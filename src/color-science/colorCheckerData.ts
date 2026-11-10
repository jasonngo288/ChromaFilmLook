// 24-Patch Classic Macbeth ColorChecker sRGB (D65 standard values)
export interface ColorPatch {
  index: number;
  name: string;
  category: 'Skin/Natural' | 'Primary/Secondary' | 'Grayscale';
  r: number;
  g: number;
  b: number;
}

export const MACBETH_COLOR_CHECKER_PATCHES: ColorPatch[] = [
  // Row 1: Natural & Skin
  { index: 1, name: 'Dark Skin', category: 'Skin/Natural', r: 115, g: 82, b: 68 },
  { index: 2, name: 'Light Skin', category: 'Skin/Natural', r: 194, g: 150, b: 130 },
  { index: 3, name: 'Blue Sky', category: 'Skin/Natural', r: 98, g: 122, b: 157 },
  { index: 4, name: 'Foliage', category: 'Skin/Natural', r: 87, g: 108, b: 67 },
  { index: 5, name: 'Blue Flower', category: 'Skin/Natural', r: 133, g: 128, b: 177 },
  { index: 6, name: 'Bluish Green', category: 'Skin/Natural', r: 103, g: 189, b: 170 },

  // Row 2: Primaries & Secondaries
  { index: 7, name: 'Orange', category: 'Primary/Secondary', r: 214, g: 126, b: 44 },
  { index: 8, name: 'Purplish Blue', category: 'Primary/Secondary', r: 80, g: 91, b: 166 },
  { index: 9, name: 'Moderate Red', category: 'Primary/Secondary', r: 193, g: 90, b: 99 },
  { index: 10, name: 'Purple', category: 'Primary/Secondary', r: 94, g: 60, b: 108 },
  { index: 11, name: 'Yellow Green', category: 'Primary/Secondary', r: 157, g: 188, b: 64 },
  { index: 12, name: 'Orange Yellow', category: 'Primary/Secondary', r: 224, g: 163, b: 46 },

  // Row 3: Additive Primaries & Secondaries
  { index: 13, name: 'Blue', category: 'Primary/Secondary', r: 56, g: 61, b: 150 },
  { index: 14, name: 'Green', category: 'Primary/Secondary', r: 70, g: 148, b: 73 },
  { index: 15, name: 'Red', category: 'Primary/Secondary', r: 175, g: 54, b: 60 },
  { index: 16, name: 'Yellow', category: 'Primary/Secondary', r: 231, g: 199, b: 31 },
  { index: 17, name: 'Magenta', category: 'Primary/Secondary', r: 187, g: 86, b: 149 },
  { index: 18, name: 'Cyan', category: 'Primary/Secondary', r: 8, g: 133, b: 161 },

  // Row 4: Grayscale Step Wedge (Neutral Density)
  { index: 19, name: 'White 9.5 (.05 D)', category: 'Grayscale', r: 243, g: 243, b: 242 },
  { index: 20, name: 'Neutral 8 (.23 D)', category: 'Grayscale', r: 200, g: 200, b: 200 },
  { index: 21, name: 'Neutral 6.5 (.44 D)', category: 'Grayscale', r: 160, g: 160, b: 160 },
  { index: 22, name: 'Neutral 5 (.70 D)', category: 'Grayscale', r: 122, g: 122, b: 121 },
  { index: 23, name: 'Neutral 3.5 (1.05 D)', category: 'Grayscale', r: 85, g: 85, b: 85 },
  { index: 24, name: 'Black 2 (1.50 D)', category: 'Grayscale', r: 52, g: 52, b: 52 },
];
