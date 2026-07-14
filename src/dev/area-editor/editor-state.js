import { editorLayersForDocument } from "./editor-document.js";

export function createEditorUiState(document) {
  const layers = editorLayersForDocument(document);
  return {
    tool: "select",
    activeLayer: "ground",
    view: document?.editor?.lastView === "topdown" ? "topdown" : "isometric",
    zoom: Number(document?.editor?.zoom) || 1,
    panX: Number(document?.editor?.panX) || 0,
    panY: Number(document?.editor?.panY) || 0,
    visibility: Object.fromEntries(layers.map((layer) => [layer, !(document?.editor?.hiddenLayers ?? []).includes(layer)])),
    locked: Object.fromEntries(layers.map((layer) => [layer, (document?.editor?.lockedLayers ?? []).includes(layer)])),
    selection: null,
    selectedCell: null,
    rectangleStart: null,
    catalogAsset: null,
    clipboard: null,
  };
}

export function persistEditorView(document, ui) {
  const layers = editorLayersForDocument(document);
  return {
    ...document,
    editor: {
      ...document.editor,
      lastView: ui.view,
      zoom: ui.zoom,
      panX: ui.panX,
      panY: ui.panY,
      hiddenLayers: layers.filter((layer) => ui.visibility[layer] === false),
      lockedLayers: layers.filter((layer) => ui.locked[layer] === true),
    },
  };
}
