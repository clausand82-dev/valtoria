const wallImagePromises = new Map();

export function loadTileEdgeWallImage(fileName) {
  const safeFileName = String(fileName ?? "").trim();
  if (!safeFileName || typeof Image === "undefined") return Promise.resolve(null);

  const url = `/assets/generated/${safeFileName}`;
  if (wallImagePromises.has(url)) return wallImagePromises.get(url);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.warn(`[tile-edge-walls] Unable to load ${url}; wall rendering disabled.`);
      resolve(null);
    };
    image.src = url;
  });
  wallImagePromises.set(url, promise);
  return promise;
}
