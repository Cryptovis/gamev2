// Phase 9.9: where the simulation core runs. Both hosts speak the same protocol, so the controller cannot tell them apart.

import type { SimRequest, SimResponse, SimulationHost } from './protocol';
import { SimulationCore } from './simulationCore';

/** The subset of the Worker API the host needs; a test hands in a fake. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: SimResponse }) => void): void;
  addEventListener(type: 'error' | 'messageerror', listener: (event: unknown) => void): void;
  terminate(): void;
}

/** A real (module) Web Worker. */
export class WorkerHost implements SimulationHost {
  readonly kind = 'worker' as const;
  private handlers = new Set<(message: SimResponse) => void>();
  private worker: WorkerLike;
  constructor(factory: () => WorkerLike) {
    this.worker = factory();
    this.worker.addEventListener('message', event => { for (const handler of [...this.handlers]) handler(event.data); });
    const fail = (event: unknown) => {
      const message = event && typeof event === 'object' && 'message' in event ? String((event as { message: unknown }).message) : 'The simulation worker failed.';
      for (const handler of [...this.handlers]) handler({ type: 'error', message });
    };
    this.worker.addEventListener('error', fail);
    this.worker.addEventListener('messageerror', fail);
  }
  post(message: SimRequest) { this.worker.postMessage(message); }
  listen(handler: (message: SimResponse) => void) { this.handlers.add(handler); return () => { this.handlers.delete(handler); }; }
  terminate() { this.handlers.clear(); this.worker.terminate(); }
}

/**
 * The same core on the calling thread: the headless fallback (vitest, environments without Workers) and the test double.
 * Replies come back asynchronously, as they would from a worker. With `manual` set they wait for flush(), so a test can
 * place commands inside the window while a tick is "in flight".
 */
export class MainThreadHost implements SimulationHost {
  readonly kind = 'main' as const;
  readonly core: SimulationCore;
  private handlers = new Set<(message: SimResponse) => void>();
  private queue: SimResponse[] = [];
  private closed = false;
  constructor(private readonly manual = false, now?: () => number) {
    this.core = new SimulationCore(now);
    this.deliver(this.core.hello());
  }
  private deliver(message: SimResponse) {
    this.queue.push(message);
    if (!this.manual) queueMicrotask(() => this.flush());
  }
  /** Hands every waiting reply to the listeners. */
  flush() {
    const waiting = this.queue.splice(0);
    if (this.closed) return;
    for (const message of waiting) for (const handler of [...this.handlers]) handler(message);
  }
  post(message: SimRequest) { if (!this.closed) this.deliver(this.core.handle(message)); }
  listen(handler: (message: SimResponse) => void) { this.handlers.add(handler); return () => { this.handlers.delete(handler); }; }
  terminate() { this.closed = true; this.handlers.clear(); this.queue = []; }
  get pending() { return this.queue.length; }
}

/** The production worker. Only called in a browser, and lazily, so tests and the headless build never evaluate the URL. */
export const createBrowserWorker = (): WorkerLike => new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
