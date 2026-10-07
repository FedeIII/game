import { describe, expect, it } from 'vitest';
import { CRT_DEFAULTS } from '../render/crt.ts';
import { crtQuery, crtStateFrom } from './settings-panel.ts';

const url = (query: string) => new URLSearchParams(query);

describe('crtStateFrom', () => {
  it('starts on, with the defaults', () => {
    expect(crtStateFrom(url(''), null)).toEqual({ enabled: true, values: CRT_DEFAULTS });
  });

  it('uses the saved settings, and ignores values that are not numbers', () => {
    const state = crtStateFrom(url(''), { enabled: false, values: { spread: 0.8, mix: 'x', glow: null } });
    expect(state.enabled).toBe(false);
    expect(state.values).toEqual({ ...CRT_DEFAULTS, spread: 0.8 });
  });

  it('lets the URL win over the saved settings, value by value', () => {
    const state = crtStateFrom(url('crt=0.9,,0.6'), { enabled: true, values: { spread: 0.2, mix: 0.7 } });
    expect(state.values).toEqual({ ...CRT_DEFAULTS, spread: 0.9, mix: 0.7, glow: 0.6 });
  });

  it('turns the effect off with ?nocrt', () => {
    expect(crtStateFrom(url('nocrt'), { enabled: true }).enabled).toBe(false);
  });

  it('keeps every value inside the range of its slider', () => {
    const state = crtStateFrom(url('crt=5,-1,2,0.9'), null);
    expect(state.values).toEqual({ spread: 1, mix: 0, glow: 1, scanline: 0.5 });
  });

  it('survives storage that holds garbage', () => {
    expect(crtStateFrom(url(''), 'not an object').values).toEqual(CRT_DEFAULTS);
  });
});

describe('crtQuery', () => {
  it('writes the values in slider order, without trailing zeros', () => {
    expect(crtQuery({ spread: 0.5, mix: 0.7, glow: 0.45, scanline: 0.08 })).toBe('0.5,0.7,0.45,0.08');
  });
});
