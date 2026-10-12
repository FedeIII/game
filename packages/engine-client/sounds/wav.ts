/**
 * Reads a WAV file (RIFF): 16, 24 or 32-bit integer PCM, or 32-bit float, with any number of
 * channels (WAVE_FORMAT_EXTENSIBLE too). The samples come back as floats from -1 to 1, one array for
 * each channel. The sounds of the game come from WAV files of the VSCO 2 library (sounds/build.ts).
 */
export interface Pcm {
  readonly rate: number;
  readonly channels: readonly Float32Array[];
}

export function readWav(bytes: Uint8Array): Pcm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let format = 0;
  let channels = 0;
  let rate = 0;
  let bits = 0;
  let data: { at: number; length: number } | null = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = tag(at);
    const length = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ') {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      rate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first two bytes of the sub-format GUID.
      if (format === 0xfffe && length >= 26) format = view.getUint16(body + 24, true);
    } else if (id === 'data') {
      data = { at: body, length: Math.min(length, bytes.length - body) };
    }
    at = body + length + (length % 2);
  }
  if (!data || channels === 0) throw new Error('WAV file without fmt or data');
  const width = bits / 8;
  const frames = Math.floor(data.length / (width * channels));
  const out = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const at = data.at + (i * channels + c) * width;
      let v: number;
      if (format === 3 && bits === 32) v = view.getFloat32(at, true);
      else if (bits === 16) v = view.getInt16(at, true) / 32768;
      else if (bits === 24) v = ((bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16)) << 8) / 2147483648;
      else if (bits === 32) v = view.getInt32(at, true) / 2147483648;
      else if (bits === 8) v = (bytes[at]! - 128) / 128;
      else throw new Error(`WAV: ${bits}-bit samples (format ${format}) are not read`);
      out[c]![i] = v;
    }
  }
  return { rate, channels: out };
}
