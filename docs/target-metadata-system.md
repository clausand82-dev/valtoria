# Valtoria Target Metadata System

Valtoria supports gradual metadata on combat targets and damage sources:

- `factionId`: social, political, or lore group. Factions are centrally defined in `src/game/config/faction-config.js` because they can drive reputation, conditions, unlocks, UI, and combat matching.
- `speciesId`: precise species/type match key. It is intentionally free-form; unknown species must not crash runtime. Add known labels to `src/game/config/species-config.js` when UI should show a friendly name.
- `tags`: flexible labels for combat, materials, magic, bestiary, lore, and object types. Unknown tags must not crash runtime, but shared tags should be reused from `src/game/config/tag-config.js`.

`lydra` and `netdra` tags are only combat/source metadata. They do not replace the existing world balance keys such as `worldBalanceLydra`, `worldBalanceNetdra`, `killLydra`, or `killNetdra`.

## Target Syntax

Items, spells, and effects can opt into explicit targets:

```js
target: ["monster", "critter", "object:wood"]
```

Supported forms:

- `"monster"`, `"critter"`, `"npc"`, `"player"` match target types.
- `"object:any"` matches any destructible object.
- `"object:wood"` matches destructible objects with the `wood` tag.

Non-destructible objects are never damageable through this system.

## Bonus Syntax

Conditional offensive damage bonuses are written as:

```js
bonus: [
  ["tag:small", +2],
  ["species:spider", "25%"],
  ["faction:nethrendor_regime", "10%"]
]
```

Number values are flat damage. Percent strings multiply damage, and matching percent bonuses stack multiplicatively. Flat target bonuses are applied before percent target bonuses. Existing defensive stats such as `fireResist`, `iceResist`, `poisonResist`, and `allResist` still apply after offensive bonuses.

## Backward Compatibility

- Monsters, critters, NPCs, player, and objects without metadata normalize to empty tags and no faction/species.
- Weapons without `target` keep old behavior: monsters, critters, and destructible objects.
- Spells without `target` keep old behavior and do not gain object damage.
- Weapon effects without `target` keep old behavior for monsters and critters.
- Saves without `factionRep` are normalized with defaults from `FACTIONS`.

## Examples

Normal sword:

```js
{
  id: "plain_sword",
  slot: "weapon",
  mode: "melee",
  // No target/bonus fields: uses legacy weapon behavior.
}
```

Spiderbane weapon:

```js
{
  id: "spiderbane",
  target: ["monster", "critter"],
  bonus: [["species:spider", "25%"], ["tag:small", +2]]
}
```

Woodcutter axe:

```js
{
  id: "woodcutter_axe",
  target: ["object:wood", "object:tree"],
  bonus: [["tag:wood", "50%"], ["tag:tree", "50%"]]
}
```

Add `"monster"` and `"critter"` to `target` if the axe should also work as a normal weapon.

Fireball damaging wood/web objects:

```js
{
  id: "fireball",
  element: "fire",
  tags: ["magic", "projectile", "aoe", "fire"],
  target: ["monster", "critter", "object:wood", "object:plant", "object:web"],
  bonus: [["tag:wood", "50%"], ["tag:plant", "50%"], ["tag:web", "100%"], ["tag:stone", "-75%"]]
}
```

Nethrendor banner:

```js
{
  id: "object_nethrendor_banner",
  destructible: true,
  factionId: "nethrendor_regime",
  tags: ["object", "destructible", "cloth", "banner", "symbol", "nethrendor"],
  onDestroyed: {
    factionRep: {
      nethrendor_regime: -5,
      eldiria_court: +2
    }
  }
}
```

Spider mob:

```js
{
  id: "small_spider",
  speciesId: "spider",
  factionId: "wilds",
  tags: ["beast", "wildlife", "small", "poison"]
}
```
