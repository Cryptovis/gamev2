// Phase 9.9: the module Web Worker entry. Vite bundles it from `new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' })`
// (see workerHost.ts). It must stay free of DOM globals: the engine runs here without a window or a document.

import type { SimRequest, SimResponse } from './protocol';
import { SimulationCore } from './simulationCore';

interface WorkerScope {
  postMessage(message: SimResponse): void;
  onmessage: ((event: { data: SimRequest }) => void) | null;
}
const scope = self as unknown as WorkerScope;
const core = new SimulationCore();
scope.onmessage = event => scope.postMessage(core.handle(event.data));
scope.postMessage(core.hello());
