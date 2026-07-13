import { importHandwrittenPrefab, serializeEditorDocument, editorDocumentFromGenerated } from "./editor-document.js";

export function openGeneratedPrefab(prefab) {
  return editorDocumentFromGenerated(prefab);
}

export function importPrefabAsCopy(prefab, id) {
  return importHandwrittenPrefab(prefab, id);
}

export function editorDocumentToRuntimePrefab(document) {
  const output = serializeEditorDocument(document);
  delete output.tiles;
  delete output.legend;
  return output;
}
