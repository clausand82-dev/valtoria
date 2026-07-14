import { cloneEditorValue } from "./editor-document.js";

export function ensureGroundPaletteEntry(document, asset) {
  const palette = document.ground?.palette ?? [];
  const index = palette.findIndex((entry) => entry?.fileName === asset.fileName && Number(entry.variant) === Number(asset.variant));
  if (index >= 0) return { document, paletteIndex: index };
  const next = cloneEditorValue(document);
  next.ground ??= { palette: [], rows: [] };
  next.ground.palette.push({ fileName: asset.fileName, variant: Number(asset.variant) });
  return { document: next, paletteIndex: next.ground.palette.length - 1 };
}

function ensurePaletteEntry(document, layer, asset) {
  if (layer === "ground") return ensureGroundPaletteEntry(document, asset);
  const palette = document[layer]?.palette ?? []; const index = palette.findIndex((entry) => entry?.fileName === asset.fileName && Number(entry.variant) === Number(asset.variant));
  if (index >= 0) return { document, paletteIndex: index };
  const next = cloneEditorValue(document); next[layer] ??= { palette: [], rows: [] }; next[layer].palette.push({ fileName: asset.fileName, variant: Number(asset.variant) });
  return { document: next, paletteIndex: next[layer].palette.length - 1 };
}

export function paintGroundCell(document, x, y, asset) {
  const ensured = ensureGroundPaletteEntry(document, asset);
  const next = cloneEditorValue(ensured.document);
  next.ground.rows[y][x] = ensured.paletteIndex;
  return next;
}

export function eraseGroundCell(document, x, y) {
  const next = cloneEditorValue(document);
  next.ground.rows[y][x] = null;
  return next;
}

export function rectangleCells(a, b) {
  const cells = [];
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y += 1) for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x += 1) cells.push({ x, y });
  return cells;
}

export function paintGroundRectangle(document, a, b, asset) {
  return rectangleCells(a, b).reduce((next, cell) => paintGroundCell(next, cell.x, cell.y, asset), document);
}

export function fillGround(document, start, asset) {
  const target = document.ground.rows[start.y][start.x] ?? null;
  const ensured = ensureGroundPaletteEntry(document, asset);
  if (target === ensured.paletteIndex) return ensured.document;
  const next = cloneEditorValue(ensured.document);
  const queue = [start];
  const visited = new Set();
  while (queue.length) {
    const cell = queue.shift();
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key) || cell.x < 0 || cell.y < 0 || cell.x >= next.w || cell.y >= next.h) continue;
    visited.add(key);
    if ((next.ground.rows[cell.y][cell.x] ?? null) !== target) continue;
    next.ground.rows[cell.y][cell.x] = ensured.paletteIndex;
    queue.push({ x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 });
  }
  return next;
}

export function placeEntity(document, layer, x, y, template) {
  const next = cloneEditorValue(document);
  next[layer] = [...(next[layer] ?? []), { ...cloneEditorValue(template), x, y }];
  return { document: next, selection: { layer, index: next[layer].length - 1 } };
}

export function updateEntity(document, selection, patch) {
  const next = cloneEditorValue(document);
  if (!next[selection?.layer]?.[selection?.index]) return document;
  const entry = next[selection.layer][selection.index];
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value === undefined) delete entry[key];
    else entry[key] = cloneEditorValue(value);
  }
  return next;
}

export function deleteEntity(document, selection) {
  const next = cloneEditorValue(document);
  if (!next[selection?.layer]?.[selection?.index]) return document;
  next[selection.layer].splice(selection.index, 1);
  return next;
}

export function duplicateEntity(document, selection) {
  const entry = document[selection?.layer]?.[selection?.index];
  if (!entry) return { document, selection };
  const x = Math.min(document.w - 1, Number(entry.x) + 1);
  const y = Math.min(document.h - 1, Number(entry.y) + 1);
  return placeEntity(document, selection.layer, x, y, entry);
}

export function applyEditorBrushStroke(document, { layer, cells = [], mode = "paint", asset = null } = {}) {
  let next = document; let selection = null;
  const uniqueCells = [...new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell])).values()]
    .filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < document.w && cell.y < document.h);
  for (const cell of uniqueCells) {
    if (layer === "ground") next = mode === "erase" ? eraseGroundCell(next, cell.x, cell.y) : asset ? paintGroundCell(next, cell.x, cell.y, asset) : next;
    else if (layer === "playableMask") { next = cloneEditorValue(next); next.playableMask.rows[cell.y][cell.x] = mode !== "erase"; }
    else if (layer === "water") { next = cloneEditorValue(next); if (mode === "erase") next.water.rows[cell.y][cell.x] = null; else if (asset) { const ensured = ensurePaletteEntry(next, "water", asset); next = cloneEditorValue(ensured.document); next.water.rows[cell.y][cell.x] = ensured.paletteIndex; } }
    else if (layer === "start") { next = cloneEditorValue(next); next.start = mode === "erase" ? null : { x: cell.x, y: cell.y }; selection = { layer: "start", index: 0 }; }
    else if (layer === "exits") { next = cloneEditorValue(next); if (mode === "erase") next.exits = (next.exits ?? []).filter((entry) => Number(entry.x) !== cell.x || Number(entry.y) !== cell.y); else if (!(next.exits ?? []).some((entry) => Number(entry.x) === cell.x && Number(entry.y) === cell.y)) { next.exits = [...(next.exits ?? []), { id: next.exits?.length ? `exit_${next.exits.length + 1}` : "primary", x: cell.x, y: cell.y, primary: !(next.exits?.length) }]; selection = { layer: "exits", index: next.exits.length - 1 }; } }
    else if (mode === "erase") {
      const index = (next[layer] ?? []).map((entry, index) => ({ entry, index })).filter(({ entry }) => Number(entry.x) === cell.x && Number(entry.y) === cell.y).pop()?.index;
      if (index !== undefined) next = deleteEntity(next, { layer, index });
    } else if (asset?.template) {
      const identity = asset.template.id ?? asset.template.decayId ?? asset.template.type ?? asset.template.npcId;
      const exists = (next[layer] ?? []).some((entry) => Number(entry.x) === cell.x && Number(entry.y) === cell.y && (entry.id ?? entry.decayId ?? entry.type ?? entry.npcId) === identity);
      if (!exists) { const result = placeEntity(next, layer, cell.x, cell.y, asset.template); next = result.document; selection = result.selection; }
    }
  }
  return { document: next, selection, cells: uniqueCells };
}

export function fillEditorLayer(document, layer, start, asset = null) {
  if (layer === "ground") return fillGround(document, start, asset);
  if (!["playableMask", "water"].includes(layer)) return document;
  const rows = layer === "playableMask" ? document.playableMask.rows : document.water.rows;
  const target = rows[start.y][start.x] ?? null; const cells = []; const seen = new Set(); const queue = [start];
  while (queue.length) { const cell = queue.shift(); const key = `${cell.x},${cell.y}`; if (seen.has(key) || cell.x < 0 || cell.y < 0 || cell.x >= document.w || cell.y >= document.h) continue; seen.add(key); if ((rows[cell.y][cell.x] ?? null) !== target) continue; cells.push(cell); queue.push({ x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 }); }
  return applyEditorBrushStroke(document, { layer, cells, mode: "paint", asset }).document;
}
