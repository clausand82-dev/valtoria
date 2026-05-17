import { localSaveRepository } from "./localSaveRepository.js";

const SAVE_MODE = import.meta.env.VITE_SAVE_MODE || "local";

if (SAVE_MODE !== "local" && import.meta.env.DEV) {
  console.warn(`[saveRepository] Unsupported VITE_SAVE_MODE "${SAVE_MODE}". Falling back to local storage.`);
}

export const saveRepository = localSaveRepository;
