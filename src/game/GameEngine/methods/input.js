import { distance, screenToWorld, DESTRUCTIBLE_OBJECT_ATTACK_RANGE } from "../dependencies.js";
import { preventDefault } from "../helpers.js";

export const inputMethods = {
  setInputLocked(locked) {
    this.inputLocked = Boolean(locked);
    if (!this.inputLocked) return;
    this.keys.clear();
    this.pointer.down = false;
    this.player.target = null;
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
  },

  setReadableMergeStation(stationId) {
    const station = String(stationId ?? "backpack");
    this.readableMergeStation = station || "backpack";
  },

  handlePointerMove(event) {
    if (this.inputLocked) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = event.clientX - rect.left;
    this.pointer.y = event.clientY - rect.top;
    const world = screenToWorld(this.pointer.x, this.pointer.y, this.camera);
    this.pointer.worldX = world.x;
    this.pointer.worldY = world.y;
    const hovered = this.monsterAtScreen(this.pointer.x, this.pointer.y);
    const hoverMonsterId = hovered?.id ?? null;
    if (hoverMonsterId !== this.hoverMonsterId) {
      this.hoverMonsterId = hoverMonsterId;
      this.publishSnapshot();
    }
  },

  handlePointerLeave() {
    if (this.inputLocked) return;
    if (!this.hoverMonsterId) return;
    this.hoverMonsterId = null;
    this.publishSnapshot();
  },

  handlePointerDown(event) {
    if (this.inputLocked) return;
    this.handlePointerMove(event);
    if (event.button === 2) {
      event.preventDefault();
      this.castSpellAt(this.pointer.worldX, this.pointer.worldY);
      return;
    }
    this.pointer.down = true;
    const monster = this.monsterAtScreen(this.pointer.x, this.pointer.y);
    if (monster) {
      this.player.attackTargetId = monster.id;
      this.player.attackObjectId = null;
      const stats = this.calcStats();
      if (distance(this.player, monster) <= stats.range + monster.radius) {
        this.primaryAttack(monster);
      } else {
        this.player.target = { x: monster.x, y: monster.y };
      }
      return;
    }
    const object = this.objectAtScreen(this.pointer.x, this.pointer.y);
    if (object) {
      this.player.attackTargetId = null;
      this.player.attackObjectId = object.id;
      if (distance(this.player, object) <= DESTRUCTIBLE_OBJECT_ATTACK_RANGE + object.radius) {
        this.primaryAttack(object);
      } else {
        this.player.target = { x: object.x, y: object.y };
      }
      return;
    }
    const questgiver = this.questgiverAtScreen(this.pointer.x, this.pointer.y);
    if (questgiver) {
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      this.player.target = { x: questgiver.x, y: questgiver.y };
      return;
    }
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.player.target = { x: this.pointer.worldX, y: this.pointer.worldY };
  },

  handlePointerUp() {
    if (this.inputLocked) return;
    this.pointer.down = false;
  },

  handleKeyDown(event) {
    if (this.inputLocked) return;
    const key = event.key.toLowerCase();
    this.keys.add(key);
    if (key === " ") {
      event.preventDefault();
      this.primaryAttack();
    }
    if (key === "1") {
      event.preventDefault();
      this.usePotion("health");
    }
    if (key === "2") {
      event.preventDefault();
      this.usePotion("mana");
    }
    if (key === "q") {
      const target = this.nearestMonster(7);
      this.castSpellAt(target ? target.x : this.pointer.worldX, target ? target.y : this.pointer.worldY);
    }
    if (key === "e" && this.nearbyQuestgiver) {
      event.preventDefault();
      this.publishSnapshot();
    }
  },

  handleKeyUp(event) {
    if (this.inputLocked) return;
    this.keys.delete(event.key.toLowerCase());
  }
};
