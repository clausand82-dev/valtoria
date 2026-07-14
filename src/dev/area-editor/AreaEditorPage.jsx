import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocalization } from "../../i18n/index.js";
import { PREFAB_CONTENT_LAYERS } from "../../game/world/prefabs/prefab-normalization.js";
import { buildAreaEditorAssetCatalog, filterAssetCatalog } from "./asset-catalog.js";
import { AssetCatalog, buildCatalogPreviewIndex, EditorEntityPreview, GroundTilePreview, previewDepth, previewGeometry, previewImageState, resolveEntityPreviewAsset, SvgSpriteFrame, useEditorPreviewImages, WaterTilePreview } from "./editor-preview.jsx";
import { deleteEditorBlueprint, deleteEditorPrefab, downloadEditorDocument, listEditorPrefabs, readEditorJsonFile, saveEditorBlueprint, saveEditorPrefab } from "./editor-api.js";
import { createEditorHistory, commitEditorHistory, redoEditorHistory, undoEditorHistory } from "./editor-history.js";
import { createBlueprintEditorDocument, createEditorDocument, cloneEditorValue, editorDocumentFingerprint, editorLayersForDocument, resizeEditorDocument, resizeImpact } from "./editor-document.js";
import { createEditorUiState, persistEditorView } from "./editor-state.js";
import { isCellInBounds, pointerToGrid, gridToIsometric, gridToTopDown, ISO_TILE_H, ISO_TILE_W, TOP_TILE_SIZE } from "./editor-renderer.js";
import { entitiesAtCell, cycleCellSelection } from "./editor-selection.js";
import { applyEditorBrushStroke, deleteEntity, duplicateEntity, eraseGroundCell, fillEditorLayer, fillGround, paintGroundCell, paintGroundRectangle, placeEntity, updateEntity } from "./editor-tools.js";
import { PREFAB_PROPERTY_SCHEMA, schemaForLayer } from "./property-schemas.js";
import { editorDocumentToRuntimePrefab, importPrefabAsCopy, openGeneratedPrefab } from "./prefab-document-adapter.js";
import { validateEditorDocument } from "./editor-validation.js";
import { serializeAreaBlueprint } from "../../game/world/blueprints/blueprint-normalization.js";
import { MAP_REGION_SETS } from "../../game/config/map-region-config.js";
import { worldEntryAllowed } from "../../game/world-state.js";
import { buildRegionConditionPreview } from "./condition-preview.js";
import { buildEditorPlaytest } from "./editor-playtest.js";
import "./area-editor.css";

const LAYER_LABELS = { playableMask: "Playable mask", ground: "Ground", water: "Water", start: "Start position", exits: "Exit positions", decals: "Decay / decals", foliage: "Foliage", objects: "Objects", monsters: "Monsters", npcs: "NPCs", chests: "Chests" };
const LAYER_COLORS = { decals: "#9f6f5f", foliage: "#5ea66f", objects: "#d49b56", monsters: "#c75c65", npcs: "#65a7d8", chests: "#e3c45f" };
const TOOLS = ["select", "paint", "erase", "rectangle", "fill", "eyedropper", "move", "pan"];

function uniqueCopyId(base, ids) {
  const normalized = `${String(base ?? "prefab").replace(/[^a-z0-9_]/g, "_").replace(/^[^a-z]+/, "") || "prefab"}_editor`;
  let candidate = normalized;
  let index = 2;
  while (ids.includes(candidate)) candidate = `${normalized}_${index++}`;
  return candidate;
}

function countLayer(document, layer) {
  if (layer === "playableMask") return document.playableMask?.rows?.flat().filter(Boolean).length ?? 0;
  if (layer === "water") return document.water?.rows?.flat().filter((cell) => cell !== null && cell !== undefined).length ?? 0;
  if (layer === "start") return document.start ? 1 : 0;
  if (layer === "exits") return document.exits?.length ?? 0;
  if (layer !== "ground") return document[layer]?.length ?? 0;
  return document.ground?.rows?.reduce((sum, row) => sum + row.filter((cell) => cell !== null && cell !== undefined).length, 0) ?? 0;
}

function fieldValue(value, field) {
  if (field.type === "checkbox") return value === undefined ? Boolean(field.defaultValue) : Boolean(value);
  return value ?? "";
}

function FieldLabel({ field }) {
  const tooltipId = `area-editor-field-${useId().replace(/[^a-z0-9_-]/gi, "-")}`;
  const tooltipRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const [position, setPosition] = useState(null);
  const openTooltip = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor({ centerX: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom });
  };
  const closeTooltip = () => { setAnchor(null); setPosition(null); };
  useLayoutEffect(() => {
    if (!anchor || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const gutter = 8;
    const left = Math.max(gutter, Math.min(window.innerWidth - rect.width - gutter, anchor.centerX - rect.width / 2));
    let top = anchor.top - rect.height - gutter;
    if (top < gutter) top = anchor.bottom + gutter;
    top = Math.max(gutter, Math.min(window.innerHeight - rect.height - gutter, top));
    setPosition({ left, top });
  }, [anchor, field.description]);
  const tooltip = anchor && createPortal(<span
    ref={tooltipRef}
    id={tooltipId}
    className="area-editor-field-tooltip"
    role="tooltip"
    style={position ?? { left: 8, top: 8, visibility: "hidden" }}
  >{field.description}</span>, document.body);
  return <span className="area-editor-field-label"><span>{field.label}</span><span
    className="area-editor-field-help"
    tabIndex="0"
    aria-label={`Help for ${field.label}`}
    aria-describedby={tooltipId}
    onPointerEnter={openTooltip}
    onPointerLeave={closeTooltip}
    onFocus={openTooltip}
    onBlur={closeTooltip}
  >?</span>{tooltip}</span>;
}

function normalizedOptions(field, value) {
  const options = (field.options ?? []).map((option) => typeof option === "object" ? option : { value: option, label: String(option) });
  const hasValue = value !== undefined && value !== null && value !== "";
  if (hasValue && !options.some((option) => String(option.value) === String(value))) options.unshift({ value, label: `${value} (current)` });
  return options;
}

function PropertyField({ field, value, onChange }) {
  if (field.type === "checkbox") return <label className="area-editor-check"><input type="checkbox" checked={fieldValue(value, field)} onChange={(event) => onChange(event.target.checked)} /><FieldLabel field={field} /></label>;
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    const options = normalizedOptions(field, null);
    return <div className="area-editor-multiselect"><FieldLabel field={field} /><details><summary>{selected.length ? `${selected.length} selected` : "None selected"}</summary><div>{options.map((option) => <label key={option.value}><input type="checkbox" checked={selected.includes(String(option.value))} onChange={(event) => onChange(event.target.checked ? [...new Set([...selected, String(option.value)])] : selected.filter((entry) => entry !== String(option.value)))} />{option.label}</label>)}</div></details></div>;
  }
  if (field.type === "select") {
    const options = normalizedOptions(field, value);
    return <label><FieldLabel field={field} /><select value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : field.valueType === "number" ? Number(event.target.value) : event.target.value)}>{field.optional && <option value="">Runtime default / none</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  }
  return <label><FieldLabel field={field} /><input type={field.type} min={field.min} max={field.max} step={field.step} value={fieldValue(value, field)} onChange={(event) => onChange(field.type === "number" ? event.target.value === "" ? undefined : Number(event.target.value) : event.target.value)} /></label>;
}

function DocumentBrowser({ data, onNew, onNewBlueprint, onOpenGenerated, onOpenBlueprint, onPreviewHandwritten, onImport, onDuplicate, onDelete, onDeleteBlueprint, onImportJson, onClose, status }) {
  const { t } = useLocalization();
  const fileRef = useRef(null);
  return <main className="area-editor-home" data-testid="area-editor-home">
    <header><div><span className="area-editor-kicker">{t("areaEditor.devOnly")}</span><h1>{t("areaEditor.title")}</h1><p>{t("areaEditor.browserHelp")}</p></div><button type="button" onClick={onClose}>{t("areaEditor.returnSettings")}</button></header>
    <div className="area-editor-home-actions">
      <button type="button" onClick={onNew}>{t("areaEditor.newPrefab")}</button>
      <button type="button" onClick={onNewBlueprint}>New full-area blueprint</button>
      <button type="button" onClick={() => fileRef.current?.click()}>{t("areaEditor.importJson")}</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportJson(file); event.target.value = ""; }} />
    </div>
    {status && <p className="area-editor-status">{status}</p>}
    {(data?.invalid?.length ?? 0) > 0 && <section className="area-editor-errors"><h2>Generated files that could not be loaded</h2>{data.invalid.map((entry) => <p key={entry.id}><b>{entry.id}</b>: {entry.message}</p>)}</section>}
    <section><h2>{t("areaEditor.managedPrefabs")}</h2><div className="area-editor-doc-grid">
      {(data?.generated ?? []).map((document) => <article key={document.id}><div><strong>{document.label || document.id}</strong><code>{document.id}</code><small>{document.w}×{document.h} · schema {document.schemaVersion ?? 1} · editor-managed · valid</small></div><div><button type="button" onClick={() => onOpenGenerated(document)}>Open</button><button type="button" onClick={() => onDuplicate(document)}>Duplicate</button><button type="button" className="danger-action" onClick={() => onDelete(document)}>Delete</button></div></article>)}
      {!(data?.generated?.length) && <p>No editor-managed prefabs yet.</p>}
    </div></section>
    <section><h2>Editor-managed full-area blueprints</h2><p>Blueprints replace physical region generation only when an ordered region candidate matches; otherwise procedural generation remains automatic.</p><div className="area-editor-doc-grid">
      {(data?.blueprints ?? []).map((document) => <article key={document.id}><div><strong>{document.label || document.id}</strong><code>{document.id}</code><small>{document.w}×{document.h} · full-area blueprint · schema {document.schemaVersion ?? 1}</small></div><div><button type="button" onClick={() => onOpenBlueprint(document)}>Open</button><button type="button" onClick={() => onDuplicate(document)}>Duplicate</button><button type="button" className="danger-action" onClick={() => onDeleteBlueprint(document)}>Delete</button></div></article>)}
      {!(data?.blueprints?.length) && <p>No editor-managed blueprints yet.</p>}
    </div></section>
    <section><h2>{t("areaEditor.handwrittenPrefabs")}</h2><p>Handwritten prefabs are read-only. Import one to edit a canonical direct-array copy.</p><div className="area-editor-doc-grid">
      {(data?.handwritten ?? []).map((document) => <article key={document.id}><div><strong>{document.label || document.id}</strong><code>{document.id}</code><small>{document.w}×{document.h} · handwritten · read-only</small></div><div><button type="button" onClick={() => onPreviewHandwritten(document)}>Preview</button><button type="button" onClick={() => onImport(document)}>Import as copy</button></div></article>)}
    </div></section>
  </main>;
}

function EditorCanvas({ document, ui, catalogByFile, previewIndex, onCell, onHover, hoverCell, onPanStart, onWheel, onStrokeStart, onStrokeMove, onStrokeEnd }) {
  const width = 1100;
  const height = 720;
  const originX = width / 2 + ui.panX;
  const originY = 70 + ui.panY;
  const view = { zoom: ui.zoom, originX, originY };
  const cells = [];
  for (let y = 0; y < document.h; y += 1) for (let x = 0; x < document.w; x += 1) cells.push({ x, y });
  const point = (x, y) => ui.view === "topdown" ? gridToTopDown(x, y, { ...view, originX: 50 + ui.panX, originY: 50 + ui.panY }) : gridToIsometric(x, y, view);
  const tileW = (ui.view === "topdown" ? TOP_TILE_SIZE : ISO_TILE_W) * ui.zoom;
  const tileH = (ui.view === "topdown" ? TOP_TILE_SIZE : ISO_TILE_H) * ui.zoom;
  const handlePointer = (event, callback) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const localX = (event.clientX - rect.left) * scaleX;
    const localY = (event.clientY - rect.top) * scaleY;
    const conversionView = ui.view === "topdown" ? { ...view, originX: 50 + ui.panX, originY: 50 + ui.panY } : view;
    callback(pointerToGrid(localX, localY, ui.view, conversionView), event);
  };
  const rawEntities = PREFAB_CONTENT_LAYERS.flatMap((layer) => ui.visibility[layer] === false ? [] : (document[layer] ?? []).map((entry, index) => ({ layer, entry, index, asset: resolveEntityPreviewAsset(previewIndex, layer, entry) })));
  const groundPreviewAssets = (document.ground?.palette ?? []).map((entry) => {
    const asset = entry ? catalogByFile.get(`ground:${entry.fileName}:${Number(entry.variant) || 0}`) : null;
    return asset ? { ...asset, ...entry, sourceVariant: Number(entry.variant) || 0 } : null;
  });
  const waterPreviewAssets = (document.water?.palette ?? []).map((entry) => {
    const asset = entry ? catalogByFile.get(`water:${entry.fileName}:${Number(entry.variant) || 0}`) : null;
    return asset ? { ...asset, ...entry, sourceVariant: Number(entry.variant) || 0 } : null;
  });
  const imageState = useEditorPreviewImages([...rawEntities.map(({ asset }) => asset), ...groundPreviewAssets, ...waterPreviewAssets]);
  const entities = rawEntities.map((entity) => {
    const pos = point(Number(entity.entry.x), Number(entity.entry.y));
    const baseX = ui.view === "topdown" ? pos.x + tileW / 2 : pos.x;
    const baseY = ui.view === "topdown"
      ? pos.y + tileH / 2
      : pos.y + tileH * (entity.asset?.kind === "decal" ? 0.52 : 0.5);
    const image = previewImageState(imageState, entity.asset);
    const geometry = image?.status === "loaded" ? previewGeometry(entity.asset, image, tileW, tileH, entity.entry) : null;
    return { ...entity, baseX, baseY, depth: previewDepth(entity.asset, entity.entry, baseY, geometry) };
  }).sort((a, b) => a.depth.layer - b.depth.layer || a.depth.value - b.depth.value || PREFAB_CONTENT_LAYERS.indexOf(a.layer) - PREFAB_CONTENT_LAYERS.indexOf(b.layer) || a.index - b.index);
  return <svg className="area-editor-canvas" viewBox={`0 0 ${width} ${height}`} onPointerDown={(event) => handlePointer(event, (cell, original) => {
    if (original.button === 1 || ui.tool === "pan") onPanStart(original);
    else if (["paint", "erase"].includes(ui.tool)) { original.currentTarget.setPointerCapture?.(original.pointerId); onStrokeStart(cell); }
    else onCell(cell);
  })} onPointerMove={(event) => handlePointer(event, (cell) => { onHover(cell); if (event.buttons & 1) onStrokeMove(cell); })} onPointerUp={onStrokeEnd} onPointerCancel={onStrokeEnd} onPointerLeave={() => onHover(null)} onWheel={onWheel} data-testid="area-editor-canvas">
    <rect width={width} height={height} fill="#11171a" />
    {cells.map((cell) => {
      const pos = point(cell.x, cell.y);
      const overrideIndex = document.ground?.rows?.[cell.y]?.[cell.x];
      const playable = document.documentType !== "blueprint" || document.playableMask?.rows?.[cell.y]?.[cell.x] === true;
      const waterIndex = document.documentType === "blueprint" ? document.water?.rows?.[cell.y]?.[cell.x] : null;
      const water = waterIndex !== null && waterIndex !== undefined;
      const groundEntry = document.ground?.palette?.[overrideIndex];
      const waterEntry = document.water?.palette?.[waterIndex];
      const catalogGroundAsset = groundEntry ? catalogByFile.get(`ground:${groundEntry.fileName}:${Number(groundEntry.variant) || 0}`) : null;
      const groundAsset = catalogGroundAsset ? { ...catalogGroundAsset, ...groundEntry, sourceVariant: Number(groundEntry.variant) || 0 } : null;
      const catalogWaterAsset = waterEntry ? catalogByFile.get(`water:${waterEntry.fileName}:${Number(waterEntry.variant) || 0}`) : null;
      const waterAsset = catalogWaterAsset ? { ...catalogWaterAsset, ...waterEntry, sourceVariant: Number(waterEntry.variant) || 0 } : null;
      const selected = ui.selectedCell?.x === cell.x && ui.selectedCell?.y === cell.y;
      const hovered = hoverCell?.x === cell.x && hoverCell?.y === cell.y;
      if (ui.view === "topdown") return <g key={`${cell.x},${cell.y}`}><rect x={pos.x} y={pos.y} width={tileW} height={tileH} fill={playable ? (overrideIndex === null || overrideIndex === undefined ? "#1c2927" : "#273b36") : "#090d0f"} />{groundAsset && playable && <SvgSpriteFrame asset={groundAsset} x={pos.x} y={pos.y} width={tileW} height={tileH} />}{water && (waterAsset ? <SvgSpriteFrame asset={waterAsset} x={pos.x} y={pos.y} width={tileW} height={tileH} opacity={0.82} /> : <rect x={pos.x} y={pos.y} width={tileW} height={tileH} fill="#247c9d" opacity="0.72" />)}<rect x={pos.x} y={pos.y} width={tileW} height={tileH} fill="none" stroke={selected ? "#ffe08a" : hovered ? "#ffffff" : playable ? "#38504b" : "#7c3f48"} strokeWidth={selected || hovered ? 3 : 1} /></g>;
      const points = `${pos.x},${pos.y} ${pos.x + tileW / 2},${pos.y + tileH / 2} ${pos.x},${pos.y + tileH} ${pos.x - tileW / 2},${pos.y + tileH / 2}`;
      const runtimeRatio = tileW / 104;
      const groundBasePoints = `${pos.x},${pos.y - runtimeRatio} ${pos.x + tileW / 2 + runtimeRatio},${pos.y + tileH / 2} ${pos.x},${pos.y + tileH + runtimeRatio} ${pos.x - tileW / 2 - runtimeRatio},${pos.y + tileH / 2}`;
      const waterClipId = `water-${cell.x}-${cell.y}`;
      return <g key={`${cell.x},${cell.y}`}><polygon points={points} fill={playable ? (overrideIndex === null || overrideIndex === undefined ? "#1c2927" : "#273b36") : "#090d0f"} />{groundAsset && playable && <><polygon points={groundBasePoints} fill={groundAsset.baseColor ?? "#4f8f36"} opacity={Number.isFinite(Number(groundAsset.baseAlpha)) ? Number(groundAsset.baseAlpha) : 1} /><GroundTilePreview asset={groundAsset} imageState={imageState} x={pos.x} y={pos.y} tileW={tileW} tileH={tileH} /></>}{water && <><polygon points={groundBasePoints} fill="#1f5f7f" opacity="1" />{waterAsset && <WaterTilePreview asset={waterAsset} imageState={imageState} x={pos.x} y={pos.y} tileW={tileW} tileH={tileH} clipId={waterClipId} />}</>}<polygon points={points} fill="none" stroke={selected ? "#ffe08a" : hovered ? "#ffffff" : playable ? "#38504b" : "#7c3f48"} strokeWidth={selected || hovered ? 3 : 1} /></g>;
    })}
    {entities.map(({ layer, entry, index, asset, baseX, baseY }) => {
      const selected = ui.selection?.layer === layer && ui.selection?.index === index;
      if (ui.view === "topdown") return <g key={`${layer}:${index}`} pointerEvents="none"><circle cx={baseX} cy={baseY} r={selected ? 16 : 12} fill={LAYER_COLORS[layer]} stroke={selected ? "#fff2a8" : "#0a0d0e"} strokeWidth={selected ? 4 : 2} /><text x={baseX} y={baseY + 5} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">{layer.slice(0, 1).toUpperCase()}</text></g>;
      return <EditorEntityPreview key={`${layer}:${index}`} asset={asset} entry={entry} layer={layer} baseX={baseX} baseY={baseY} tileW={tileW} tileH={tileH} selected={selected} imageState={imageState} previewKey={`${layer}-${index}`} />;
    })}
    {document.documentType === "blueprint" && document.start && (() => { const pos = point(document.start.x, document.start.y); const cx = ui.view === "topdown" ? pos.x + tileW / 2 : pos.x; const cy = ui.view === "topdown" ? pos.y + tileH / 2 : pos.y + tileH / 2; return <g><circle cx={cx} cy={cy} r="15" fill="#4fd77d" stroke="#fff" strokeWidth="3" /><text x={cx} y={cy + 5} textAnchor="middle" fontWeight="800">S</text></g>; })()}
    {document.documentType === "blueprint" && (document.exits ?? []).map((exit, index) => { const pos = point(exit.x, exit.y); const cx = ui.view === "topdown" ? pos.x + tileW / 2 : pos.x; const cy = ui.view === "topdown" ? pos.y + tileH / 2 : pos.y + tileH / 2; return <g key={`exit:${index}`}><circle cx={cx} cy={cy} r="15" fill={exit.primary ? "#f2bd4a" : "#d58ae8"} stroke="#fff" strokeWidth="3" /><text x={cx} y={cy + 5} textAnchor="middle" fontWeight="800">E</text></g>; })}
    <text x="16" y="24" fill="#9eb0ad" fontSize="13">{ui.view} · zoom {ui.zoom.toFixed(2)} · {document.w}×{document.h}</text>
  </svg>;
}

export function AreaEditorPlaytestOverlay({ label, kind, onExit }) {
  return <aside className="area-editor-playtest-toolbar" aria-label="Area Editor test mode">
    <div><strong>Editor test</strong><span>{label} · {kind}</span></div>
    <button type="button" data-testid="exit-area-editor-test" onClick={onExit}>Exit test</button>
  </aside>;
}

export default function AreaEditorPage({ onClose, onTest, resumeState = null }) {
  const { t } = useLocalization();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(() => cloneEditorValue(resumeState?.history) ?? null);
  const document = history?.present ?? null;
  const [ui, setUi] = useState(() => cloneEditorValue(resumeState?.ui) ?? null);
  const [savedFingerprint, setSavedFingerprint] = useState(() => resumeState?.savedFingerprint ?? null);
  const [originalId, setOriginalId] = useState(() => resumeState?.originalId ?? null);
  const [readOnly, setReadOnly] = useState(() => Boolean(resumeState?.readOnly));
  const [status, setStatus] = useState(() => resumeState ? "Returned from playable test." : "");
  const [search, setSearch] = useState(() => resumeState?.search ?? "");
  const [category, setCategory] = useState(() => resumeState?.category ?? "all");
  const [hoverCell, setHoverCell] = useState(null);
  const [advancedText, setAdvancedText] = useState(() => resumeState?.advancedText ?? "{}");
  const [conditionPreviewText, setConditionPreviewText] = useState(() => resumeState?.conditionPreviewText ?? "{\n  \"worldState\": { \"flags\": {}, \"values\": {}, \"counters\": {} },\n  \"cityStats\": {}\n}");
  const [conditionPreviewCommon, setConditionPreviewCommon] = useState(() => cloneEditorValue(resumeState?.conditionPreviewCommon) ?? { activeQuests: "", completedQuests: "", flags: "", corruption: "", cityThreat: "" });
  const [testing, setTesting] = useState(false);
  const panRef = useRef(null);
  const strokeRef = useRef(null);
  const catalog = useMemo(buildAreaEditorAssetCatalog, []);
  const catalogByKey = useMemo(() => new Map(catalog.map((entry) => [entry.key, entry])), [catalog]);
  const catalogByFile = useMemo(() => new Map(catalog.filter((entry) => entry.fileName).map((entry) => [`${entry.layer}:${entry.fileName}:${Number(entry.variant) || 0}`, entry])), [catalog]);
  const previewIndex = useMemo(() => buildCatalogPreviewIndex(catalog), [catalog]);
  const dirty = Boolean(document && savedFingerprint !== editorDocumentFingerprint(persistEditorView(document, ui)));
  const allIds = useMemo(() => document?.documentType === "blueprint" ? (data?.blueprints ?? []).map((entry) => entry.id) : [...(data?.generated ?? []), ...(data?.handwritten ?? [])].map((entry) => entry.id), [data, document?.documentType]);
  const validation = useMemo(() => document ? validateEditorDocument(persistEditorView(document, ui), allIds, originalId) : { errors: [], warnings: [], canSave: false }, [document, ui, allIds, originalId]);

  const refresh = useCallback(async () => {
    try { setData(await listEditorPrefabs()); setStatus(""); } catch (error) { setStatus(error.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!dirty) return undefined;
    const protect = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  const canLeave = useCallback(() => !dirty || window.confirm(t("areaEditor.unsavedPrompt")), [dirty, t]);
  const openDocument = useCallback((next, options = {}) => {
    if (!canLeave()) return;
    const uiState = createEditorUiState(next);
    setHistory(createEditorHistory(next));
    setUi(uiState);
    setOriginalId(options.originalId ?? null);
    setReadOnly(Boolean(options.readOnly));
    setSavedFingerprint(options.dirty ? null : editorDocumentFingerprint(persistEditorView(next, uiState)));
    setStatus(options.message ?? "");
  }, [canLeave]);
  const closeDocument = () => { if (canLeave()) { setHistory(null); setUi(null); setReadOnly(false); setOriginalId(null); refresh(); } };
  const commit = useCallback((next) => setHistory((current) => commitEditorHistory(current, typeof next === "function" ? next(current.present) : next)), []);
  const beginStroke = useCallback((cell) => {
    if (readOnly || !isCellInBounds(document, cell) || ui.visibility[ui.activeLayer] === false || ui.locked[ui.activeLayer]) return;
    const asset = ui.catalogAsset ? catalogByKey.get(ui.catalogAsset) : null;
    if (ui.tool === "paint" && !asset && !["playableMask", "start", "exits"].includes(ui.activeLayer)) return;
    strokeRef.current = { base: cloneEditorValue(document), cells: [], keys: new Set(), layer: ui.activeLayer, mode: ui.tool, asset };
    const add = (target) => { const key = `${target.x},${target.y}`; if (!strokeRef.current.keys.has(key)) { strokeRef.current.keys.add(key); strokeRef.current.cells.push(target); } };
    add(cell);
    const result = applyEditorBrushStroke(strokeRef.current.base, strokeRef.current);
    setHistory((current) => ({ ...current, present: result.document }));
    if (result.selection) setUi((current) => ({ ...current, selection: result.selection, selectedCell: cell }));
  }, [catalogByKey, document, readOnly, ui]);
  const extendStroke = useCallback((cell) => {
    const stroke = strokeRef.current; if (!stroke || !isCellInBounds(stroke.base, cell)) return;
    const key = `${cell.x},${cell.y}`; if (stroke.keys.has(key)) return; stroke.keys.add(key); stroke.cells.push(cell);
    const result = applyEditorBrushStroke(stroke.base, stroke); setHistory((current) => ({ ...current, present: result.document }));
    if (result.selection) setUi((current) => ({ ...current, selection: result.selection, selectedCell: cell }));
  }, []);
  const endStroke = useCallback(() => {
    const stroke = strokeRef.current; if (!stroke) return; strokeRef.current = null;
    setHistory((current) => commitEditorHistory({ ...current, present: stroke.base }, current.present));
  }, []);

  const newDocument = () => {
    const id = uniqueCopyId("new_prefab", allIds);
    openDocument(createEditorDocument({ id, label: "New Prefab" }), { dirty: true });
  };
  const newBlueprint = () => {
    const ids = (data?.blueprints ?? []).map((entry) => entry.id);
    openDocument(createBlueprintEditorDocument({ id: uniqueCopyId("new_blueprint", ids) }), { dirty: true });
  };
  const importHandwritten = (prefab) => {
    const id = uniqueCopyId(prefab.id, allIds);
    openDocument(importPrefabAsCopy(prefab, id), { dirty: true, message: `Imported read-only prefab "${prefab.id}" as canonical copy "${id}".` });
  };
  const duplicateManaged = (prefab) => {
    const ids = prefab.documentType === "blueprint" ? (data?.blueprints ?? []).map((entry) => entry.id) : allIds;
    const id = uniqueCopyId(prefab.id, ids); const create = prefab.documentType === "blueprint" ? createBlueprintEditorDocument : createEditorDocument;
    openDocument(create({ ...cloneEditorValue(prefab), id, label: `${prefab.label ?? prefab.id} Copy`, editor: { ...prefab.editor, managed: true, duplicatedFrom: prefab.id } }), { dirty: true });
  };

  const save = async (asCopy = false) => {
    if (readOnly || !document) return;
    let target = persistEditorView(document, ui);
    let previous = originalId;
    if (asCopy) {
      const proposed = window.prompt(`Save copy as ${document.documentType === "blueprint" ? "blueprint" : "prefab"} ID`, uniqueCopyId(document.id, allIds));
      if (!proposed) return;
      target = { ...target, id: proposed, label: `${target.label} Copy`, editor: { ...target.editor, duplicatedFrom: document.id } };
      previous = null;
    }
    const check = validateEditorDocument(target, allIds, previous);
    if (!check.canSave) { setStatus(check.errors.map((entry) => entry.message).join(" · ")); return; }
    try {
      const blueprint = document.documentType === "blueprint";
      const payload = blueprint ? await saveEditorBlueprint(serializeAreaBlueprint(target), previous) : await saveEditorPrefab(editorDocumentToRuntimePrefab(target), previous);
      const opened = blueprint ? createBlueprintEditorDocument(payload.document) : openGeneratedPrefab(payload.document);
      const nextUi = createEditorUiState(opened);
      setHistory(createEditorHistory(opened));
      setUi(nextUi);
      setOriginalId(payload.id);
      setSavedFingerprint(editorDocumentFingerprint(persistEditorView(opened, nextUi)));
      setStatus(`Saved ${payload.id}.`);
      await refresh();
    } catch (error) {
      setStatus(`${error.message} Use JSON download as a fallback.`);
    }
  };

  const startPlayableTest = async () => {
    if (!document || !ui || !onTest || testing) return;
    const target = persistEditorView(document, ui);
    const check = validateEditorDocument(target, allIds, originalId);
    if (!check.canSave) {
      setStatus(`Cannot test invalid document: ${check.errors.map((entry) => entry.message).join(" · ")}`);
      return;
    }
    const editorState = {
      history: cloneEditorValue(history),
      ui: cloneEditorValue(ui),
      savedFingerprint,
      originalId,
      readOnly,
      search,
      category,
      advancedText,
      conditionPreviewText,
      conditionPreviewCommon: cloneEditorValue(conditionPreviewCommon),
    };
    setTesting(true);
    setStatus("Preparing playable test...");
    try {
      const started = await onTest({ playtest: buildEditorPlaytest(target), resumeState: editorState });
      if (started === false) setStatus("Playable test could not be started.");
    } catch (error) {
      setStatus(`Playable test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const selectedEntry = document && ui?.selection ? document[ui.selection.layer]?.[ui.selection.index] : null;
  useEffect(() => { setAdvancedText(JSON.stringify(selectedEntry ?? {}, null, 2)); }, [selectedEntry]);

  const deleteSelection = useCallback(() => {
    if (!document || !ui.selection || readOnly) return;
    if (ui.selection.layer === "start") commit({ ...document, start: null });
    else if (ui.selection.layer === "exits") { const next = cloneEditorValue(document); next.exits.splice(ui.selection.index, 1); commit(next); }
    else commit(deleteEntity(document, ui.selection));
    setUi((current) => ({ ...current, selection: null }));
  }, [commit, document, readOnly, ui?.selection]);
  const duplicateSelection = useCallback(() => {
    if (!document || !ui.selection || readOnly) return;
    const result = duplicateEntity(document, ui.selection);
    commit(result.document);
    setUi((current) => ({ ...current, selection: result.selection }));
  }, [commit, document, readOnly, ui?.selection]);

  useEffect(() => {
    if (!document) return undefined;
    const keydown = (event) => {
      const input = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName);
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); setHistory((current) => event.shiftKey ? redoEditorHistory(current) : undoEditorHistory(current)); return; }
      if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); setHistory(redoEditorHistory); return; }
      if (input) return;
      if (mod && event.key.toLowerCase() === "c" && selectedEntry) { event.preventDefault(); setUi((current) => ({ ...current, clipboard: { layer: current.selection.layer, entry: cloneEditorValue(selectedEntry) } })); }
      if (mod && event.key.toLowerCase() === "v" && ui.clipboard) { event.preventDefault(); const result = placeEntity(document, ui.clipboard.layer, Math.min(document.w - 1, Number(ui.clipboard.entry.x) + 1), Math.min(document.h - 1, Number(ui.clipboard.entry.y) + 1), ui.clipboard.entry); commit(result.document); setUi((current) => ({ ...current, selection: result.selection })); }
      if (event.key === "Delete") { event.preventDefault(); deleteSelection(); }
      if (event.key === "Escape") setUi((current) => ({ ...current, selection: null, rectangleStart: null, tool: "select" }));
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [commit, deleteSelection, document, selectedEntry, ui?.clipboard]);

  if (!document) return <DocumentBrowser data={data} status={status} onClose={onClose} onNew={newDocument} onNewBlueprint={newBlueprint} onOpenGenerated={(prefab) => openDocument(openGeneratedPrefab(prefab), { originalId: prefab.id })} onOpenBlueprint={(blueprint) => openDocument(createBlueprintEditorDocument(blueprint), { originalId: blueprint.id })} onPreviewHandwritten={(prefab) => openDocument(importPrefabAsCopy(prefab, prefab.id), { readOnly: true, originalId: null, message: "Read-only normalized preview. Import as a copy to edit." })} onImport={importHandwritten} onDuplicate={duplicateManaged} onDelete={async (prefab) => { if (!window.confirm(`Delete generated prefab "${prefab.id}"?`)) return; try { await deleteEditorPrefab(prefab.id); await refresh(); } catch (error) { setStatus(error.message); } }} onDeleteBlueprint={async (blueprint) => { if (!window.confirm(`Delete generated blueprint "${blueprint.id}"? Region references will fall back procedurally.`)) return; try { await deleteEditorBlueprint(blueprint.id); await refresh(); } catch (error) { setStatus(error.message); } }} onImportJson={async (file) => { try { const raw = await readEditorJsonFile(file); const create = raw.documentType === "blueprint" ? createBlueprintEditorDocument : createEditorDocument; const imported = create(raw); const ids = imported.documentType === "blueprint" ? (data?.blueprints ?? []).map((entry) => entry.id) : [...(data?.generated ?? []), ...(data?.handwritten ?? [])].map((entry) => entry.id); const id = ids.includes(imported.id) ? uniqueCopyId(imported.id, ids) : imported.id; openDocument({ ...imported, id }, { dirty: true }); } catch (error) { setStatus(error.message); } }} />;

  const availableCategories = [...new Set(catalog.filter((entry) => entry.layer === ui.activeLayer).map((entry) => entry.category))];
  const filteredCatalog = filterAssetCatalog(catalog, { layer: ui.activeLayer, search, category });
  const selectedCatalog = ui.catalogAsset ? catalogByKey.get(ui.catalogAsset) : null;
  const editorLayers = editorLayersForDocument(document);
  const cellCandidates = ui.selectedCell ? entitiesAtCell(document, ui.selectedCell.x, ui.selectedCell.y, ui.visibility) : [];
  const blueprintUsages = document.documentType === "blueprint" ? Object.values(MAP_REGION_SETS).flatMap((regions) => Array.isArray(regions) ? regions : []).flatMap((region) => (region.blueprints ?? []).map((candidate, index) => ({ region, candidate, index })).filter((entry) => entry.candidate.id === document.id)) : [];

  const handleCell = (cell) => {
    if (!isCellInBounds(document, cell)) return;
    setUi((current) => ({ ...current, selectedCell: cell }));
    if (readOnly) {
      const next = cycleCellSelection(entitiesAtCell(document, cell.x, cell.y, ui.visibility), ui.selection);
      setUi((current) => ({ ...current, selection: next }));
      return;
    }
    if (ui.locked[ui.activeLayer] || ui.visibility[ui.activeLayer] === false) return;
    if (ui.tool === "select") {
      if (document.documentType === "blueprint" && document.start?.x === cell.x && document.start?.y === cell.y) { setUi((current) => ({ ...current, selection: { layer: "start", index: 0 } })); return; }
      const exitIndex = document.documentType === "blueprint" ? (document.exits ?? []).findIndex((entry) => entry.x === cell.x && entry.y === cell.y) : -1;
      if (exitIndex >= 0) { setUi((current) => ({ ...current, selection: { layer: "exits", index: exitIndex } })); return; }
      const next = cycleCellSelection(entitiesAtCell(document, cell.x, cell.y, ui.visibility), ui.selection); setUi((current) => ({ ...current, selection: next })); return;
    }
    if (ui.tool === "eyedropper") {
      if (["ground", "water"].includes(ui.activeLayer)) { const layer = document[ui.activeLayer]; const index = layer.rows[cell.y][cell.x]; const entry = layer.palette[index]; if (entry) { const found = catalog.find((asset) => asset.layer === ui.activeLayer && asset.fileName === entry.fileName && asset.variant === entry.variant); if (found) setUi((current) => ({ ...current, catalogAsset: found.key, tool: "paint" })); } }
      else { const foundEntity = entitiesAtCell(document, cell.x, cell.y, ui.visibility).filter((entry) => entry.layer === ui.activeLayer).pop(); if (foundEntity) { const id = foundEntity.entry.id ?? foundEntity.entry.decayId ?? foundEntity.entry.type ?? foundEntity.entry.npcId; const found = catalog.find((asset) => asset.layer === ui.activeLayer && asset.id === id); if (found) setUi((current) => ({ ...current, catalogAsset: found.key, tool: "paint", selection: foundEntity })); } }
      return;
    }
    if (ui.tool === "move" && ui.selection) {
      if (ui.selection.layer === "start") commit({ ...document, start: cell });
      else if (ui.selection.layer === "exits") { const next = cloneEditorValue(document); next.exits[ui.selection.index] = { ...next.exits[ui.selection.index], ...cell }; commit(next); }
      else commit(updateEntity(document, ui.selection, cell));
      return;
    }
    if (ui.tool === "erase") {
      if (ui.activeLayer === "ground") commit(eraseGroundCell(document, cell.x, cell.y));
      else { const target = entitiesAtCell(document, cell.x, cell.y, ui.visibility).filter((entry) => entry.layer === ui.activeLayer).pop(); if (target) commit(deleteEntity(document, target)); }
      return;
    }
    if (ui.tool === "rectangle") {
      if (!ui.rectangleStart) { setUi((current) => ({ ...current, rectangleStart: cell })); return; }
      if (["ground", "water", "playableMask"].includes(ui.activeLayer)) {
        const cells = []; for (let y = Math.min(ui.rectangleStart.y, cell.y); y <= Math.max(ui.rectangleStart.y, cell.y); y += 1) for (let x = Math.min(ui.rectangleStart.x, cell.x); x <= Math.max(ui.rectangleStart.x, cell.x); x += 1) cells.push({ x, y });
        commit(applyEditorBrushStroke(document, { layer: ui.activeLayer, cells, mode: "paint", asset: selectedCatalog }).document);
      }
      else if (selectedCatalog) {
        let next = document;
        let selection = null;
        const minX = Math.min(ui.rectangleStart.x, cell.x); const maxX = Math.max(ui.rectangleStart.x, cell.x);
        const minY = Math.min(ui.rectangleStart.y, cell.y); const maxY = Math.max(ui.rectangleStart.y, cell.y);
        for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) { const result = placeEntity(next, ui.activeLayer, x, y, selectedCatalog.template); next = result.document; selection = result.selection; }
        commit(next); setUi((current) => ({ ...current, selection }));
      }
      setUi((current) => ({ ...current, rectangleStart: null }));
      return;
    }
    if (ui.tool === "fill" && ["ground", "water", "playableMask"].includes(ui.activeLayer) && (selectedCatalog || ui.activeLayer === "playableMask")) { commit(fillEditorLayer(document, ui.activeLayer, cell, selectedCatalog)); return; }
    if (ui.tool === "paint" && (selectedCatalog || ["playableMask", "start", "exits"].includes(ui.activeLayer))) {
      if (ui.activeLayer === "ground") commit(paintGroundCell(document, cell.x, cell.y, selectedCatalog));
      else { const result = applyEditorBrushStroke(document, { layer: ui.activeLayer, cells: [cell], mode: "paint", asset: selectedCatalog }); commit(result.document); if (result.selection) setUi((current) => ({ ...current, selection: result.selection })); }
    }
  };

  const updateMetadata = (field, value) => {
    if (readOnly) return;
    if (["w", "h"].includes(field.key)) {
      const impact = resizeImpact(document, field.key === "w" ? value : document.w, field.key === "h" ? value : document.h);
      if (impact.total > 0 && !window.confirm(`Shrinking removes ${impact.groundCells} ground overrides, ${impact.waterCells ?? 0} water cells, ${impact.maskCells ?? 0} mask cells, ${impact.markers ?? 0} critical markers, and ${impact.entities} entities. Continue?`)) return;
      commit(resizeEditorDocument(document, impact.w, impact.h));
    } else commit({ ...document, [field.key]: value });
  };
  const updateSelected = (field, value) => { if (!readOnly) commit(updateEntity(document, ui.selection, { [field.key]: value })); };

  return <main className="area-editor-page" data-testid="area-editor-page">
    <header className="area-editor-topbar"><div><button type="button" onClick={closeDocument}>← Documents</button><strong>{document.label || document.id}</strong><span>{document.documentType === "blueprint" ? "Full-area blueprint" : "Prefab"}</span>{dirty && <span className="area-editor-dirty">Modified</span>}{readOnly && <span>Read-only preview</span>}</div><div><button type="button" onClick={() => setHistory(undoEditorHistory)} disabled={!history.past.length || readOnly}>Undo</button><button type="button" onClick={() => setHistory(redoEditorHistory)} disabled={!history.future.length || readOnly}>Redo</button><button type="button" data-testid="test-area-editor-document" onClick={startPlayableTest} disabled={testing || !validation.canSave}>{testing ? "Preparing test..." : "Playable test"}</button><button type="button" onClick={() => downloadEditorDocument(document.documentType === "blueprint" ? serializeAreaBlueprint(persistEditorView(document, ui)) : editorDocumentToRuntimePrefab(persistEditorView(document, ui)))}>Download JSON</button><button type="button" onClick={() => save(true)} disabled={readOnly}>Save as copy</button><button type="button" onClick={() => save(false)} disabled={readOnly || !validation.canSave}>Save</button></div></header>
    <div className="area-editor-toolbar">
      {TOOLS.map((tool) => <button type="button" key={tool} className={ui.tool === tool ? "active" : ""} onClick={() => setUi((current) => ({ ...current, tool, rectangleStart: null }))}>{tool}</button>)}
      <span className="area-editor-separator" />
      <button type="button" className={ui.view === "isometric" ? "active" : ""} onClick={() => setUi((current) => ({ ...current, view: "isometric" }))}>Isometric</button>
      <button type="button" className={ui.view === "topdown" ? "active" : ""} onClick={() => setUi((current) => ({ ...current, view: "topdown" }))}>Top-down</button>
      <button type="button" onClick={() => setUi((current) => ({ ...current, zoom: Math.max(0.45, current.zoom - 0.1) }))}>−</button><button type="button" onClick={() => setUi((current) => ({ ...current, zoom: Math.min(2.5, current.zoom + 0.1) }))}>+</button>
    </div>
    <div className="area-editor-layout">
      <aside className="area-editor-sidebar area-editor-layers"><h2>Layers</h2>{editorLayers.map((layer) => <div key={layer} className={ui.activeLayer === layer ? "active" : ""}><button type="button" onClick={() => { setCategory("all"); setUi((current) => ({ ...current, activeLayer: layer, selection: null, catalogAsset: null })); }}>{LAYER_LABELS[layer]} <b>{countLayer(document, layer)}</b></button><label title="Visible"><input type="checkbox" checked={ui.visibility[layer]} onChange={(event) => setUi((current) => ({ ...current, visibility: { ...current.visibility, [layer]: event.target.checked } }))} />V</label><label title="Locked"><input type="checkbox" checked={ui.locked[layer]} onChange={(event) => setUi((current) => ({ ...current, locked: { ...current.locked, [layer]: event.target.checked } }))} />L</label></div>)}
        <button type="button" onClick={() => setUi((current) => ({ ...current, visibility: Object.fromEntries(editorLayers.map((layer) => [layer, layer === current.activeLayer])) }))}>Show only active</button>
        <button type="button" className="danger-action" disabled={readOnly} onClick={() => { if (!window.confirm(`Clear ${LAYER_LABELS[ui.activeLayer]}?`)) return; const layer = ui.activeLayer; if (["ground", "water"].includes(layer)) commit({ ...document, [layer]: { ...document[layer], rows: document[layer].rows.map((row) => row.map(() => null)) } }); else if (layer === "playableMask") commit({ ...document, playableMask: { ...document.playableMask, rows: document.playableMask.rows.map((row) => row.map(() => false)) } }); else if (layer === "start") commit({ ...document, start: null }); else commit({ ...document, [layer]: [] }); }}>Clear layer</button>
        <h2>{document.documentType === "blueprint" ? "Blueprint" : "Prefab"}</h2><div className="area-editor-form">{PREFAB_PROPERTY_SCHEMA.filter((field) => document.documentType !== "blueprint" || ["id", "label", "w", "h"].includes(field.key)).map((field) => <PropertyField key={field.key} field={field} value={document[field.key]} onChange={(value) => updateMetadata(field, value)} />)}</div>
      </aside>
      <section className="area-editor-stage">
        <EditorCanvas document={document} ui={ui} catalogByFile={catalogByFile} previewIndex={previewIndex} hoverCell={hoverCell} onHover={(cell) => setHoverCell(cell && isCellInBounds(document, cell) ? cell : null)} onCell={handleCell} onStrokeStart={beginStroke} onStrokeMove={extendStroke} onStrokeEnd={endStroke} onWheel={(event) => { event.preventDefault(); setUi((current) => ({ ...current, zoom: Math.max(0.45, Math.min(2.5, current.zoom + (event.deltaY < 0 ? 0.1 : -0.1))) })); }} onPanStart={(event) => { panRef.current = { x: event.clientX, y: event.clientY, panX: ui.panX, panY: ui.panY }; event.currentTarget.setPointerCapture?.(event.pointerId); const move = (moveEvent) => setUi((current) => ({ ...current, panX: panRef.current.panX + moveEvent.clientX - panRef.current.x, panY: panRef.current.panY + moveEvent.clientY - panRef.current.y })); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); }} />
        {ui.rectangleStart && <div className="area-editor-hint">Choose the opposite rectangle corner.</div>}
        {status && <div className="area-editor-statusbar">{status}</div>}
      </section>
      <aside className="area-editor-sidebar area-editor-inspector">
        <h2>Asset catalog</h2><input type="search" placeholder="Search assets" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Asset category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{availableCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select><AssetCatalog assets={filteredCatalog.slice(0, 240)} selectedKey={ui.catalogAsset} onSelect={(asset) => setUi((current) => ({ ...current, catalogAsset: asset.key, tool: current.tool === "select" ? "paint" : current.tool }))} />
        <h2>Selection</h2>{ui.selectedCell && <p>Cell {ui.selectedCell.x}, {ui.selectedCell.y} · {cellCandidates.length} entities</p>}<div className="area-editor-cell-list">{cellCandidates.map((candidate) => <button type="button" key={`${candidate.layer}:${candidate.index}`} className={ui.selection?.layer === candidate.layer && ui.selection?.index === candidate.index ? "active" : ""} onClick={() => setUi((current) => ({ ...current, selection: candidate }))}>{candidate.layer}: {candidate.entry.id ?? candidate.entry.decayId ?? candidate.entry.type ?? candidate.entry.npcId}</button>)}</div>
        {selectedEntry && <><div className="area-editor-selection-actions"><button type="button" onClick={duplicateSelection} disabled={readOnly}>Duplicate</button><button type="button" onClick={deleteSelection} disabled={readOnly}>Delete</button></div><div className="area-editor-form">{schemaForLayer(ui.selection.layer, { entry: selectedEntry, document, catalog }).map((field) => <PropertyField key={field.key} field={field} value={selectedEntry[field.key]} onChange={(value) => updateSelected(field, value)} />)}</div><label><FieldLabel field={{ key: "advanced-properties", label: "Advanced properties JSON", description: "Rå JSON til understøttede avancerede runtime-egenskaber, som ikke har et særskilt felt. Apply fletter objektet ind i den valgte entry." }} /><textarea rows="10" value={advancedText} onChange={(event) => setAdvancedText(event.target.value)} /></label><button type="button" disabled={readOnly} onClick={() => { try { const parsed = JSON.parse(advancedText); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Advanced properties must be an object."); commit(updateEntity(document, ui.selection, parsed)); setStatus("Advanced properties applied."); } catch (error) { setStatus(`Invalid advanced properties: ${error.message}`); } }}>Apply advanced JSON</button></>}
        <h2>Validation</h2><div className="area-editor-validation">{validation.errors.map((issue, index) => <button type="button" key={`e${index}`} className="error" onClick={() => issue.path?.layer && setUi((current) => ({ ...current, activeLayer: issue.path.layer, selection: { layer: issue.path.layer, index: issue.path.index }, selectedCell: document[issue.path.layer]?.[issue.path.index] ? { x: document[issue.path.layer][issue.path.index].x, y: document[issue.path.layer][issue.path.index].y } : current.selectedCell }))}>{issue.message}</button>)}{validation.warnings.map((issue, index) => <p key={`w${index}`} className="warning">{issue.message}</p>)}{validation.canSave && <p className="valid">Runtime-compatible and safe to save.</p>}</div>
        {document.documentType === "blueprint" && <section><h2>Region usage / assignment</h2><p>Candidate order is authoritative: the first matching entry wins. No match, missing data, or an invalid matched blueprint uses procedural generation.</p>{blueprintUsages.length ? blueprintUsages.map(({ region, index }) => <p key={`${region.id}:${index}`}><b>{region.id}</b> candidate {index + 1}</p>) : <p>No handwritten region references discovered.</p>}<button type="button" onClick={() => navigator.clipboard?.writeText(`blueprints: [\n  { id: "${document.id}", questCompleted: "quest_id" },\n],`)}>Copy assignment snippet</button><div className="area-editor-form"><label>Active quests (comma separated)<input value={conditionPreviewCommon.activeQuests} onChange={(event) => setConditionPreviewCommon((current) => ({ ...current, activeQuests: event.target.value }))} /></label><label>Completed quests<input value={conditionPreviewCommon.completedQuests} onChange={(event) => setConditionPreviewCommon((current) => ({ ...current, completedQuests: event.target.value }))} /></label><label>World flags<input value={conditionPreviewCommon.flags} onChange={(event) => setConditionPreviewCommon((current) => ({ ...current, flags: event.target.value }))} /></label><label>Corruption<input type="number" value={conditionPreviewCommon.corruption} onChange={(event) => setConditionPreviewCommon((current) => ({ ...current, corruption: event.target.value }))} /></label><label>City threat<input type="number" value={conditionPreviewCommon.cityThreat} onChange={(event) => setConditionPreviewCommon((current) => ({ ...current, cityThreat: event.target.value }))} /></label></div><label>Advanced context JSON (quest steps, inventory, player, factions, kills, region state)<textarea rows="7" value={conditionPreviewText} onChange={(event) => setConditionPreviewText(event.target.value)} /></label><button type="button" onClick={() => { try { const preview = JSON.parse(conditionPreviewText); const regionConfig = blueprintUsages[0]?.region ?? null; const { worldState, context } = buildRegionConditionPreview(preview, conditionPreviewCommon, regionConfig); const candidate = blueprintUsages[0]?.candidate ?? { id: document.id }; const matched = worldEntryAllowed(candidate, worldState, context); setStatus(matched ? "Condition preview: matched." : "Condition preview: not matched."); } catch (error) { setStatus(`Condition preview: invalid condition context (${error.message}).`); } }}>Preview first usage condition</button></section>}
      </aside>
    </div>
  </main>;
}
