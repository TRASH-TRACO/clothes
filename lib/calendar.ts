/** 이 앱의 하루는 한국 시간 기준이다 (서버가 UTC라도) */
export const TIME_ZONE = "Asia/Seoul";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 지금 한국 시각 (YYYY-MM-DD + 시) */
export function seoulNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    // hour12:false 는 자정을 24로 주는 구현이 있어 h23을 명시한다
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

export function seoulToday() {
  return seoulNow().date;
}

/** YYYY-MM-DD 에 며칠 더하기 (UTC로만 계산해 시간대 영향을 안 받는다) */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
}

export function isValidMonth(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1 + delta, 1));
  return moved.toISOString().slice(0, 7);
}

/** 그 달의 첫날과 마지막 날 */
export function monthEdges(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

/**
 * 달력 한 판. 일요일 시작으로 주 단위 배열을 만든다.
 * 앞뒤로 지난달·다음달 날짜가 섞여 들어온다.
 */
export function monthGrid(month: string): string[][] {
  const { first, last } = monthEdges(month);
  const leading = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -leading);

  // start는 항상 first 이하라 최소 한 주는 돈다. 마지막 날이 든 주까지 채운다 (4~6주)
  const weeks: string[][] = [];
  for (let cursor = start; cursor <= last; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** "9월 10일 (수)" */
export function dayLabel(date: string) {
  const [, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}
