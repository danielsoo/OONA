"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "./CinematicHomePage.module.css";

const PAGE_COLOR = [7, 17, 27];
// These stops match heroShade. Sampling includes its two overlays so the
// background starts at the displayed edge color, not the unshaded source color.
const SHADE_STOPS = [[0, 0.94], [0.25, 0.6], [0.58, 0.08], [1, 0.45]];

export default function HeroBackgroundFade({ imageRef, source }: {
  imageRef: RefObject<HTMLImageElement | null>;
  source: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    let frame = 0;

    const draw = () => {
      if (!image.complete || !image.naturalWidth) return;
      const bounds = image.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * density);
      const height = Math.round(canvas.getBoundingClientRect().height * density);
      if (!width || !height) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = width;
      canvas.height = height;

      const sample = document.createElement("canvas");
      sample.width = width;
      sample.height = 1;
      const sampler = sample.getContext("2d", { willReadFrequently: true });
      if (!sampler) return;

      // Reproduce object-fit: cover and the responsive object-position, then
      // read only the final visible row. No image pixels are drawn below it.
      const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      const position = getComputedStyle(image).objectPosition.split(" ").map(parseFloat);
      const left = (bounds.width - image.naturalWidth * scale) * position[0] / 100;
      const top = (bounds.height - image.naturalHeight * scale) * position[1] / 100;
      sampler.drawImage(image, left * density, (top - bounds.height) * density + 1,
        image.naturalWidth * scale * density, image.naturalHeight * scale * density);
      let pixels: Uint8ClampedArray;
      try {
        pixels = sampler.getImageData(0, 0, width, 1).data;
      } catch {
        // A future cross-origin slide may not allow sampling; leave the page
        // background visible instead of painting a mismatched fallback strip.
        context.clearRect(0, 0, width, height);
        return;
      }

      const edge = new Float64Array(width * 3);
      const sums = new Float64Array((width + 1) * 3);
      for (let x = 0; x < width; x++) {
        const fraction = x / Math.max(1, width - 1);
        const next = SHADE_STOPS.findIndex(([stop]) => stop >= fraction);
        const [end, endAlpha] = SHADE_STOPS[Math.max(1, next)];
        const [start, startAlpha] = SHADE_STOPS[Math.max(1, next) - 1];
        const alpha = startAlpha + (endAlpha - startAlpha) * (fraction - start) / (end - start);
        for (let c = 0; c < 3; c++) {
          const shaded = pixels[x * 4 + c] * 0.88 + [1, 7, 13][c] * 0.12;
          edge[x * 3 + c] = shaded * (1 - alpha) + [1, 8, 14][c] * alpha;
          sums[(x + 1) * 3 + c] = sums[x * 3 + c] + edge[x * 3 + c];
        }
      }

      const output = context.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        const depth = y / density;
        const t = y / Math.max(1, height - 1);
        const fade = (1 - t) ** 3;
        const radius = Math.round(depth * 2.5 * density);
        const diffusion = 1 - Math.exp(-depth / 3);
        for (let x = 0; x < width; x++) {
          const from = Math.max(0, x - radius);
          const to = Math.min(width, x + radius + 1);
          // Subpixel dithering avoids long, visible 8-bit color bands. It fades
          // to zero at both ends so the first/last rows retain their exact color.
          let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
          hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
          const noise = (((hash >>> 0) / 4294967295) - 0.5) * Math.min(1, depth / 4) * (1 - t);
          for (let c = 0; c < 3; c++) {
            const average = (sums[to * 3 + c] - sums[from * 3 + c]) / (to - from);
            const color = edge[x * 3 + c] * (1 - diffusion) + average * diffusion;
            output.data[(y * width + x) * 4 + c] = PAGE_COLOR[c] + (color - PAGE_COLOR[c]) * fade + noise;
          }
          output.data[(y * width + x) * 4 + 3] = 255;
        }
      }
      context.putImageData(output, 0, 0);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(image);
    image.addEventListener("load", schedule);
    image.addEventListener("animationend", schedule);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      image.removeEventListener("load", schedule);
      image.removeEventListener("animationend", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [imageRef, source]);

  return <canvas ref={canvasRef} className={styles.heroBackgroundFade} aria-hidden="true" />;
}
