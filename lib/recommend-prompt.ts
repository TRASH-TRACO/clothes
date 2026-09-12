/**
 * 추천 요청에 실어 보낼 내용을 만드는 부분.
 *
 * 아무 모듈도 물지 않게 해 뒀다. 그래야 네트워크도 빌드도 없이 결과를 바로 확인할 수 있다
 * (bin/check-recommend-prompt.ts).
 */

export type PromptItem = {
  id: string;
  name: string;
  /** 사람이 읽는 분류 이름 ("상의"). 이 파일이 다른 모듈을 안 물게 하려고 미리 풀어서 받는다 */
  category: string;
  subcategory: string | null;
  color_name: string;
  brand: string | null;
  notes: string | null;
};

export type PromptWeather = {
  target: "today" | "tomorrow";
  city: string;
  label: string;
  high: number | null;
  low: number | null;
  feelsLike: number | null;
  rainChance: number | null;
  windMax: number | null;
  compare: string | null;
};

/** 최근에 뭘 입었는지. 같은 걸 또 추천하지 않게 쓴다 */
export type PromptHistory = {
  date: string;
  itemIds: string[];
  felt: "cold" | "ok" | "hot" | null;
};

/**
 * 지시는 대화마다 안 바뀌므로 시스템 프롬프트에 둔다 (캐시가 붙는 자리이기도 하다).
 * 옷 목록·날씨처럼 매번 바뀌는 것만 사용자 메시지로 보낸다.
 */
export const SYSTEM_PROMPT = [
  "너는 사용자의 옷장을 보고 오늘 입을 옷을 골라주는 스타일리스트다.",
  "",
  "규칙:",
  "- **반드시 주어진 옷 목록의 id 만 쓴다.** 목록에 없는 옷을 지어내지 않는다.",
  "- 한 조합에 같은 분류를 두 벌 넣지 않는다 (상의 두 개 같은 것).",
  "- 상의와 하의는 되도록 넣는다. 신발도 있으면 넣는다.",
  "- 서로 다른 성격의 조합을 2~3개 준다. 같은 옷만 바꿔 낀 조합은 하나로 친다.",
  "- 최근에 입은 조합과 겹치지 않게 한다. 옷장이 작아 어쩔 수 없으면 겹쳐도 된다.",
  "- 날씨를 먼저 본다. 추우면 겹쳐 입히고, 비가 오면 젖어서 곤란한 신발은 뺀다.",
  "- 그날 '추웠다/더웠다'고 적어 둔 기록이 있으면 다음 추천에 반영한다.",
  "",
  "이름은 그날 상황이 떠오르게 짧게 짓는다 (예: 비 오는 날 출근룩).",
  "이유는 한두 문장으로, 왜 이 날씨에 이 조합인지 말한다. 미사여구는 빼고.",
  "모든 글은 한국어 존댓말로 쓴다.",
].join("\n");

function line(item: PromptItem) {
  const parts = [
    `${item.id}`,
    item.category + (item.subcategory ? `/${item.subcategory}` : ""),
    item.color_name,
    item.name,
  ];
  if (item.brand) parts.push(item.brand);
  if (item.notes) parts.push(`메모: ${item.notes.slice(0, 60)}`);
  return `- ${parts.join(" | ")}`;
}

function weatherBlock(weather: PromptWeather | null) {
  if (!weather) return "날씨: 알 수 없음";
  const when = weather.target === "today" ? "오늘" : "내일";
  const bits = [
    `${when} ${weather.city} ${weather.label}`,
    weather.high !== null ? `최고 ${Math.round(weather.high)}°` : null,
    weather.low !== null ? `최저 ${Math.round(weather.low)}°` : null,
    weather.feelsLike !== null ? `체감 ${Math.round(weather.feelsLike)}°` : null,
    weather.rainChance !== null ? `강수확률 ${weather.rainChance}%` : null,
    weather.windMax !== null ? `바람 ${Math.round(weather.windMax)}m/s` : null,
  ].filter(Boolean);
  return `날씨: ${bits.join(" · ")}${weather.compare ? `\n(${weather.compare})` : ""}`;
}

const FELT_TEXT = { cold: "추웠다", ok: "적당했다", hot: "더웠다" } as const;

function historyBlock(history: PromptHistory[]) {
  if (history.length === 0) return "최근 입은 기록: 없음";
  const lines = history.map((entry) => {
    const felt = entry.felt ? ` (${FELT_TEXT[entry.felt]})` : "";
    return `- ${entry.date}: ${entry.itemIds.join(", ")}${felt}`;
  });
  return ["최근 입은 기록 (최신순):", ...lines].join("\n");
}

/** 사용자 메시지 본문 */
export function buildUserMessage(
  items: PromptItem[],
  weather: PromptWeather | null,
  history: PromptHistory[],
  request: string,
) {
  const blocks = [
    weatherBlock(weather),
    "",
    `옷장 (id | 분류 | 색 | 이름 | 브랜드 | 메모), 총 ${items.length}벌:`,
    ...items.map(line),
    "",
    historyBlock(history),
  ];
  if (request.trim()) {
    blocks.push("", `추가 요청: ${request.trim()}`);
  }
  return blocks.join("\n");
}
