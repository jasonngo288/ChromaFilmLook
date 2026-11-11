import React, { useState, useRef, useEffect } from 'react';
import { FilmEmulationProfile, SensitometryParams, Matrix3x3, ColorGradingParams, OpticalArtifactsParams } from '../color-science/types.ts';
import { transformPixel, clamp } from '../color-science/transferFunctions.ts';
import { generateCubeLUT, generateHaldClutCanvas, downloadTextFile, downloadCanvasAsPng } from '../color-science/lutGenerator.ts';
import { generatePythonCode, generateGLSLCode } from '../color-science/codeGenerators.ts';
import { Upload, Sparkles, Download, CheckCircle2, ArrowRight, Activity, Palette, Sliders, SplitSquareVertical, Eye, Copy, Check, AlertCircle, Cpu, Dices, Layers, Maximize2, Minimize2 } from 'lucide-react';
import { safeFetchJson, downscaleImageForAnalysis, computeLocalColorScienceAnalysis, LookAnalysisResult } from '../utils/safeApi.ts';
import { GraphicOverlayType, OverlayBlendMode, applyGraphicOverlay } from '../color-science/graphicOverlay.ts';

interface LookAnalyzerTabProps {
  onApplyProfileToStudio: (profile: Partial<FilmEmulationProfile>) => void;
  onNavigateToStudio: () => void;
}

const SAMPLE_REFERENCES = [
  {
    id: 'benidorm',
    title: 'Benidorm (@onlyfimshots / Carmencita)',
    src: '/benidorm_ref.jpg',
    desc: 'Kodak Gold 200 + Portra 400 scan, nắng ấm Địa Trung Hải, tường vôi vàng, trời xanh ngọc cyan',
  },
  {
    id: 'portrait',
    title: 'Studio Portrait (Skin Tones)',
    src: '/src/assets/images/portrait_skin_tone_test_1794287470317.jpg',
    desc: 'Chân dung studio, kiểm tra tông màu da tự nhiên và chuyển tiếp highlight mịn',
  },
  {
    id: 'night_street',
    title: 'Night Street (Halation & High Contrast)',
    src: '/src/assets/images/cinematic_street_night_1794287471294.jpg',
    desc: 'Đèn neon ban đêm, tương phản cao, halation đỏ quanh bóng đèn',
  },
  {
    id: 'landscape',
    title: 'Mountain Vista (Highlight Roll-off)',
    src: '/src/assets/images/landscape_dynamic_range_1794287471178.jpg',
    desc: 'Phong cảnh núi non, dải động rộng, mây trời cuộn êm không cháy',
  },
];

export const LookAnalyzerTab: React.FC<LookAnalyzerTabProps> = ({
  onApplyProfileToStudio,
  onNavigateToStudio,
}) => {
  const [imageSrc, setImageSrc] = useState<string>('/benidorm_ref.jpg');
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted Profile State for interactive preview & LUT download
  const [extractedProfile, setExtractedProfile] = useState<FilmEmulationProfile | null>(null);
  const [lutSize, setLutSize] = useState<number>(33);
  const [exportIntensity, setExportIntensity] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'split' | 'graded' | 'original'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isDownloadingCube, setIsDownloadingCube] = useState<boolean>(false);
  const [overlayType, setOverlayType] = useState<GraphicOverlayType>('none');
  const [overlayBlendMode, setOverlayBlendMode] = useState<OverlayBlendMode>('screen');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [overlaySeed, setOverlaySeed] = useState<number>(42);
  const [canvasScaleMode, setCanvasScaleMode] = useState<'fit' | 'full'>('fit');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto analyze initial Benidorm image on mount if not yet analyzed
  useEffect(() => {
    handleRunAnalysis('/benidorm_ref.jpg', 'image/jpeg', 'Benidorm captured by @onlyfimshots on Kodak Gold 200 and Kodak Portra 400, scanned by Carmencita Film Lab');
  }, []);

  // Handle image upload from user computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type || 'image/jpeg';
    setImageMime(mime);
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setImageSrc(b64);
      handleRunAnalysis(b64, mime, userPrompt || file.name);
    };
    reader.readAsDataURL(file);
  };

  const applyAnalyzedData = (data: LookAnalysisResult | any, src: string) => {
    setAnalysisData(data);

    // Build working profile
    const s = data.sensitometry || {};
    const m = data.colorMatrix || [
      [1.05, -0.02, -0.03],
      [0.01, 1.02, -0.03],
      [-0.04, 0.02, 1.02],
    ];
    const g = data.colorGrading || {};
    const o = data.opticalArtifacts || {};

    const profile: FilmEmulationProfile = {
      id: 'extracted_' + Date.now(),
      name: data.lookName || 'Analyzed Film Look',
      manufacturer: data.stockFamily || 'Custom Photochemical Scan',
      stockType: 'Color Negative',
      iso: 'Auto Calibrated',
      description: data.analysis?.practicalGradingAdvice || 'Extracted film emulation profile',
      characteristics: [
        data.analysis?.highlightCompression || 'Sigmoid shoulder roll-off',
        data.analysis?.shadowLifting || 'Lifted toe density',
        data.analysis?.rgbDistribution || 'Calibrated spectral distribution',
      ],
      sensitometry: {
        toeLift: s.toeLift ?? 0.04,
        shadowGamma: s.shadowGamma ?? 1.08,
        midtoneContrast: s.midtoneContrast ?? 1.05,
        shoulderRollOff: s.shoulderRollOff ?? 0.75,
        highlightClip: s.highlightClip ?? 0.97,
        dMin: 0.17,
        dMax: 2.85,
      },
      colorMatrix: m,
      colorGrading: {
        shadowTint: g.shadowTint ?? { r: -0.015, g: 0.01, b: 0.025 },
        highlightTint: g.highlightTint ?? { r: 0.035, g: 0.02, b: -0.025 },
        globalSaturation: g.globalSaturation ?? 1.08,
        shadowSaturation: g.shadowSaturation ?? 0.88,
        highlightSaturation: g.highlightSaturation ?? 0.78,
        skinProtection: 0.88,
      },
      opticalArtifacts: {
        halationIntensity: o.halationIntensity ?? 0.15,
        halationThreshold: o.halationThreshold ?? 0.82,
        halationRadius: 4,
        grainIntensity: o.grainIntensity ?? 0.12,
        grainSize: 1.0,
        grainRoughness: 0.45,
      },
      targetColorSpace: 'sRGB',
    };

    setExtractedProfile(profile);
    renderPreview(profile, src);
  };

  // Run analysis via server Gemini API or Local Engine
  const handleRunAnalysis = async (src: string, mime: string, desc: string, forceLocal = false) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    // Preload image element for rendering & local fallback
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    if (forceLocal) {
      try {
        const localData = computeLocalColorScienceAnalysis(img, desc || 'Local Pixel Analysis');
        applyAnalyzedData(localData, src);
      } catch (err: any) {
        setErrorMsg('Lỗi khi tính toán phân tích cục bộ: ' + err.message);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    try {
      // Downscale image before uploading to avoid 413 / timeout
      const { base64: optimizedBase64 } = await downscaleImageForAnalysis(src, 1024, 0.85);

      const data = await safeFetchJson<any>('/api/analyze-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType: mime || 'image/jpeg',
          description: desc || 'Deconstruct tone curve, shadow/highlight color shift, and dye coupler matrix.',
        }),
      });

      applyAnalyzedData(data, src);
    } catch (err: any) {
      console.warn('Cloud AI analysis failed, falling back to local color science engine:', err);
      // Seamless local fallback
      try {
        const localData = computeLocalColorScienceAnalysis(img, desc || 'Local Sensitometry Engine');
        applyAnalyzedData(localData, src);
        setErrorMsg('Lưu ý: API Cloud bận (' + (err.message || '502/Timeout') + '), hệ thống đã tự động chạy Bộ Phân Tích Pixel Cục Bộ để tạo ngay Tone Curve & 3D LUT.');
      } catch (fallbackErr: any) {
        setErrorMsg('Lỗi phân tích: ' + (err.message || fallbackErr.message));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Render processed preview on canvas
  const renderPreview = (profile: FilmEmulationProfile, src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const maxDim = 840;
      let w = img.naturalWidth || 600;
      let h = img.naturalHeight || 400;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      // Raw canvas
      const raw = document.createElement('canvas');
      raw.width = w;
      raw.height = h;
      const rawCtx = raw.getContext('2d');
      if (!rawCtx) return;
      rawCtx.drawImage(img, 0, 0, w, h);
      rawCanvasRef.current = raw;

      drawDisplayCanvas(profile, raw, w, h, splitPos, viewMode);
    };
  };

  const drawDisplayCanvas = (
    profile: FilmEmulationProfile,
    raw: HTMLCanvasElement,
    w: number,
    h: number,
    split: number,
    mode: 'split' | 'graded' | 'original'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawCtx = raw.getContext('2d');
    if (!rawCtx) return;
    const srcData = rawCtx.getImageData(0, 0, w, h);
    const src = srcData.data;

    const gradedData = ctx.createImageData(w, h);
    const out = gradedData.data;

    // Apply color science transform
    for (let i = 0; i < src.length; i += 4) {
      const r = src[i] / 255.0;
      const g = src[i + 1] / 255.0;
      const b = src[i + 2] / 255.0;

      const [trR, trG, trB] = transformPixel(
        r, g, b,
        profile.sensitometry,
        profile.colorMatrix,
        profile.colorGrading,
        profile.targetColorSpace,
        1.0
      );

      out[i] = Math.round(trR * 255.0);
      out[i + 1] = Math.round(trG * 255.0);
      out[i + 2] = Math.round(trB * 255.0);
      out[i + 3] = src[i + 3];
    }

    // Graded Canvas
    const gradedCanvas = document.createElement('canvas');
    gradedCanvas.width = w;
    gradedCanvas.height = h;
    const gCtx = gradedCanvas.getContext('2d');
    if (gCtx) gCtx.putImageData(gradedData, 0, 0);

    // Graphic Overlay Layer (Screen / Additive Blend)
    if (overlayType !== 'none' && overlayOpacity > 0.01) {
      applyGraphicOverlay(gradedCanvas, {
        type: overlayType,
        blendMode: overlayBlendMode,
        opacity: overlayOpacity,
        seed: overlaySeed,
      });
    }

    if (mode === 'original') {
      ctx.drawImage(raw, 0, 0);
      return;
    }

    if (mode === 'graded') {
      ctx.drawImage(gradedCanvas, 0, 0);
      return;
    }

    // Default 'split' curtain
    ctx.drawImage(gradedCanvas, 0, 0);

    const splitX = Math.round(w * split);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.drawImage(raw, 0, 0);
    ctx.restore();

    // Divider
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(8, 8, 70, 20);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ORIGINAL', 14, 22);

    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    ctx.fillRect(w - 74, 8, 66, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('GRADED', w - 66, 22);
  };

  // Re-draw when viewMode, split or overlay changes
  useEffect(() => {
    if (extractedProfile && rawCanvasRef.current) {
      const raw = rawCanvasRef.current;
      drawDisplayCanvas(extractedProfile, raw, raw.width, raw.height, splitPos, viewMode);
    }
  }, [viewMode, splitPos, extractedProfile, overlayType, overlayBlendMode, overlayOpacity, overlaySeed]);

  // Handle Dragging Split Divider
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'split') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    setSplitPos(clamp(relX, 0.05, 0.95));
  };

  // Direct LUT Downloads
  const handleDownloadCube = () => {
    if (!extractedProfile) return;
    setIsDownloadingCube(true);
    setTimeout(() => {
      const intensityScale = exportIntensity / 100.0;
      const cube = generateCubeLUT(extractedProfile, lutSize, intensityScale);
      const filename = `${extractedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${lutSize}x${lutSize}_${exportIntensity}pct.cube`;
      downloadTextFile(cube, filename, 'application/x-cube');
      setIsDownloadingCube(false);
    }, 50);
  };

  const handleDownloadHald = () => {
    if (!extractedProfile) return;
    const intensityScale = exportIntensity / 100.0;
    const canvas = generateHaldClutCanvas(extractedProfile, 8, intensityScale);
    downloadCanvasAsPng(canvas, `${extractedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_HaldCLUT_Level8.png`);
  };

  const handleDownloadPython = () => {
    if (!extractedProfile) return;
    const code = generatePythonCode(extractedProfile);
    downloadTextFile(code, `apply_${extractedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`, 'text/x-python');
  };

  const handleCopyGLSL = () => {
    if (!extractedProfile) return;
    const code = generateGLSLCode(extractedProfile);
    navigator.clipboard.writeText(code);
    setCopiedCode('glsl');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleApplyToStudio = () => {
    if (!extractedProfile) return;
    onApplyProfileToStudio(extractedProfile);
    onNavigateToStudio();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Banner Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">
                Bộ Phân Tích Chất Màu & Trích Xuất 3D LUT
              </h1>
              <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Sensitometry & Color Shift Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Nhập ảnh bất kỳ → Giải mã đường cong Tone Curve, Color Shift vùng tối/sáng, ma trận màu → Tải ngay file .cube 3D LUT
            </p>
          </div>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider shrink-0">
            Ảnh Mẫu:
          </span>
          {SAMPLE_REFERENCES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setImageSrc(sample.src);
                handleRunAnalysis(sample.src, 'image/jpeg', sample.desc);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap shrink-0 ${
                imageSrc === sample.src
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {sample.title}
            </button>
          ))}

          <label className="flex items-center gap-1 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold rounded cursor-pointer whitespace-nowrap shrink-0 shadow-sm transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Ảnh Của Bạn</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Column: Visual Canvas & Before/After Comparison */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl min-w-0">
          {/* Canvas Sub-Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">
                {extractedProfile ? extractedProfile.name : 'Đang xử lý ảnh...'}
              </span>
              {extractedProfile && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {extractedProfile.manufacturer}
                </span>
              )}
            </div>

            {/* Graphic Overlay Controls */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                <span className="text-[10px] font-mono text-pink-400 px-1 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  <span>Họa Tiết:</span>
                </span>
                <button
                  onClick={() => setOverlayType('none')}
                  className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                    overlayType === 'none' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Tắt
                </button>
                <button
                  onClick={() => setOverlayType('bling-bling')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    overlayType === 'bling-bling' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-amber-300/80 hover:bg-slate-800'
                  }`}
                >
                  ✦ Bling
                </button>
                <button
                  onClick={() => setOverlayType('catcha')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    overlayType === 'catcha' ? 'bg-cyan-400 text-slate-950 font-semibold' : 'text-cyan-300/80 hover:bg-slate-800'
                  }`}
                >
                  🐾 Cat
                </button>
                <button
                  onClick={() => setOverlayType('emoticon')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    overlayType === 'emoticon' ? 'bg-pink-400 text-slate-950 font-semibold' : 'text-pink-300/80 hover:bg-slate-800'
                  }`}
                >
                  (◕‿◕) Emoji
                </button>
              </div>

              {overlayType !== 'none' && (
                <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                  <button
                    onClick={() => setOverlayBlendMode('screen')}
                    title="Screen: Hòa trộn dịu êm tự nhiên chuẩn phim quang học"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      overlayBlendMode === 'screen' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400'
                    }`}
                  >
                    Screen
                  </button>
                  <button
                    onClick={() => setOverlayBlendMode('lighter')}
                    title="Additive (Linear Dodge): Cộng sáng quang học phát quang"
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      overlayBlendMode === 'lighter' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400'
                    }`}
                  >
                    Additive
                  </button>
                  <button
                    onClick={() => setOverlaySeed((s) => (s * 16807 + 7) % 100000)}
                    title="Đổi vị trí ngẫu nhiên họa tiết trên ảnh"
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    <Dices className="w-3 h-3 text-pink-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Split / View Mode Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'split' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SplitSquareVertical className="w-3 h-3" />
                <span>Split Curtain</span>
              </button>
              <button
                onClick={() => setViewMode('graded')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'graded' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Graded (100%)</span>
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  viewMode === 'original' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Ảnh Gốc</span>
              </button>
              <button
                onClick={() => setCanvasScaleMode((m) => (m === 'fit' ? 'full' : 'fit'))}
                title={canvasScaleMode === 'fit' ? '100% Cuộn xem toàn ảnh' : 'Fit vừa khung hình'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                  canvasScaleMode === 'full' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {canvasScaleMode === 'fit' ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                <span>{canvasScaleMode === 'fit' ? 'Fit Khung' : '100% Cuộn'}</span>
              </button>
            </div>
          </div>

          {/* Canvas Display - Scrollable for Full Image Inspection */}
          <div
            className={`flex-1 p-4 bg-slate-950 overflow-auto relative select-none ${
              canvasScaleMode === 'fit' ? 'flex items-center justify-center' : 'block'
            }`}
          >
            <div className={canvasScaleMode === 'full' ? 'min-w-fit flex justify-center py-2' : 'flex items-center justify-center w-full h-full'}>
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                className={`${
                  canvasScaleMode === 'fit'
                    ? 'max-w-full max-h-[540px] object-contain'
                    : 'w-auto h-auto max-w-none max-h-none'
                } rounded shadow-2xl border border-slate-800 bg-black transition-all ${
                  viewMode === 'split' ? 'cursor-ew-resize' : 'cursor-default'
                }`}
              />
            </div>

            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="font-mono text-xs text-amber-300 tracking-wider">
                  ĐANG PHÂN TÍCH QUANG PHỔ & TRÍCH XUẤT MA TRẬN MÀU...
                </span>
              </div>
            )}
          </div>

          {/* Canvas Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-400 shrink-0">
            <span>Rê chuột trên ảnh để kéo đường phân tách Split Curtain</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyToStudio}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 rounded transition-colors"
              >
                <Sliders className="w-3 h-3" />
                <span>Mở Trong Film Workbench</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Analytical Breakdown & Direct LUT Download Center */}
        <div className="w-[450px] lg:w-[480px] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl shrink-0">
          {/* Header */}
          <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                Kết Quả Phân Tích & Tải LUT
              </h2>
            </div>
            {extractedProfile && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Sẵn sàng tải LUT</span>
              </span>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Quick Engine Actions */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">Công cụ phân tích</span>
                <span className="text-slate-400 font-mono text-[10px]">Dual Engine (AI + Local)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isAnalyzing || !imageSrc}
                  onClick={() => handleRunAnalysis(imageSrc, 'image/jpeg', userPrompt, false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded font-medium disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Phân Tích AI Cloud</span>
                </button>
                <button
                  disabled={isAnalyzing || !imageSrc}
                  onClick={() => handleRunAnalysis(imageSrc, 'image/jpeg', userPrompt, true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded font-medium disabled:opacity-50 transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span>Đo Pixel Cục Bộ (0ms)</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* 1. TONE CURVE SENSITOMETRY CARD */}
            {extractedProfile && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-slate-200">Độ Tương Phản (Tone Curve)</span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400">
                    Gamma {extractedProfile.sensitometry.midtoneContrast.toFixed(2)}
                  </span>
                </div>

                {/* Tone Curve Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-sans">Vùng Tối (Toe Lift)</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      +{(extractedProfile.sensitometry.toeLift * 100).toFixed(1)}% (Nâng đáy)
                    </div>
                    <div className="text-[9px] text-slate-500 font-sans mt-0.5">Không bẹp đen tuyệt đối</div>
                  </div>

                  <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-sans">Độ Dốc Vùng Tối</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      {extractedProfile.sensitometry.shadowGamma.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-sans mt-0.5">Chuyển tiếp êm dịu</div>
                  </div>

                  <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-sans">Vùng Sáng (Shoulder Roll-Off)</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      {extractedProfile.sensitometry.shoulderRollOff.toFixed(2)} (Sigmoid)
                    </div>
                    <div className="text-[9px] text-slate-500 font-sans mt-0.5">Cuộn êm mây trời chống cháy</div>
                  </div>

                  <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 font-sans">Trần Trắng (Highlight Clip)</div>
                    <div className="text-amber-300 font-semibold mt-0.5">
                      {extractedProfile.sensitometry.highlightClip.toFixed(2)} (97%)
                    </div>
                    <div className="text-[9px] text-slate-500 font-sans mt-0.5">Ngả kem pastel tự nhiên</div>
                  </div>
                </div>

                {analysisData?.analysis?.highlightCompression && (
                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                    {analysisData.analysis.highlightCompression}
                  </p>
                )}
              </div>
            )}

            {/* 2. COLOR SHIFT IN SHADOWS & HIGHLIGHTS */}
            {extractedProfile && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-semibold text-slate-200">Dịch Chuyển Màu (Color Shift)</span>
                  </div>
                  <span className="font-mono text-[10px] text-sky-400">
                    Split-Toning Locus
                  </span>
                </div>

                {/* Shadow & Highlight Shift Badges */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Shadow Shift */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-cyan-400 uppercase">Vùng Tối (Shadows)</span>
                      <span className="w-3 h-3 rounded-full bg-[#1e4050] border border-cyan-400/40 inline-block" />
                    </div>
                    <div className="font-mono text-[10px] text-slate-300">
                      R: {extractedProfile.colorGrading.shadowTint.r > 0 ? `+${extractedProfile.colorGrading.shadowTint.r.toFixed(3)}` : extractedProfile.colorGrading.shadowTint.r.toFixed(3)} |
                      G: {extractedProfile.colorGrading.shadowTint.g > 0 ? `+${extractedProfile.colorGrading.shadowTint.g.toFixed(3)}` : extractedProfile.colorGrading.shadowTint.g.toFixed(3)} |
                      B: {extractedProfile.colorGrading.shadowTint.b > 0 ? `+${extractedProfile.colorGrading.shadowTint.b.toFixed(3)}` : extractedProfile.colorGrading.shadowTint.b.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Lệch nhẹ về <strong>Cyan/Teal mát</strong> tạo độ tách biệt nhiệt độ màu với nắng vàng.
                    </p>
                  </div>

                  {/* Highlight Shift */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-amber-400 uppercase">Vùng Sáng (Highlights)</span>
                      <span className="w-3 h-3 rounded-full bg-[#fde047] border border-amber-400/40 inline-block" />
                    </div>
                    <div className="font-mono text-[10px] text-slate-300">
                      R: +{extractedProfile.colorGrading.highlightTint.r.toFixed(3)} |
                      G: +{extractedProfile.colorGrading.highlightTint.g.toFixed(3)} |
                      B: {extractedProfile.colorGrading.highlightTint.b.toFixed(3)}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Lệch về <strong>Golden Amber / Vàng ấm</strong>, highlight cực sáng desaturate nhẹ.
                    </p>
                  </div>
                </div>

                {analysisData?.analysis?.rgbDistribution && (
                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                    {analysisData.analysis.rgbDistribution}
                  </p>
                )}
              </div>
            )}

            {/* 3. SPECTRAL DYE COUPLER MATRIX 3x3 */}
            {extractedProfile && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Ma Trận Màu Phổ (3×3 Dye Matrix)</span>
                  <span className="font-mono text-[10px] text-slate-400">Energy Preserving</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-[10px] text-slate-300 leading-relaxed border border-slate-800">
                  <div className="text-red-400/90">[ {extractedProfile.colorMatrix[0].map(v => v.toFixed(3)).join(', ')} ] (Red)</div>
                  <div className="text-green-400/90">[ {extractedProfile.colorMatrix[1].map(v => v.toFixed(3)).join(', ')} ] (Green)</div>
                  <div className="text-sky-400/90">[ {extractedProfile.colorMatrix[2].map(v => v.toFixed(3)).join(', ')} ] (Blue)</div>
                </div>
              </div>
            )}

            {/* 4. DIRECT LUT DOWNLOAD & EXPORT CENTER */}
            {extractedProfile && (
              <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-amber-500/30 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-white">Tải 3D LUT Ngay Lập Tức</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300">DaVinci / Premiere / Mobile</span>
                </div>

                {/* LUT Options: Size & Intensity */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Độ Phân Giải 3D LUT:</label>
                    <select
                      value={lutSize}
                      onChange={(e) => setLutSize(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                    >
                      <option value={17}>17x17x17 (Nhẹ, Mobile)</option>
                      <option value={33}>33x33x33 (Chuẩn DaVinci)</option>
                      <option value={65}>65x65x65 (Chất lượng cao)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cường Độ (Bake Intensity):</label>
                    <select
                      value={exportIntensity}
                      onChange={(e) => setExportIntensity(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                    >
                      <option value={65}>65% (Khuyên dùng, chống cháy)</option>
                      <option value={80}>80% (Đậm đà)</option>
                      <option value={100}>100% (Full Raw LUT)</option>
                    </select>
                  </div>
                </div>

                {/* Primary Download Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleDownloadCube}
                    disabled={isDownloadingCube}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingCube ? 'Đang tạo ma trận 3D...' : `Tải File .CUBE 3D LUT (${lutSize}³)`}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadHald}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>HaldCLUT PNG (512²)</span>
                    </button>

                    <button
                      onClick={handleDownloadPython}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Script Python (.py)</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCopyGLSL}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[11px] transition-colors"
                  >
                    {copiedCode === 'glsl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'glsl' ? 'Đã sao chép Shader GLSL!' : 'Sao chép Shader GLSL (WebGL/Android)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
