export interface StoreAppearance {
  style: 'clean' | 'warm' | 'bold';
  font: 'sans' | 'serif' | 'rounded';
  brandColor: string;
  shade: number;
}

export const DEFAULT_STORE_APPEARANCE: StoreAppearance = {
  style: 'clean', font: 'sans', brandColor: '#356859', shade: 0,
};

export const STORE_FONTS = [
  { id: 'sans' as const, name: 'Noto Sans Khmer', detail: 'Clear & modern', family: '"Noto Sans Khmer", sans-serif' },
  { id: 'serif' as const, name: 'Noto Serif Khmer', detail: 'Classic & crafted', family: '"Noto Serif Khmer", serif' },
  { id: 'rounded' as const, name: 'Kantumruy Pro', detail: 'Friendly & simple', family: '"Kantumruy Pro", sans-serif' },
];

export function storeBrandColor(appearance: StoreAppearance): string {
  const amount = Math.max(-60, Math.min(60, appearance.shade)) / 100;
  const target = amount < 0 ? 0 : 255;
  const channels = appearance.brandColor.slice(1).match(/.{2}/g) ?? ['35', '68', '59'];
  return '#' + channels.map(channel => {
    const value = parseInt(channel, 16);
    return Math.round(value + (target - value) * Math.abs(amount)).toString(16).padStart(2, '0');
  }).join('');
}

export function storeFontFamily(font: StoreAppearance['font']): string {
  return (STORE_FONTS.find(item => item.id === font) ?? STORE_FONTS[0]).family;
}
