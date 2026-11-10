import { SensitometryParams, Matrix3x3, ColorGradingParams, OpticalArtifactsParams } from './types.ts';

// Standard CIE 1931 Luminance weights for Rec.709 / sRGB
export const LUMA_R = 0.2126;
export const LUMA_G = 0.7152;
export const LUMA_B = 0.0722;

export function clamp(v: number, min = 0.0, max = 1.0): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Sensitometric Hurter-Driffield (H&D) transfer function
// Formulated with soft toe flare, linear/sigmoid midtone gamma, and anti-burn highlight compression
export function evaluateSensitometricCurve(x: number, s: SensitometryParams): number {
  const clampedX = clamp(x);

  // 1. Toe flare lift (base fog/density)
  // Decays smoothly toward midtones so deep shadows never crush to pitch black
  const toeWeight = Math.pow(1.0 - clampedX, 3.0);
  const toe = s.toeLift * toeWeight;

  // 2. Smooth S-curve midtone contrast
  // S-curve formulation: x^gamma / (x^gamma + (1-x)^gamma)
  const gamma = Math.max(0.6, s.midtoneContrast);
  let midtone: number;
  if (Math.abs(gamma - 1.0) < 0.001) {
    midtone = clampedX;
  } else {
    const xG = Math.pow(clampedX, gamma);
    const invG = Math.pow(1.0 - clampedX, gamma);
    const denom = xG + invG;
    midtone = denom > 0.0001 ? xG / denom : clampedX;
  }

  // 3. Highlight Shoulder Roll-off (Anti-burn soft knee)
  // Begins at knee threshold (0.68) and compresses asymptotically toward highlightClip
  const knee = 0.68;
  const clip = Math.min(0.99, s.highlightClip || 0.97);
  let shoulder = midtone;

  if (midtone > knee) {
    const excess = (midtone - knee) / (1.0 - knee);
    const rollFactor = Math.max(0.5, s.shoulderRollOff || 1.0);
    // Asymptotic compression: excess / (1 + excess * rollFactor)
    const compressed = excess / (1.0 + excess * rollFactor);
    shoulder = knee + compressed * (clip - knee);
  }

  // Combine toe flare and compressed shoulder
  const result = toe + shoulder * (1.0 - toe);
  return clamp(result, 0.0, clip);
}

// 3x3 Matrix multiplication for RGB vector with row energy normalization
export function applyMatrix3x3(r: number, g: number, b: number, m: Matrix3x3): [number, number, number] {
  // Normalize row sums so spectral cross-talk doesn't inflate luminance
  const sum0 = m[0][0] + m[0][1] + m[0][2];
  const scale0 = Math.abs(sum0) > 0.001 ? 1.0 / sum0 : 1.0;

  const sum1 = m[1][0] + m[1][1] + m[1][2];
  const scale1 = Math.abs(sum1) > 0.001 ? 1.0 / sum1 : 1.0;

  const sum2 = m[2][0] + m[2][1] + m[2][2];
  const scale2 = Math.abs(sum2) > 0.001 ? 1.0 / sum2 : 1.0;

  const outR = (m[0][0] * r + m[0][1] * g + m[0][2] * b) * scale0;
  const outG = (m[1][0] * r + m[1][1] * g + m[1][2] * b) * scale1;
  const outB = (m[2][0] * r + m[2][1] * g + m[2][2] * b) * scale2;

  return [clamp(outR), clamp(outG), clamp(outB)];
}

// Cineon Log encoding (Kodak Cineon 10-bit specification)
export function linearToCineonLog(x: number): number {
  const norm = clamp(x, 0.00001, 1.0);
  const val = (685 + 300 * Math.log10(0.01079 + 0.98921 * norm)) / 1023.0;
  return clamp(val);
}

// Cineon Log decoding to linear
export function cineonLogToLinear(logVal: number): number {
  const cv = clamp(logVal) * 1023.0;
  const exp = Math.pow(10.0, (cv - 685.0) / 300.0);
  const lin = (exp - 0.01079) / 0.98921;
  return clamp(lin);
}

// Evaluates skin tone index for protecting natural melanin
export function getSkinToneWeight(r: number, g: number, b: number): number {
  const y = LUMA_R * r + LUMA_G * g + LUMA_B * b;
  const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;

  const cbNorm = cb - (-0.05);
  const crNorm = cr - 0.12;
  const dist = (cbNorm * cbNorm) / (0.08 * 0.08) + (crNorm * crNorm) / (0.09 * 0.09);

  return clamp(1.0 - dist);
}

// Full analytical pixel transformation pipeline with intensity blend
export function transformPixel(
  r: number,
  g: number,
  b: number,
  sensitometry: SensitometryParams,
  matrix: Matrix3x3,
  grading: ColorGradingParams,
  targetSpace: string = 'sRGB',
  intensity: number = 1.0 // 0.0 = original neutral, 1.0 = 100% full LUT grade
): [number, number, number] {
  const inR = clamp(r);
  const inG = clamp(g);
  const inB = clamp(b);

  if (intensity <= 0.001) {
    return [inR, inG, inB];
  }

  let currR = inR;
  let currG = inG;
  let currB = inB;

  // 1. Spectral Dye Coupler Matrix (Cross-talk with energy normalization)
  const [matR, matG, matB] = applyMatrix3x3(currR, currG, currB, matrix);
  currR = matR;
  currG = matG;
  currB = matB;

  // 2. Channel Sensitometric Curves (Per-channel H&D density mapping with anti-burn)
  currR = evaluateSensitometricCurve(currR, sensitometry);
  currG = evaluateSensitometricCurve(currG, sensitometry);
  currB = evaluateSensitometricCurve(currB, sensitometry);

  // 3. Shadow & Highlight Color Split Toning (smooth weighting)
  const lum = LUMA_R * currR + LUMA_G * currG + LUMA_B * currB;
  const shadowWeight = Math.pow(1.0 - lum, 2.5);
  const highlightWeight = Math.pow(lum, 2.5);

  currR += grading.shadowTint.r * shadowWeight * 0.6 + grading.highlightTint.r * highlightWeight * 0.6;
  currG += grading.shadowTint.g * shadowWeight * 0.6 + grading.highlightTint.g * highlightWeight * 0.6;
  currB += grading.shadowTint.b * shadowWeight * 0.6 + grading.highlightTint.b * highlightWeight * 0.6;

  // 4. Controlled Luminance-dependent Saturation
  // Real film dyes saturate gently in midtones and roll off in deep blacks and high highlights
  const midtoneWeight = Math.sin(lum * Math.PI);
  const effectiveSat = grading.globalSaturation * (
    grading.shadowSaturation * shadowWeight +
    1.0 * midtoneWeight +
    grading.highlightSaturation * highlightWeight
  );

  // Preserve skin tones if protected
  const skinWeight = getSkinToneWeight(currR, currG, currB) * grading.skinProtection;
  const finalSat = lerp(effectiveSat, 1.0, skinWeight * 0.6);

  currR = lerp(lum, currR, finalSat);
  currG = lerp(lum, currG, finalSat);
  currB = lerp(lum, currB, finalSat);

  // Soft clamp highlights to prevent clipping burn
  currR = clamp(currR, 0.0, sensitometry.highlightClip || 0.98);
  currG = clamp(currG, 0.0, sensitometry.highlightClip || 0.98);
  currB = clamp(currB, 0.0, sensitometry.highlightClip || 0.98);

  // 5. Optional color space conversion if Target is Cineon Log
  if (targetSpace === 'Cineon Log') {
    currR = linearToCineonLog(currR);
    currG = linearToCineonLog(currG);
    currB = linearToCineonLog(currB);
  }

  // 6. Blend Graded with Original according to calibrated Intensity
  const finalR = lerp(inR, currR, intensity);
  const finalG = lerp(inG, currG, intensity);
  const finalB = lerp(inB, currB, intensity);

  return [clamp(finalR), clamp(finalG), clamp(finalB)];
}
