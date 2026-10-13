import { LocaleText, translateLive } from "../i18n/localeText";
import { useEffect, useRef, useState } from "react";
import type { GeoProjection } from "d3-geo";
export const BLUE_MARBLE_SRC = "/assets/geography/blue-marble-surface.svg";
// Decoded textures by source URL, so the surface and the relief layer each load (and cache) their own image once.
const textures = new Map<string, ImageData>();
const loading = new Map<string, Promise<ImageData>>();
function loadTexture(src: string) {
  const ready = textures.get(src);
  if (ready) return Promise.resolve(ready);
  let pending = loading.get(src);
  if (!pending) {
    pending = new Promise<ImageData>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext("2d");
        if (!ctx) {
          loading.delete(src);
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        textures.set(src, data);
        resolve(data);
      };
      image.onerror = () => {
        loading.delete(src);
        reject(new Error("Geographic imagery unavailable"));
      };
      image.src = src;
    });
    loading.set(src, pending);
  }
  return pending;
}
export function GeographicSurface({
  projection,
  flat,
  pan,
  zoom,
  onReady,
  src = BLUE_MARBLE_SRC,
  variant = "surface",
}: {
  projection: GeoProjection;
  flat: boolean;
  pan: { x: number; y: number };
  zoom: number;
  onReady: () => void;
  /** Texture to reproject. Default: the Blue Marble surface. */
  src?: string;
  /** 'relief' is the greyscale hillshade layer: it reuses the same reprojection, renders a smaller full frame and never shows a loading label. */
  variant?: "surface" | "relief";
}) {
  const isRelief = variant === "relief",
    mode = isRelief ? "relief" : "color",
    fullWidth = isRelief ? 960 : 1200,
    fullHeight = isRelief ? 560 : 700;
  const [raster, setRaster] = useState<string | null>(null),
    [failed, setFailed] = useState(false),
    [source, setSource] = useState<ImageData | null>(textures.get(src) ?? null),
    worker = useRef<Worker | null>(null),
    url = useRef<string | null>(null),
    ready = useRef(onReady),
    sequence = useRef(0),
    busy = useRef(false),
    runningId = useRef(0),
    queued = useRef<any>(null),
    fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  ready.current = onReady;
  useEffect(() => {
    let alive = true;
    loadTexture(src)
      .then((s) => {
        if (alive) setSource(s);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [src]);
  useEffect(() => {
    if (!source) return;
    let alive = true;
    const display = (
      blob: Blob,
      id: number,
      duration: number,
      width: number,
      usedWorker: boolean,
    ) => {
      if (!alive || id !== sequence.current) return;
      const next = URL.createObjectURL(blob),
        previous = url.current;
      url.current = next;
      setRaster(next);
      if (previous) URL.revokeObjectURL(previous);
      ready.current();
      window.dispatchEvent(
        new CustomEvent("geographic-frame", {
          detail: { duration, width, worker: usedWorker, variant },
        }),
      );
    };
    const fallback = async (m: any) => {
      try {
        const start = performance.now(),
          { renderSurface } = await import("./surfaceRaster");
        if (!alive || m.id !== sequence.current) return;
        const pixels = renderSurface(source, m.view, 600, 350, undefined, 0, 350, mode),
          canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 350;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.putImageData(new ImageData(pixels, 600, 350), 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob)
              display(blob, m.id, performance.now() - start, 600, false);
          },
          "image/webp",
          0.9,
        );
      } catch {
        if (alive) setFailed(true);
      }
    };
    const submit = (m: any) => {
      if (!alive) return;
      if (worker.current) {
        if (busy.current) {
          queued.current = m;
          if (m.id > runningId.current)
            worker.current.postMessage({ type: "cancel", id: m.id });
          return;
        }
        busy.current = true;
        runningId.current = m.id;
        worker.current.postMessage(m);
      } else {
        if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        fallbackTimer.current = setTimeout(() => fallback(m), 60);
      }
    };
    queued.current = null;
    busy.current = false;
    if (
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined"
    ) {
      try {
        const w = new Worker(
          new URL("./geographic.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.current = w;
        const copy = source.data.slice();
        w.postMessage(
          {
            type: "texture",
            width: source.width,
            height: source.height,
            data: copy.buffer,
          },
          [copy.buffer],
        );
        w.onmessage = (event) => {
          busy.current = false;
          if (event.data.error) {
            w.terminate();
            worker.current = null;
            if (queued.current) submit(queued.current);
            else setFailed(true);
            return;
          }
          if (!event.data.cancelled)
            display(
              event.data.blob,
              event.data.id,
              event.data.duration,
              event.data.width,
              true,
            );
          if (queued.current) {
            const m = queued.current;
            queued.current = null;
            submit(m);
          }
        };
        w.onerror = () => {
          w.terminate();
          worker.current = null;
          busy.current = false;
          if (queued.current) submit(queued.current);
        };
      } catch {
        worker.current = null;
      }
    }
    sender.current = submit;
    return () => {
      alive = false;
      worker.current?.terminate();
      worker.current = null;
      sender.current = null;
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, [source]);
  const sender = useRef<((m: any) => void) | null>(null);
  useEffect(() => {
    if (!source) return;
    const view = {
        flat,
        pan,
        zoom,
        rotate: projection.rotate(),
        scale: projection.scale(),
        translate: projection.translate(),
      },
      id = ++sequence.current;
    sender.current?.({ type: "render", view, id, mode, width:url.current?480:720, height:url.current?280:420 });
    const settle = setTimeout(
      () =>
        sender.current?.({
          type: "render",
          view,
          id,
          mode,
          width: fullWidth,
          height: fullHeight,
        }),
      180,
    );
    return () => clearTimeout(settle);
  }, [source, projection, flat, pan.x, pan.y, zoom]);
  if (isRelief)
    // Decorative shading: no label, no loading or failure text; the map is complete without it.
    return raster ? (
      <image
        data-relief-render="worker-ready"
        x="0"
        y="0"
        width="1200"
        height="700"
        href={raster}
        pointerEvents="none"
        aria-hidden="true"
      />
    ) : null;
  return raster ? (
    <image
      data-geographic-render="worker-ready"
      x="0"
      y="0"
      width="1200"
      height="700"
      href={raster}
      pointerEvents="none"
      aria-label={translateLive("NASA Blue Marble geographic surface")}
    />
  ) : (
    <text x="600" y="670" textAnchor="middle" fill="#f5d38d" fontSize="12">
      <LocaleText
        value={
          failed
            ? "Satellite texture unavailable · terrain fallback active"
            : "Loading satellite surface…"
        }
      />
    </text>
  );
}
