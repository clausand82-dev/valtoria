import { SOUND_DEFS } from "./config/sound-config.js";
import { MUSIC_PROFILES, MUSIC_TRACKS } from "./config/music-config.js";
import { AUDIO_MIX_CONFIG } from "./config/audio-mix-config.js";
import { relativeIsoHorizontalTiles } from "./iso.js";

const DEFAULT_SETTINGS = Object.freeze({ masterVolume: 1, musicVolume: 0.7, ambienceVolume: 0.55, sfxVolume: 0.8, uiVolume: 0.7, audioMuted: false });
const BUS_SETTING = Object.freeze({ music: "musicVolume", ambience: "ambienceVolume", sfx: "sfxVolume", ui: "uiVolume" });
const ESSENTIAL_SOUNDS = Object.freeze(["player_hurt", "sword_swing", "sword_hit_flesh", "footstep_walk_grass", "footstep_run_grass", "item_pickup", "ui_open"]);

function clamp(value, fallback = 1) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; }
function fileFor(definition, excludedFile = null) { const files = definition?.files ?? (definition?.file ? [definition.file] : []); const candidates = files.filter((file) => file !== excludedFile); const pool = candidates.length ? candidates : files; return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }
function isWebAudioAvailable() { return typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext); }

class AudioManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.templates = new Map(); // Streaming-loop and HTML fallback templates only.
    this.buffers = new Map();
    this.bufferLoads = new Map();
    this.webAudioFallbackFiles = new Set();
    this.unavailable = new Set();
    this.warned = new Set();
    this.voices = new Map();
    this.ambience = new Map();
    this.music = null;
    this.desiredAmbience = [];
    this.desiredMusic = null;
    this.unlocked = false;
    this.context = null;
    this.buses = null;
    this.warnedWebAudioUnavailable = false;
  }

  setSettings(settings = {}) { this.settings = { ...this.settings, ...Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => [key, key === "audioMuted" ? Boolean(settings[key] ?? this.settings[key]) : clamp(settings[key] ?? this.settings[key], value)])) }; this.applyVolumes(); }
  setBusVolume(bus, volume) { if (bus === "master") this.setSettings({ masterVolume: volume }); else { const key = BUS_SETTING[bus]; if (key) this.setSettings({ [key]: volume }); } }
  setMuted(muted) { this.setSettings({ audioMuted: muted }); }

  ensureContext() {
    if (this.context?.state === "closed") { this.context = null; this.buses = null; }
    if (this.context) return this.context;
    if (!isWebAudioAvailable()) { this.warnWebAudioUnavailable(); return null; }
    const Context = window.AudioContext || window.webkitAudioContext;
    try {
      this.context = new Context();
      const master = this.context.createGain(); const sfx = this.context.createGain(); const ui = this.context.createGain();
      const sfxLowShelf = this.context.createBiquadFilter(); const sfxHighShelf = this.context.createBiquadFilter();
      const { lowShelf, highShelf } = AUDIO_MIX_CONFIG.sfxEq;
      sfxLowShelf.type = "lowshelf"; sfxLowShelf.frequency.value = lowShelf.frequency; sfxLowShelf.gain.value = lowShelf.enabled ? lowShelf.gainDb : 0;
      sfxHighShelf.type = "highshelf"; sfxHighShelf.frequency.value = highShelf.frequency; sfxHighShelf.gain.value = highShelf.enabled ? highShelf.gainDb : 0;
      sfxLowShelf.connect(sfxHighShelf); sfxHighShelf.connect(sfx); sfx.connect(master); ui.connect(master); master.connect(this.context.destination);
      this.buses = { master, sfx, ui, sfxLowShelf, sfxHighShelf };
      this.applyWebAudioVolumes();
      return this.context;
    } catch (error) { this.warnWebAudioUnavailable(error); return null; }
  }
  warnWebAudioUnavailable(error = null) { if (this.warnedWebAudioUnavailable || !import.meta.env.DEV) return; this.warnedWebAudioUnavailable = true; console.warn("[audio] Web Audio is unavailable; short sounds use HTML audio fallback.", error ?? ""); }
  async unlock() {
    this.unlocked = true;
    const context = this.ensureContext();
    if (context?.state === "suspended") {
      try { await context.resume(); } catch { /* A later valid gesture can resume it. */ }
    }
    this.syncLoops();
    this.preload(ESSENTIAL_SOUNDS);
  }

  preload(ids = []) { for (const id of ids) { const def = SOUND_DEFS[id]; const files = def?.files ?? (def?.file ? [def.file] : []); for (const file of files) this.loadBuffer(file); } }
  preloadRegion(region = null, extraIds = []) {
    const ids = new Set([...(region?.audio?.ambience ?? []), ...extraIds]);
    for (const monster of region?.monsters ?? []) for (const id of Object.values(monster?.audio ?? {})) if (typeof id === "string") ids.add(id);
    this.preload([...ids]);
  }
  template(file) {
    if (typeof Audio === "undefined" || !file || this.unavailable.has(file)) return null;
    if (!this.templates.has(file)) { const audio = new Audio(); audio.preload = "auto"; audio.src = file; audio.addEventListener("error", () => this.markUnavailable(file)); this.templates.set(file, audio); }
    return this.templates.get(file);
  }
  markUnavailable(file) { if (this.unavailable.has(file)) return; this.unavailable.add(file); this.bufferLoads.delete(file); if (import.meta.env.DEV && !this.warned.has(file)) { this.warned.add(file); console.warn(`[audio] Asset unavailable: ${file}`); } }
  async loadBuffer(file) {
    if (!file || this.unavailable.has(file) || this.webAudioFallbackFiles.has(file)) return null;
    if (this.buffers.has(file)) return this.buffers.get(file);
    if (this.bufferLoads.has(file)) return this.bufferLoads.get(file);
    const context = this.ensureContext(); if (!context) return null;
    const load = (async () => {
      try {
        const response = await fetch(file);
        if (!response.ok) { this.markUnavailable(file); return null; }
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(file, buffer); return buffer;
      } catch (error) {
        // Network/missing assets are permanently unavailable. Decoder/browser failures use the small HTML fallback.
        if (error instanceof TypeError) this.markUnavailable(file); else { this.webAudioFallbackFiles.add(file); if (import.meta.env.DEV && !this.warned.has(`decode:${file}`)) { this.warned.add(`decode:${file}`); console.warn(`[audio] Could not decode ${file}; using HTML audio fallback.`, error); } }
        return null;
      } finally { this.bufferLoads.delete(file); }
    })();
    this.bufferLoads.set(file, load); return load;
  }
  gain(definition, attenuation = 1) { const bus = definition?.bus ?? "sfx"; return this.settings.audioMuted ? 0 : clamp(definition?.volume, 1) * this.settings.masterVolume * (this.settings[BUS_SETTING[bus]] ?? 1) * attenuation; }
  spatial(options = {}, definition = null) {
    if (!options.position || !options.listener) return { gain: 1, pan: 0 };
    const dx = (Number(options.position.x) || 0) - (Number(options.listener.x) || 0); const dy = (Number(options.position.y) || 0) - (Number(options.listener.y) || 0);
    const maxDistance = Math.max(0.1, Number(options.maxDistance) || 12); const distance = Math.hypot(dx, dy); if (distance > maxDistance) return null;
    const override = definition?.spatial && typeof definition.spatial === "object" ? definition.spatial : {};
    const fullPanDistanceTiles = Math.max(0.1, Number(override.fullPanDistanceTiles) || AUDIO_MIX_CONFIG.spatial.fullPanDistanceTiles);
    const maxPan = clamp(override.panStrength ?? AUDIO_MIX_CONFIG.spatial.maxPan, AUDIO_MIX_CONFIG.spatial.maxPan);
    const projectedHorizontalTiles = relativeIsoHorizontalTiles(options.position, options.listener);
    const pan = Math.max(-1, Math.min(1, (projectedHorizontalTiles / fullPanDistanceTiles) * maxPan));
    return { gain: Math.max(0, 1 - distance / maxDistance), pan };
  }
  voiceKey(id, definition) { return definition.voiceGroup || id; }
  activeVoices(key) { return (this.voices.get(key) ?? []).filter((entry) => !entry.ended); }
  canPlayVoice(id, definition) { return this.activeVoices(this.voiceKey(id, definition)).length < Math.max(1, Number(definition.maxVoices) || 1); }
  playSound(id, options = {}) {
    const definition = SOUND_DEFS[id]; if (!definition || !this.unlocked) return false;
    const spatial = definition.spatial === false || definition.bus === "ui" ? { gain: 1, pan: 0 } : this.spatial(options, definition); if (!spatial) return false;
    if (!this.canPlayVoice(id, definition)) return false;
    const file = fileFor(definition); if (!file || this.unavailable.has(file)) return false;
    const context = this.ensureContext();
    if (context && !this.webAudioFallbackFiles.has(file)) {
      const buffer = this.buffers.get(file);
      if (buffer && context.state === "running") return this.playBuffer(id, definition, buffer, spatial);
      // Do not make immediate combat/footstep sounds arrive late. Preloads cover their normal path.
      this.loadBuffer(file).then((loaded) => { if (loaded && context.state === "running" && this.canPlayVoice(id, definition)) this.playBuffer(id, definition, loaded, spatial); else if (!loaded && this.webAudioFallbackFiles.has(file)) this.playHtmlVoice(id, definition, file, spatial); });
      return false;
    }
    return this.playHtmlVoice(id, definition, file, spatial);
  }
  playBuffer(id, definition, buffer, spatial) {
    const context = this.context; if (!context || context.state !== "running" || !this.canPlayVoice(id, definition)) return false;
    const source = context.createBufferSource(); const gain = context.createGain(); const rate = Math.max(0.25, Math.min(4, 1 + ((Math.random() * 2 - 1) * (Number(definition.randomPitch) || 0))));
    source.buffer = buffer; source.playbackRate.value = rate; source.loop = Boolean(definition.loop);
    // Settings live on the shared Web Audio buses; only config volume and spatial attenuation belong here.
    const initialGain = clamp(definition.volume, 1) * spatial.gain; const now = context.currentTime; const fadeIn = Math.max(0, Number(definition.fadeInMs) || 0) / 1000;
    gain.gain.setValueAtTime(fadeIn > 0 ? 0 : initialGain, now); if (fadeIn > 0) gain.gain.linearRampToValueAtTime(initialGain, now + fadeIn);
    let tail = source; if (definition.spatial !== false && definition.bus !== "ui" && typeof context.createStereoPanner === "function") { const panner = context.createStereoPanner(); panner.pan.value = spatial.pan; source.connect(panner); tail = panner; }
    for (const [field, type] of [["highpassHz", "highpass"], ["lowpassHz", "lowpass"]]) { const hz = Number(definition[field]); if (hz > 0) { const filter = context.createBiquadFilter(); filter.type = type; filter.frequency.value = hz; tail.connect(filter); tail = filter; } }
    tail.connect(gain); gain.connect(this.buses[definition.bus === "ui" ? "ui" : "sfxLowShelf"]);
    const key = this.voiceKey(id, definition); const entry = { id, key, definition, source, gain, attenuation: spatial.gain, ended: false, rate };
    const cleanup = () => { if (entry.ended) return; entry.ended = true; if (entry.stopTimer) clearTimeout(entry.stopTimer); try { source.disconnect(); gain.disconnect(); } catch {} this.voices.set(key, this.activeVoices(key).filter((voice) => voice !== entry)); };
    entry.cleanup = cleanup; source.addEventListener("ended", cleanup, { once: true }); this.voices.set(key, [...this.activeVoices(key), entry]);
    const offset = Math.max(0, Number(definition.startOffsetMs) || 0) / 1000; const endOffset = Math.max(0, Number(definition.endOffsetMs) || 0) / 1000; const available = Math.max(0, buffer.duration - offset - endOffset); const limit = Math.max(0, Number(definition.durationLimitMs) || 0) / 1000; const duration = limit > 0 ? Math.min(available, limit / rate) : (endOffset > 0 ? available : undefined);
    if (duration != null) { const fade = Math.min(duration, Math.max(0, Number(definition.fadeOutMs) || 0) / 1000); if (fade > 0) { const at = now + Math.max(0, duration - fade); gain.gain.setValueAtTime(initialGain, at); gain.gain.linearRampToValueAtTime(0.0001, at + fade); } source.start(now, offset, duration); } else source.start(now, offset);
    return true;
  }
  playHtmlVoice(id, definition, file, spatial) {
    const template = this.template(file); if (!template || !this.canPlayVoice(id, definition)) return false;
    const audio = template.cloneNode(true); audio.volume = this.gain(definition, spatial.gain); audio.playbackRate = 1 + ((Math.random() * 2 - 1) * (Number(definition.randomPitch) || 0));
    const key = this.voiceKey(id, definition); const entry = { id, key, definition, audio, attenuation: spatial.gain, ended: false };
    const cleanup = () => { if (entry.ended) return; entry.ended = true; if (entry.stopTimer) clearTimeout(entry.stopTimer); this.voices.set(key, this.activeVoices(key).filter((voice) => voice !== entry)); };
    entry.cleanup = cleanup; audio.addEventListener("ended", cleanup, { once: true }); audio.addEventListener("error", () => { this.markUnavailable(file); cleanup(); }, { once: true }); this.voices.set(key, [...this.activeVoices(key), entry]);
    const limit = Math.max(0, Number(definition.durationLimitMs) || 0); if (limit > 0) entry.stopTimer = setTimeout(() => this.fadeAndStopVoice(entry, Math.max(0, Math.min(limit, Number(definition.fadeOutMs) || 0))), Math.max(0, limit - (Number(definition.fadeOutMs) || 0)));
    audio.play().catch(cleanup); return true;
  }

  playMusic(trackOrProfileId, options = {}) { const profile = MUSIC_PROFILES[trackOrProfileId]; const trackId = profile?.trackId ?? trackOrProfileId; if (!MUSIC_TRACKS[trackId]) return; this.desiredMusic = { trackId, fadeMs: options.fadeMs ?? profile?.fadeMs ?? 0 }; this.syncLoops(); }
  stopMusic(options = {}) { this.desiredMusic = null; if (this.music) this.stopLoop(this.music, Math.max(0, Number(options.fadeMs) || 1400)); this.music = null; }
  setAmbience(soundIds = []) { this.desiredAmbience = [...new Set(soundIds.filter((id) => SOUND_DEFS[id]?.loop))]; this.syncLoops(); }
  stopAmbience() { this.desiredAmbience = []; for (const entry of this.ambience.values()) this.stopLoop(entry, 0); this.ambience.clear(); }
  setRegionAudio(audio = null) { if (!audio) { this.stopMusic(); this.stopAmbience(); return; } this.setAmbience(audio.ambience ?? []); if (audio.musicProfile) this.playMusic(audio.musicProfile); else this.stopMusic(); }
  syncLoops() { if (!this.unlocked) return; for (const [id, entry] of this.ambience) if (!this.desiredAmbience.includes(id)) { this.stopLoop(entry, 0); this.ambience.delete(id); } for (const id of this.desiredAmbience) if (!this.ambience.has(id)) { const entry = this.startLoop(id, SOUND_DEFS[id]); if (entry) this.ambience.set(id, entry); } const desired = this.desiredMusic?.trackId; if (this.music?.id !== desired) { const fadeMs = this.desiredMusic?.fadeMs ?? 0; if (this.music) this.stopLoop(this.music, fadeMs); this.music = desired ? this.startLoop(desired, MUSIC_TRACKS[desired], fadeMs) : null; } }
  cancelLoopFade(entry) { if (!entry) return; entry.fadeToken = (entry.fadeToken ?? 0) + 1; if (entry.fadeFrame != null) cancelAnimationFrame(entry.fadeFrame); entry.fadeFrame = null; }
  applyLoopVolume(entry) { if (entry?.audio) entry.audio.volume = this.gain(entry.definition) * (entry.fadeGain ?? 1); }
  isDesiredLoop(entry) { return entry && (entry.definition?.bus === "music" ? this.music === entry && this.desiredMusic?.trackId === entry.id : this.ambience.get(entry.id) === entry && this.desiredAmbience.includes(entry.id)); }
  handleLoopPlayFailure(entry, error) { if (!entry || entry.stopped) return; entry.pending = false; const name = String(error?.name ?? ""); const blocked = name === "NotAllowedError" || name === "AbortError" || entry.audio?.readyState === HTMLMediaElement.HAVE_NOTHING; if (!blocked && (name === "NotSupportedError" || name === "EncodingError")) this.markUnavailable(entry.file); if (this.music === entry) this.music = null; if (this.ambience.get(entry.id) === entry) this.ambience.delete(entry.id); }
  startLoop(id, definition, fadeInMs = 0, excludedFile = null) { const file = fileFor(definition, excludedFile); const template = this.template(file); if (!template || this.unavailable.has(file)) return null; const audio = template.cloneNode(true); audio.loop = !definition.rotateVariants; const entry = { id, file, audio, definition, fadeGain: fadeInMs > 0 ? 0 : 1, fadeFrame: null, fadeToken: 0, pending: true, stopped: false }; this.applyLoopVolume(entry); audio.addEventListener("error", () => { this.markUnavailable(file); this.handleLoopPlayFailure(entry, new Error("media error")); }, { once: true }); if (definition.rotateVariants && (definition.files?.length ?? 0) > 1) audio.addEventListener("ended", () => { if (this.music !== entry || this.desiredMusic?.trackId !== id || entry.stopped) return; this.stopLoop(entry, 0); this.music = this.startLoop(id, definition, 350, file); }, { once: true }); audio.play().then(() => { entry.pending = false; if (entry.stopped || !this.isDesiredLoop(entry)) this.stopLoop(entry, 0); }).catch((error) => this.handleLoopPlayFailure(entry, error)); if (fadeInMs > 0) this.fadeLoopVolume(entry, 1, fadeInMs); return entry; }
  fadeLoopVolume(entry, targetGain, fadeMs, onComplete = null) { if (!entry?.audio) return; this.cancelLoopFade(entry); const token = entry.fadeToken; const startedAt = performance.now(); const startGain = entry.fadeGain ?? 1; if (fadeMs <= 0) { entry.fadeGain = targetGain; this.applyLoopVolume(entry); onComplete?.(); return; } const tick = () => { if (entry.stopped || token !== entry.fadeToken) return; const progress = Math.min(1, (performance.now() - startedAt) / fadeMs); entry.fadeGain = startGain + (targetGain - startGain) * progress; this.applyLoopVolume(entry); if (progress < 1) entry.fadeFrame = requestAnimationFrame(tick); else { entry.fadeFrame = null; onComplete?.(); } }; entry.fadeFrame = requestAnimationFrame(tick); }
  fadeAndStopVoice(entry, fadeOutMs) { if (!entry) return; if (entry.source && this.context) { const now = this.context.currentTime; if (fadeOutMs > 0) { entry.gain.gain.cancelScheduledValues(now); entry.gain.gain.setValueAtTime(entry.gain.gain.value, now); entry.gain.gain.linearRampToValueAtTime(0.0001, now + fadeOutMs / 1000); entry.source.stop(now + fadeOutMs / 1000); } else entry.source.stop(); return; } if (!entry.audio) return; if (fadeOutMs <= 0) { entry.audio.pause(); entry.audio.currentTime = 0; entry.cleanup?.(); return; } const start = entry.audio.volume; const began = performance.now(); const tick = () => { const progress = Math.min(1, (performance.now() - began) / fadeOutMs); entry.audio.volume = start * (1 - progress); if (progress < 1) requestAnimationFrame(tick); else { entry.audio.pause(); entry.audio.currentTime = 0; entry.cleanup?.(); } }; requestAnimationFrame(tick); }
  stopLoop(entry, fadeMs) { if (!entry?.audio) return; const finish = () => { entry.stopped = true; this.cancelLoopFade(entry); entry.audio.pause(); entry.audio.currentTime = 0; }; if (fadeMs > 0 && (entry.fadeGain ?? 1) > 0) this.fadeLoopVolume(entry, 0, fadeMs, finish); else finish(); }
  applyWebAudioVolumes() { if (!this.buses) return; this.buses.master.gain.value = this.settings.audioMuted ? 0 : this.settings.masterVolume; this.buses.sfx.gain.value = this.settings.sfxVolume; this.buses.ui.gain.value = this.settings.uiVolume; }
  applyVolumes() { this.applyWebAudioVolumes(); for (const entries of this.voices.values()) for (const entry of entries) if (entry.audio) entry.audio.volume = this.gain(entry.definition, entry.attenuation); for (const entry of this.ambience.values()) this.applyLoopVolume(entry); this.applyLoopVolume(this.music); }
  stopAll() { this.stopMusic({ fadeMs: 0 }); this.stopAmbience(); for (const entries of this.voices.values()) for (const entry of entries) this.fadeAndStopVoice(entry, 0); this.voices.clear(); }
  cleanup() { this.stopAll(); for (const template of this.templates.values()) { template.pause(); template.src = ""; } this.templates.clear(); this.buffers.clear(); this.bufferLoads.clear(); for (const node of Object.values(this.buses ?? {})) try { node.disconnect?.(); } catch {} if (this.context && this.context.state !== "closed") this.context.close().catch(() => {}); this.context = null; this.buses = null; this.unlocked = false; }
}

export const audioManager = new AudioManager();
export { DEFAULT_SETTINGS as DEFAULT_AUDIO_SETTINGS };
