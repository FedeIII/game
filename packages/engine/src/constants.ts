/** The size of one tile, in world pixels. All art uses this grid. */
export const TILE_SIZE = 16;

/** The number of tiles on each side of a chunk. The world is made, kept and sent in chunks. */
export const CHUNK_SIZE = 32;

/** The size of one chunk, in world pixels. */
export const CHUNK_PIXELS = TILE_SIZE * CHUNK_SIZE;

/**
 * The fixed simulation rate. The client and the future server step the same code at this
 * rate, and client-side prediction needs that.
 */
export const TICK_RATE = 60;
export const TICK_SECONDS = 1 / TICK_RATE;
