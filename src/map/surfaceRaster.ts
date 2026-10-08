import { geoNaturalEarth1, geoOrthographic } from "d3-geo";
export interface SurfaceView {
  flat: boolean;
  rotate: [number, number, number];
  scale: number;
  translate: [number, number];
  pan: { x: number; y: number };
  zoom: number;
}
export function renderSurface(
  source: { width: number; height: number; data: Uint8ClampedArray },
  view: SurfaceView,
  width: number,
  height: number,
  existing?: Uint8ClampedArray<ArrayBuffer>,
  startRow = 0,
  endRow = height,
) {
  const projection = (view.flat ? geoNaturalEarth1() : geoOrthographic())
      .rotate(view.rotate)
      .translate(view.translate)
      .scale(view.scale),
    pixels = existing ?? new Uint8ClampedArray(width * height * 4),
    src = source.data;
  for (let y = startRow; y < endRow; y++)
    for (let x = 0; x < width; x++) {
      let sx = ((x + 0.5) * 1200) / width,
        sy = ((y + 0.5) * 700) / height;
      if (view.flat) {
        sx = 600 + (sx - view.pan.x - 600) / view.zoom;
        sy = 350 + (sy - view.pan.y - 350) / view.zoom;
      } else if (
        (sx - view.translate[0]) ** 2 + (sy - view.translate[1]) ** 2 >
        view.scale ** 2
      )
        continue;
      const geo = projection.invert?.([sx, sy]);
      if (
        !geo ||
        !geo.every(Number.isFinite) ||
        Math.abs(geo[0]) > 180 ||
        Math.abs(geo[1]) > 90
      )
        continue;
      const check = projection(geo);
      if (!check || Math.hypot(check[0] - sx, check[1] - sy) > 1) continue;
      const fx = ((geo[0] + 180) / 360) * source.width - 0.5,
        fy = Math.max(
          0,
          Math.min(
            source.height - 1,
            ((90 - geo[1]) / 180) * source.height - 0.5,
          ),
        ),
        x0 = (Math.floor(fx) + source.width) % source.width,
        x1 = (x0 + 1) % source.width,
        y0 = Math.floor(fy),
        y1 = Math.min(source.height - 1, y0 + 1),
        dx = fx - Math.floor(fx),
        dy = fy - y0,
        to = (y * width + x) * 4;
      const shade = view.flat
        ? 0.91
        : 0.76 +
          0.18 *
            Math.sqrt(
              Math.max(
                0,
                1 -
                  ((sx - view.translate[0]) ** 2 +
                    (sy - view.translate[1]) ** 2) /
                    view.scale ** 2,
              ),
            );
      for (let channel = 0; channel < 3; channel++) {
        const sample =
          (src[(y0 * source.width + x0) * 4 + channel] * (1 - dx) +
            src[(y0 * source.width + x1) * 4 + channel] * dx) *
            (1 - dy) +
          (src[(y1 * source.width + x0) * 4 + channel] * (1 - dx) +
            src[(y1 * source.width + x1) * 4 + channel] * dx) *
            dy;
        pixels[to + channel] = sample * shade;
      }
      pixels[to + 3] = 255;
    }
  return pixels;
}
