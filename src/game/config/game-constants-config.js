export const TILE_W = 104;
export const TILE_H = 52;
export const CHUNK_SIZE = 16;
export const WORLD_SEED = 7341;
export const GAME_VERSION = "1.11";

export const INVENTORY_COLUMNS = 7;
export const INVENTORY_ROWS = 7;
export const MAX_INVENTORY = INVENTORY_COLUMNS * INVENTORY_ROWS;

// Locks are applied from the bottom of the backpack, in declaration order.
export const INVENTORY_SLOT_LOCKS = [
	{ requiredLevel: 15, slotCount: INVENTORY_COLUMNS },
	{ requiredLevel: 30, slotCount: INVENTORY_COLUMNS },
];

export function inventoryUnlockedSlotCount(level = 1) {
	const currentLevel = Math.max(1, Math.floor(Number(level) || 1));
	let lockedSlots = 0;
	for (const entry of INVENTORY_SLOT_LOCKS) {
		const requiredLevel = Math.max(1, Math.floor(Number(entry?.requiredLevel) || 1));
		const slotCount = Math.max(0, Math.floor(Number(entry?.slotCount) || 0));
		if (currentLevel < requiredLevel) lockedSlots += slotCount;
	}
	return Math.max(0, MAX_INVENTORY - lockedSlots);
}

export function inventorySlotRequiredLevel(slotIndex) {
	const index = Math.floor(Number(slotIndex));
	if (!Number.isInteger(index) || index < 0 || index >= MAX_INVENTORY) return null;
	let end = MAX_INVENTORY;
	for (let i = INVENTORY_SLOT_LOCKS.length - 1; i >= 0; i -= 1) {
		const entry = INVENTORY_SLOT_LOCKS[i];
		const slotCount = Math.max(0, Math.floor(Number(entry?.slotCount) || 0));
		const start = Math.max(0, end - slotCount);
		if (index >= start && index < end) {
			return Math.max(1, Math.floor(Number(entry?.requiredLevel) || 1));
		}
		end = start;
	}
	return null;
}
