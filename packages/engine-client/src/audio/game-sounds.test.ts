import { describe, expect, it } from 'vitest';
import { Ground, MOB_KINDS } from '@game/engine';
import manifest from '../generated/sounds.json';
import { VOICE_OF, mobVoice, syllables, type VoiceEvent } from './creatures.ts';
import { PLACE_MOODS } from './director.ts';
import { FX, FX_INSTRUMENTS, spatial } from './fx.ts';
import { ambienceOf, stepOf, voiceOfChange } from './game-sounds.ts';
import { AMBIENCES } from './sounds.ts';

const INSTRUMENTS = (manifest as unknown as { instruments: Record<string, unknown> }).instruments;

describe('the sounds of the game', () => {
  it('have a step for each ground that a player walks on', () => {
    expect(stepOf(Ground.Grass)).toBe('stepGrass');
    expect(stepOf(Ground.DarkGrass)).toBe('stepGrass');
    expect(stepOf(Ground.Dirt)).toBe('stepDirt');
    expect(stepOf(Ground.Sand)).toBe('stepSand');
    expect(stepOf(Ground.Cobble)).toBe('stepStone');
    expect(stepOf(Ground.FloorStone)).toBe('stepStone');
    expect(stepOf(Ground.Floor)).toBe('stepWood');
    expect(stepOf(Ground.FloorEarth)).toBe('stepEarth');
    expect(stepOf(Ground.Shallows)).toBe('stepWater');
    expect(stepOf(Ground.Water)).toBeNull();
  });

  it('have an ambience for each place, and a room inside a building', () => {
    for (const mood of PLACE_MOODS) expect(AMBIENCES, mood).toContain(ambienceOf(mood, false));
    expect(ambienceOf('wilds', false)).toBe('forest');
    expect(ambienceOf('wilds', true)).toBe('indoor');
    expect(ambienceOf('town', true)).toBe('indoor');
    expect(ambienceOf('home', true)).toBe('hearth');
    expect(ambienceOf('chapel', true)).toBe('candle');
    expect(ambienceOf('combat', false)).toBeNull();
  });

  it('give a mob a voice when it spots the player, gathers for a blow, is hurt or dies', () => {
    expect(voiceOfChange('idle', 'chase')).toBe('alert');
    expect(voiceOfChange('walk', 'chase')).toBe('alert');
    expect(voiceOfChange(undefined, 'chase')).toBe('alert');
    expect(voiceOfChange('retreat', 'chase')).toBeNull();
    expect(voiceOfChange('chase', 'windup')).toBe('windup');
    expect(voiceOfChange('strike', 'hurt')).toBe('hurt');
    expect(voiceOfChange('hurt', 'dying')).toBe('death');
    expect(voiceOfChange('chase', 'chase')).toBeNull();
    expect(voiceOfChange('windup', 'strike')).toBeNull();
  });

  it('place a sound: louder near, from its side, nothing beyond its range', () => {
    const near = spatial(10, 0)!;
    const far = spatial(150, 0)!;
    expect(near.gain).toBeGreaterThan(far.gain);
    expect(far.pan).toBeGreaterThan(0);
    expect(spatial(-150, 0)!.pan).toBeLessThan(0);
    expect(spatial(0, 0)).toEqual({ gain: 1, pan: 0 });
    expect(spatial(400, 0)).toBeNull();
    expect(Math.abs(spatial(-1000, 0, 2000)!.pan)).toBeLessThanOrEqual(0.85);
  });

  it('give every kind of mob a voice for every moment, with sound shapes', () => {
    for (const kind of MOB_KINDS) {
      expect(VOICE_OF[kind], kind).toBeDefined();
      for (const event of ['alert', 'windup', 'hurt', 'death'] as VoiceEvent[]) {
        const voice = mobVoice(kind, event);
        expect(voice.key).toBe(`${kind}:${event}`);
        for (let i = 0; i < 5; i++) {
          const calls = syllables(VOICE_OF[kind].kind, event, VOICE_OF[kind].size);
          expect(calls.length, `${kind} ${event}`).toBeGreaterThan(0);
          for (const s of calls) {
            expect(s.seconds).toBeGreaterThan(0.03);
            expect(s.seconds).toBeLessThan(2);
            expect(s.from).toBeGreaterThan(20);
            expect(s.to).toBeGreaterThan(20);
            expect(s.gain).toBeLessThanOrEqual(0.6);
            expect(s.rough).toBeGreaterThanOrEqual(0);
            expect(s.rough).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('play their recorded sounds from the bank', () => {
    for (const inst of FX_INSTRUMENTS) expect(INSTRUMENTS[inst], inst).toBeDefined();
    for (const [id, def] of Object.entries(FX)) {
      expect(def.seconds, id).toBeGreaterThan(0);
      expect(def.variants, id).toBeGreaterThanOrEqual(1);
    }
  });
});
