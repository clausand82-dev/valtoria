export const LOCAL_DEV_HOSTNAMES = Object.freeze(["localhost", "127.0.0.1"]);

export function isAllowedLocalHostname(hostname) {
  return LOCAL_DEV_HOSTNAMES.includes(String(hostname ?? "").trim().toLowerCase());
}

export function isAreaEditorAvailable({ dev = false, hostname = "" } = {}) {
  return Boolean(dev && isAllowedLocalHostname(hostname));
}
