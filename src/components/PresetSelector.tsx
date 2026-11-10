import React from 'react';
import { FilmEmulationProfile } from '../color-science/types.ts';
import { FILM_PRESETS } from '../color-science/presets.ts';
import { Film, Check } from 'lucide-react';

interface PresetSelectorProps {
  activeProfileId: string;
  onSelectPreset: (preset: FilmEmulationProfile) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  activeProfileId,
  onSelectPreset,
}) => {
  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-3">
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-slate-200">
            Calibrated Film Emulation Stocks
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          {FILM_PRESETS.length} Profiles
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {FILM_PRESETS.map((p) => {
          const isActive = p.id === activeProfileId;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className={`flex flex-col text-left p-2.5 rounded-lg border transition-all ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-sm shadow-amber-950'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-slate-100 line-clamp-1">
                  {p.name}
                </span>
                {isActive && <Check className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-1.5">
                <span>{p.stockType}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400/90">{typeof p.iso === 'number' ? `ISO ${p.iso}` : p.iso}</span>
              </div>

              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
