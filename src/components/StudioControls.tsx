import React, { useState } from 'react';
import { SensitometryParams, Matrix3x3, ColorGradingParams, OpticalArtifactsParams } from '../color-science/types.ts';
import { Sliders, Grid3X3, Palette, Sparkles, RotateCcw } from 'lucide-react';

interface StudioControlsProps {
  sensitometry: SensitometryParams;
  colorMatrix: Matrix3x3;
  colorGrading: ColorGradingParams;
  opticalArtifacts: OpticalArtifactsParams;
  onChangeSensitometry: (s: SensitometryParams) => void;
  onChangeMatrix: (m: Matrix3x3) => void;
  onChangeColorGrading: (g: ColorGradingParams) => void;
  onChangeOptical: (o: OpticalArtifactsParams) => void;
  onResetControls: () => void;
}

export const StudioControls: React.FC<StudioControlsProps> = ({
  sensitometry,
  colorMatrix,
  colorGrading,
  opticalArtifacts,
  onChangeSensitometry,
  onChangeMatrix,
  onChangeColorGrading,
  onChangeOptical,
  onResetControls,
}) => {
  const [activeTab, setActiveTab] = useState<'sensitometry' | 'matrix' | 'balance' | 'optical'>('sensitometry');

  // Matrix cell change helper
  const handleMatrixCell = (row: number, col: number, val: number) => {
    const next: Matrix3x3 = [
      [...colorMatrix[0]],
      [...colorMatrix[1]],
      [...colorMatrix[2]],
    ] as Matrix3x3;
    next[row][col] = Math.round(val * 1000) / 1000;
    onChangeMatrix(next);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl text-xs">
      {/* Sub Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('sensitometry')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'sensitometry' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sensitometry</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'matrix' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>3x3 Dye Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'balance' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color Balance</span>
          </button>

          <button
            onClick={() => setActiveTab('optical')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'optical' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Halation & Grain</span>
          </button>
        </div>

        <button
          onClick={onResetControls}
          title="Reset tab values"
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SENSITOMETRY (H&D Curves) */}
        {activeTab === 'sensitometry' && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Hurter-Driffield (H&D) sensitometric density transfer curve. Controls film shadow flare, straight-line contrast, and soft highlight shoulder roll-off.
            </div>

            {/* Toe Lift */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Shadow Toe Lift (Flare Floor)</span>
                <span className="font-mono text-amber-400">{(sensitometry.toeLift * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="0.15"
                step="0.005"
                value={sensitometry.toeLift}
                onChange={(e) => onChangeSensitometry({ ...sensitometry, toeLift: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Raises black floor density, preventing harsh digital clipping in deep shadows.</span>
            </div>

            {/* Shadow Gamma */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Toe Curvature (Shadow Gamma)</span>
                <span className="font-mono text-amber-400">{sensitometry.shadowGamma.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="1.80"
                step="0.02"
                value={sensitometry.shadowGamma}
                onChange={(e) => onChangeSensitometry({ ...sensitometry, shadowGamma: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Midtone Contrast */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Midtone Gamma (Straight-Line Contrast)</span>
                <span className="font-mono text-amber-400">{sensitometry.midtoneContrast.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.70"
                max="1.80"
                step="0.02"
                value={sensitometry.midtoneContrast}
                onChange={(e) => onChangeSensitometry({ ...sensitometry, midtoneContrast: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">1.0 = linear. Typical color negative is 1.05 - 1.15; reversal slide is 1.35+.</span>
            </div>

            {/* Shoulder Roll-Off */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Highlight Shoulder Roll-Off</span>
                <span className="font-mono text-amber-400">{sensitometry.shoulderRollOff.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="1.80"
                step="0.02"
                value={sensitometry.shoulderRollOff}
                onChange={(e) => onChangeSensitometry({ ...sensitometry, shoulderRollOff: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Algebraic sigmoid soft knee smoothly compressing bright skies and cloud details.</span>
            </div>

            {/* Highlight Clip */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Highlight Ceiling (White Point D-Min)</span>
                <span className="font-mono text-amber-400">{sensitometry.highlightClip.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.00"
                step="0.01"
                value={sensitometry.highlightClip}
                onChange={(e) => onChangeSensitometry({ ...sensitometry, highlightClip: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 2: 3x3 DYE COUPLER MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Spectral dye coupler cross-talk matrix. Models the overlapping spectral absorption of Cyan, Magenta, and Yellow dyes in real chemical film emulsions.
            </div>

            {/* Red Output Row */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] font-mono font-semibold text-red-400">RED CHANNEL COUPLERS</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">R → R ({colorMatrix[0][0].toFixed(2)})</div>
                  <input
                    type="range" min="0.80" max="1.30" step="0.01"
                    value={colorMatrix[0][0]}
                    onChange={(e) => handleMatrixCell(0, 0, parseFloat(e.target.value))}
                    className="w-full accent-red-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">G → R ({colorMatrix[0][1].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[0][1]}
                    onChange={(e) => handleMatrixCell(0, 1, parseFloat(e.target.value))}
                    className="w-full accent-red-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">B → R ({colorMatrix[0][2].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[0][2]}
                    onChange={(e) => handleMatrixCell(0, 2, parseFloat(e.target.value))}
                    className="w-full accent-red-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Green Output Row */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] font-mono font-semibold text-green-400">GREEN CHANNEL COUPLERS</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">R → G ({colorMatrix[1][0].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[1][0]}
                    onChange={(e) => handleMatrixCell(1, 0, parseFloat(e.target.value))}
                    className="w-full accent-green-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">G → G ({colorMatrix[1][1].toFixed(2)})</div>
                  <input
                    type="range" min="0.80" max="1.30" step="0.01"
                    value={colorMatrix[1][1]}
                    onChange={(e) => handleMatrixCell(1, 1, parseFloat(e.target.value))}
                    className="w-full accent-green-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">B → G ({colorMatrix[1][2].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[1][2]}
                    onChange={(e) => handleMatrixCell(1, 2, parseFloat(e.target.value))}
                    className="w-full accent-green-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Blue Output Row */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] font-mono font-semibold text-sky-400">BLUE CHANNEL COUPLERS</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">R → B ({colorMatrix[2][0].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[2][0]}
                    onChange={(e) => handleMatrixCell(2, 0, parseFloat(e.target.value))}
                    className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">G → B ({colorMatrix[2][1].toFixed(2)})</div>
                  <input
                    type="range" min="-0.20" max="0.20" step="0.01"
                    value={colorMatrix[2][1]}
                    onChange={(e) => handleMatrixCell(2, 1, parseFloat(e.target.value))}
                    className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1">B → B ({colorMatrix[2][2].toFixed(2)})</div>
                  <input
                    type="range" min="0.80" max="1.30" step="0.01"
                    value={colorMatrix[2][2]}
                    onChange={(e) => handleMatrixCell(2, 2, parseFloat(e.target.value))}
                    className="w-full accent-sky-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COLOR BALANCE & SPLIT TONING */}
        {activeTab === 'balance' && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Luminance-weighted split toning and saturation response. Film dyes exhibit peak saturation in midtones with natural desaturation at density extremes.
            </div>

            {/* Global Saturation */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Global Saturation</span>
                <span className="font-mono text-amber-400">{(colorGrading.globalSaturation * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.0" max="2.0" step="0.02"
                value={colorGrading.globalSaturation}
                onChange={(e) => onChangeColorGrading({ ...colorGrading, globalSaturation: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Highlight Saturation (Desaturation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Highlight Saturation</span>
                <span className="font-mono text-amber-400">{(colorGrading.highlightSaturation * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.2" max="1.5" step="0.02"
                value={colorGrading.highlightSaturation}
                onChange={(e) => onChangeColorGrading({ ...colorGrading, highlightSaturation: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Real film dye exhaustion causes bright highlights to pastel / desaturate smoothly.</span>
            </div>

            {/* Skin Tone Protection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Skin Tone Melanin Protection</span>
                <span className="font-mono text-amber-400">{(colorGrading.skinProtection * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.0" max="1.0" step="0.05"
                value={colorGrading.skinProtection}
                onChange={(e) => onChangeColorGrading({ ...colorGrading, skinProtection: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Isolates the I-axis melanin locus to preserve natural skin undertones.</span>
            </div>

            {/* Shadow Tint Split */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">SHADOW COLOR CAST (TOE BIAS)</div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Cyan ↔ Red</span>
                    <span className="font-mono">{colorGrading.shadowTint.r > 0 ? `+${colorGrading.shadowTint.r.toFixed(3)}` : colorGrading.shadowTint.r.toFixed(3)}</span>
                  </div>
                  <input
                    type="range" min="-0.15" max="0.15" step="0.005"
                    value={colorGrading.shadowTint.r}
                    onChange={(e) => onChangeColorGrading({
                      ...colorGrading,
                      shadowTint: { ...colorGrading.shadowTint, r: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Magenta ↔ Green</span>
                    <span className="font-mono">{colorGrading.shadowTint.g > 0 ? `+${colorGrading.shadowTint.g.toFixed(3)}` : colorGrading.shadowTint.g.toFixed(3)}</span>
                  </div>
                  <input
                    type="range" min="-0.15" max="0.15" step="0.005"
                    value={colorGrading.shadowTint.g}
                    onChange={(e) => onChangeColorGrading({
                      ...colorGrading,
                      shadowTint: { ...colorGrading.shadowTint, g: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Yellow ↔ Blue</span>
                    <span className="font-mono">{colorGrading.shadowTint.b > 0 ? `+${colorGrading.shadowTint.b.toFixed(3)}` : colorGrading.shadowTint.b.toFixed(3)}</span>
                  </div>
                  <input
                    type="range" min="-0.15" max="0.15" step="0.005"
                    value={colorGrading.shadowTint.b}
                    onChange={(e) => onChangeColorGrading({
                      ...colorGrading,
                      shadowTint: { ...colorGrading.shadowTint, b: parseFloat(e.target.value) }
                    })}
                    className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OPTICAL ARTIFACTS (Halation & Grain) */}
        {activeTab === 'optical' && (
          <div className="space-y-4">
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Physical emulsion characteristics: Red halation bloom from light scattering at base layer, and stochastic silver halide grain distribution.
            </div>

            {/* Halation Intensity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Red Halation Intensity</span>
                <span className="font-mono text-amber-400">{(opticalArtifacts.halationIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.0" max="0.8" step="0.02"
                value={opticalArtifacts.halationIntensity}
                onChange={(e) => onChangeOptical({ ...opticalArtifacts, halationIntensity: parseFloat(e.target.value) })}
                className="w-full accent-red-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Simulates Kodak Vision3 / CineStill 800T red glow around specular light sources.</span>
            </div>

            {/* Halation Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Halation Trigger Threshold</span>
                <span className="font-mono text-amber-400">{(opticalArtifacts.halationThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.65" max="0.95" step="0.01"
                value={opticalArtifacts.halationThreshold}
                onChange={(e) => onChangeOptical({ ...opticalArtifacts, halationThreshold: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Film Grain Intensity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Silver Halide Film Grain</span>
                <span className="font-mono text-amber-400">{(opticalArtifacts.grainIntensity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min="0.0" max="0.4" step="0.01"
                value={opticalArtifacts.grainIntensity}
                onChange={(e) => onChangeOptical({ ...opticalArtifacts, grainIntensity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Organic micro-crystal grain scaled to midtones and roll-off in highlights.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
