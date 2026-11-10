import React from 'react';
import { X, Table, Download, Info, Check } from 'lucide-react';
import { INTENSITY_TABLE, SCENE_DEFINITIONS, SceneType } from '../color-science/intensityTable.ts';
import { downloadTextFile } from '../color-science/lutGenerator.ts';

interface IntensityScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId: string;
  activeScene: SceneType;
  onSelectCell: (presetId: string, scene: SceneType, intensity: number) => void;
}

export const IntensityScorecardModal: React.FC<IntensityScorecardModalProps> = ({
  isOpen,
  onClose,
  activePresetId,
  activeScene,
  onSelectCell,
}) => {
  if (!isOpen) return null;

  const handleDownloadJson = () => {
    fetch('/intensity-table.json')
      .then((res) => res.text())
      .then((text) => {
        downloadTextFile(text, 'intensity-table.json', 'application/json');
      })
      .catch(() => {
        downloadTextFile(JSON.stringify(INTENSITY_TABLE, null, 2), 'intensity-table.json', 'application/json');
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Bảng Intensity LUT × Scene — Tĩnh, P0
                </h2>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Spec §3.2 (10/11/2026)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hiệu chuẩn chống cháy màu & gắt tương phản bằng ma trận intensity theo scene thay vì dùng 1 số global
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Tải intensity-table.json</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        <div className="flex items-start gap-3 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-200/90 shrink-0">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-relaxed">
            <div>
              <strong>Quy tắc hiệu chuẩn:</strong> Scene "nhà" của preset lấy cao; scene rủi ro lấy thấp (portrait thấp với preset vivid/contrast cao để an toàn màu da; night thấp trừ CineStill-800T; landscape cao với preset vivid).
            </div>
            <div className="text-amber-300/70">
              Nhấp vào bất kỳ ô số nào để kích hoạt ngay preset và mức intensity tương ứng lên màn hình làm việc!
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                <th className="py-2.5 px-3 bg-slate-900/60 sticky top-0 z-10 font-semibold">Preset</th>
                {SCENE_DEFINITIONS.map((s) => (
                  <th key={s.id} className="py-2.5 px-3 bg-slate-900/60 sticky top-0 z-10 font-semibold text-center whitespace-nowrap">
                    <div>{s.label}</div>
                    <div className="text-[9px] text-slate-500 font-normal">{s.typicalRange}</div>
                  </th>
                ))}
                <th className="py-2.5 px-3 bg-slate-900/60 sticky top-0 z-10 font-semibold min-w-[220px]">
                  Ghi chú & Cơ sở suy ra số
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {Object.entries(INTENSITY_TABLE).map(([pId, row]) => {
                const isCurrentPreset = pId === activePresetId;
                return (
                  <tr
                    key={pId}
                    className={`transition-colors ${
                      isCurrentPreset ? 'bg-amber-500/5' : 'hover:bg-slate-900/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isCurrentPreset && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        <span>{row.name}</span>
                      </div>
                    </td>

                    {SCENE_DEFINITIONS.map((s) => {
                      const val = row.intensities[s.id];
                      const isSelectedCell = isCurrentPreset && activeScene === s.id;
                      const isHighHome = val >= 70;
                      const isLowSafe = val <= 45;

                      return (
                        <td key={s.id} className="py-3 px-2 text-center">
                          <button
                            onClick={() => {
                              onSelectCell(pId, s.id, val);
                              onClose();
                            }}
                            className={`w-12 py-1 rounded font-mono text-xs font-semibold transition-all ${
                              isSelectedCell
                                ? 'bg-amber-400 text-slate-950 shadow-md scale-105 ring-2 ring-amber-300'
                                : isHighHome
                                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                                : isLowSafe
                                ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30'
                                : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700 border border-slate-700/60'
                            }`}
                            title={`Chọn ${row.name} × ${s.label}: ${val}%`}
                          >
                            {val}%
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-[11px] text-slate-400 leading-relaxed">
                      {row.note}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-500 shrink-0">
          <span>SOURCE: spec §3.2 + presets-drop-2026/*.json</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400/40 inline-block" /> ≥70% (Scene "nhà")
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400/40 inline-block" /> ≤45% (Scene an toàn da/night)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
