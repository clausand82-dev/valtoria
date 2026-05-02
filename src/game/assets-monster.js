import { drawShadow } from "./assets-ground.js";

const tintCache = new WeakMap();

export function drawMonster(ctx, screen, monster, atlas, time = 0, sheets) {
	if (drawAnimatedMonsterSheet(ctx, screen, monster, time, sheets?.monsters)) {
		drawMonsterHealth(ctx, screen, monster, monster.elite ? 58 : 52);
	}
}

function drawAnimatedMonsterSheet(ctx, screen, monster, time, monsters) {
	if (!monsters) return false;

	const monsterId = monster.typeName === "Scorpion" ? "scorpion"
		: monster.typeName === "Snake" ? "snake"
		: monster.typeName === "Spider" ? "spider"
		: monster.typeName === "MiniSpider" ? "minispider"
		: monster.typeName === "MediumSpider" ? "mediumspider"
		: monster.typeName === "LargeSpider" ? "largespider"
		: monster.typeName === "Wolf" ? "wolf"
		: monster.typeName === "Skeleton" ? "skeleton"
		: monster.typeName === "Ghost" ? "ghost"
		: monster.typeName === "Demon" ? "demon"
		: monster.typeName.includes("Bone") ? "skeleton"
		: monster.typeName.includes("Warden") ? "skeleton"
		: monster.typeName.includes("Shade") ? "ghost"
		: "demon";
	const entry = monsters[monsterId];
	if (!entry) return false;

	const { sheet, cfg } = entry;
	const view = visualDirection(monster.facingX, monster.facingY);
	const flipX = view.x > 0.05;
	const ghost = monsterId === "ghost";

	const attackProgress = monster.attackAnim > 0 ? 1 - monster.attackAnim / 0.24 : 0;
	let seq = cfg.sequences.find((s) => s.name === "idle");
	if (monster.attackAnim > 0) {
		seq = cfg.sequences.find((s) => s.name === "attack") ?? seq;
	} else if (monster.moving) {
		seq = cfg.sequences.find((s) => s.name === "walk") ?? seq;
	}
	const colStart = seq.colStart ?? 0;
	let col;
	if (seq.name === "attack") {
		col = colStart + Math.min(seq.frames - 1, Math.floor(attackProgress * seq.frames));
	} else if (seq.name === "walk") {
		col = colStart + (Math.floor((monster.gait / (Math.PI * 2)) * seq.frames) % seq.frames);
	} else {
		col = colStart + (Math.floor(time * 3.8 + monster.animSeed) % seq.frames);
	}

	const attack = monster.attackAnim > 0 ? Math.sin((monster.attackAnim / 0.24) * Math.PI) : 0;
	const hurt = monster.hurt > 0 ? Math.sin((monster.hurt / 0.18) * Math.PI) : 0;
	const bob = ghost ? Math.sin(time * 2.4 + monster.animSeed) * 7
		: monster.moving ? -Math.abs(Math.sin(monster.gait)) * 3
		: Math.sin(time * monster.breathSpeed + monster.animSeed) * 1.2;
	const scale = cfg.scale * (monster.visualScale || 1);

	drawShadow(ctx, screen.x, screen.y + (cfg.shadowY ?? 17), cfg.shadowW, cfg.shadowH, cfg.shadowAlpha);
	drawSheetFrame(ctx, sheet, seq.row, col, screen.x, screen.y + cfg.yOffset + bob, {
		scale,
		flipX,
		alpha: ghost ? 0.86 + Math.sin(time * 3 + monster.animSeed) * 0.08 : 1,
		tint: monster.elite?.color,
		tintAlpha: monster.elite?.tintAlpha,
		stabilize: true,
		rawCell: false,
		anchor: sheet.sequenceAnchors?.[seq.row]?.[0],
	});
	if (hurt > 0.05) drawHitFlash(ctx, screen.x, screen.y - 34, 40 + monster.radius * 34, hurt);
	if (attack > 0.18 && !ghost) drawClawSwipe(ctx, screen.x + view.x * 31, screen.y - 28 + view.y * 10, view.x || 1);
	return true;
}

function drawMonsterHealth(ctx, screen, monster, width) {
	if (monster.hp >= monster.maxHp) return;
	ctx.fillStyle = "rgba(0,0,0,0.68)";
	ctx.fillRect(screen.x - width / 2, screen.y - 72, width, 5);
	ctx.fillStyle = "#d8313d";
	ctx.fillRect(screen.x - width / 2, screen.y - 72, width * (monster.hp / monster.maxHp), 5);
}

function drawSheetFrame(ctx, sheet, row, col, x, y, options = {}) {
	if (!sheet?.canvas) return false;
	const cell = sheet.cells?.[row]?.[col];
	const useRawCell = options.rawCell;
	const source = useRawCell ? sheet.canvas : (cell?.sprite ?? sheet.canvas);
	const anchor = options.stabilize ? options.anchor ?? cell?.anchor ?? sheet.anchors?.[row] : null;
	const sx = useRawCell ? (cell ? cell.x : col * sheet.cellW) : (cell?.sprite ? 0 : (cell ? cell.x : col * sheet.cellW));
	const sy = useRawCell ? (cell ? cell.y : row * sheet.cellH) : (cell?.sprite ? 0 : (cell ? cell.y : row * sheet.cellH));
	const sw = useRawCell ? cell?.w ?? sheet.cellW : (cell?.sprite ? cell.sprite.width : cell?.w ?? sheet.cellW);
	const sh = useRawCell ? cell?.h ?? sheet.cellH : (cell?.sprite ? cell.sprite.height : cell?.h ?? sheet.cellH);
	const scale = options.scale ?? 1;
	const width = (options.width ?? sw) * scale;
	const height = (options.height ?? sh) * scale;
	const anchorX = options.anchorX ?? 0.5;
	const anchorY = options.anchorY ?? 1;
	const dx = anchor ? -(anchor.x - (useRawCell ? 0 : cell?.spriteOffsetX ?? 0)) * scale : -width * anchorX;
	const dy = anchor ? -(anchor.y - (useRawCell ? 0 : cell?.spriteOffsetY ?? 0)) * scale : -height * anchorY;
	ctx.save();
	ctx.translate(x, y);
	if (options.rotation) ctx.rotate(options.rotation);
	ctx.scale((options.flipX ? -1 : 1) * (options.scaleX ?? 1), options.scaleY ?? 1);
	if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
	ctx.drawImage(source, sx, sy, sw, sh, dx, dy, width, height);
	if (options.tint && options.tintAlpha > 0) {
		const overlay = getTintOverlay(source, sx, sy, sw, sh, options.tint);
		ctx.globalAlpha *= options.tintAlpha;
		ctx.drawImage(overlay, dx, dy, width, height);
	}
	ctx.restore();
	return true;
}

function getTintOverlay(source, sx, sy, sw, sh, color) {
	let sourceCache = tintCache.get(source);
	if (!sourceCache) {
		sourceCache = new Map();
		tintCache.set(source, sourceCache);
	}
	const key = `${sx},${sy},${sw},${sh},${color}`;
	const cached = sourceCache.get(key);
	if (cached) return cached;

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.ceil(sw));
	canvas.height = Math.max(1, Math.ceil(sh));
	const ctx = canvas.getContext("2d");
	ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
	ctx.globalCompositeOperation = "source-atop";
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	sourceCache.set(key, canvas);
	return canvas;
}

function drawClawSwipe(ctx, x, y, facingX) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(facingX < 0 ? -1 : 1, 1);
	ctx.strokeStyle = "rgba(255, 104, 84, 0.75)";
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	for (let i = 0; i < 3; i += 1) {
		ctx.beginPath();
		ctx.moveTo(-12, -12 + i * 9);
		ctx.quadraticCurveTo(10, -22 + i * 9, 31, -4 + i * 9);
		ctx.stroke();
	}
	ctx.restore();
}

function drawHitFlash(ctx, x, y, radius, amount) {
	ctx.save();
	ctx.globalAlpha = 0.24 * amount;
	ctx.fillStyle = "#ffd6cf";
	ctx.beginPath();
	ctx.ellipse(x, y, radius, radius * 0.85, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function visualDirection(x, y) {
	const sx = x - y;
	const sy = (x + y) * 0.55;
	const len = Math.hypot(sx, sy) || 1;
	return { x: sx / len, y: sy / len };
}

function clamp01(value) {
	return Math.max(0, Math.min(1, value));
}

