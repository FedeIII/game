import { describe, expect, it } from 'vitest';
import { isBuildScript, scriptOf } from './new-build.ts';

describe('the build of a page', () => {
  it('is the src of its first module script', () => {
    const page = `<!doctype html><head><script>var x = 1;</script>
    <link rel="modulepreload" href="/assets/Filter-BCRRlzOx.js">
    <script type="module" crossorigin src="/assets/main-Ci1f4dpB.js"></script></head>`;
    expect(scriptOf(page)).toBe('/assets/main-Ci1f4dpB.js');
    expect(scriptOf('<p>Bad gateway</p>')).toBeNull();
  });

  it('counts only the files of a build, not a development source', () => {
    expect(isBuildScript('/assets/main-Ci1f4dpB.js')).toBe(true);
    expect(isBuildScript('./src/main.ts')).toBe(false);
    expect(isBuildScript(null)).toBe(false);
  });
});
