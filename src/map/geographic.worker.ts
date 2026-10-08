import { renderSurface, type SurfaceView } from "./surfaceRaster";
let source: { width: number; height: number; data: Uint8ClampedArray } | null =
    null,
  latest = 0;
self.onmessage = async (event: MessageEvent) => {
  const m = event.data;
  if (m.type === "texture") {
    source = {
      width: m.width,
      height: m.height,
      data: new Uint8ClampedArray(m.data),
    };
    return;
  }
  if (m.type === "cancel") {
    latest = Math.max(latest, m.id);
    return;
  }
  if (!source) return;
  latest = Math.max(latest, m.id);
  try {
    const start = performance.now(),
      pixels = new Uint8ClampedArray(m.width * m.height * 4);
    for (let row = 0; row < m.height; row += 24) {
      renderSurface(
        source,
        m.view as SurfaceView,
        m.width,
        m.height,
        pixels,
        row,
        Math.min(m.height, row + 24),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (m.id < latest) {
        self.postMessage({ id: m.id, cancelled: true });
        return;
      }
    }
    const canvas = new OffscreenCanvas(m.width, m.height),
      ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Offscreen canvas unavailable");
    ctx.putImageData(new ImageData(pixels, m.width, m.height), 0, 0);
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: 0.9,
    });
    self.postMessage({
      id: m.id,
      blob,
      duration: performance.now() - start,
      width: m.width,
    });
  } catch (error) {
    self.postMessage({ id: m.id, error: String(error) });
  }
};
