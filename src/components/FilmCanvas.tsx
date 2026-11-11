import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SensitometryParams, Matrix3x3, ColorGradingParams, OpticalArtifactsParams, PixelProbeData } from '../color-science/types.ts';
import { transformPixel, LUMA_R, LUMA_G, LUMA_B, clamp } from '../color-science/transferFunctions.ts';
import { SceneType, SCENE_DEFINITIONS } from '../color-science/intensityTable.ts';
import { MACBETH_COLOR_CHECKER_PATCHES } from '../color-science/colorCheckerData.ts';
import { Upload, Eye, Columns, SplitSquareVertical, Sparkles, Crosshair, Table, SlidersHorizontal, RotateCcw, Dices, Download, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { GraphicOverlayType, OverlayBlendMode, applyGraphicOverlay } from '../color-science/graphicOverlay.ts';

const TEST_IMAGES = [
  {
    id: 'portrait',
    label: 'Portrait (Skin Tones)',
    src: '/src/assets/images/portrait_skin_tone_test_1794287470317.jpg',
    defaultScene: 'portrait' as SceneType,
  },
  {
    id: 'night_street',
    label: 'Night City (Halation & High Contrast)',
    src: '/src/assets/images/cinematic_street_night_1794287471294.jpg',
    defaultScene: 'night' as SceneType,
  },
  {
    id: 'landscape',
    label: 'Mountain Vista (Sky & Cloud Roll-Off)',
    src: '/src/assets/images/landscape_dynamic_range_1794287471178.jpg',
    defaultScene: 'landscape-sky' as SceneType,
  },
  {
    id: 'benidorm',
    label: 'Benidorm (Carmencita IG Post)',
    src: '/benidorm_ref.jpg',
    defaultScene: 'street' as SceneType,
  },
  {
    id: 'macbeth',
    label: 'Macbeth 24-Patch ColorChecker',
    src: 'synthetic_macbeth',
    defaultScene: 'portrait' as SceneType,
  },
];

interface FilmCanvasProps {
  sensitometry: SensitometryParams;
  colorMatrix: Matrix3x3;
  colorGrading: ColorGradingParams;
  opticalArtifacts: OpticalArtifactsParams;
  targetColorSpace: string;
  intensity: number; // 0.0 to 1.0
  onIntensityChange: (intensity: number) => void;
  scene: SceneType;
  onSceneChange: (scene: SceneType) => void;
  calibratedIntensity: number; // P0 lookup value
  onOpenIntensityTable: () => void;
  onProbePixel?: (probe: PixelProbeData | null) => void;
  onImageLoaded?: (canvas: HTMLCanvasElement) => void;
  presetId?: string;
}

export const FilmCanvas: React.FC<FilmCanvasProps> = ({
  sensitometry,
  colorMatrix,
  colorGrading,
  opticalArtifacts,
  targetColorSpace,
  intensity,
  onIntensityChange,
  scene,
  onSceneChange,
  calibratedIntensity,
  onOpenIntensityTable,
  onProbePixel,
  onImageLoaded,
  presetId,
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string>('portrait');
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'graded' | 'original' | 'false-color'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [probeData, setProbeData] = useState<PixelProbeData | null>(null);

  // Graphic Overlay Layer State (Pre-exposed film pattern)
  const [overlayType, setOverlayType] = useState<GraphicOverlayType>('none');
  const [overlayBlendMode, setOverlayBlendMode] = useState<OverlayBlendMode>('screen');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [overlaySeed, setOverlaySeed] = useState<number>(42);
  const [overlayTint, setOverlayTint] = useState<'authentic' | 'white'>('authentic');
  const [showOverlayControls, setShowOverlayControls] = useState<boolean>(true);
  const [canvasScaleMode, setCanvasScaleMode] = useState<'fit' | 'full'>('fit');

  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rawImageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gradedImageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load image onto source canvas
  useEffect(() => {
    let active = true;

    if (selectedImageId === 'macbeth') {
      const w = 720;
      const h = 480;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        const cols = 6;
        const rows = 4;
        const padding = 24;
        const patchGap = 12;
        const patchW = (w - padding * 2 - (cols - 1) * patchGap) / cols;
        const patchH = (h - padding * 2 - (rows - 1) * patchGap) / rows;

        MACBETH_COLOR_CHECKER_PATCHES.forEach((p, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const px = padding + c * (patchW + patchGap);
          const py = padding + r * (patchH + patchGap);
          ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
          ctx.fillRect(px, py, patchW, patchH);

          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, patchW, patchH);
        });
      }
      rawImageCanvasRef.current = canvas;
      if (onImageLoaded) onImageLoaded(canvas);
      processGrading();
      return;
    }

    const currentSrc = selectedImageId === 'custom' ? customImageSrc : TEST_IMAGES.find((t) => t.id === selectedImageId)?.src;
    if (!currentSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentSrc;
    img.onload = () => {
      if (!active) return;
      const maxDim = 960;
      let w = img.naturalWidth || 800;
      let h = img.naturalHeight || 600;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const rawCanvas = document.createElement('canvas');
      rawCanvas.width = w;
      rawCanvas.height = h;
      const ctx = rawCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
      }
      rawImageCanvasRef.current = rawCanvas;
      if (onImageLoaded) onImageLoaded(rawCanvas);
      processGrading();
    };

    return () => {
      active = false;
    };
  }, [selectedImageId, customImageSrc]);

  // Execute Color Science Grading Transformation on pixels
  const processGrading = useCallback(() => {
    const rawCanvas = rawImageCanvasRef.current;
    if (!rawCanvas) return;

    const w = rawCanvas.width;
    const h = rawCanvas.height;
    const rawCtx = rawCanvas.getContext('2d');
    if (!rawCtx) return;

    setIsProcessing(true);

    const srcImageData = rawCtx.getImageData(0, 0, w, h);
    const srcData = srcImageData.data;

    const gradedCanvas = document.createElement('canvas');
    gradedCanvas.width = w;
    gradedCanvas.height = h;
    const gradedCtx = gradedCanvas.getContext('2d');
    if (!gradedCtx) return;

    const outImageData = gradedCtx.createImageData(w, h);
    const outData = outImageData.data;

    // First Pass: Apply Color Science Transform with Intensity Blend
    for (let i = 0; i < srcData.length; i += 4) {
      const r = srcData[i] / 255.0;
      const g = srcData[i + 1] / 255.0;
      const b = srcData[i + 2] / 255.0;

      const [trR, trG, trB] = transformPixel(
        r,
        g,
        b,
        sensitometry,
        colorMatrix,
        colorGrading,
        targetColorSpace,
        intensity
      );

      outData[i] = Math.round(trR * 255.0);
      outData[i + 1] = Math.round(trG * 255.0);
      outData[i + 2] = Math.round(trB * 255.0);
      outData[i + 3] = srcData[i + 3];
    }

    // Second Pass: Optical Artifacts (Gentle halation & grain scaled by intensity)
    const hasHalation = opticalArtifacts.halationIntensity > 0.01 && intensity > 0.1;
    const hasGrain = opticalArtifacts.grainIntensity > 0.01 && intensity > 0.1;

    if (hasHalation || hasGrain) {
      const grainFactor = opticalArtifacts.grainIntensity * 255.0 * intensity * 0.7;

      for (let i = 0; i < outData.length; i += 4) {
        const r = outData[i];
        const g = outData[i + 1];
        const b = outData[i + 2];
        const lum = (LUMA_R * r + LUMA_G * g + LUMA_B * b) / 255.0;

        // Controlled soft halation bloom (anti-burn)
        if (hasHalation && lum > opticalArtifacts.halationThreshold) {
          const excess = (lum - opticalArtifacts.halationThreshold) / (1.0 - opticalArtifacts.halationThreshold);
          const halationRed = excess * opticalArtifacts.halationIntensity * 40.0 * intensity;
          const halationGreen = excess * opticalArtifacts.halationIntensity * 14.0 * intensity;
          outData[i] = Math.min(252, r + halationRed);
          outData[i + 1] = Math.min(252, g + halationGreen);
        }

        // Silver halide film grain in midtones
        if (hasGrain) {
          const midWeight = Math.sin(lum * Math.PI);
          const hashVal = ((i * 1234567 + 9876543) % 1000) / 500.0 - 1.0;
          const grain = hashVal * grainFactor * midWeight;
          outData[i] = clamp(outData[i] + grain, 0, 255);
          outData[i + 1] = clamp(outData[i + 1] + grain, 0, 255);
          outData[i + 2] = clamp(outData[i + 2] + grain, 0, 255);
        }
      }
    }

    gradedCtx.putImageData(outImageData, 0, 0);

    // Third Pass: Pre-exposed Graphic Overlay Layer (Screen / Additive Blend)
    if (overlayType !== 'none' && overlayOpacity > 0.01) {
      applyGraphicOverlay(gradedCanvas, {
        type: overlayType,
        blendMode: overlayBlendMode,
        opacity: overlayOpacity * Math.min(1.0, intensity * 1.15),
        seed: overlaySeed,
        colorTint: overlayTint,
      });
    }

    gradedImageCanvasRef.current = gradedCanvas;
    setIsProcessing(false);
    renderDisplay();
  }, [
    sensitometry,
    colorMatrix,
    colorGrading,
    opticalArtifacts,
    targetColorSpace,
    intensity,
    overlayType,
    overlayBlendMode,
    overlayOpacity,
    overlaySeed,
    overlayTint,
  ]);

  // Synchronize overlay pattern when selecting RETOCOLOR film stocks
  useEffect(() => {
    if (presetId === 'retocolor-bling-400') {
      setOverlayType('bling-bling');
      setOverlayBlendMode('screen');
      setOverlayOpacity(0.85);
    } else if (presetId === 'retocolor-catcha-400') {
      setOverlayType('catcha');
      setOverlayBlendMode('screen');
      setOverlayOpacity(0.85);
    } else if (presetId === 'retocolor-emoticon-400') {
      setOverlayType('emoticon');
      setOverlayBlendMode('screen');
      setOverlayOpacity(0.85);
    }
  }, [presetId]);

  useEffect(() => {
    processGrading();
  }, [processGrading]);

  // Render to display canvas
  const renderDisplay = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    const rawCanvas = rawImageCanvasRef.current;
    const gradedCanvas = gradedImageCanvasRef.current;

    if (!displayCanvas || !rawCanvas || !gradedCanvas) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    const w = rawCanvas.width;
    const h = rawCanvas.height;

    if (viewMode === 'side-by-side') {
      displayCanvas.width = w * 2;
      displayCanvas.height = h;
      ctx.clearRect(0, 0, w * 2, h);

      ctx.drawImage(rawCanvas, 0, 0);
      ctx.drawImage(gradedCanvas, w, 0);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.lineTo(w, h);
      ctx.stroke();

      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(8, 8, 80, 22);
      ctx.fillRect(w + 8, 8, 120, 22);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('ORIGINAL', 16, 23);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`GRADED (${Math.round(intensity * 100)}%)`, w + 14, 23);
      return;
    }

    displayCanvas.width = w;
    displayCanvas.height = h;
    ctx.clearRect(0, 0, w, h);

    if (viewMode === 'original') {
      ctx.drawImage(rawCanvas, 0, 0);
      return;
    }

    if (viewMode === 'graded') {
      ctx.drawImage(gradedCanvas, 0, 0);
      return;
    }

    if (viewMode === 'false-color') {
      const gradedCtx = gradedCanvas.getContext('2d');
      if (!gradedCtx) return;
      const imgData = gradedCtx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const fcData = ctx.createImageData(w, h);
      const fc = fcData.data;

      for (let i = 0; i < data.length; i += 4) {
        const lum = (LUMA_R * data[i] + LUMA_G * data[i + 1] + LUMA_B * data[i + 2]) / 255.0;

        if (lum < 0.02) {
          fc[i] = 16; fc[i + 1] = 44; fc[i + 2] = 180;
        } else if (lum < 0.18) {
          fc[i] = 20; fc[i + 1] = 160; fc[i + 2] = 180;
        } else if (lum >= 0.18 && lum <= 0.22) {
          fc[i] = 34; fc[i + 1] = 197; fc[i + 2] = 94;
        } else if (lum > 0.45 && lum < 0.65) {
          fc[i] = 236; fc[i + 1] = 72; fc[i + 2] = 153;
        } else if (lum > 0.85 && lum < 0.98) {
          fc[i] = 245; fc[i + 1] = 158; fc[i + 2] = 11;
        } else if (lum >= 0.98) {
          fc[i] = 239; fc[i + 1] = 68; fc[i + 2] = 68;
        } else {
          const m = Math.round(lum * 180);
          fc[i] = m; fc[i + 1] = m; fc[i + 2] = m;
        }
        fc[i + 3] = 255;
      }
      ctx.putImageData(fcData, 0, 0);
      return;
    }

    // Default: 'split' curtain
    const splitX = Math.round(w * splitPos);
    ctx.drawImage(gradedCanvas, 0, 0);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.drawImage(rawCanvas, 0, 0);
    ctx.restore();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(8, 8, 70, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ORIGINAL', 14, 22);

    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(w - 94, 8, 86, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`GRADED (${Math.round(intensity * 100)}%)`, w - 88, 22);
  }, [viewMode, splitPos, intensity]);

  useEffect(() => {
    renderDisplay();
  }, [renderDisplay]);

  // Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode !== 'split') return;
    setIsDraggingSplit(true);
    updateSplitFromPointer(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSplit) {
      updateSplitFromPointer(e.clientX);
    }
    samplePixelUnderPointer(e);
  };

  const handleMouseUp = () => {
    setIsDraggingSplit(false);
  };

  const updateSplitFromPointer = (clientX: number) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    setSplitPos(clamp(relX, 0.05, 0.95));
  };

  const samplePixelUnderPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = displayCanvasRef.current;
    const rawCanvas = rawImageCanvasRef.current;
    const gradedCanvas = gradedImageCanvasRef.current;
    if (!canvas || !rawCanvas || !gradedCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const normX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const normY = clamp((e.clientY - rect.top) / rect.height, 0, 1);

    const x = Math.floor(normX * rawCanvas.width);
    const y = Math.floor(normY * rawCanvas.height);

    const rawCtx = rawCanvas.getContext('2d');
    const gradedCtx = gradedCanvas.getContext('2d');
    if (!rawCtx || !gradedCtx) return;

    const origPixel = rawCtx.getImageData(x, y, 1, 1).data;
    const gradedPixel = gradedCtx.getImageData(x, y, 1, 1).data;

    const gradedLum = (LUMA_R * gradedPixel[0] + LUMA_G * gradedPixel[1] + LUMA_B * gradedPixel[2]) / 255.0;
    const density = -Math.log10(Math.max(0.001, gradedLum));

    const dr = (gradedPixel[0] - origPixel[0]) / 255.0;
    const dg = (gradedPixel[1] - origPixel[1]) / 255.0;
    const db = (gradedPixel[2] - origPixel[2]) / 255.0;
    const deltaE = Math.sqrt(dr * dr + dg * dg + db * db) * 100.0;

    const probe: PixelProbeData = {
      x,
      y,
      origR: origPixel[0],
      origG: origPixel[1],
      origB: origPixel[2],
      gradedR: gradedPixel[0],
      gradedG: gradedPixel[1],
      gradedB: gradedPixel[2],
      deltaE: Math.round(deltaE * 10) / 10,
      density: Math.round(density * 1000) / 1000,
    };

    setProbeData(probe);
    if (onProbePixel) onProbePixel(probe);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomImageSrc(result);
      setSelectedImageId('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadGradedImage = () => {
    const canvas = gradedImageCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `chromafilm_${presetId || 'graded'}_overlay.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  const isAtCalibrated = Math.abs(intensity - calibratedIntensity) < 0.01;

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Level 1: Scene & Calibrated Intensity Calibration Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs shrink-0">
        {/* Scene Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider shrink-0">
            Scene:
          </span>
          {SCENE_DEFINITIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSceneChange(s.id)}
              className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                scene === s.id
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Intensity Scrubber & P0 calibration tag */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400 text-[11px] uppercase">
              Intensity:
            </span>
            <input
              type="range"
              min="0.10"
              max="1.00"
              step="0.05"
              value={intensity}
              onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
              className="w-24 accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
            <span className="font-mono text-amber-300 font-semibold text-xs w-9 text-right">
              {Math.round(intensity * 100)}%
            </span>
          </div>

          {/* Quick P0 reset badge */}
          <button
            onClick={() => onIntensityChange(calibratedIntensity)}
            title="Khôi phục về intensity chuẩn theo Bảng tra P0"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              isAtCalibrated
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            }`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>P0: {Math.round(calibratedIntensity * 100)}%</span>
          </button>

          {/* Open full scorecard table button */}
          <button
            onClick={onOpenIntensityTable}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors text-xs"
          >
            <Table className="w-3.5 h-3.5 text-amber-400" />
            <span>Bảng Tra P0</span>
          </button>
        </div>
      </div>

      {/* Level 1.5: Pre-Exposed Graphic Overlay Layer (RETOCOLOR Series) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-1.5 bg-slate-900/95 border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 text-pink-400 font-mono text-[11px] font-semibold shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Họa Tiết Pre-Exposed:</span>
          </div>

          {/* Pattern Selector Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setOverlayType('none')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                overlayType === 'none'
                  ? 'bg-slate-800 text-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Tắt
            </button>
            <button
              onClick={() => {
                setOverlayType('bling-bling');
                if (overlayOpacity < 0.2) setOverlayOpacity(0.85);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                overlayType === 'bling-bling'
                  ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-amber-300/80 hover:text-amber-200 hover:bg-slate-900'
              }`}
            >
              <span>✦ Bling-Bling 400</span>
            </button>
            <button
              onClick={() => {
                setOverlayType('catcha');
                if (overlayOpacity < 0.2) setOverlayOpacity(0.85);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                overlayType === 'catcha'
                  ? 'bg-cyan-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-cyan-300/80 hover:text-cyan-200 hover:bg-slate-900'
              }`}
            >
              <span>🐾 Cat'cha 400</span>
            </button>
            <button
              onClick={() => {
                setOverlayType('emoticon');
                if (overlayOpacity < 0.2) setOverlayOpacity(0.85);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                overlayType === 'emoticon'
                  ? 'bg-pink-400 text-slate-950 font-semibold shadow-sm'
                  : 'text-pink-300/80 hover:text-pink-200 hover:bg-slate-900'
              }`}
            >
              <span>(◕‿◕) Emoticon 400</span>
            </button>
          </div>
        </div>

        {/* When overlay is active, display Blend Mode, Opacity, Seed Randomizer, and Save Image */}
        {overlayType !== 'none' && (
          <div className="flex items-center gap-3 shrink-0 text-xs">
            {/* Blend Mode Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px]">Blend:</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-md">
                <button
                  onClick={() => setOverlayBlendMode('screen')}
                  title="Screen: Hòa trộn dịu êm tự nhiên, chuẩn phim quang học"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    overlayBlendMode === 'screen'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Screen
                </button>
                <button
                  onClick={() => setOverlayBlendMode('lighter')}
                  title="Additive (Linear Dodge): Cộng sáng quang học phát quang"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    overlayBlendMode === 'lighter'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Additive
                </button>
                <button
                  onClick={() => setOverlayBlendMode('color-dodge')}
                  title="Color-Dodge: Đẩy rực rỡ và phát quang họa tiết"
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    overlayBlendMode === 'color-dodge'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dodge
                </button>
              </div>
            </div>

            {/* Opacity Range */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px]">Rõ:</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-16 accent-pink-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="font-mono text-pink-300 font-semibold text-[11px] w-7 text-right">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>

            {/* Randomize Seed button */}
            <button
              onClick={() => setOverlaySeed((s) => (s * 16807 + 7) % 100000)}
              title="Đổi vị trí ngẫu nhiên các họa tiết trên ảnh"
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded text-[11px] font-mono transition-colors"
            >
              <Dices className="w-3 h-3 text-pink-400" />
              <span>Đổi Bố Cục</span>
            </button>

            {/* Download Graded + Overlay image */}
            <button
              onClick={handleDownloadGradedImage}
              title="Lưu file ảnh đã áp màu và hòa trộn họa tiết"
              className="flex items-center gap-1 px-2.5 py-0.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-200 rounded text-[11px] font-medium transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Lưu Ảnh</span>
            </button>
          </div>
        )}
      </div>

      {/* Level 2: Plate Selector & View Mode Switcher */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
        {/* Source Plates */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider shrink-0">
            Plate:
          </span>
          {TEST_IMAGES.map((img) => (
            <button
              key={img.id}
              onClick={() => {
                setSelectedImageId(img.id);
                onSceneChange(img.defaultScene);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                selectedImageId === img.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {img.label}
            </button>
          ))}

          <label className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded border border-dashed border-slate-700 cursor-pointer whitespace-nowrap shrink-0">
            <Upload className="w-3 h-3 text-slate-400" />
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('split')}
            title="Split curtain slider"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'split' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Split Curtain</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            title="Side-by-side comparison"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'side-by-side' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setViewMode('graded')}
            title="Show full graded film look"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'graded' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Graded</span>
          </button>
          <button
            onClick={() => setViewMode('false-color')}
            title="False-color exposure zones"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'false-color' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span>Exposure Zones</span>
          </button>
          <button
            onClick={() => setCanvasScaleMode((m) => (m === 'fit' ? 'full' : 'fit'))}
            title={canvasScaleMode === 'fit' ? 'Chuyển sang 100% cuộn xem toàn ảnh' : 'Chuyển sang vừa vặn khung hình'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              canvasScaleMode === 'full' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {canvasScaleMode === 'fit' ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            <span>{canvasScaleMode === 'fit' ? 'Fit Khung' : '100% Cuộn'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Stage - Scrollable for Full Image Inspection */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 p-4 bg-slate-950 overflow-auto select-none ${
          canvasScaleMode === 'fit' ? 'flex items-center justify-center' : 'block'
        } ${viewMode === 'split' ? 'cursor-ew-resize' : 'cursor-crosshair'}`}
      >
        <div className={canvasScaleMode === 'full' ? 'min-w-fit flex justify-center py-2' : 'flex items-center justify-center w-full h-full'}>
          <canvas
            ref={displayCanvasRef}
            className={`${
              canvasScaleMode === 'fit'
                ? 'max-w-full max-h-[580px] object-contain'
                : 'w-auto h-auto max-w-none max-h-none'
            } rounded shadow-2xl border border-slate-800/80 bg-black transition-all`}
          />
        </div>

        {isProcessing && (
          <div className="absolute top-6 right-6 px-2.5 py-1 bg-slate-900/90 border border-slate-700/80 rounded text-[11px] font-mono text-amber-400 tracking-wider flex items-center gap-1.5 shadow-lg z-20">
            <span>UPDATING TRANSFORMS</span>
          </div>
        )}
      </div>

      {/* Bottom Telemetry & Densitometer HUD Strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Crosshair className="w-3 h-3 text-amber-400" />
            <span>DENSITOMETER PROBE:</span>
          </div>

          {probeData ? (
            <div className="flex items-center gap-4 text-slate-300">
              <span>COORD: [{probeData.x}, {probeData.y}]</span>
              <span className="text-slate-500">|</span>
              <span>
                INPUT: R <span className="text-slate-200">{probeData.origR}</span> G <span className="text-slate-200">{probeData.origG}</span> B <span className="text-slate-200">{probeData.origB}</span>
              </span>
              <span className="text-slate-500">→</span>
              <span>
                GRADED: R <span className="text-amber-400">{probeData.gradedR}</span> G <span className="text-amber-400">{probeData.gradedG}</span> B <span className="text-amber-400">{probeData.gradedB}</span>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">
                DENSITY D: {probeData.density}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400">
                ΔE: {probeData.deltaE}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">Hover crosshair over image to sample density & color shift</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-amber-400/90">SCENE: {scene.toUpperCase()} ({Math.round(intensity * 100)}%)</span>
          <span className="text-slate-600">·</span>
          <span>PIPELINE: {targetColorSpace}</span>
        </div>
      </div>
    </div>
  );
};
