export type SceneType =
  | 'portrait'
  | 'landscape-sky'
  | 'food'
  | 'night'
  | 'street'
  | 'indoor'
  | 'pet';

export interface SceneMeta {
  id: SceneType;
  label: string;
  description: string;
  typicalRange: string;
}

export const SCENE_DEFINITIONS: SceneMeta[] = [
  {
    id: 'portrait',
    label: 'Portrait',
    description: 'Ưu tiên da tự nhiên, tránh cháy highlight má và trán, soft/air',
    typicalRange: '40–60%',
  },
  {
    id: 'landscape-sky',
    label: 'Landscape & Sky',
    description: 'Giữ mây trời không cháy, độ sâu thiên nhiên, vivid hoặc muted',
    typicalRange: '50–80%',
  },
  {
    id: 'food',
    label: 'Food',
    description: 'Tôn màu sắc tươi tắn của món ăn, kiểm soát saturation ấm',
    typicalRange: '50–70%',
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Hạ intensity để chống wash shadow và noise/grain, trừ halation',
    typicalRange: '30–50% (CineStill: 75%)',
  },
  {
    id: 'street',
    label: 'Street',
    description: 'Tone analog ấm, độ tương phản vừa phải, cảm giác đường phố',
    typicalRange: '50–70%',
  },
  {
    id: 'indoor',
    label: 'Indoor',
    description: 'Kiểm soát ánh sáng đèn nhân tạo, cân bằng bóng đổ dịu',
    typicalRange: '50–70%',
  },
  {
    id: 'pet',
    label: 'Pet',
    description: 'Giữ chi tiết lông thú ở vùng tối và sáng, màu dịu',
    typicalRange: '40–55%',
  },
];

export interface PresetIntensityRow {
  name: string;
  intensities: Record<SceneType, number>;
  note: string;
}

export const INTENSITY_TABLE: Record<string, PresetIntensityRow> = {
  'cpm35': {
    name: 'cpm35 (Free)',
    intensities: {
      'portrait': 50,
      'landscape-sky': 60,
      'food': 50,
      'night': 40,
      'street': 70,
      'indoor': 60,
      'pet': 50,
    },
    note: 'Street là nhà; night thấp vì shadow lift + grain dễ wash',
  },
  'carmencita-gold': {
    name: 'Carmencita Gold/Portra',
    intensities: {
      'portrait': 55,
      'landscape-sky': 65,
      'food': 60,
      'night': 40,
      'street': 65,
      'indoor': 60,
      'pet': 50,
    },
    note: 'Benidorm Mediterranean sun (Gold 200 + Portra 400)',
  },
  'retocolor-bling-400': {
    name: 'RETOCOLOR Bling-Bling 400',
    intensities: {
      'portrait': 55,
      'landscape-sky': 50,
      'food': 60,
      'night': 70,
      'street': 65,
      'indoor': 65,
      'pet': 50,
    },
    note: 'Night flash & party (Y2K sparkle, punchy contrast)',
  },
  'retocolor-catcha-400': {
    name: "RETOCOLOR Cat'cha 400",
    intensities: {
      'portrait': 55,
      'landscape-sky': 60,
      'food': 55,
      'night': 40,
      'street': 65,
      'indoor': 55,
      'pet': 65,
    },
    note: 'Pet & daylight street (dịu pastel Nhật Bản, cyan sky)',
  },
  'retocolor-emoticon-400': {
    name: 'RETOCOLOR Emoticon 400',
    intensities: {
      'portrait': 60,
      'landscape-sky': 50,
      'food': 60,
      'night': 65,
      'street': 60,
      'indoor': 65,
      'pet': 50,
    },
    note: 'Selfie & bạn bè (Harajuku pop, warm cream flash)',
  },
  'portra-160': {
    name: 'portra-160',
    intensities: {
      'portrait': 60,
      'landscape-sky': 50,
      'food': 60,
      'night': 40,
      'street': 50,
      'indoor': 60,
      'pet': 50,
    },
    note: 'Portrait/indoor là nhà (soft, da an toàn)',
  },
  'fuji-400h': {
    name: 'fuji-400h',
    intensities: {
      'portrait': 55,
      'landscape-sky': 50,
      'food': 55,
      'night': 40,
      'street': 55,
      'indoor': 55,
      'pet': 50,
    },
    note: 'Muted đều các scene, không scene nào cao',
  },
  'kodachrome-64': {
    name: 'kodachrome-64',
    intensities: {
      'portrait': 40,
      'landscape-sky': 80,
      'food': 50,
      'night': 40,
      'street': 70,
      'indoor': 50,
      'pet': 50,
    },
    note: 'Portrait thấp (contrast cao, rủi ro da); landscape là nhà',
  },
  'grd-r': {
    name: 'grd-r',
    intensities: {
      'portrait': 50,
      'landscape-sky': 55,
      'food': 55,
      'night': 40,
      'street': 65,
      'indoor': 60,
      'pet': 50,
    },
    note: 'Street warm là nhà',
  },
  'palm-springs': {
    name: 'palm-springs',
    intensities: {
      'portrait': 50,
      'landscape-sky': 70,
      'food': 60,
      'night': 40,
      'street': 60,
      'indoor': 55,
      'pet': 55,
    },
    note: 'Landscape sáng/ấm là nhà',
  },
  'social-pop': {
    name: 'social-pop (Story)',
    intensities: {
      'portrait': 60,
      'landscape-sky': 80,
      'food': 70,
      'night': 50,
      'street': 80,
      'indoor': 70,
      'pet': 70,
    },
    note: 'Preset riêng Story 9:16 — cao toàn bảng, night vẫn cap 50',
  },
  'superia-400': {
    name: 'superia-400 (Free)',
    intensities: {
      'portrait': 55,
      'landscape-sky': 70,
      'food': 60,
      'night': 45,
      'street': 65,
      'indoor': 60,
      'pet': 55,
    },
    note: 'Đã có toneCurve; bảng này chỉ để runtime tra',
  },
  'cinestill-800t': {
    name: 'cinestill-800t',
    intensities: {
      'portrait': 40,
      'landscape-sky': 50,
      'food': 50,
      'night': 75,
      'street': 60,
      'indoor': 55,
      'pet': 40,
    },
    note: 'Night là nhà (halation); portrait/pet thấp (teal shadow)',
  },
};

// Helper to lookup calibrated intensity (0.0 to 1.0)
export function getCalibratedIntensity(presetId: string, scene: SceneType): number {
  const row = INTENSITY_TABLE[presetId];
  if (row && row.intensities[scene] !== undefined) {
    return row.intensities[scene] / 100.0;
  }
  // Default fallback per scene from spec §3.2
  const defaults: Record<SceneType, number> = {
    'portrait': 0.55,
    'landscape-sky': 0.65,
    'food': 0.55,
    'night': 0.45,
    'street': 0.60,
    'indoor': 0.55,
    'pet': 0.50,
  };
  return defaults[scene] ?? 0.55;
}
