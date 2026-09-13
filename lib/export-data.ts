/**
 * 다른 AI 에이전트에 넘길 수 있게 옷장을 한 덩어리로 만든다.
 *
 * 만드는 규칙만 여기 둔다 (읽어오는 건 app/api/export). 아무 모듈도 안 물어서
 * bin/check-export.ts 로 바로 확인한다.
 */

export type ExportItem = {
  이름: string;
  분류: string;
  세분류: string | null;
  브랜드: string | null;
  색: string;
  표기사이즈: string | null;
  사이즈감: string | null;
  부위별: Record<string, string>;
  실측: Record<string, string>;
  메모: string | null;
  보관함: boolean;
};

export type ExportOutfit = {
  이름: string;
  옷: string[];
  만족도: string | null;
  메모: string | null;
};

export type ExportLog = {
  날짜: string;
  옷: string[];
  코디: string | null;
  체감: string | null;
  지역: string | null;
  날씨: string | null;
  메모: string | null;
};

export type ExportData = {
  내보낸시각: string;
  기본지역: string;
  옷: ExportItem[];
  코디: ExportOutfit[];
  착용기록: ExportLog[];
};

/** 빈 값을 걷어낸다. 넘겨 봐야 자리만 차지하고 읽는 쪽이 헷갈린다 */
function tidy<T extends object>(value: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined || entry === "" || entry === false) continue;
    if (Array.isArray(entry) && entry.length === 0) continue;
    if (typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).length === 0) {
      continue;
    }
    out[key] = entry;
  }
  return out as Partial<T>;
}

export function tidyExport(data: ExportData) {
  return {
    ...data,
    옷: data.옷.map(tidy),
    코디: data.코디.map(tidy),
    착용기록: data.착용기록.map(tidy),
  };
}

function kv(record: Record<string, string>) {
  return Object.entries(record)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
}

/**
 * 사람도 읽고 모델도 읽는 모양.
 *
 * JSON 을 그대로 붙여 넣어도 되지만 토큰이 두 배쯤 든다. 대화창에 붙여 넣을 때는
 * 이쪽이 낫다.
 */
export function toMarkdown(data: ExportData): string {
  const lines: string[] = [
    "# 내 옷장",
    "",
    `- 내보낸 시각: ${data.내보낸시각}`,
    `- 기본 지역: ${data.기본지역}`,
    `- 옷 ${data.옷.length}개 · 코디 ${data.코디.length}개 · 착용 기록 ${data.착용기록.length}일`,
    "",
    "## 옷",
  ];

  if (data.옷.length === 0) lines.push("(없음)");
  for (const item of data.옷) {
    const head = [
      item.이름,
      item.브랜드,
      item.분류 + (item.세분류 ? `/${item.세분류}` : ""),
      item.색,
      item.표기사이즈 ? `표기 ${item.표기사이즈}` : null,
      item.사이즈감 ? `입어보니 ${item.사이즈감}` : null,
      item.보관함 ? "보관함" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    lines.push(`- ${head}`);
    if (Object.keys(item.실측).length > 0) lines.push(`  - 실측: ${kv(item.실측)}`);
    if (Object.keys(item.부위별).length > 0) lines.push(`  - 부위별: ${kv(item.부위별)}`);
    if (item.메모) lines.push(`  - 메모: ${item.메모}`);
  }

  lines.push("", "## 저장한 코디");
  if (data.코디.length === 0) lines.push("(없음)");
  for (const outfit of data.코디) {
    const tail = [outfit.만족도 ? `만족도 ${outfit.만족도}` : null, outfit.메모]
      .filter(Boolean)
      .join(" · ");
    lines.push(`- ${outfit.이름}: ${outfit.옷.join(" + ")}${tail ? ` (${tail})` : ""}`);
  }

  lines.push("", "## 착용 기록");
  if (data.착용기록.length === 0) lines.push("(없음)");
  for (const log of data.착용기록) {
    const bits = [
      log.옷.length > 0 ? log.옷.join(" + ") : log.코디,
      log.날씨,
      log.지역,
      log.체감 ? `체감 ${log.체감}` : null,
      log.메모,
    ].filter(Boolean);
    lines.push(`- ${log.날짜}: ${bits.join(" · ")}`);
  }

  return lines.join("\n");
}
