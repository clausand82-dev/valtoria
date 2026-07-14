# Valtoria area editor

The Area Editor is a local-development tool available from main-menu Settings on `localhost`, `127.0.0.1`, or IPv6 loopback. It is dynamically loaded only in Vite development mode. Production builds and previews contain neither its UI nor its write middleware.

## Prefabs and full-area blueprints

A prefab is a bounded reusable placement that procedural generation can rotate, mirror, and place through `prefabRules`. Existing handwritten direct-array and `tiles`/`legend` prefabs remain supported. Editor-managed prefabs live in `src/game/config/generated-prefabs`; handwritten sources are never rewritten.

A full-area blueprint supplies a region's physical map: dimensions, playable mask, exact optional ground and water cells, start, primary/additional exits, reservations, and content layers. Broader region configuration—identity, localization, music, weather, level rules, world-map relationships, and gameplay effects—continues to come from the region config. Editor-managed blueprints live in `src/game/config/generated-blueprints`.

Both document types retain canonical JSON as their editable source and deterministic JavaScript modules for runtime registration. Unknown editor metadata and supported instance properties survive round trips.

## Creating and editing

Open Settings → Area Editor. The document browser can create, open, duplicate, delete, download, or import editor documents. Handwritten prefabs can be previewed read-only or imported as canonical editor-managed copies. Existing generated documents save in place; “Save as copy” creates a distinct ID.

Both document types share the isometric/top-down canvas, visual variant catalog, drag brushes, rectangle/fill/eyedropper tools, selection, move, copy/paste, and undo history. Blueprint-specific layers are playable mask, ground, water, start, exits, decals, foliage, objects, monsters, NPCs, and chests. Exactly one start and primary exit are required, and validation checks playable connectivity.

## Region assignment and priority

Blueprint candidates are declared on a normal region configuration. Entries are evaluated from top to bottom with `worldEntryAllowed`; the first matching valid blueprint wins:

```js
blueprints: [
  {
    id: "village_destroyed",
    cityStat: {
      cityThreat: 100,
    },
  },
  {
    id: "village_under_siege",
    cityStat: {
      cityThreat: { gte: 50 },
    },
  },
  {
    id: "village_rebuilt",
    questCompleted: "rebuild_the_village",
  },
],
```

Order matters. Put narrow/high-priority states before broad states. An unconditional entry makes later candidates unreachable. If the list is absent or empty, no condition matches, or a matched reference is missing/invalid, the existing procedural generator is used automatically. A matched missing or invalid high-priority entry does not fall through to a lower-priority blueprint.

The editor's Region usage panel discovers handwritten references, reports candidate order, previews common/advanced world-state context through the actual condition evaluator, and provides a copy-ready assignment snippet. It does not rewrite handwritten region files.

## Runtime and safety

Blueprint entity content uses the same instance creation/default paths as prefabs. Ground and water are supplied before chunk tiles and content are created. Runtime ignores editor metadata.

The development middleware accepts only fixed generated-prefab and generated-blueprint endpoints. IDs are sanitized, documents are validated, output is deterministic, and writes stay within the two generated directories. Requests require a local Host, a loopback client connection, and a matching local Origin when Origin is present. Starting Vite with `--host 0.0.0.0` does not make the write API usable remotely.

Live non-persistent GameEngine blueprint sessions are intentionally not provided yet: the structural preview uses runtime normalization and validation without risking normal save slots. Additional exits are retained in documents, while current travel behavior uses the primary exit.
