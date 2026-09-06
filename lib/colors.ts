export type ColorPreset = { name: string; hex: string };

/** 옷 등록 폼의 기본 색상 팔레트 */
export const COLOR_PRESETS: ColorPreset[] = [
  { name: "블랙", hex: "#111111" },
  { name: "화이트", hex: "#ffffff" },
  { name: "그레이", hex: "#9a9a9a" },
  { name: "차콜", hex: "#3f3f3f" },
  { name: "아이보리", hex: "#f2ead8" },
  { name: "베이지", hex: "#d9c3a5" },
  { name: "브라운", hex: "#6f4b2e" },
  { name: "카키", hex: "#5c5a3c" },
  { name: "네이비", hex: "#1f2b46" },
  { name: "블루", hex: "#2f6fdb" },
  { name: "라이트블루", hex: "#9dc4ec" },
  { name: "그린", hex: "#2e7d4f" },
  { name: "레드", hex: "#c62f25" },
  { name: "오렌지", hex: "#fa5400" },
  { name: "옐로우", hex: "#f4c430" },
  { name: "핑크", hex: "#e79ab0" },
  { name: "퍼플", hex: "#6b4f9e" },
  { name: "데님", hex: "#4a6c8f" },
];

/** 밝은 색이면 테두리를 그려서 흰 배경에서도 보이게 */
export function isLight(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}
