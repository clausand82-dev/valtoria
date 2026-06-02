export function isRegionDebugShortcut(event, enabled) {
  return Boolean(
    enabled
    && event?.ctrlKey
    && event?.shiftKey
    && String(event?.key ?? "").toLowerCase() === "d"
  );
}
