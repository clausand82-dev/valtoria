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
  next[selection.layer][selection.index] = { ...next[selection.layer][selection.index], ...cloneEditorValue(patch) };
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
