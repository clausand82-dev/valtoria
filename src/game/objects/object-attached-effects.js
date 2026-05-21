const DEFAULT_FRAME_WIDTH = 256;
const DEFAULT_FRAME_HEIGHT = 256;

export function resolveObjectSocketsForVariant({ objectDef, runtimeObject }) {
  const sockets = objectDef?.sockets;
  if (!sockets?.files || !runtimeObject) return {};

  const variant = Math.max(0, Math.floor(Number(runtimeObject.treeVariant ?? runtimeObject.variant ?? 0) || 0));
  const graphics = objectDef?.graphics ?? {};
  const files = graphicsFiles(graphics);
  const cols = positiveInt(sockets.cols ?? graphics.cols, 1);
  const rows = positiveInt(sockets.rows ?? graphics.rows, 1);
  const frameCount = positiveInt(graphics.frameCount, cols * rows);
  const fileIndex = files.length ? Math.floor(variant / frameCount) % files.length : 0;
  const fileName = runtimeObject.graphicsFileName ?? files[fileIndex] ?? graphics.fileName ?? null;
  const frameIndex = Number.isFinite(Number(runtimeObject.frameIndex))
    ? Math.max(0, Math.floor(Number(runtimeObject.frameIndex)))
    : variant % frameCount;
  if (!fileName) return {};

  const fileSockets = sockets.files[fileName] ?? sockets.files[stripAssetPrefix(fileName)] ?? null;
  if (!fileSockets) return {};

  const frameNumberBase = Number(sockets.frameNumberBase) === 1 ? 1 : 0;
  const frameSockets = fileSockets[frameIndex + frameNumberBase] ?? fileSockets[String(frameIndex + frameNumberBase)] ?? {};
  if (!frameSockets || typeof frameSockets !== "object") return {};

  const frameW = resolveFrameSize(sockets, "Width", cols);
  const frameH = resolveFrameSize(sockets, "Height", rows);
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols);
  const originX = col * frameW;
  const originY = row * frameH;

  const resolved = {};
  for (const [name, socket] of Object.entries(frameSockets)) {
    const x = Number(socket?.x);
    const y = Number(socket?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    resolved[name] = sockets.coordinateSpace === "sheet"
      ? { ...socket, name, x: x - originX, y: y - originY, sourceX: x, sourceY: y, frameIndex, fileName, frameW, frameH }
      : { ...socket, name, x, y, sourceX: x, sourceY: y, frameIndex, fileName, frameW, frameH };
  }
  return resolved;
}

export function resolveAttachedObjectEffects({ objectDef, runtimeObject, regionObjectConfig }) {
  const effects = Array.isArray(objectDef?.attachedEffects) ? objectDef.attachedEffects : [];
  if (!effects.length) return [];
  const sockets = resolveObjectSocketsForVariant({ objectDef, runtimeObject });
  if (!Object.keys(sockets).length) return [];

  const overrides = regionObjectConfig?.effects ?? runtimeObject?.effects ?? {};
  const resolved = [];
  for (const effect of effects) {
    const state = resolveEffectState(effect, overrides?.[effect.id]);
    if (!state.enabled) continue;
    const matches = matchingSockets(sockets, effect);
    if (!matches.length) continue;
    for (const [socketName, socket] of matches) {
      const finalScale = resolveFinalScale(objectDef, runtimeObject);
      const anchor = resolveAnchor(objectDef, runtimeObject, socket);
      const configuredOffset = effect.offset ?? {};
      const screenOffsetX = (socket.x - anchor.x) * finalScale + (Number(configuredOffset.x) || 0);
      const screenOffsetY = (socket.y - anchor.y) * finalScale + (Number(configuredOffset.y) || 0);
      resolved.push({
        ...state.settings,
        id: effect.id,
        type: effect.type,
        preset: effect.preset,
        socketName,
        socket,
        ownerId: runtimeObject?.id ?? null,
        offset: { x: Number(configuredOffset.x) || 0, y: Number(configuredOffset.y) || 0 },
        particleConfig: effect.type === "particle"
          ? {
              ...state.settings,
              type: effect.preset,
              offsetX: 0,
              offsetY: 0,
              screenOffsetX,
              screenOffsetY,
              socketSourceX: socket.sourceX,
              socketSourceY: socket.sourceY,
              socketFrameIndex: socket.frameIndex,
              socketFileName: socket.fileName,
              ...(state.settings.velocityScale !== undefined ? { velocityScale: state.settings.velocityScale } : {}),
              ownerId: runtimeObject?.id ?? null,
              socketName,
              attachedEffectId: effect.id,
            }
          : null,
      });
    }
  }
  return resolved;
}

export function resolveAttachedObjectParticleConfigs(args) {
  return resolveAttachedObjectEffects(args)
    .map((effect) => effect.particleConfig)
    .filter(Boolean);
}

function resolveEffectState(effect, override) {
  if (override === false) return { enabled: false, settings: {} };
  if (override === true) return { enabled: true, settings: {} };
  if (override && typeof override === "object" && !Array.isArray(override)) {
    const { enabled = effect.enabledByDefault === true, ...settings } = override;
    return { enabled: enabled !== false, settings };
  }
  return { enabled: effect.enabledByDefault === true, settings: {} };
}

function matchingSockets(sockets, effect) {
  if (effect.socket) {
    const socket = sockets[effect.socket];
    return socket ? [[effect.socket, socket]] : [];
  }
  if (effect.socketPrefix) {
    const prefix = String(effect.socketPrefix);
    return Object.entries(sockets).filter(([name]) => name.startsWith(prefix));
  }
  return [];
}

function resolveFinalScale(objectDef, runtimeObject) {
  const graphics = objectDef?.graphics ?? {};
  const renderScale = Number.isFinite(Number(graphics.renderScale)) ? Number(graphics.renderScale) : 1;
  const size = Number.isFinite(Number(runtimeObject?.size)) ? Number(runtimeObject.size) : 1;
  const visualScale = Number.isFinite(Number(runtimeObject?.visualScale)) ? Number(runtimeObject.visualScale) : 1;
  return getSheetObjectBaseScale(runtimeObject?.type) * size * visualScale * renderScale;
}

function resolveAnchor(objectDef, runtimeObject, socket) {
  const anchor = runtimeObject?.sortAnchor ?? objectDef?.sortAnchor ?? { x: 0.5, y: 1 };
  return {
    x: socket.frameW * clamp01(anchor.x),
    y: socket.frameH * clamp01(anchor.y),
  };
}

function resolveFrameSize(sockets, axis, cells) {
  const frameKey = `frame${axis}`;
  const imageKey = `image${axis}`;
  const frameSize = Number(sockets[frameKey]);
  if (Number.isFinite(frameSize) && frameSize > 0) return frameSize;
  const imageSize = Number(sockets[imageKey]);
  if (Number.isFinite(imageSize) && imageSize > 0) return imageSize / cells;
  return axis === "Width" ? DEFAULT_FRAME_WIDTH : DEFAULT_FRAME_HEIGHT;
}

function graphicsFiles(graphics) {
  return (Array.isArray(graphics?.files) ? graphics.files : [graphics?.fileName])
    .map((file) => String(file ?? "").trim())
    .filter(Boolean);
}

function stripAssetPrefix(fileName) {
  return String(fileName ?? "").replace(/^\/?assets\/generated\//, "");
}

function positiveInt(value, fallback) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function getSheetObjectBaseScale(type) {
  return type === "building" ? 0.58
    : type === "ruin" ? 0.54
      : type === "crystal" ? 0.46
        : type === "chest" ? 0.28
          : type === "firebeacon" ? 0.44
            : 0.4;
}
