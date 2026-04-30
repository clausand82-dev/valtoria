import { drawShadow } from "./assets-ground.js";

export function drawHero(ctx, screen, hero, atlas, sheets) {
	drawAnimatedHeroSheet(ctx, screen, hero, sheets?.hero, sheets?.heroCast);
}

function drawAnimatedHeroSheet(ctx, screen, hero, sheet, castSheet) {
	if (!sheet) return false;
	const view = visualDirection(hero.facingX, hero.facingY);
	const flipX = view.x < -0.05;
	const speed = clamp01((hero.moveSpeed || 0) / 3.8);
	const attackProgress = hero.attackAnim > 0 ? 1 - hero.attackAnim / 0.24 : 0;
	const castProgress = hero.castAnim > 0 ? 1 - hero.castAnim / 0.38 : 0;
	let row = 0;
	let col = Math.floor(hero.time * 4.5) % 8;

	if (hero.attackAnim > 0) {
		row = 2;
		col = Math.min(7, Math.floor(attackProgress * 8));
	} else if (hero.castAnim > 0) {
		row = 3;
		col = Math.min(7, Math.floor(castProgress * 8));
	} else if (hero.moving) {
		row = 1;
		col = Math.floor((hero.gait / (Math.PI * 2)) * 8) % 8;
	}

	const bob = row === 3
		? 0
		: (hero.moving ? -Math.abs(Math.sin(hero.gait)) * 3 : Math.sin(hero.time * 2.4) * 1.2);
	const attack = hero.attackAnim > 0 ? Math.sin((hero.attackAnim / 0.24) * Math.PI) : 0;
	const cast = hero.castAnim > 0 ? Math.sin((hero.castAnim / 0.38) * Math.PI) : 0;
	const isCasting = row === 3;
	const activeSheet = isCasting ? (castSheet ?? sheet) : sheet;
	const activeRow = isCasting ? 0 : row;
	const heroAnchor = activeSheet.sequenceAnchors?.[activeRow]?.[0];
	const idleAnchor = sheet.sequenceAnchors?.[0]?.[0];
	const castCellSprite = isCasting ? activeSheet.cells?.[activeRow]?.[col]?.sprite : null;
	const baseScale = 0.58;
	const castScaleRatio = isCasting && castSheet ? sheet.cellH / castSheet.cellH : 1;
	const finalScale = baseScale * castScaleRatio;
	const drawAnchor = isCasting && castSheet && heroAnchor && idleAnchor
		? {
			x: (castCellSprite?.width ?? heroAnchor.x * 2) * 0.5,
			y: idleAnchor.y / castScaleRatio,
		}
		: heroAnchor;

	drawShadow(ctx, screen.x, screen.y + 17, 29 + speed * 7, 11 + speed * 2, 0.42);
	drawSheetFrame(ctx, activeSheet, activeRow, col, screen.x, screen.y + 30 + bob, {
		scale: finalScale,
		flipX,
		stabilize: true,
		rawCell: false,
		anchor: drawAnchor,
	});
	if (attack > 0.2) drawSlashArc(ctx, screen.x + view.x * 34 + attack * view.x * 12, screen.y - 37 + view.y * 12, view.x || 1, view.y);
	if (cast > 0.1) drawCastingRing(ctx, screen.x, screen.y - 35, cast);
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
