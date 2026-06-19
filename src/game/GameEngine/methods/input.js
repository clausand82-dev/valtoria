import { distance, screenToWorld, DESTRUCTIBLE_OBJECT_ATTACK_RANGE } from "../dependencies.js";
import { preventDefault } from "../helpers.js";

export const inputMethods = {
  setInputLocked(locked) {
    this.inputLocked = Boolean(locked);
    if (!this.inputLocked) return;
    this.keys.clear();
    this.pointer.down = false;
    this.pointer.rightDown = false;
    this.stopHeldSpell?.();
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
    if (hovered) this.markMobSeen?.(hovered.typeName);
    if (hoverMonsterId !== this.hoverMonsterId) {
      this.hoverMonsterId = hoverMonsterId;
      this.markRenderDirty?.("hover-monster");
      this.publishSnapshot();
    }
  },

  handlePointerLeave() {
    if (this.inputLocked) return;
    if (!this.hoverMonsterId) return;
    this.hoverMonsterId = null;
    this.markRenderDirty?.("pointer-leave");
    this.publishSnapshot();
  },

  handlePointerDown(event) {
    if (this.inputLocked) return;
    this.handlePointerMove(event);
    if (event.button === 2) {
      event.preventDefault();
      this.pointer.rightDown = true;
      this.startHeldSpell?.(this.player.activeSpellId, "pointer");
      this.markRenderDirty?.("pointer-down");
      return;
    }
    this.pointer.down = true;
    const monster = this.monsterAtScreen(this.pointer.x, this.pointer.y);
    if (monster) {
      this.markMobSeen?.(monster.typeName);
      this.player.attackTargetId = monster.id;
      this.player.attackObjectId = null;
      const stats = this.calcStats();
      if (distance(this.player, monster) <= stats.range + monster.radius) {
        this.primaryAttack(monster);
      } else {
        this.player.target = { x: monster.x, y: monster.y };
      }
      this.markRenderDirty?.("player-target");
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
      this.markRenderDirty?.("player-target");
      return;
    }
    const questgiver = this.questgiverAtScreen(this.pointer.x, this.pointer.y);
    if (questgiver) {
      this.player.attackTargetId = null;
      this.player.attackObjectId = null;
      this.player.target = { x: questgiver.x, y: questgiver.y };
      this.markRenderDirty?.("player-target");
      return;
    }
    this.player.attackTargetId = null;
    this.player.attackObjectId = null;
    this.player.target = { x: this.pointer.worldX, y: this.pointer.worldY };
    this.markRenderDirty?.("player-target");
  },

  handlePointerUp(event) {
    if (this.inputLocked) return;
    if (!event || event.button === 2) {
      this.pointer.rightDown = false;
      this.stopHeldSpell?.();
      this.markRenderDirty?.("pointer-up");
    }
    this.pointer.down = false;
  },

  handleKeyDown(event) {
    if (this.inputLocked) return;
    const key = event.key.toLowerCase();
    const wasDown = this.keys.has(key);
    this.keys.add(key);
    if (!wasDown) this.markRenderDirty?.("key-down");
    if (key === " " && !wasDown) {
      event.preventDefault();
      this.primaryAttack();
    }
    if (key === "1" && !wasDown) {
      event.preventDefault();
      this.activateQuickSlot("1");
    }
    if (key === "2" && !wasDown) {
      event.preventDefault();
      this.activateQuickSlot("2");
    }
    if (key === "3" && !wasDown) {
      event.preventDefault();
      this.activateQuickSlot("3");
    }
    if (key === "4" && !wasDown) {
      event.preventDefault();
      this.activateQuickSlot("4");
    }
    if (key === "q" && !wasDown) {
      event.preventDefault();
      this.startHeldSpell?.(this.player.activeSpellId, "nearest");
    }
    if (key === "e") {
      if (this.nearbyQuestgiver) {
        event.preventDefault();
        this.publishSnapshot();
      } else if (this.nearbyActionTarget) {
        event.preventDefault();
        this.interactNearbyAction();
      } else if (this.nearbyFoliageLoot) {
        event.preventDefault();
        this.lootNearbyFoliage();
      }
    }
    if (key === "tab" && this.nearbyActionTarget?.targetCount > 1) {
      event.preventDefault();
      this.cycleNearbyActionTarget(event.shiftKey ? -1 : 1);
    }
  },

  handleKeyUp(event) {
    if (this.inputLocked) return;
    const key = event.key.toLowerCase();
    const wasDown = this.keys.delete(key);
    if (wasDown) this.markRenderDirty?.("key-up");
    if (["3", "4", "q"].includes(key)) {
      const slot = this.normalizeQuickSlots?.()[key];
      if (key === "q") this.stopHeldSpell?.(this.player.activeSpellId);
      else if (slot?.kind === "spell") this.stopHeldSpell?.(slot.id);
    }
  }
};
