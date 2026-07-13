import { EDITOR_LAYERS } from "./editor-document.js";

export function createEditorUiState(document) {
  return {
    tool: "select",
    activeLayer: "ground",
    view: document?.editor?.lastView === "topdown" ? "topdown" : "isometric",
    zoom: Number(document?.editor?.zoom) || 1,
    panX: Number(document?.editor?.panX) || 0,
    panY: Number(document?.editor?.panY) || 0,
    visibility: Object.fromEntries(EDITOR_LAYERS.map((layer) => [layer, !(document?.editor?.hiddenLayers ?? []).includes(layer)])),
    locked: Object.fromEntries(EDITOR_LAYERS.map((layer) => [layer, (document?.editor?.lockedLayers ?? []).includes(layer)])),
    selection: null,
    selectedCell: null,
    rectangleStart: null,
    catalogAsset: null,
    clipboard: null,
  };
}

export function persistEditorView(document, ui) {
  return {
    ...document,
    editor: {
      ...document.editor,
      lastView: ui.view,
      zoom: ui.zoom,
      panX: ui.panX,
      panY: ui.panY,
      hiddenLayers: EDITOR_LAYERS.filter((layer) => ui.visibility[layer] === false),
      lockedLayers: EDITOR_LAYERS.filter((layer) => ui.locked[layer] === true),
    },
  };
}
