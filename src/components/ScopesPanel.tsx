import React, { useRef, useEffect, useState } from 'react';
import { SensitometryParams, Matrix3x3, ColorGradingParams } from '../color-science/types.ts';
import { evaluateSensitometricCurve, transformPixel, clamp } from '../color-science/transferFunctions.ts';
import { Activity, BarChart2, Compass, Layers } from 'lucide-react';

interface ScopesPanelProps {
  sensitometry: SensitometryParams;
  colorMatrix: Matrix3x3;
  colorGrading: ColorGradingParams;
  sourceCanvas: HTMLCanvasElement | null;
  targetColorSpace: string;
}

export const ScopesPanel: React.FC<ScopesPanelProps> = ({
  sensitometry,
  colorMatrix,
  colorGrading,
  sourceCanvas,
  targetColorSpace,
}) => {
  const [activeScope, setActiveScope] = useState<'sensitometry' | 'waveform' | 'vectorscope' | 'lut-slice'>('sensitometry');

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const vectorscopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const lutSliceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render RGB Waveform Parade
  useEffect(() => {
    if (activeScope !== 'waveform' || !sourceCanvas) return;
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid lines for IRE (0, 25, 50, 75, 100 IRE)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [0.1, 0.25, 0.5, 0.75, 0.9].forEach((frac) => {
      const y = Math.round(h * (1.0 - frac));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(frac * 100)}%`, 4, y - 2);
    });

    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) return;

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    // Downsample for fast waveform draw
    const stepX = Math.max(1, Math.floor(srcW / w));
    const stepY = Math.max(1, Math.floor(srcH / 80));

    const imgData = srcCtx.getImageData(0, 0, srcW, srcH);
    const data = imgData.data;

    // We draw 3 channels in parallel or overlay: Red, Green, Blue
    // Semi-transparent additive blend
    ctx.globalCompositeOperation = 'screen';

    for (let x = 0; x < srcW; x += stepX) {
      const outX = Math.floor((x / srcW) * w);

      for (let y = 0; y < srcH; y += stepY) {
        const idx = (y * srcW + x) * 4;
        const r = data[idx] / 255.0;
        const g = data[idx + 1] / 255.0;
        const b = data[idx + 2] / 255.0;

        const [trR, trG, trB] = transformPixel(
          r, g, b,
          sensitometry, colorMatrix, colorGrading, targetColorSpace
        );

        const yR = Math.round((1.0 - clamp(trR)) * (h - 1));
        const yG = Math.round((1.0 - clamp(trG)) * (h - 1));
        const yB = Math.round((1.0 - clamp(trB)) * (h - 1));

        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(outX, yR, 1, 1);

        ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.fillRect(outX, yG, 1, 1);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(outX, yB, 1, 1);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }, [activeScope, sourceCanvas, sensitometry, colorMatrix, colorGrading, targetColorSpace]);

  // Render Vectorscope (UV / CbCr Chrominance polar plot)
  useEffect(() => {
    if (activeScope !== 'vectorscope' || !sourceCanvas) return;
    const canvas = vectorscopeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = size * 0.42;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Concentric graticule rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach((rFrac) => {
      ctx.beginPath();
      ctx.arc(center, center, radius * rFrac, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.stroke();

    // Skin Tone Line (I-axis ~ 123 degrees / approx 10:30 on clock face)
    const skinAngle = -0.65; // ~10:30 in radians
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(skinAngle) * radius,
      center + Math.sin(skinAngle) * radius
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // Skin tone label
    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('SKIN TONE (I-AXIS)', center + Math.cos(skinAngle) * radius * 0.7 - 50, center + Math.sin(skinAngle) * radius * 0.7 - 8);

    // Standard 75% SMPTE color targets (R, Mg, B, Cy, G, Yl)
    const targets = [
      { name: 'R', angle: -0.32, color: '#ef4444' },
      { name: 'Mg', angle: -1.35, color: '#ec4899' },
      { name: 'B', angle: -2.35, color: '#3b82f6' },
      { name: 'Cy', angle: 2.82, color: '#06b6d4' },
      { name: 'G', angle: 1.82, color: '#22c55e' },
      { name: 'Yl', angle: 0.82, color: '#eab308' },
    ];

    targets.forEach((t) => {
      const tx = center + Math.cos(t.angle) * (radius * 0.75);
      const ty = center + Math.sin(t.angle) * (radius * 0.75);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - 4, ty - 4, 8, 8);
      ctx.fillStyle = t.color;
      ctx.fillText(t.name, tx + 6, ty + 3);
    });

    // Sample pixels from source image and plot transformed Cb/Cr
    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) return;
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const step = Math.max(2, Math.floor(Math.sqrt((srcW * srcH) / 8000)));

    const imgData = srcCtx.getImageData(0, 0, srcW, srcH);
    const data = imgData.data;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    for (let y = 0; y < srcH; y += step) {
      for (let x = 0; x < srcW; x += step) {
        const idx = (y * srcW + x) * 4;
        const r = data[idx] / 255.0;
        const g = data[idx + 1] / 255.0;
        const b = data[idx + 2] / 255.0;

        const [trR, trG, trB] = transformPixel(
          r, g, b,
          sensitometry, colorMatrix, colorGrading, targetColorSpace
        );

        // Calculate Cb and Cr in range [-0.5, 0.5]
        const cb = -0.168736 * trR - 0.331264 * trG + 0.5 * trB;
        const cr = 0.5 * trR - 0.418688 * trG - 0.081312 * trB;

        // Plot onto vectorscope coordinates
        const plotX = center + cb * (radius * 2.0);
        const plotY = center - cr * (radius * 2.0);

        ctx.fillRect(plotX, plotY, 1.5, 1.5);
      }
    }
  }, [activeScope, sourceCanvas, sensitometry, colorMatrix, colorGrading, targetColorSpace]);

  // Render 3D LUT Lattice Slice Visualizer
  useEffect(() => {
    if (activeScope !== 'lut-slice') return;
    const canvas = lutSliceCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Draw 4 slices of blue: B = 0.0, 0.33, 0.66, 1.0
    const slices = 4;
    const sliceW = (w - 30) / slices;
    const sliceH = h - 30;

    for (let s = 0; s < slices; s++) {
      const bIn = s / (slices - 1);
      const startX = 15 + s * sliceW;
      const startY = 15;

      const steps = 16;
      const cellW = (sliceW - 4) / steps;
      const cellH = (sliceH - 20) / steps;

      for (let gy = 0; gy < steps; gy++) {
        const gIn = 1.0 - gy / (steps - 1);
        for (let rx = 0; rx < steps; rx++) {
          const rIn = rx / (steps - 1);

          const [rOut, gOut, bOut] = transformPixel(
            rIn, gIn, bIn,
            sensitometry, colorMatrix, colorGrading, targetColorSpace
          );

          ctx.fillStyle = `rgb(${Math.round(rOut * 255)}, ${Math.round(gOut * 255)}, ${Math.round(bOut * 255)})`;
          ctx.fillRect(startX + rx * cellW, startY + gy * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      // Slice label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`B=${bIn.toFixed(2)}`, startX + 4, startY + sliceH - 4);
    }
  }, [activeScope, sensitometry, colorMatrix, colorGrading, targetColorSpace]);

  // Generate Sensitometric SVG Curve Points
  const getCurvePath = (channel: 'r' | 'g' | 'b' | 'luma') => {
    const points: string[] = [];
    const samples = 100;

    for (let i = 0; i <= samples; i++) {
      const x = i / samples;
      let r = x, g = x, b = x;
      if (channel === 'r') { r = x; g = x * 0.5; b = x * 0.5; }
      else if (channel === 'g') { r = x * 0.5; g = x; b = x * 0.5; }
      else if (channel === 'b') { r = x * 0.5; g = x * 0.5; b = x; }

      const [trR, trG, trB] = transformPixel(
        r, g, b,
        sensitometry, colorMatrix, colorGrading, targetColorSpace
      );

      let val = trR;
      if (channel === 'g') val = trG;
      if (channel === 'b') val = trB;
      if (channel === 'luma') val = 0.2126 * trR + 0.7152 * trG + 0.0722 * trB;

      // Coordinate in 400x260 SVG space
      const svgX = 40 + x * 320;
      const svgY = 220 - clamp(val) * 180;
      points.push(`${i === 0 ? 'M' : 'L'} ${svgX.toFixed(1)},${svgY.toFixed(1)}`);
    }

    return points.join(' ');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header / Scope Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveScope('sensitometry')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeScope === 'sensitometry' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>H&D Sensitometry Curve</span>
          </button>

          <button
            onClick={() => setActiveScope('waveform')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeScope === 'waveform' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>RGB Waveform Parade</span>
          </button>

          <button
            onClick={() => setActiveScope('vectorscope')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeScope === 'vectorscope' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Vectorscope (Skin Line)</span>
          </button>

          <button
            onClick={() => setActiveScope('lut-slice')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
              activeScope === 'lut-slice' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D LUT Lattice Slice</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>GAMMA: {sensitometry.midtoneContrast.toFixed(2)}</span>
          <span className="text-slate-600">·</span>
          <span>TOE: {(sensitometry.toeLift * 100).toFixed(1)}%</span>
          <span className="text-slate-600">·</span>
          <span>SHOULDER: {sensitometry.shoulderRollOff.toFixed(2)}</span>
        </div>
      </div>

      {/* Scope Main Display */}
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950">
        {activeScope === 'sensitometry' && (
          <div className="w-full max-w-2xl flex flex-col items-center">
            <svg viewBox="0 0 400 260" className="w-full h-auto bg-slate-900/80 rounded-lg border border-slate-800 shadow-inner">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((v) => {
                const y = 220 - v * 180;
                const x = 40 + v * 320;
                return (
                  <g key={v}>
                    <line x1="40" y1={y} x2="360" y2={y} stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1={x} y1="40" x2={x} y2="220" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="32" y={y + 3} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">
                      {v.toFixed(2)}
                    </text>
                    <text x={x} y="235" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      {v.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Identity 45 degree line */}
              <line x1="40" y1="220" x2="360" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

              {/* R, G, B Curves */}
              <path d={getCurvePath('r')} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d={getCurvePath('g')} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d={getCurvePath('b')} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.8" />
              {/* Luma Transfer Curve (Thick Amber) */}
              <path d={getCurvePath('luma')} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

              {/* Sensitometric Key Region Markers */}
              <text x="50" y="210" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                TOE (Flare Floor)
              </text>
              <text x="160" y="140" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                GAMMA (Straight Line)
              </text>
              <text x="270" y="55" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                SHOULDER (Soft Knee)
              </text>

              {/* Axis Titles */}
              <text x="200" y="252" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
                Relative Log Exposure (Input)
              </text>
              <text x="14" y="130" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="middle" transform="rotate(-90 14 130)">
                Optical Density / Transmittance
              </text>
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 rounded" /> Luminance Response
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 rounded" /> Red Coupler
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-green-500 rounded" /> Green Coupler
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-sky-400 rounded" /> Blue Coupler
              </span>
            </div>
          </div>
        )}

        {activeScope === 'waveform' && (
          <canvas
            ref={waveformCanvasRef}
            width={580}
            height={300}
            className="w-full max-w-2xl h-auto rounded-lg border border-slate-800 shadow-inner"
          />
        )}

        {activeScope === 'vectorscope' && (
          <canvas
            ref={vectorscopeCanvasRef}
            width={340}
            height={340}
            className="rounded-lg border border-slate-800 shadow-inner"
          />
        )}

        {activeScope === 'lut-slice' && (
          <canvas
            ref={lutSliceCanvasRef}
            width={580}
            height={260}
            className="w-full max-w-2xl h-auto rounded-lg border border-slate-800 shadow-inner"
          />
        )}
      </div>
    </div>
  );
};
