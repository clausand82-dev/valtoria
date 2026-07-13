import { cloneEditorValue } from "./editor-document.js";

export function createEditorHistory(initialDocument, maxEntries = 80) {
  return { past: [], present: cloneEditorValue(initialDocument), future: [], maxEntries };
}

export function commitEditorHistory(history, nextDocument) {
  if (JSON.stringify(history.present) === JSON.stringify(nextDocument)) return history;
  return {
    ...history,
    past: [...history.past, cloneEditorValue(history.present)].slice(-history.maxEntries),
    present: cloneEditorValue(nextDocument),
    future: [],
  };
}

export function undoEditorHistory(history) {
  if (!history.past.length) return history;
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: cloneEditorValue(history.past[history.past.length - 1]),
    future: [cloneEditorValue(history.present), ...history.future].slice(0, history.maxEntries),
  };
}

export function redoEditorHistory(history) {
  if (!history.future.length) return history;
  return {
    ...history,
    past: [...history.past, cloneEditorValue(history.present)].slice(-history.maxEntries),
    present: cloneEditorValue(history.future[0]),
    future: history.future.slice(1),
  };
}
