/**
 * The sound of the game (2026-10-12, Fede's request: music and sound effects): one Web Audio context
 * for the page, made and started on the first touch, click or key (a browser starts no sound before
 * the visitor does something). Everything is synthesized in the page (audio/synth.ts): there are no
 * sound files.
 *
 * The buses, each to the master (a compressor keeps the sum from clipping):
 *   music     (audio/music.ts)   with a hall reverb, at the music volume
 *   effects   (audio/sounds.ts)  with a room reverb, at the effects volume
 *   ambience  (audio/sounds.ts)  dry, at the effects volume
 * The volumes and the mute come from the settings (audio/settings.ts). A clock schedules what plays a
 * little ahead of the context's time, so a busy page never makes a note late.
 */
import type { MusicTrack, Pattern } from './music.ts';
import { loadSound, saveSound, type SoundSettings } from './settings.ts';
import { playEffect, startAmbience, type Ambience, type AmbienceId, type EffectId } from './sounds.ts';
import { reverbBuffer } from './synth.ts';

/** The clock looks this far ahead (s), every CLOCK_MS. */
const LOOKAHEAD = 0.8;
const CLOCK_MS = 100;

/** The buses of a context, for the page and for a render to a file. */
export interface Buses {
  readonly master: GainNode;
  readonly music: GainNode;
  readonly musicOut: GainNode;
  readonly effects: GainNode;
  readonly effectsOut: GainNode;
  readonly ambience: GainNode;
}

/** Builds the buses of a context, at these settings. */
export function makeBuses(ctx: BaseAudioContext, settings: SoundSettings): Buses {
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.3;
  compressor.connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(compressor);

  const music = ctx.createGain();
  const musicOut = ctx.createGain();
  const musicDry = ctx.createGain();
  musicDry.gain.value = 0.62;
  const hall = ctx.createConvolver();
  // 3.2 s: a longer tail costs a phone much more work for little more space.
  hall.buffer = reverbBuffer(ctx, 3.2, 101);
  const hallWet = ctx.createGain();
  hallWet.gain.value = 0.55;
  music.connect(musicDry).connect(musicOut);
  music.connect(hall).connect(hallWet).connect(musicOut);
  musicOut.connect(master);

  const effects = ctx.createGain();
  const effectsOut = ctx.createGain();
  const room = ctx.createConvolver();
  room.buffer = reverbBuffer(ctx, 1.7, 211);
  const roomWet = ctx.createGain();
  roomWet.gain.value = 0.3;
  effects.connect(effectsOut);
  effects.connect(room).connect(roomWet).connect(effectsOut);
  effectsOut.connect(master);

  const ambience = ctx.createGain();
  ambience.connect(master);

  const buses = { master, music, musicOut, effects, effectsOut, ambience };
  applySettings(buses, settings, ctx.currentTime);
  return buses;
}

/** Sets the volumes of the buses, smoothly. */
function applySettings(buses: Buses, settings: SoundSettings, t: number): void {
  buses.master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.05);
  buses.musicOut.gain.setTargetAtTime(settings.music, t, 0.05);
  buses.effectsOut.gain.setTargetAtTime(settings.effects, t, 0.05);
  buses.ambience.gain.setTargetAtTime(settings.effects * 0.9, t, 0.05);
}

interface Playing {
  readonly pattern: Pattern;
  readonly gain: GainNode;
  /** Where its notes go (the gain), and the bus that the gain feeds. */
  readonly bus: GainNode;
  stopping: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buses: Buses | null = null;
  private clock: number | null = null;
  private settingsNow: SoundSettings = loadSound();
  private music: (Playing & { readonly id: string }) | null = null;
  private ambience: (Playing & { readonly id: AmbienceId; readonly loop: Ambience }) | null = null;
  /** What should play once the context runs (asked before the visitor did anything). */
  private wanted: { music: MusicTrack | null; ambience: AmbienceId | null } = { music: null, ambience: null };
  private readonly listeners = new Set<(settings: SoundSettings) => void>();

  /**
   * Starts the context on the first touch, click or key of the page (a browser asks for it). A hidden
   * page stops its sound (and its work: the context sleeps), and it goes on where it was when the
   * page shows again.
   */
  listen(): void {
    const wake = () => this.resume();
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) document.addEventListener(type, wake, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => this.sync());
  }

  /** Whether the context should run: the page shows and the sound is not muted. */
  private get shouldRun(): boolean {
    return document.visibilityState !== 'hidden' && !this.settingsNow.muted;
  }

  /** Puts the context to sleep, or wakes it, as shouldRun says. */
  private sync(): void {
    if (!this.ctx) return;
    if (!this.shouldRun) {
      if (this.ctx.state === 'running') void this.ctx.suspend().catch(() => {});
    } else if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => {});
  }

  get settings(): SoundSettings {
    return this.settingsNow;
  }

  /** New settings: the buses follow at once, and the page keeps them. */
  setSettings(settings: SoundSettings): void {
    this.settingsNow = settings;
    saveSound(settings);
    if (this.ctx && this.buses) applySettings(this.buses, settings, this.ctx.currentTime);
    // Muted, the context sleeps (a little after the fade of the master, so the sound does not click off).
    if (settings.muted) window.setTimeout(() => this.sync(), 250);
    else this.sync();
    for (const listener of this.listeners) listener(settings);
  }

  /** Calls `listener` with each new setting (a toggle in the prologue, the sliders in the settings); returns how to stop. */
  onSettings(listener: (settings: SoundSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Whether the context runs now. */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Makes the context (once) and starts it; then what was asked before plays. */
  resume(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      this.buses = makeBuses(this.ctx, this.settingsNow);
      this.ctx.addEventListener('statechange', () => this.onState());
    }
    this.sync();
    this.onState();
  }

  private onState(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.clock === null) this.clock = window.setInterval(() => this.tick(), CLOCK_MS);
    const { music, ambience } = this.wanted;
    this.wanted = { music: null, ambience: null };
    if (music && !this.music) this.playMusic(music);
    if (ambience && !this.ambience) this.setAmbience(ambience);
  }

  /** Schedules what plays next, a little ahead of the clock. */
  private tick(): void {
    if (!this.ctx) return;
    const until = this.ctx.currentTime + LOOKAHEAD;
    for (const playing of [this.music, this.ambience]) if (playing && !playing.stopping) playing.pattern.schedule(this.ctx, playing.gain, until);
  }

  /** Plays a track, fading it in over `fade` s; another track fades out. Before the visitor did anything, it waits. */
  playMusic(track: MusicTrack, fade = 2.5): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.buses) {
      if (this.music && this.music.id !== track.id) this.stopMusic(fade);
      this.wanted.music = track;
      this.resume();
      return;
    }
    if (this.music && !this.music.stopping && this.music.id === track.id) return;
    this.stopMusic(fade);
    const t = this.ctx.currentTime + 0.05;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + fade);
    gain.connect(this.buses.music);
    this.music = { id: track.id, pattern: track.start(t), gain, bus: this.buses.music, stopping: false };
    this.tick();
  }

  /** Fades the music out over `fade` s. */
  stopMusic(fade = 2.5): void {
    if (this.wanted.music) this.wanted.music = null;
    const music = this.music;
    if (!music || !this.ctx) return;
    this.fadeOut(music, fade);
    this.music = null;
  }

  /** Changes the ambience, crossfading over `fade` s (null: none). */
  setAmbience(id: AmbienceId | null, fade = 1.6): void {
    if (this.ambience?.id === id) return;
    // The old one goes even while the context sleeps (muted, or a hidden page), or it would come back.
    if (this.ambience && this.ctx) {
      const old = this.ambience;
      this.fadeOut(old, fade, () => old.loop.stop(this.ctx!.currentTime + 0.05));
      this.ambience = null;
    }
    if (!this.ctx || this.ctx.state !== 'running' || !this.buses) {
      this.wanted.ambience = id;
      if (id) this.resume();
      return;
    }
    if (!id) return;
    const t = this.ctx.currentTime + 0.05;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + fade);
    gain.connect(this.buses.ambience);
    const loop = startAmbience(id, this.ctx, gain, t);
    this.ambience = { id, pattern: loop, loop, gain, bus: this.buses.ambience, stopping: false };
    this.tick();
  }

  /** Plays an effect now (nothing before the visitor did anything: a sound that late would be wrong). */
  play(id: EffectId, delay = 0): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.buses || this.settingsNow.muted) return;
    playEffect(id, this.ctx, this.buses.effects, this.ctx.currentTime + 0.01 + delay);
  }

  /** Fades a playing thing out, then lets it go. */
  private fadeOut(playing: Playing, fade: number, then?: () => void): void {
    const ctx = this.ctx!;
    playing.stopping = true;
    const t = ctx.currentTime;
    playing.gain.gain.cancelScheduledValues(t);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, t);
    playing.gain.gain.linearRampToValueAtTime(0, t + fade);
    window.setTimeout(() => {
      then?.();
      playing.gain.disconnect();
    }, (fade + 0.2) * 1000);
  }
}

/** The sound of the page. */
export const audio = new AudioEngine();

/**
 * Renders `seconds` of a track (and optionally an ambience) without a page's context: the same buses
 * and instruments in an OfflineAudioContext. For tests (a file to measure) and a look at the sound.
 */
export async function renderOffline(seconds: number, track: MusicTrack | null, ambience: AmbienceId | null = null, settings: SoundSettings = { music: 0.6, effects: 0.8, muted: false }, sampleRate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const buses = makeBuses(ctx, settings);
  if (track) track.start(0.05).schedule(ctx, buses.music, seconds);
  if (ambience) startAmbience(ambience, ctx, buses.ambience, 0.05).schedule(ctx, buses.ambience, seconds);
  return ctx.startRendering();
}
