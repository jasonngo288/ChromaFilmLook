import React, { useState, useEffect } from 'react';
import { FILM_PRESETS } from './color-science/presets.ts';
import { FilmEmulationProfile, SensitometryParams, Matrix3x3, ColorGradingParams, OpticalArtifactsParams, PixelProbeData } from './color-science/types.ts';
import { SceneType, getCalibratedIntensity } from './color-science/intensityTable.ts';
import { Header } from './components/Header.tsx';
import { PresetSelector } from './components/PresetSelector.tsx';
import { FilmCanvas } from './components/FilmCanvas.tsx';
import { StudioControls } from './components/StudioControls.tsx';
import { ScopesPanel } from './components/ScopesPanel.tsx';
import { CodeExportModal } from './components/CodeExportModal.tsx';
import { AILookAnalyzerModal } from './components/AILookAnalyzerModal.tsx';
import { ScientistConsultationModal } from './components/ScientistConsultationModal.tsx';
import { IntensityScorecardModal } from './components/IntensityScorecardModal.tsx';

export default function App() {
  const [profile, setProfile] = useState<FilmEmulationProfile>(FILM_PRESETS[0]);
  const [scene, setScene] = useState<SceneType>('portrait');
  const [intensity, setIntensity] = useState<number>(0.50);
  const [activeTab, setActiveTab] = useState<'studio' | 'scopes' | 'code' | 'ai-consult'>('studio');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAIAnalyzerOpen, setIsAIAnalyzerOpen] = useState<boolean>(false);
  const [isConsultOpen, setIsConsultOpen] = useState<boolean>(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState<boolean>(false);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [probeData, setProbeData] = useState<PixelProbeData | null>(null);

  // Compute current calibrated P0 intensity for active preset & scene
  const calibratedP0 = getCalibratedIntensity(profile.id, scene);

  // Sync intensity when preset or scene changes (unless user explicitly customized)
  const handleSelectPreset = (newPreset: FilmEmulationProfile) => {
    setProfile(newPreset);
    const newCal = getCalibratedIntensity(newPreset.id, scene);
    setIntensity(newCal);
  };

  const handleSceneChange = (newScene: SceneType) => {
    setScene(newScene);
    const newCal = getCalibratedIntensity(profile.id, newScene);
    setIntensity(newCal);
  };

  // Reset to Neutral Identity Profile
  const handleResetToNeutral = () => {
    setProfile({
      id: 'neutral_linear',
      name: 'Neutral Linear Rec.709',
      manufacturer: 'Reference Standard',
      stockType: 'Color Negative',
      iso: 100,
      description: 'Neutral un-graded reference pass with 1:1 linear gamma and identity color matrix.',
      characteristics: ['Identity Matrix', 'Linear Contrast (Gamma 1.0)', 'Zero Flare Toe'],
      sensitometry: {
        toeLift: 0.0,
        shadowGamma: 1.0,
        midtoneContrast: 1.0,
        shoulderRollOff: 1.0,
        highlightClip: 1.0,
        dMin: 0.0,
        dMax: 3.0,
      },
      colorMatrix: [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0],
      ],
      colorGrading: {
        shadowTint: { r: 0.0, g: 0.0, b: 0.0 },
        highlightTint: { r: 0.0, g: 0.0, b: 0.0 },
        globalSaturation: 1.0,
        shadowSaturation: 1.0,
        highlightSaturation: 1.0,
        skinProtection: 0.0,
      },
      opticalArtifacts: {
        halationIntensity: 0.0,
        halationThreshold: 0.95,
        halationRadius: 1,
        grainIntensity: 0.0,
        grainSize: 1.0,
        grainRoughness: 0.2,
      },
      targetColorSpace: 'sRGB',
    });
    setIntensity(1.0);
  };

  // Cell selection from full scorecard modal
  const handleSelectScorecardCell = (presetId: string, targetScene: SceneType, valPct: number) => {
    const matchedPreset = FILM_PRESETS.find((p) => p.id === presetId);
    if (matchedPreset) {
      setProfile(matchedPreset);
    }
    setScene(targetScene);
    setIntensity(valPct / 100.0);
  };

  // Apply look deconstructed by AI
  const handleApplyExtractedLook = (extracted: Partial<FilmEmulationProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...extracted,
      id: 'ai_custom_look_' + Date.now(),
    }));
    setIntensity(0.60);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'code') {
            setIsExportOpen(true);
          } else if (tab === 'ai-consult') {
            setIsConsultOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAIAnalyzer={() => setIsAIAnalyzerOpen(true)}
        onResetToNeutral={handleResetToNeutral}
        activePresetName={profile.name}
      />

      {/* Film Stock Preset Shelf */}
      <div className="px-6 py-2 bg-slate-950 border-b border-slate-900 shrink-0">
        <PresetSelector
          activeProfileId={profile.id}
          onSelectPreset={handleSelectPreset}
        />
      </div>

      {/* Main Studio Viewport */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {activeTab === 'studio' && (
          <>
            {/* Left 62%: Interactive Film Canvas with Scene & Intensity ribbon */}
            <div className="flex-1 flex flex-col min-w-0">
              <FilmCanvas
                sensitometry={profile.sensitometry}
                colorMatrix={profile.colorMatrix}
                colorGrading={profile.colorGrading}
                opticalArtifacts={profile.opticalArtifacts}
                targetColorSpace={profile.targetColorSpace}
                intensity={intensity}
                onIntensityChange={setIntensity}
                scene={scene}
                onSceneChange={handleSceneChange}
                calibratedIntensity={calibratedP0}
                onOpenIntensityTable={() => setIsScorecardOpen(true)}
                onProbePixel={setProbeData}
                onImageLoaded={setSourceCanvas}
              />
            </div>

            {/* Right 38%: Fine Precision Color Science Controls */}
            <div className="w-[380px] lg:w-[420px] flex flex-col shrink-0">
              <StudioControls
                sensitometry={profile.sensitometry}
                colorMatrix={profile.colorMatrix}
                colorGrading={profile.colorGrading}
                opticalArtifacts={profile.opticalArtifacts}
                onChangeSensitometry={(s) => setProfile((p) => ({ ...p, sensitometry: s }))}
                onChangeMatrix={(m) => setProfile((p) => ({ ...p, colorMatrix: m }))}
                onChangeColorGrading={(g) => setProfile((p) => ({ ...p, colorGrading: g }))}
                onChangeOptical={(o) => setProfile((p) => ({ ...p, opticalArtifacts: o }))}
                onResetControls={handleResetToNeutral}
              />
            </div>
          </>
        )}

        {activeTab === 'scopes' && (
          <>
            {/* Left 50%: Live Canvas */}
            <div className="flex-1 flex flex-col min-w-0">
              <FilmCanvas
                sensitometry={profile.sensitometry}
                colorMatrix={profile.colorMatrix}
                colorGrading={profile.colorGrading}
                opticalArtifacts={profile.opticalArtifacts}
                targetColorSpace={profile.targetColorSpace}
                intensity={intensity}
                onIntensityChange={setIntensity}
                scene={scene}
                onSceneChange={handleSceneChange}
                calibratedIntensity={calibratedP0}
                onOpenIntensityTable={() => setIsScorecardOpen(true)}
                onProbePixel={setProbeData}
                onImageLoaded={setSourceCanvas}
              />
            </div>

            {/* Right 50%: Multi-Scope Sensitometric Diagnostics */}
            <div className="flex-1 flex flex-col min-w-0">
              <ScopesPanel
                sensitometry={profile.sensitometry}
                colorMatrix={profile.colorMatrix}
                colorGrading={profile.colorGrading}
                sourceCanvas={sourceCanvas}
                targetColorSpace={profile.targetColorSpace}
              />
            </div>
          </>
        )}
      </main>

      {/* Modal 1: Code & 3D LUT (.cube / HaldCLUT) Export */}
      <CodeExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        profile={profile}
        currentIntensity={intensity}
      />

      {/* Modal 2: Bảng Tra Intensity P0 Scorecard Matrix Modal */}
      <IntensityScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        activePresetId={profile.id}
        activeScene={scene}
        onSelectCell={handleSelectScorecardCell}
      />

      {/* Modal 3: AI Look Reference Analyzer */}
      <AILookAnalyzerModal
        isOpen={isAIAnalyzerOpen}
        onClose={() => setIsAIAnalyzerOpen(false)}
        onApplyExtractedLook={handleApplyExtractedLook}
      />

      {/* Modal 4: AI Color Scientist Technical Terminal */}
      <ScientistConsultationModal
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
        activeProfile={profile}
      />
    </div>
  );
}
