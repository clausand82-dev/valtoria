import { SOUND_DEFS } from "./config/sound-config.js";
import { MUSIC_PROFILES, MUSIC_TRACKS } from "./config/music-config.js";

const DEFAULT_SETTINGS = Object.freeze({ masterVolume: 1, musicVolume: 0.7, ambienceVolume: 0.55, sfxVolume: 0.8, uiVolume: 0.7, audioMuted: false });
const BUS_SETTING = Object.freeze({ music: "musicVolume", ambience: "ambienceVolume", sfx: "sfxVolume", ui: "uiVolume" });

function clamp(value, fallback = 1) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; }
function fileFor(definition, excludedFile = null) { const files = definition?.files ?? (definition?.file ? [definition.file] : []); const candidates = files.filter((file) => file !== excludedFile); const pool = candidates.length ? candidates : files; return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }

class AudioManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.templates = new Map();
    this.unavailable = new Set();
    this.warned = new Set();
    this.voices = new Map();
    this.ambience = new Map();
    this.music = null;
    this.desiredAmbience = [];
    this.desiredMusic = null;
    this.unlocked = false;
  }

  setSettings(settings = {}) { this.settings = { ...this.settings, ...Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, key === "audioMuted" ? Boolean(settings[key] ?? this.settings[key]) : clamp(settings[key] ?? this.settings[key], value)])) }; this.applyVolumes(); }
  setBusVolume(bus, volume) { const key = BUS_SETTING[bus]; if (key) this.setSettings({ [key]: volume }); }
  setMuted(muted) { this.setSettings({ audioMuted: muted }); }
  unlock() { this.unlocked = true; this.syncLoops(); }
  preload(ids = []) { for (const id of ids) { const def = SOUND_DEFS[id] ?? MUSIC_TRACKS[id]; const file = fileFor(def); if (file) this.template(file); } }
  template(file) {
    if (typeof Audio === "undefined" || !file || this.unavailable.has(file)) return null;
    if (!this.templates.has(file)) {
      const audio = new Audio(); audio.preload = "auto"; audio.src = file;
      audio.addEventListener("error", () => this.markUnavailable(file));
      this.templates.set(file, audio);
    }
    return this.templates.get(file);
  }
  markUnavailable(file) { if (this.unavailable.has(file)) return; this.unavailable.add(file); if (import.meta.env.DEV && !this.warned.has(file)) { this.warned.add(file); console.warn(`[audio] Asset unavailable: ${file}`); } }
  gain(definition, attenuation = 1) { const bus = definition?.bus ?? "sfx"; return this.settings.audioMuted ? 0 : clamp(definition?.volume, 1) * this.settings.masterVolume * (this.settings[BUS_SETTING[bus]] ?? 1) * attenuation; }
  spatial(options = {}) {
    if (!options.position || !options.listener) return { gain: 1, pan: 0 };
    const dx = (Number(options.position.x) || 0) - (Number(options.listener.x) || 0); const dy = (Number(options.position.y) || 0) - (Number(options.listener.y) || 0);
    const maxDistance = Math.max(0.1, Number(options.maxDistance) || 12); const distance = Math.hypot(dx, dy);
    if (distance > maxDistance) return null;
    return { gain: Math.max(0, 1 - distance / maxDistance), pan: Math.max(-1, Math.min(1, dx / maxDistance)) };
  }
  playSound(id, options = {}) {
    const definition = SOUND_DEFS[id]; if (!definition || !this.unlocked) return false;
    const spatial = this.spatial(options); if (!spatial) return false;
    const file = fileFor(definition); const template = this.template(file); if (!template || this.unavailable.has(file)) return false;
    const active = (this.voices.get(id) ?? []).filter((entry) => !entry.audio.ended); const maxVoices = Math.max(1, Number(definition.maxVoices) || 1); if (active.length >= maxVoices) return false;
    const voice = template.cloneNode(true); voice.volume = this.gain(definition, spatial.gain); voice.playbackRate = 1 + ((Math.random() * 2 - 1) * (Number(definition.randomPitch) || 0));
    // HTMLAudioElement stereo panning is intentionally deferred; position still culls and attenuates in world space.
    const entry = { audio: voice, definition, attenuation: spatial.gain };
    const clearEntry = () => {
      if (entry.stopTimer) clearTimeout(entry.stopTimer);
      this.voices.set(id, (this.voices.get(id) ?? []).filter((current) => current !== entry));
    };
    entry.cleanup = clearEntry;
    voice.addEventListener("ended", clearEntry, { once: true });
    voice.addEventListener("error", () => this.markUnavailable(file), { once: true }); this.voices.set(id, [...active, entry]);
    const durationLimitMs = Math.max(0, Number(definition.durationLimitMs) || 0);
    const fadeOutMs = Math.max(0, Math.min(durationLimitMs, Number(definition.fadeOutMs) || 0));
    if (durationLimitMs > 0) entry.stopTimer = setTimeout(() => this.fadeAndStopVoice(entry, fadeOutMs), Math.max(0, durationLimitMs - fadeOutMs));
    voice.play().catch(clearEntry); return true;
  }
  playMusic(trackOrProfileId, options = {}) { const profile = MUSIC_PROFILES[trackOrProfileId]; const trackId = profile?.trackId ?? trackOrProfileId; if (!MUSIC_TRACKS[trackId]) return; this.desiredMusic = { trackId, fadeMs: options.fadeMs ?? profile?.fadeMs ?? 0 }; this.syncLoops(); }
  stopMusic(options = {}) { this.desiredMusic = null; if (this.music) this.stopLoop(this.music, Math.max(0, Number(options.fadeMs) || 1400)); this.music = null; }
  setAmbience(soundIds = []) { this.desiredAmbience = [...new Set(soundIds.filter((id) => SOUND_DEFS[id]?.loop))]; this.syncLoops(); }
  stopAmbience() { this.desiredAmbience = []; for (const entry of this.ambience.values()) this.stopLoop(entry, 0); this.ambience.clear(); }
  setRegionAudio(audio = null) { if (!audio) { this.stopMusic(); this.stopAmbience(); return; } this.setAmbience(audio.ambience ?? []); if (audio.musicProfile) this.playMusic(audio.musicProfile); else this.stopMusic(); }
  syncLoops() {
    if (!this.unlocked) return;
    for (const [id, entry] of this.ambience) if (!this.desiredAmbience.includes(id)) { this.stopLoop(entry, 0); this.ambience.delete(id); }
    for (const id of this.desiredAmbience) if (!this.ambience.has(id)) { const entry = this.startLoop(id, SOUND_DEFS[id]); if (entry) this.ambience.set(id, entry); }
    const desired = this.desiredMusic?.trackId; if (this.music?.id !== desired) { const fadeMs = this.desiredMusic?.fadeMs ?? 0; if (this.music) this.stopLoop(this.music, fadeMs); this.music = desired ? this.startLoop(desired, MUSIC_TRACKS[desired], fadeMs) : null; }
  }
  cancelLoopFade(entry) {
    if (!entry) return;
    entry.fadeToken = (entry.fadeToken ?? 0) + 1;
    if (entry.fadeFrame != null) cancelAnimationFrame(entry.fadeFrame);
    entry.fadeFrame = null;
  }
  applyLoopVolume(entry) { if (entry?.audio) entry.audio.volume = this.gain(entry.definition) * (entry.fadeGain ?? 1); }
  isDesiredLoop(entry) { return entry && (entry.definition?.bus === "music" ? this.music === entry && this.desiredMusic?.trackId === entry.id : this.ambience.get(entry.id) === entry && this.desiredAmbience.includes(entry.id)); }
  handleLoopPlayFailure(entry, error) {
    if (!entry || entry.stopped) return;
    entry.pending = false;
    const name = String(error?.name ?? "");
    const blocked = name === "NotAllowedError" || name === "AbortError" || entry.audio?.readyState === HTMLMediaElement.HAVE_NOTHING;
    if (!blocked && (name === "NotSupportedError" || name === "EncodingError")) this.markUnavailable(entry.file);
    if (this.music === entry) this.music = null;
    if (this.ambience.get(entry.id) === entry) this.ambience.delete(entry.id);
    // Autoplay/context failures retain the desired profile and are retried only on unlock.
  }
  startLoop(id, definition, fadeInMs = 0, excludedFile = null) {
    const file = fileFor(definition, excludedFile); const template = this.template(file);
    if (!template || this.unavailable.has(file)) return null;
    const audio = template.cloneNode(true); audio.loop = !definition.rotateVariants;
    const entry = { id, file, audio, definition, fadeGain: fadeInMs > 0 ? 0 : 1, fadeFrame: null, fadeToken: 0, pending: true, stopped: false };
    this.applyLoopVolume(entry);
    audio.addEventListener("error", () => { this.markUnavailable(file); this.handleLoopPlayFailure(entry, new Error("media error")); }, { once: true });
    if (definition.rotateVariants && (definition.files?.length ?? 0) > 1) audio.addEventListener("ended", () => {
      if (this.music !== entry || this.desiredMusic?.trackId !== id || entry.stopped) return;
      this.stopLoop(entry, 0); this.music = this.startLoop(id, definition, 350, file);
    }, { once: true });
    audio.play().then(() => { entry.pending = false; if (entry.stopped || !this.isDesiredLoop(entry)) this.stopLoop(entry, 0); }).catch((error) => this.handleLoopPlayFailure(entry, error));
    if (fadeInMs > 0) this.fadeLoopVolume(entry, 1, fadeInMs);
    return entry;
  }
  fadeLoopVolume(entry, targetGain, fadeMs, onComplete = null) {
    if (!entry?.audio) return;
    this.cancelLoopFade(entry);
    const token = entry.fadeToken; const startedAt = performance.now(); const startGain = entry.fadeGain ?? 1;
    if (fadeMs <= 0) { entry.fadeGain = targetGain; this.applyLoopVolume(entry); onComplete?.(); return; }
    const tick = () => {
      if (entry.stopped || token !== entry.fadeToken) return;
      const progress = Math.min(1, (performance.now() - startedAt) / fadeMs);
      entry.fadeGain = startGain + (targetGain - startGain) * progress; this.applyLoopVolume(entry);
      if (progress < 1) entry.fadeFrame = requestAnimationFrame(tick); else { entry.fadeFrame = null; onComplete?.(); }
    };
    entry.fadeFrame = requestAnimationFrame(tick);
  }
  fadeAndStopVoice(entry, fadeOutMs) { if (!entry?.audio) return; if (fadeOutMs <= 0) { entry.audio.pause(); entry.audio.currentTime = 0; entry.cleanup?.(); return; } const start = entry.audio.volume; const began = performance.now(); const tick = () => { const progress = Math.min(1, (performance.now() - began) / fadeOutMs); entry.audio.volume = start * (1 - progress); if (progress < 1) requestAnimationFrame(tick); else { entry.audio.pause(); entry.audio.currentTime = 0; entry.cleanup?.(); } }; requestAnimationFrame(tick); }
  stopLoop(entry, fadeMs) {
    if (!entry?.audio) return;
    const finish = () => { entry.stopped = true; this.cancelLoopFade(entry); entry.audio.pause(); entry.audio.currentTime = 0; };
    if (fadeMs > 0 && (entry.fadeGain ?? 1) > 0) this.fadeLoopVolume(entry, 0, fadeMs, finish); else finish();
  }
  applyVolumes() { for (const entries of this.voices.values()) for (const entry of entries) entry.audio.volume = this.gain(entry.definition, entry.attenuation); for (const entry of this.ambience.values()) this.applyLoopVolume(entry); this.applyLoopVolume(this.music); }
  stopAll() { this.stopMusic({ fadeMs: 0 }); this.stopAmbience(); for (const entries of this.voices.values()) for (const entry of entries) { if (entry.stopTimer) clearTimeout(entry.stopTimer); entry.audio.pause(); entry.audio.currentTime = 0; } this.voices.clear(); }
}

export const audioManager = new AudioManager();
export { DEFAULT_SETTINGS as DEFAULT_AUDIO_SETTINGS };
