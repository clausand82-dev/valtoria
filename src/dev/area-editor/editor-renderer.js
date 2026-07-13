export const ISO_TILE_W = 64;
export const ISO_TILE_H = 32;
export const TOP_TILE_SIZE = 42;

export function gridToIsometric(x, y, view = {}) {
  const zoom = Number(view.zoom) || 1;
  const originX = Number(view.originX) || 0;
  const originY = Number(view.originY) || 0;
  return {
    x: originX + (x - y) * (ISO_TILE_W * zoom) / 2,
    y: originY + (x + y) * (ISO_TILE_H * zoom) / 2,
  };
}

export function isometricToGrid(screenX, screenY, view = {}) {
  const zoom = Number(view.zoom) || 1;
  const dx = (screenX - (Number(view.originX) || 0)) / ((ISO_TILE_W * zoom) / 2);
  const dy = (screenY - (Number(view.originY) || 0)) / ((ISO_TILE_H * zoom) / 2);
  return { x: Math.floor((dx + dy) / 2), y: Math.floor((dy - dx) / 2) };
}

export function gridToTopDown(x, y, view = {}) {
  const size = TOP_TILE_SIZE * (Number(view.zoom) || 1);
  return { x: (Number(view.originX) || 0) + x * size, y: (Number(view.originY) || 0) + y * size };
}

export function topDownToGrid(screenX, screenY, view = {}) {
  const size = TOP_TILE_SIZE * (Number(view.zoom) || 1);
  return { x: Math.floor((screenX - (Number(view.originX) || 0)) / size), y: Math.floor((screenY - (Number(view.originY) || 0)) / size) };
}

export function pointerToGrid(screenX, screenY, mode, view) {
  return mode === "topdown" ? topDownToGrid(screenX, screenY, view) : isometricToGrid(screenX, screenY, view);
}

export function isCellInBounds(document, cell) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < document.w && cell.y < document.h;
}
