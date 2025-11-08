"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pica from "pica";

// Lazy import to avoid SSR issues
let pipeline: any;

// Simple HDR-style tonemapping (Reinhard) and warm grade
function applyHDRAndWarmthToCanvas(inputCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = inputCanvas.width;
  const h = inputCanvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ictx = inputCanvas.getContext("2d", { willReadFrequently: true })!;
  const octx = out.getContext("2d")!;

  const img = ictx.getImageData(0, 0, w, h);
  const data = img.data;
  const exposure = 1.15; // mild exposure boost
  const white = 4.0; // reinhard white point
  const warm = 1.04; // red/green warmth multiplier
  const contrast = 1.06;
  const gamma = 0.95;

  for (let i = 0; i < data.length; i += 4) {
    // sRGB -> linear
    let r = Math.pow(data[i] / 255, 2.2);
    let g = Math.pow(data[i + 1] / 255, 2.2);
    let b = Math.pow(data[i + 2] / 255, 2.2);

    // exposure
    r *= exposure; g *= exposure; b *= exposure;

    // Reinhard tonemap per channel (approximation)
    const tonemap = (x: number) => (x * (1 + x / (white * white))) / (1 + x);
    r = tonemap(r); g = tonemap(g); b = tonemap(b);

    // subtle warmth
    r *= warm; g *= (warm * 0.995);

    // contrast in linear-ish space
    const adjustContrast = (x: number) => {
      const mid = 0.5;
      return (x - mid) * contrast + mid;
    };
    r = adjustContrast(r); g = adjustContrast(g); b = adjustContrast(b);

    // clamp
    r = Math.min(Math.max(r, 0), 1);
    g = Math.min(Math.max(g, 0), 1);
    b = Math.min(Math.max(b, 0), 1);

    // linear -> sRGB + gamma tweak
    data[i] = Math.round(Math.pow(r, 1 / (2.2 * gamma)) * 255);
    data[i + 1] = Math.round(Math.pow(g, 1 / (2.2 * gamma)) * 255);
    data[i + 2] = Math.round(Math.pow(b, 1 / (2.2 * gamma)) * 255);
    // alpha unchanged
  }

  octx.putImageData(img, 0, 0);
  return out;
}

async function loadPipeline() {
  if (!pipeline) {
    const mod = await import("@xenova/transformers");
    const { pipeline: pp } = mod as any;
    pipeline = await pp("text-to-image", "Xenova/stable-diffusion-turbo", {
      // Enable browser-friendly execution
      device: "webgpu",
      quantized: true,
      // Fallbacks handled internally by transformers.js
    });
  }
  return pipeline;
}

function useIsWebGPUAvailable() {
  return useMemo(() => typeof navigator !== 'undefined' && (navigator as any).gpu, []);
}

export default function Generator({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [imgURL, setImgURL] = useState<string | null>(null);
  const [downURL, setDownURL] = useState<string | null>(null);
  const isWebGPU = useIsWebGPUAvailable();
  const pica = useMemo(() => Pica({ features: ["js", "wasm"] }), []);
  const abortRef = useRef<AbortController | null>(null);

  const baseWidth = 1024; // 16:9 base for turbo
  const baseHeight = 576;

  const targetWidth = 7680; // 8K UHD
  const targetHeight = 4320;

  const handleGenerate = useCallback(async () => {
    setError(null);
    setImgURL(null);
    setDownURL(null);

    try {
      setStatus(isWebGPU ? "Loading model (WebGPU)?" : "Loading model (CPU/WASM)?");
      const pipe: any = await loadPipeline();

      setStatus("Generating base image?");
      const output: any = await pipe(prompt, {
        height: baseHeight,
        width: baseWidth,
        guidance_scale: 0.0, // turbo works well with low guidance
        num_inference_steps: 2,
        negative_prompt: [
          'lowres, blurry, deformed, text artifacts, watermark, extra limbs, disfigured, bad anatomy, bad hands, duplicate, cropped, worst quality, low quality, jpeg artifacts'
        ].join(', ')
      });

      // Convert output to canvas
      let baseCanvas: HTMLCanvasElement | null = null;
      if (output?.toCanvas) {
        baseCanvas = await output.toCanvas();
      } else if (output?.image?.toCanvas) {
        baseCanvas = await output.image.toCanvas();
      } else if (output instanceof HTMLCanvasElement) {
        baseCanvas = output;
      } else if (output?.canvas instanceof HTMLCanvasElement) {
        baseCanvas = output.canvas;
      } else {
        // Try ImageData
        if (output?.data && output?.width && output?.height) {
          const c = document.createElement('canvas');
          c.width = output.width; c.height = output.height;
          const ctx = c.getContext('2d')!;
          const id = new ImageData(output.data, output.width, output.height);
          ctx.putImageData(id, 0, 0);
          baseCanvas = c;
        }
      }

      if (!baseCanvas) throw new Error('Unable to read generated image.');

      setStatus("Applying HDR tonemapping?");
      const hdrCanvas = applyHDRAndWarmthToCanvas(baseCanvas);

      setStatus("Upscaling to 8K (this can take a while)?");
      const upCanvas = document.createElement('canvas');
      upCanvas.width = targetWidth;
      upCanvas.height = targetHeight;
      await pica.resize(hdrCanvas, upCanvas, { quality: 3, alpha: false });

      setStatus("Encoding final image?");
      const blob: Blob = await new Promise((resolve) => upCanvas.toBlob(b => resolve(b as Blob), 'image/jpeg', 0.92));
      const url = URL.createObjectURL(blob);
      setImgURL(url);
      setDownURL(url);
      setStatus("Done");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Unexpected error');
      setStatus("Error");
    }
  }, [prompt, isWebGPU, pica]);

  return (
    <section>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={handleGenerate} style={{ padding: '10px 16px', borderRadius: 8, background: '#111', color: 'white', border: '1px solid #000', cursor: 'pointer' }}>
          Generate 8K Render
        </button>
        <span style={{ opacity: 0.8 }}>Status: {status}</span>
        {isWebGPU ? <span style={{ padding: '2px 8px', background: '#e6ffea', borderRadius: 6, color: '#14532d' }}>WebGPU</span> : <span style={{ padding: '2px 8px', background: '#fff7ed', borderRadius: 6, color: '#7c2d12' }}>CPU/WASM</span>}
        {downURL && (
          <a href={downURL} download="rajasthani-cinematic-8k.jpg" style={{ marginLeft: 'auto', textDecoration: 'none', color: '#2563eb', fontWeight: 600 }}>
            Download 8K JPG
          </a>
        )}
      </div>
      {error && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</div>}
      {imgURL && (
        <img
          src={imgURL}
          alt="Cinematic 8K Render"
          style={{ width: '100%', height: 'auto', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
        />
      )}
      {!imgURL && (
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          border: '1px dashed #cbd5e1',
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          color: '#64748b'
        }}>
          8K result preview will appear here
        </div>
      )}
    </section>
  );
}
