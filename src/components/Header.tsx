import React from 'react';
import { Film, Sliders, Activity, Code2, Sparkles, RotateCcw, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'analyzer' | 'scopes' | 'code' | 'ai-consult';
  onSelectTab: (tab: 'studio' | 'analyzer' | 'scopes' | 'code' | 'ai-consult') => void;
  onOpenExport: () => void;
  onOpenAIAnalyzer: () => void;
  onResetToNeutral: () => void;
  activePresetName: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenExport,
  onOpenAIAnalyzer,
  onResetToNeutral,
  activePresetName,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0">
      {/* Zone 1: Brand wordmark (single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Film className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            ChromaFilm
          </span>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline whitespace-nowrap">
            Color Science Studio
          </span>
        </div>
      </div>

      {/* Zone 2: 5 single-line text navigation links/tabs */}
      <nav className="flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('studio')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'studio' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Film Workbench</span>
        </button>

        <button
          onClick={() => onSelectTab('analyzer')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'analyzer' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Phân Tích & LUT</span>
        </button>

        <button
          onClick={() => onSelectTab('scopes')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'scopes' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Sensitometry Scopes</span>
        </button>

        <button
          onClick={() => onSelectTab('code')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'code' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code & 3D LUTs</span>
        </button>

        <button
          onClick={() => onSelectTab('ai-consult')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'ai-consult' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'
          }`}
        >
          <span>AI Specialist</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action buttons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenAIAnalyzer}
          title="Analyze target look reference image or description"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Analyze Look Reference</span>
        </button>

        <button
          onClick={onResetToNeutral}
          title="Reset all color science parameters to identity"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-950"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export .cube / Code</span>
        </button>
      </div>
    </header>
  );
};
