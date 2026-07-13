import { HANDWRITTEN_MAP_PREFABS } from "../../game/config/map-prefab-config.js";

const API_ROOT = "/__valtoria-dev/area-editor/prefabs";

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message ?? payload.message ?? `Editor API failed (${response.status})`);
  return payload;
}

export async function listEditorPrefabs() {
  const payload = await parseResponse(await fetch(API_ROOT, { headers: { Accept: "application/json" } }));
  return { ...payload, handwritten: Object.values(HANDWRITTEN_MAP_PREFABS) };
}

export async function saveEditorPrefab(document, previousId = null) {
  return parseResponse(await fetch(API_ROOT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document, previousId }) }));
}

export async function deleteEditorPrefab(id) {
  return parseResponse(await fetch(`${API_ROOT}/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export function downloadEditorDocument(editorDocument) {
  const blob = new Blob([`${JSON.stringify(editorDocument, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${editorDocument.id || "prefab"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readEditorJsonFile(file) {
  return JSON.parse(await file.text());
}
