/**
 * Client-side Postal Code Lookup - Offline Canadian Representative Finder
 * Uses local binary postal code data + Represent API for complete offline functionality
 */

import { isValidPostalCode, normalizePostalCode } from './postal';
import {
  PostalLookup,
  fetchPostalStore,
  supportsPostalWorker,
  type PostalCodeData,
} from './postalLookupCore';

/** A worker that has not reported by then is treated as unavailable. */
const WORKER_READY_TIMEOUT_MS = 15_000;
/** Same for a single lookup, once loaded. */
const LOOKUP_TIMEOUT_MS = 5_000;

/**
 * Where the index lives. The index is a 17 MB JSON document (~850k keys); it
 * took 345 ms to parse on the main thread of a desktop browser and 1.5 s under
 * 4x CPU throttling, freezing the first screen, so it is normally parsed in a
 * worker (postalLookup.worker.ts) that answers lookups by message. The
 * main-thread store is the fallback for a context without workers.
 */
interface Store {
  /** Resolves when the data is loaded; rejects if it could not be. */
  ready: Promise<void>;
  lookup(code: string): Promise<PostalCodeData | null>;
  /** Indexed postal codes; 0 until ready. */
  count(): number;
}

type PendingLookup = {
  resolve: (value: PostalCodeData | null) => void;
  reject: (error: unknown) => void;
};

type WorkerMessage = {
  type: 'loaded' | 'failed' | 'result';
  id?: number;
  total?: number;
  result?: PostalCodeData | null;
  message?: string;
};

/** The index in a worker. Returns null where workers cannot be created. */
function createWorkerStore(): Store | null {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./postalLookup.worker.ts', import.meta.url));
  } catch {
    return null;
  }

  let total = 0;
  let nextId = 0;
  const pending = new Map<number, PendingLookup>();

  let settleReady!: { ok: () => void; fail: (error: unknown) => void };
  const ready = new Promise<void>((resolve, reject) => {
    settleReady = { ok: resolve, fail: reject };
  });

  const fail = (error: unknown) => {
    settleReady.fail(error);
    pending.forEach((entry) => entry.reject(error));
    pending.clear();
    worker.terminate();
  };

  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.type === 'loaded') {
      total = message.total ?? 0;
      settleReady.ok();
    } else if (message.type === 'failed') {
      fail(new Error(message.message || 'Postal worker failed'));
    } else if (message.type === 'result') {
      const id = message.id ?? -1;
      const entry = pending.get(id);
      if (entry) {
        pending.delete(id);
        entry.resolve(message.result ?? null);
      }
    }
  };

  // The script failed to load, or an uncaught error escaped the worker.
  worker.onerror = (event) => {
    event.preventDefault();
    fail(new Error(event.message || 'Postal worker error'));
  };

  const readyTimer = setTimeout(
    () => fail(new Error('Postal worker did not start')),
    WORKER_READY_TIMEOUT_MS,
  );
  const clearReadyTimer = () => clearTimeout(readyTimer);
  ready.then(clearReadyTimer, clearReadyTimer);

  worker.postMessage({ type: 'load' });

  return {
    ready,
    count: () => total,
    lookup: (code) =>
      new Promise<PostalCodeData | null>((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Postal worker lookup timed out'));
        }, LOOKUP_TIMEOUT_MS);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        worker.postMessage({ type: 'lookup', id, code });
      }),
  };
}

/** The index on this thread: same files, parsed here. */
function createMainThreadStore(): Store {
  let instance: PostalLookup | null = null;
  const loaded = fetchPostalStore().then((store) => {
    instance = new PostalLookup(store);
  });
  return {
    ready: loaded,
    count: () => instance?.size ?? 0,
    lookup: async (code) => {
      await loaded;
      return instance?.get(code) ?? null;
    },
  };
}

class LocalPostalLookup {
  private store: Store | null = null;
  private loaded = false;
  private loadingPromise: Promise<void>;

  constructor() {
    // Start loading immediately when created.
    this.loadingPromise = this.load(false);
    // A failed load is reported to whoever waits for it; this handler only
    // keeps the rejection from surfacing as "unhandled" before then.
    this.loadingPromise.catch(() => {});
  }

  private async load(skipWorker: boolean): Promise<void> {
    if (!skipWorker && supportsPostalWorker(globalThis.location?.protocol ?? "")) {
      const workerStore = createWorkerStore();
      if (workerStore) {
        try {
          await workerStore.ready;
          this.store = workerStore;
          this.loaded = true;
          return;
        } catch (error) {
          console.warn('[LocalPostalLookup] Worker unavailable, loading postal data on the main thread:', error);
        }
      }
    }
    const mainStore = createMainThreadStore();
    await mainStore.ready;
    this.store = mainStore;
    this.loaded = true;
  }

  /**
   * Wait for postal data to be loaded
   */
  async waitForLoad(): Promise<void> {
    await this.loadingPromise;
    if (!this.loaded || !this.store) {
      throw new Error('Postal data failed to load');
    }
  }

  /**
   * Get coordinates for a specific postal code
   */
  async getCoordinates(postalCode: string): Promise<PostalCodeData | null> {
    await this.waitForLoad();
    const store = this.store as Store | null;
    if (!store) return null;

    try {
      return await store.lookup(postalCode);
    } catch (error) {
      // The worker answered its ready message but cannot answer lookups
      // (it died, or stalled). Reload on this thread and ask again.
      console.warn('[LocalPostalLookup] Worker lookup failed, retrying on the main thread:', error);
      this.store = null;
      this.loaded = false;
      this.loadingPromise = this.load(true);
      this.loadingPromise.catch(() => {});
      await this.waitForLoad();
      const fallback = this.store as Store | null;
      return fallback ? fallback.lookup(postalCode) : null;
    }
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get statistics about loaded data
   */
  getStats(): { totalPostalCodes: number } {
    return { totalPostalCodes: this.store?.count() ?? 0 };
  }

  /**
   * Validate Canadian postal code format (canonical validator in lib/postal.ts)
   */
  static isValidCanadianPostalCode(postalCode: string): boolean {
    return isValidPostalCode(postalCode);
  }

  /**
   * Normalize Canadian postal code format (canonical normalizer in lib/postal.ts)
   */
  static normalizePostalCode(postalCode: string): string {
    return normalizePostalCode(postalCode);
  }
}

// Singleton instance
const localPostalLookup = new LocalPostalLookup();

// Export functions
export type { PostalCodeData } from './postalLookupCore';

export async function getCoordinatesFromPostalCodeLocal(postalCode: string): Promise<PostalCodeData | null> {
  await localPostalLookup.waitForLoad();
  return localPostalLookup.getCoordinates(postalCode);
}

export function isLocalDataLoaded(): boolean {
  return localPostalLookup.isLoaded();
}

export function getLocalDataStats(): { totalPostalCodes: number } {
  return localPostalLookup.getStats();
}

export { LocalPostalLookup };
