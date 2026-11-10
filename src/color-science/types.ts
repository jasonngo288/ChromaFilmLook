export interface SensitometryParams {
  toeLift: number;          // 0.00 to 0.15 - Lift in black floor / flare
  shadowGamma: number;      // 0.8 to 1.8 - Slope of toe to midtones
  midtoneContrast: number;  // 0.7 to 1.8 - Linear straight-line gamma
  shoulderRollOff: number;  // 0.4 to 1.8 - Soft highlight compression curvature
  highlightClip: number;    // 0.80 to 1.0 - Highlight ceiling / white point
  dMin: number;             // Base fog density (typical negative 0.15 - 0.25)
  dMax: number;             // Maximum density saturation
}

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface ColorGradingParams {
  shadowTint: { r: number; g: number; b: number };     // -0.2 to 0.2
  highlightTint: { r: number; g: number; b: number };  // -0.2 to 0.2
  globalSaturation: number;                            // 0.0 to 2.0
  shadowSaturation: number;                            // 0.0 to 1.5
  highlightSaturation: number;                         // 0.0 to 1.5
  skinProtection: number;                              // 0.0 to 1.0
}

export interface OpticalArtifactsParams {
  halationIntensity: number;  // 0.0 to 1.0
  halationThreshold: number;  // 0.6 to 0.98
  halationRadius: number;     // 1 to 20
  grainIntensity: number;     // 0.0 to 0.5
  grainSize: number;          // 0.5 to 3.0
  grainRoughness: number;     // 0.1 to 0.9
}

export interface FilmEmulationProfile {
  id: string;
  name: string;
  manufacturer: string;
  stockType: 'Color Negative' | 'Color Reversal' | 'Motion Picture Negative' | 'B&W Negative' | 'Log Intermediate';
  iso: number | string;
  description: string;
  characteristics: string[];
  sensitometry: SensitometryParams;
  colorMatrix: Matrix3x3;
  colorGrading: ColorGradingParams;
  opticalArtifacts: OpticalArtifactsParams;
  targetColorSpace: 'sRGB' | 'Rec.709' | 'Cineon Log' | 'ACEScc' | 'ARRI LogC3';
}

export interface PixelProbeData {
  x: number;
  y: number;
  origR: number;
  origG: number;
  origB: number;
  gradedR: number;
  gradedG: number;
  gradedB: number;
  deltaE: number;
  density: number;
}
