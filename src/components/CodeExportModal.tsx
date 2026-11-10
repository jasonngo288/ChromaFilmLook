import React, { useState } from 'react';
import { FilmEmulationProfile } from '../color-science/types.ts';
import { generatePythonCode, generateGLSLCode, generateMetalCode, generateCoreImageCode } from '../color-science/codeGenerators.ts';
import { generateCubeLUT, generateHaldClutCanvas, downloadTextFile, downloadCanvasAsPng } from '../color-science/lutGenerator.ts';
import { X, Copy, Check, Download, Code2, Terminal, Cpu, FileText } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FilmEmulationProfile;
  currentIntensity?: number;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentIntensity = 1.0,
}) => {
  const [activeLang, setActiveLang] = useState<'python' | 'glsl' | 'metal' | 'coreimage' | 'cube'>('python');
  const [lutSize, setLutSize] = useState<number>(33);
  const [exportIntensityMode, setExportIntensityMode] = useState<'scene' | 'full'>('scene');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingLUT, setIsGeneratingLUT] = useState<boolean>(false);

  if (!isOpen) return null;

  const appliedIntensity = exportIntensityMode === 'scene' ? currentIntensity : 1.0;

  const pythonCode = generatePythonCode(profile);
  const glslCode = generateGLSLCode(profile);
  const metalCode = generateMetalCode(profile);
  const coreImageCode = generateCoreImageCode(profile);

  const getActiveCode = () => {
    switch (activeLang) {
      case 'python': return pythonCode;
      case 'glsl': return glslCode;
      case 'metal': return metalCode;
      case 'coreimage': return coreImageCode;
      case 'cube': return generateCubeLUT(profile, 17, appliedIntensity);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCube = () => {
    setIsGeneratingLUT(true);
    setTimeout(() => {
      const cubeStr = generateCubeLUT(profile, lutSize, appliedIntensity);
      const intensityTag = exportIntensityMode === 'scene' ? `_${Math.round(appliedIntensity * 100)}pct` : '_100pct';
      downloadTextFile(cubeStr, `${profile.id}_${lutSize}${intensityTag}.cube`, 'application/x-cube');
      setIsGeneratingLUT(false);
    }, 50);
  };

  const handleDownloadHald = () => {
    const canvas = generateHaldClutCanvas(profile, 8, appliedIntensity);
    const intensityTag = exportIntensityMode === 'scene' ? `_${Math.round(appliedIntensity * 100)}pct` : '_100pct';
    downloadCanvasAsPng(canvas, `${profile.id}_HaldCLUT8${intensityTag}.png`);
  };

  const handleDownloadPython = () => {
    downloadTextFile(pythonCode, `film_grade_${profile.id}.py`, 'text/x-python');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Programmatic Code & 3D LUT Generator
              </h2>
              <p className="text-xs text-slate-400">
                Target Stock: <span className="text-amber-400 font-medium">{profile.name}</span> ({profile.stockType})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Download Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px]">
              Direct File Exports:
            </span>

            {/* Intensity bake mode */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => setExportIntensityMode('scene')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  exportIntensityMode === 'scene'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bake intensity theo scene hiện tại để tránh gắt/cháy"
              >
                Theo Scene ({Math.round(currentIntensity * 100)}%)
              </button>
              <button
                onClick={() => setExportIntensityMode('full')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  exportIntensityMode === 'full'
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bake 100% full raw strength"
              >
                Full (100%)
              </button>
            </div>

            {/* .cube 3D LUT */}
            <div className="flex items-center rounded-lg border border-amber-500/30 overflow-hidden bg-amber-500/10">
              <button
                onClick={handleDownloadCube}
                disabled={isGeneratingLUT}
                className="flex items-center gap-1.5 px-3 py-1.5 text-amber-300 hover:bg-amber-500/20 font-medium transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingLUT ? 'Calculating 3D Grid...' : `Download .cube (${lutSize}³)`}</span>
              </button>
              <select
                value={lutSize}
                onChange={(e) => setLutSize(parseInt(e.target.value, 10))}
                className="bg-slate-900 text-amber-300 text-xs px-2 py-1.5 border-l border-amber-500/30 outline-none cursor-pointer"
              >
                <option value={17}>17x17x17 (Fast)</option>
                <option value={33}>33x33x33 (Standard)</option>
                <option value={65}>65x65x65 (Mastering)</option>
              </select>
            </div>

            {/* HaldCLUT PNG */}
            <button
              onClick={handleDownloadHald}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download HaldCLUT PNG (512x512)</span>
            </button>

            {/* Python Script */}
            <button
              onClick={handleDownloadPython}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download Python (.py)</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-900 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveLang('python')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeLang === 'python'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Python (OpenCV + Pillow)</span>
          </button>

          <button
            onClick={() => setActiveLang('glsl')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeLang === 'glsl'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>GLSL Shader (WebGL / OpenGL)</span>
          </button>

          <button
            onClick={() => setActiveLang('metal')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeLang === 'metal'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Apple Metal (MSL Compute)</span>
          </button>

          <button
            onClick={() => setActiveLang('coreimage')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeLang === 'coreimage'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Apple CoreImage (Swift CIFilter)</span>
          </button>

          <button
            onClick={() => setActiveLang('cube')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeLang === 'cube'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw .cube Format Sample</span>
          </button>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-xs leading-relaxed text-slate-300 select-text">
          <pre className="whitespace-pre">{getActiveCode()}</pre>
        </div>
      </div>
    </div>
  );
};
