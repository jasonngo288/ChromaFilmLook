import React, { useState } from 'react';
import { FilmEmulationProfile } from '../color-science/types.ts';
import { X, Sparkles, Upload, ArrowRight, CheckCircle2, Sliders, AlertCircle } from 'lucide-react';

interface AILookAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedLook: (updatedProfile: Partial<FilmEmulationProfile>) => void;
}

const QUICK_LOOK_PROMPTS = [
  'Kodak Vision3 500T with warm 3200K practicals, broad 14-stop dynamic range, and red specular halation',
  'Fujifilm Superia 400 with punchy 4th-layer emerald greens and cool magenta shadow undertones',
  'Classic 1970s Kodachrome 64 with warm skin tones, golden sunlight, and high contrast punch',
  'Bleach Bypass 35mm motion picture look with desaturated silver retention and high local micro-contrast',
  'Kodak Portra 160 pastel wedding look with soft highlights and cyan-tinted low-density shadows',
];

export const AILookAnalyzerModal: React.FC<AILookAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onApplyExtractedLook,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [description, setDescription] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    if (!imagePreview && !description.trim()) {
      setErrorMessage('Please upload an image reference or describe the target film aesthetic.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: imageMime,
          description: description.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze look.');
      }

      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during look analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyToStudio = () => {
    if (!analysisResult) return;

    const s = analysisResult.sensitometry || {};
    const m = analysisResult.colorMatrix || [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ];
    const g = analysisResult.colorGrading || {};
    const o = analysisResult.opticalArtifacts || {};

    const updated: Partial<FilmEmulationProfile> = {
      name: analysisResult.lookName || 'AI Extracted Look',
      description: analysisResult.analysis?.practicalGradingAdvice || 'Custom analyzed film emulation profile',
      sensitometry: {
        toeLift: s.toeLift ?? 0.03,
        shadowGamma: s.shadowGamma ?? 1.1,
        midtoneContrast: s.midtoneContrast ?? 1.05,
        shoulderRollOff: s.shoulderRollOff ?? 0.85,
        highlightClip: s.highlightClip ?? 0.96,
        dMin: 0.18,
        dMax: 2.9,
      },
      colorMatrix: m,
      colorGrading: {
        shadowTint: g.shadowTint ?? { r: 0, g: 0, b: 0 },
        highlightTint: g.highlightTint ?? { r: 0, g: 0, b: 0 },
        globalSaturation: g.globalSaturation ?? 1.0,
        shadowSaturation: g.shadowSaturation ?? 0.9,
        highlightSaturation: g.highlightSaturation ?? 0.8,
        skinProtection: 0.85,
      },
      opticalArtifacts: {
        halationIntensity: o.halationIntensity ?? 0.2,
        halationThreshold: o.halationThreshold ?? 0.8,
        halationRadius: 4,
        grainIntensity: o.grainIntensity ?? 0.15,
        grainSize: 1.1,
        grainRoughness: 0.45,
      },
    };

    onApplyExtractedLook(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                AI Look Reference Analyzer & Deconstructor
              </h2>
              <p className="text-xs text-slate-400">
                Deconstruct RGB distribution, highlight compression, and shadow toe into programmatic matrices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Image Reference Dropzone */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Look Reference Plate (Optional Image)
              </label>

              {imagePreview ? (
                <div className="relative rounded-lg border border-slate-700 overflow-hidden bg-black/50 group">
                  <img
                    src={imagePreview}
                    alt="Look reference preview"
                    className="w-full h-44 object-contain"
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 px-2 py-1 bg-black/70 hover:bg-black/90 text-slate-300 text-[10px] rounded"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg p-4 cursor-pointer bg-slate-950/40 hover:bg-slate-800/30 transition-all text-center">
                  <Upload className="w-6 h-6 text-slate-500 mb-2" />
                  <span className="text-xs text-slate-300 font-medium">Upload Movie Frame or Film Reference</span>
                  <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WebP supported</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Right: Text Description & Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Aesthetic Description & Grading Intent
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Kodak Portra 400 with soft pastel highlights, cyan shadow cast, gentle shoulder compression, and fine film grain..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:outline-none resize-none"
              />

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Quick Film Aesthetic Presets:
                </span>
                <div className="flex flex-wrap gap-1">
                  {QUICK_LOOK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setDescription(prompt)}
                      className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-left line-clamp-1 transition-colors"
                    >
                      {prompt.slice(0, 48)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {!errorMessage && <div />}

            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Analyzing Spectral Characteristics...' : 'Deconstruct Reference Look'}</span>
            </button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="p-5 bg-slate-950 rounded-xl border border-amber-500/30 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {analysisResult.lookName}
                    </h3>
                  </div>
                  <span className="text-xs text-amber-400 font-mono mt-0.5 block">
                    Stock Likeness: {analysisResult.stockFamily}
                  </span>
                </div>

                <button
                  onClick={handleApplyToStudio}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-md"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Apply Look to Studio</span>
                </button>
              </div>

              {/* Analytical Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-amber-300">Highlight Compression</div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {analysisResult.analysis?.highlightCompression}
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-amber-300">Shadow Lifting & Flare</div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {analysisResult.analysis?.shadowLifting}
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-amber-300">RGB Spectral Distribution</div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {analysisResult.analysis?.rgbDistribution}
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-semibold text-amber-300">Skin Tone Reproduction</div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {analysisResult.analysis?.skinToneReproduction}
                  </p>
                </div>
              </div>

              {/* Extracted Parameter Readouts */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
                <span>TOE LIFT: {(analysisResult.sensitometry?.toeLift * 100)?.toFixed(1)}%</span>
                <span className="text-slate-600">·</span>
                <span>GAMMA: {analysisResult.sensitometry?.midtoneContrast?.toFixed(2)}</span>
                <span className="text-slate-600">·</span>
                <span>SHOULDER: {analysisResult.sensitometry?.shoulderRollOff?.toFixed(2)}</span>
                <span className="text-slate-600">·</span>
                <span>HALATION: {(analysisResult.opticalArtifacts?.halationIntensity * 100)?.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
