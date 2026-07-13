import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const assets = path.join(dist, "assets");
const assetNames = fs.readdirSync(assets);
assert.equal(assetNames.some((name) => /AreaEditor|area-editor/i.test(name)), false, "production must not emit an editor chunk");
const emittedText = [fs.readFileSync(path.join(dist, "index.html"), "utf8"), ...assetNames.filter((name) => /\.(?:js|css)$/.test(name)).map((name) => fs.readFileSync(path.join(assets, name), "utf8"))].join("\n");
assert.equal(emittedText.includes("/__valtoria-dev/area-editor"), false, "production assets must not contain the save API");
assert.equal(emittedText.includes("area-editor-page"), false, "production CSS/UI must not contain the editor page");
console.log("[production-editor-guard] OK", { editorChunk: false, saveApi: false, editorCss: false });
