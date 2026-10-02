import { drawShadow } from "./assets-ground.js";

export function drawHero(ctx, screen, hero, atlas, sheets) {
	drawAnimatedHeroSheet(ctx, screen, hero, sheets?.hero);
}

function drawAnimatedHeroSheet(ctx, screen, hero, sheets) {
	if (!sheets?.idle) return false;
	const view = visualDirection(hero.facingX, hero.facingY);
	const flipX = view.x < -0.05;
	const isDying = hero.hp <= 0;
	const deathAnimationDuration = 0.96;
	const deathFadeDuration = 1.04;
	const deathTime = Math.max(0, Number(hero.deadTimer) || 0);
	const speed = clamp01((hero.moveSpeed || 0) / 3.8);
	const attackProgress = hero.attackAnim > 0 ? 1 - hero.attackAnim / 0.24 : 0;
	const castProgress = hero.castAnim > 0 ? 1 - hero.castAnim / 0.38 : 0;
	const pickupProgress = hero.pickupAnim > 0 ? 1 - hero.pickupAnim / 0.48 : 0;
	let sheet = sheets.idle;
	let col = Math.floor(hero.time * 4.5) % 8;

	if (isDying) {
		sheet = sheets.die ?? sheets.idle;
		col = Math.min(7, Math.floor((deathTime / deathAnimationDuration) * 8));
	} else if (hero.attackAnim > 0) {
		sheet = sheets.melee ?? sheets.idle;
		col = Math.min(7, Math.floor(attackProgress * 8));
	} else if (hero.castAnim > 0) {
		sheet = sheets.ranged ?? sheets.idle;
		col = Math.min(7, Math.floor(castProgress * 8));
	} else if (hero.pickupAnim > 0) {
		sheet = sheets.pickup ?? sheets.idle;
		col = Math.min(7, Math.floor(pickupProgress * 8));
	} else if (hero.moving) {
		sheet = sheets.walk ?? sheets.idle;
		col = Math.floor((hero.gait / (Math.PI * 2)) * 8) % 8;
	}

	// The test sheets already share a common ground line, so avoid adding a
	// procedural vertical bob on top of their own animation.
	const bob = 0;
	const attack = hero.attackAnim > 0 ? Math.sin((hero.attackAnim / 0.24) * Math.PI) : 0;
	const cast = hero.castAnim > 0 ? Math.sin((hero.castAnim / 0.38) * Math.PI) : 0;
	const activeRow = 0;
	const baseScale = 0.58;

	const deathFade = isDying
		? Math.max(0, 1 - Math.max(0, deathTime - deathAnimationDuration) / deathFadeDuration)
		: 1;
	drawShadow(ctx, screen.x, screen.y + 17, 29 + speed * 7, 11 + speed * 2, 0.42 * deathFade, hero.shadow);
	drawSheetFrame(ctx, sheet, activeRow, col, screen.x, screen.y + 30 + bob, {
		scale: baseScale,
		flipX,
		alpha: deathFade,
		rawCell: false,
	});
	if (!isDying && attack > 0.2) drawSlashArc(ctx, screen.x + view.x * 34 + attack * view.x * 12, screen.y - 37 + view.y * 12, view.x || 1, view.y);
	if (!isDying && cast > 0.1) drawCastingRing(ctx, screen.x, screen.y - 35, cast);
	return true;
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
	ctx.restore();
	return true;
}

function drawSlashArc(ctx, x, y, facingX, facingY) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(Math.atan2(facingY, facingX));
	ctx.strokeStyle = "rgba(245, 218, 150, 0.9)";
	ctx.lineWidth = 5;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.arc(0, 0, 32, -0.75, 0.75);
	ctx.stroke();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(0, 0, 38, -0.45, 0.55);
	ctx.stroke();
	ctx.restore();
}

function drawCastingRing(ctx, x, y, amount) {
	ctx.save();
	ctx.globalAlpha = 0.35 * amount;
	ctx.strokeStyle = "#8bdfff";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.ellipse(x, y, 34 + amount * 16, 14 + amount * 6, 0, 0, Math.PI * 2);
	ctx.stroke();
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
