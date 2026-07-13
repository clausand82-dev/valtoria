import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalization } from "../../i18n/index.js";
import { PREFAB_CONTENT_LAYERS } from "../../game/world/prefabs/prefab-normalization.js";
import { buildAreaEditorAssetCatalog, filterAssetCatalog } from "./asset-catalog.js";
import { deleteEditorPrefab, downloadEditorDocument, listEditorPrefabs, readEditorJsonFile, saveEditorPrefab } from "./editor-api.js";
import { createEditorHistory, commitEditorHistory, redoEditorHistory, undoEditorHistory } from "./editor-history.js";
import { createEditorDocument, cloneEditorValue, editorDocumentFingerprint, EDITOR_LAYERS, resizeEditorDocument, resizeImpact } from "./editor-document.js";
import { createEditorUiState, persistEditorView } from "./editor-state.js";
import { isCellInBounds, pointerToGrid, gridToIsometric, gridToTopDown, ISO_TILE_H, ISO_TILE_W, TOP_TILE_SIZE } from "./editor-renderer.js";
import { entitiesAtCell, cycleCellSelection } from "./editor-selection.js";
import { deleteEntity, duplicateEntity, eraseGroundCell, fillGround, paintGroundCell, paintGroundRectangle, placeEntity, updateEntity } from "./editor-tools.js";
import { PREFAB_PROPERTY_SCHEMA, schemaForLayer } from "./property-schemas.js";
import { editorDocumentToRuntimePrefab, importPrefabAsCopy, openGeneratedPrefab } from "./prefab-document-adapter.js";
import { validateEditorDocument } from "./editor-validation.js";
import "./area-editor.css";

const LAYER_LABELS = { ground: "Ground", decals: "Decay / decals", foliage: "Foliage", objects: "Objects", monsters: "Monsters", npcs: "NPCs", chests: "Chests" };
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
  if (layer !== "ground") return document[layer]?.length ?? 0;
  return document.ground?.rows?.reduce((sum, row) => sum + row.filter((cell) => cell !== null && cell !== undefined).length, 0) ?? 0;
}

function fieldValue(value, field) {
  if (field.type === "checkbox") return Boolean(value);
  return value ?? "";
}

function PropertyField({ field, value, onChange }) {
  if (field.type === "checkbox") return <label className="area-editor-check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{field.label}</label>;
  if (field.type === "select") return <label>{field.label}<select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  return <label>{field.label}<input type={field.type} min={field.min} max={field.max} step={field.step} value={fieldValue(value, field)} onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)} /></label>;
}

function DocumentBrowser({ data, onNew, onOpenGenerated, onPreviewHandwritten, onImport, onDuplicate, onDelete, onImportJson, onClose, status }) {
  const { t } = useLocalization();
  const fileRef = useRef(null);
  return <main className="area-editor-home" data-testid="area-editor-home">
    <header><div><span className="area-editor-kicker">{t("areaEditor.devOnly")}</span><h1>{t("areaEditor.title")}</h1><p>{t("areaEditor.browserHelp")}</p></div><button type="button" onClick={onClose}>{t("areaEditor.returnSettings")}</button></header>
    <div className="area-editor-home-actions">
      <button type="button" onClick={onNew}>{t("areaEditor.newPrefab")}</button>
      <button type="button" onClick={() => fileRef.current?.click()}>{t("areaEditor.importJson")}</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportJson(file); event.target.value = ""; }} />
    </div>
    {status && <p className="area-editor-status">{status}</p>}
    {(data?.invalid?.length ?? 0) > 0 && <section className="area-editor-errors"><h2>Generated files that could not be loaded</h2>{data.invalid.map((entry) => <p key={entry.id}><b>{entry.id}</b>: {entry.message}</p>)}</section>}
    <section><h2>{t("areaEditor.managedPrefabs")}</h2><div className="area-editor-doc-grid">
      {(data?.generated ?? []).map((document) => <article key={document.id}><div><strong>{document.label || document.id}</strong><code>{document.id}</code><small>{document.w}×{document.h} · schema {document.schemaVersion ?? 1} · editor-managed · valid</small></div><div><button type="button" onClick={() => onOpenGenerated(document)}>Open</button><button type="button" onClick={() => onDuplicate(document)}>Duplicate</button><button type="button" className="danger-action" onClick={() => onDelete(document)}>Delete</button></div></article>)}
      {!(data?.generated?.length) && <p>No editor-managed prefabs yet.</p>}
    </div></section>
    <section><h2>{t("areaEditor.handwrittenPrefabs")}</h2><p>Handwritten prefabs are read-only. Import one to edit a canonical direct-array copy.</p><div className="area-editor-doc-grid">
      {(data?.handwritten ?? []).map((document) => <article key={document.id}><div><strong>{document.label || document.id}</strong><code>{document.id}</code><small>{document.w}×{document.h} · handwritten · read-only</small></div><div><button type="button" onClick={() => onPreviewHandwritten(document)}>Preview</button><button type="button" onClick={() => onImport(document)}>Import as copy</button></div></article>)}
    </div></section>
  </main>;
}

function EditorCanvas({ document, ui, catalogByKey, onCell, onHover, hoverCell, onPanStart, onWheel }) {
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
  const entities = PREFAB_CONTENT_LAYERS.flatMap((layer) => ui.visibility[layer] === false ? [] : (document[layer] ?? []).map((entry, index) => ({ layer, entry, index }))).sort((a, b) => (Number(a.entry.x) + Number(a.entry.y)) - (Number(b.entry.x) + Number(b.entry.y)) || PREFAB_CONTENT_LAYERS.indexOf(a.layer) - PREFAB_CONTENT_LAYERS.indexOf(b.layer));
  return <svg className="area-editor-canvas" viewBox={`0 0 ${width} ${height}`} onPointerDown={(event) => handlePointer(event, (cell, original) => original.button === 1 || ui.tool === "pan" ? onPanStart(original) : onCell(cell))} onPointerMove={(event) => handlePointer(event, onHover)} onPointerLeave={() => onHover(null)} onWheel={onWheel} data-testid="area-editor-canvas">
    <rect width={width} height={height} fill="#11171a" />
    {cells.map((cell) => {
      const pos = point(cell.x, cell.y);
      const overrideIndex = document.ground?.rows?.[cell.y]?.[cell.x];
      const selected = ui.selectedCell?.x === cell.x && ui.selectedCell?.y === cell.y;
      const hovered = hoverCell?.x === cell.x && hoverCell?.y === cell.y;
      if (ui.view === "topdown") return <rect key={`${cell.x},${cell.y}`} x={pos.x} y={pos.y} width={tileW} height={tileH} fill={overrideIndex === null || overrideIndex === undefined ? "#1c2927" : `hsl(${(overrideIndex * 47) % 360} 35% 32%)`} stroke={selected ? "#ffe08a" : hovered ? "#ffffff" : "#38504b"} strokeWidth={selected || hovered ? 3 : 1} />;
      const points = `${pos.x},${pos.y} ${pos.x + tileW / 2},${pos.y + tileH / 2} ${pos.x},${pos.y + tileH} ${pos.x - tileW / 2},${pos.y + tileH / 2}`;
      return <polygon key={`${cell.x},${cell.y}`} points={points} fill={overrideIndex === null || overrideIndex === undefined ? "#1c2927" : `hsl(${(overrideIndex * 47) % 360} 35% 32%)`} stroke={selected ? "#ffe08a" : hovered ? "#ffffff" : "#38504b"} strokeWidth={selected || hovered ? 3 : 1} />;
    })}
    {entities.map(({ layer, entry, index }) => {
      const pos = point(Number(entry.x), Number(entry.y));
      const selected = ui.selection?.layer === layer && ui.selection?.index === index;
      const assetId = entry.id ?? entry.decayId ?? entry.type ?? entry.npcId;
      const asset = [...catalogByKey.values()].find((candidate) => candidate.layer === layer && candidate.id === assetId);
      const cx = ui.view === "topdown" ? pos.x + tileW / 2 : pos.x;
      const cy = ui.view === "topdown" ? pos.y + tileH / 2 : pos.y + tileH / 2;
      return <g key={`${layer}:${index}`} pointerEvents="none">
        <circle cx={cx} cy={cy} r={selected ? 16 : 12} fill={LAYER_COLORS[layer]} stroke={selected ? "#fff2a8" : "#0a0d0e"} strokeWidth={selected ? 4 : 2} />
        {asset?.previewUrl && <image href={asset.previewUrl} x={cx - 12} y={cy - 24} width="24" height="24" preserveAspectRatio="xMidYMid meet" />}
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">{layer.slice(0, 1).toUpperCase()}</text>
      </g>;
    })}
    <text x="16" y="24" fill="#9eb0ad" fontSize="13">{ui.view} · zoom {ui.zoom.toFixed(2)} · {document.w}×{document.h}</text>
  </svg>;
}

export default function AreaEditorPage({ onClose }) {
  const { t } = useLocalization();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const document = history?.present ?? null;
  const [ui, setUi] = useState(null);
  const [savedFingerprint, setSavedFingerprint] = useState(null);
  const [originalId, setOriginalId] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [hoverCell, setHoverCell] = useState(null);
  const [advancedText, setAdvancedText] = useState("{}");
  const panRef = useRef(null);
  const catalog = useMemo(buildAreaEditorAssetCatalog, []);
  const catalogByKey = useMemo(() => new Map(catalog.map((entry) => [entry.key, entry])), [catalog]);
  const dirty = Boolean(document && savedFingerprint !== editorDocumentFingerprint(persistEditorView(document, ui)));
  const allIds = useMemo(() => [...(data?.generated ?? []), ...(data?.handwritten ?? [])].map((entry) => entry.id), [data]);
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

  const newDocument = () => {
    const id = uniqueCopyId("new_prefab", allIds);
    openDocument(createEditorDocument({ id, label: "New Prefab" }), { dirty: true });
  };
  const importHandwritten = (prefab) => {
    const id = uniqueCopyId(prefab.id, allIds);
    openDocument(importPrefabAsCopy(prefab, id), { dirty: true, message: `Imported read-only prefab "${prefab.id}" as canonical copy "${id}".` });
  };
  const duplicateManaged = (prefab) => {
    const id = uniqueCopyId(prefab.id, allIds);
    openDocument(createEditorDocument({ ...cloneEditorValue(prefab), id, label: `${prefab.label ?? prefab.id} Copy`, editor: { ...prefab.editor, managed: true, duplicatedFrom: prefab.id } }), { dirty: true });
  };

  const save = async (asCopy = false) => {
    if (readOnly || !document) return;
    let target = persistEditorView(document, ui);
    let previous = originalId;
    if (asCopy) {
      const proposed = window.prompt("Save copy as prefab ID", uniqueCopyId(document.id, allIds));
      if (!proposed) return;
      target = { ...target, id: proposed, label: `${target.label} Copy`, editor: { ...target.editor, duplicatedFrom: document.id } };
      previous = null;
    }
    const check = validateEditorDocument(target, allIds, previous);
    if (!check.canSave) { setStatus(check.errors.map((entry) => entry.message).join(" · ")); return; }
    try {
      const payload = await saveEditorPrefab(editorDocumentToRuntimePrefab(target), previous);
      const opened = openGeneratedPrefab(payload.document);
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

  const selectedEntry = document && ui?.selection ? document[ui.selection.layer]?.[ui.selection.index] : null;
  useEffect(() => { setAdvancedText(JSON.stringify(selectedEntry ?? {}, null, 2)); }, [selectedEntry]);

  const deleteSelection = useCallback(() => {
    if (!document || !ui.selection || readOnly) return;
    commit(deleteEntity(document, ui.selection));
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

  if (!document) return <DocumentBrowser data={data} status={status} onClose={onClose} onNew={newDocument} onOpenGenerated={(prefab) => openDocument(openGeneratedPrefab(prefab), { originalId: prefab.id })} onPreviewHandwritten={(prefab) => openDocument(importPrefabAsCopy(prefab, prefab.id), { readOnly: true, originalId: null, message: "Read-only normalized preview. Import as a copy to edit." })} onImport={importHandwritten} onDuplicate={duplicateManaged} onDelete={async (prefab) => { if (!window.confirm(`Delete generated prefab "${prefab.id}"?`)) return; try { await deleteEditorPrefab(prefab.id); await refresh(); } catch (error) { setStatus(error.message); } }} onImportJson={async (file) => { try { const imported = createEditorDocument(await readEditorJsonFile(file)); const id = allIds.includes(imported.id) ? uniqueCopyId(imported.id, allIds) : imported.id; openDocument({ ...imported, id }, { dirty: true }); } catch (error) { setStatus(error.message); } }} />;

  const availableCategories = [...new Set(catalog.filter((entry) => entry.layer === ui.activeLayer).map((entry) => entry.category))];
  const filteredCatalog = filterAssetCatalog(catalog, { layer: ui.activeLayer, search, category });
  const selectedCatalog = ui.catalogAsset ? catalogByKey.get(ui.catalogAsset) : null;
  const cellCandidates = ui.selectedCell ? entitiesAtCell(document, ui.selectedCell.x, ui.selectedCell.y, ui.visibility) : [];

  const handleCell = (cell) => {
    if (!isCellInBounds(document, cell)) return;
    setUi((current) => ({ ...current, selectedCell: cell }));
    if (readOnly) {
      const next = cycleCellSelection(entitiesAtCell(document, cell.x, cell.y, ui.visibility), ui.selection);
      setUi((current) => ({ ...current, selection: next }));
      return;
    }
    if (ui.locked[ui.activeLayer] || ui.visibility[ui.activeLayer] === false) return;
    if (ui.tool === "select") { const next = cycleCellSelection(entitiesAtCell(document, cell.x, cell.y, ui.visibility), ui.selection); setUi((current) => ({ ...current, selection: next })); return; }
    if (ui.tool === "eyedropper") {
      if (ui.activeLayer === "ground") { const index = document.ground.rows[cell.y][cell.x]; const entry = document.ground.palette[index]; if (entry) { const found = catalog.find((asset) => asset.layer === "ground" && asset.fileName === entry.fileName && asset.variant === entry.variant); if (found) setUi((current) => ({ ...current, catalogAsset: found.key, tool: "paint" })); } }
      else { const foundEntity = entitiesAtCell(document, cell.x, cell.y, ui.visibility).filter((entry) => entry.layer === ui.activeLayer).pop(); if (foundEntity) { const id = foundEntity.entry.id ?? foundEntity.entry.decayId ?? foundEntity.entry.type ?? foundEntity.entry.npcId; const found = catalog.find((asset) => asset.layer === ui.activeLayer && asset.id === id); if (found) setUi((current) => ({ ...current, catalogAsset: found.key, tool: "paint", selection: foundEntity })); } }
      return;
    }
    if (ui.tool === "move" && ui.selection) { commit(updateEntity(document, ui.selection, cell)); return; }
    if (ui.tool === "erase") {
      if (ui.activeLayer === "ground") commit(eraseGroundCell(document, cell.x, cell.y));
      else { const target = entitiesAtCell(document, cell.x, cell.y, ui.visibility).filter((entry) => entry.layer === ui.activeLayer).pop(); if (target) commit(deleteEntity(document, target)); }
      return;
    }
    if (ui.tool === "rectangle") {
      if (!ui.rectangleStart) { setUi((current) => ({ ...current, rectangleStart: cell })); return; }
      if (ui.activeLayer === "ground" && selectedCatalog) commit(paintGroundRectangle(document, ui.rectangleStart, cell, selectedCatalog));
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
    if (ui.tool === "fill" && ui.activeLayer === "ground" && selectedCatalog) { commit(fillGround(document, cell, selectedCatalog)); return; }
    if (ui.tool === "paint" && selectedCatalog) {
      if (ui.activeLayer === "ground") commit(paintGroundCell(document, cell.x, cell.y, selectedCatalog));
      else { const result = placeEntity(document, ui.activeLayer, cell.x, cell.y, selectedCatalog.template); commit(result.document); setUi((current) => ({ ...current, selection: result.selection })); }
    }
  };

  const updateMetadata = (field, value) => {
    if (readOnly) return;
    if (["w", "h"].includes(field.key)) {
      const impact = resizeImpact(document, field.key === "w" ? value : document.w, field.key === "h" ? value : document.h);
      if (impact.total > 0 && !window.confirm(`Shrinking removes ${impact.groundCells} ground overrides and ${impact.entities} entities. Continue?`)) return;
      commit(resizeEditorDocument(document, impact.w, impact.h));
    } else commit({ ...document, [field.key]: value });
  };
  const updateSelected = (field, value) => { if (!readOnly) commit(updateEntity(document, ui.selection, { [field.key]: value })); };

  return <main className="area-editor-page" data-testid="area-editor-page">
    <header className="area-editor-topbar"><div><button type="button" onClick={closeDocument}>← Documents</button><strong>{document.label || document.id}</strong>{dirty && <span className="area-editor-dirty">Modified</span>}{readOnly && <span>Read-only preview</span>}</div><div><button type="button" onClick={() => setHistory(undoEditorHistory)} disabled={!history.past.length || readOnly}>Undo</button><button type="button" onClick={() => setHistory(redoEditorHistory)} disabled={!history.future.length || readOnly}>Redo</button><button type="button" onClick={() => downloadEditorDocument(editorDocumentToRuntimePrefab(persistEditorView(document, ui)))}>Download JSON</button><button type="button" onClick={() => save(true)} disabled={readOnly}>Save as copy</button><button type="button" onClick={() => save(false)} disabled={readOnly || !validation.canSave}>Save</button></div></header>
    <div className="area-editor-toolbar">
      {TOOLS.map((tool) => <button type="button" key={tool} className={ui.tool === tool ? "active" : ""} onClick={() => setUi((current) => ({ ...current, tool, rectangleStart: null }))}>{tool}</button>)}
      <span className="area-editor-separator" />
      <button type="button" className={ui.view === "isometric" ? "active" : ""} onClick={() => setUi((current) => ({ ...current, view: "isometric" }))}>Isometric</button>
      <button type="button" className={ui.view === "topdown" ? "active" : ""} onClick={() => setUi((current) => ({ ...current, view: "topdown" }))}>Top-down</button>
      <button type="button" onClick={() => setUi((current) => ({ ...current, zoom: Math.max(0.45, current.zoom - 0.1) }))}>−</button><button type="button" onClick={() => setUi((current) => ({ ...current, zoom: Math.min(2.5, current.zoom + 0.1) }))}>+</button>
    </div>
    <div className="area-editor-layout">
      <aside className="area-editor-sidebar area-editor-layers"><h2>Layers</h2>{EDITOR_LAYERS.map((layer) => <div key={layer} className={ui.activeLayer === layer ? "active" : ""}><button type="button" onClick={() => { setCategory("all"); setUi((current) => ({ ...current, activeLayer: layer, selection: null })); }}>{LAYER_LABELS[layer]} <b>{countLayer(document, layer)}</b></button><label title="Visible"><input type="checkbox" checked={ui.visibility[layer]} onChange={(event) => setUi((current) => ({ ...current, visibility: { ...current.visibility, [layer]: event.target.checked } }))} />V</label><label title="Locked"><input type="checkbox" checked={ui.locked[layer]} onChange={(event) => setUi((current) => ({ ...current, locked: { ...current.locked, [layer]: event.target.checked } }))} />L</label></div>)}
        <button type="button" onClick={() => setUi((current) => ({ ...current, visibility: Object.fromEntries(EDITOR_LAYERS.map((layer) => [layer, layer === current.activeLayer])) }))}>Show only active</button>
        <button type="button" className="danger-action" disabled={readOnly} onClick={() => { if (!window.confirm(`Clear ${LAYER_LABELS[ui.activeLayer]}?`)) return; if (ui.activeLayer === "ground") commit({ ...document, ground: { ...document.ground, rows: document.ground.rows.map((row) => row.map(() => null)) } }); else commit({ ...document, [ui.activeLayer]: [] }); }}>Clear layer</button>
        <h2>Prefab</h2><div className="area-editor-form">{PREFAB_PROPERTY_SCHEMA.map((field) => <PropertyField key={field.key} field={field} value={document[field.key]} onChange={(value) => updateMetadata(field, value)} />)}</div>
      </aside>
      <section className="area-editor-stage">
        <EditorCanvas document={document} ui={ui} catalogByKey={catalogByKey} hoverCell={hoverCell} onHover={(cell) => setHoverCell(cell && isCellInBounds(document, cell) ? cell : null)} onCell={handleCell} onWheel={(event) => { event.preventDefault(); setUi((current) => ({ ...current, zoom: Math.max(0.45, Math.min(2.5, current.zoom + (event.deltaY < 0 ? 0.1 : -0.1))) })); }} onPanStart={(event) => { panRef.current = { x: event.clientX, y: event.clientY, panX: ui.panX, panY: ui.panY }; event.currentTarget.setPointerCapture?.(event.pointerId); const move = (moveEvent) => setUi((current) => ({ ...current, panX: panRef.current.panX + moveEvent.clientX - panRef.current.x, panY: panRef.current.panY + moveEvent.clientY - panRef.current.y })); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); }} />
        {ui.rectangleStart && <div className="area-editor-hint">Choose the opposite rectangle corner.</div>}
        {status && <div className="area-editor-statusbar">{status}</div>}
      </section>
      <aside className="area-editor-sidebar area-editor-inspector">
        <h2>Asset catalog</h2><input type="search" placeholder="Search assets" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="Asset category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{availableCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select><div className="area-editor-catalog">{filteredCatalog.slice(0, 180).map((asset) => <button type="button" key={asset.key} className={ui.catalogAsset === asset.key ? "active" : ""} onClick={() => setUi((current) => ({ ...current, catalogAsset: asset.key, tool: current.tool === "select" ? "paint" : current.tool }))}>{asset.previewUrl ? <img src={asset.previewUrl} alt="" /> : <span>?</span>}<small>{asset.label}</small><em>{asset.variantCount} variant{asset.variantCount === 1 ? "" : "s"}</em></button>)}</div>
        <h2>Selection</h2>{ui.selectedCell && <p>Cell {ui.selectedCell.x}, {ui.selectedCell.y} · {cellCandidates.length} entities</p>}<div className="area-editor-cell-list">{cellCandidates.map((candidate) => <button type="button" key={`${candidate.layer}:${candidate.index}`} className={ui.selection?.layer === candidate.layer && ui.selection?.index === candidate.index ? "active" : ""} onClick={() => setUi((current) => ({ ...current, selection: candidate }))}>{candidate.layer}: {candidate.entry.id ?? candidate.entry.decayId ?? candidate.entry.type ?? candidate.entry.npcId}</button>)}</div>
        {selectedEntry && <><div className="area-editor-selection-actions"><button type="button" onClick={duplicateSelection} disabled={readOnly}>Duplicate</button><button type="button" onClick={deleteSelection} disabled={readOnly}>Delete</button></div><div className="area-editor-form">{schemaForLayer(ui.selection.layer).map((field) => <PropertyField key={field.key} field={field} value={selectedEntry[field.key]} onChange={(value) => updateSelected(field, value)} />)}</div><label>Advanced properties JSON<textarea rows="10" value={advancedText} onChange={(event) => setAdvancedText(event.target.value)} /></label><button type="button" disabled={readOnly} onClick={() => { try { const parsed = JSON.parse(advancedText); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Advanced properties must be an object."); commit(updateEntity(document, ui.selection, parsed)); setStatus("Advanced properties applied."); } catch (error) { setStatus(`Invalid advanced properties: ${error.message}`); } }}>Apply advanced JSON</button></>}
        <h2>Validation</h2><div className="area-editor-validation">{validation.errors.map((issue, index) => <button type="button" key={`e${index}`} className="error" onClick={() => issue.path?.layer && setUi((current) => ({ ...current, activeLayer: issue.path.layer, selection: { layer: issue.path.layer, index: issue.path.index }, selectedCell: document[issue.path.layer]?.[issue.path.index] ? { x: document[issue.path.layer][issue.path.index].x, y: document[issue.path.layer][issue.path.index].y } : current.selectedCell }))}>{issue.message}</button>)}{validation.warnings.map((issue, index) => <p key={`w${index}`} className="warning">{issue.message}</p>)}{validation.canSave && <p className="valid">Runtime-compatible and safe to save.</p>}</div>
      </aside>
    </div>
  </main>;
}
