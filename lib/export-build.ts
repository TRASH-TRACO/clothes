import "server-only";

import { CATEGORY_META, measurementFields } from "./categories";
import { NEW_SIDE_NAME } from "./compare";
import { outfitTitle } from "./outfit-title";
import { addDays, seoulToday } from "./calendar";
import { FIT_LABELS, PART_FIT_LABELS, RATING_LABELS, FELT_LABELS, readPartFits } from "./feedback";
import { getBasePlace, getCompareLogs, getItems, getOutfits, getWearLogs, logPlace } from "./data";
import type {
  ExportCompare,
  ExportData,
  ExportItem,
  ExportLog,
  ExportOutfit,
} from "./export-data";
import { weatherLabel } from "./weather-codes";
import { getCalendarWeather } from "./weather-store";

/** 내보낼 기록 범위. 이보다 옛날 것까지 넘기면 붙여 넣기가 너무 길어진다 */
const LOG_DAYS = 180;

/**
 * 옷장을 한 덩어리로 모은다.
 *
 * **API 키는 절대 안 담는다.** 내보낸 파일은 다른 서비스에 붙여 넣으라고 만드는
 * 것이고, 키가 섞여 나가면 그대로 남의 손에 들어간다.
 * 사진도 안 담는다 — 우리 Storage 경로라 다른 데서는 열리지도 않는다.
 */
export async function buildExport(): Promise<ExportData> {
  const today = seoulToday();
  const from = addDays(today, -LOG_DAYS);

  const [items, outfits, logs, base, compares] = await Promise.all([
    getItems({ sort: "recent", include: "all" }),
    getOutfits(),
    getWearLogs(from, today),
    getBasePlace(),
    getCompareLogs(),
  ]);

  const weather = await getCalendarWeather(
    base,
    new Map(
      logs
        .map((log) => [log.worn_on, logPlace(log)] as const)
        .filter((entry): entry is [string, NonNullable<ReturnType<typeof logPlace>>] =>
          entry[1] !== null,
        ),
    ),
    new Set(logs.map((log) => log.worn_on)),
    logs.map((log) => log.worn_on),
  ).catch(() => new Map());

  const exportItems: ExportItem[] = items.map((item) => {
    const notes = readPartFits(item.fit_notes);
    const fields = measurementFields(item.category);
    return {
      이름: item.name,
      분류: CATEGORY_META[item.category].label,
      세분류: item.subcategory,
      브랜드: item.brand,
      색: item.color_name,
      표기사이즈: item.size_label,
      사이즈감: item.fit ? FIT_LABELS[item.fit] : null,
      부위별: Object.fromEntries(
        fields
          .filter((field) => notes[field.key])
          .map((field) => [field.label, PART_FIT_LABELS[notes[field.key]]]),
      ),
      실측: Object.fromEntries(
        fields
          .filter((field) => typeof item.measurements?.[field.key] === "number")
          .map((field) => [field.label, `${item.measurements[field.key]}${field.unit}`]),
      ),
      메모: item.notes,
      보관함: Boolean(item.archived_at),
    };
  });

  const exportOutfits: ExportOutfit[] = outfits.map((outfit) => {
    const names = outfit.items
      .map((entry) => entry.item?.name)
      .filter((name): name is string => Boolean(name));
    return {
      // 이름은 선택이라, 안 지었으면 들어간 옷으로 부른다
      이름: outfitTitle(outfit.name, names),
      옷: names,
      만족도: outfit.rating ? RATING_LABELS[outfit.rating] : null,
      메모: outfit.memo,
    };
  });

  const exportLogs: ExportLog[] = logs
    .slice()
    .reverse()
    .map((log) => {
      const day = weather.get(log.worn_on);
      const place = logPlace(log);
      return {
        날짜: log.worn_on,
        옷: log.items.map((item) => item.name),
        코디: log.outfit?.name ?? null,
        체감: log.felt ? FELT_LABELS[log.felt] : null,
        지역: place?.name ?? null,
        날씨: day
          ? [
              day.high === null ? null : `최고 ${Math.round(day.high)}°`,
              day.low === null ? null : `최저 ${Math.round(day.low)}°`,
              weatherLabel(day.code),
            ]
              .filter(Boolean)
              .join(" ")
          : null,
        메모: log.memo,
      };
    });

  // 살까 말까를 물어볼 때, 요새 뭘 보고 있는지가 그대로 단서가 된다
  const exportCompares: ExportCompare[] = compares.map((log) => {
    const category = log.other?.category ?? log.other_category;
    const values = log.other?.measurements ?? log.other_measurements ?? {};
    return {
      언제: log.created_at,
      기준: log.base?.name ?? "지워진 옷",
      상대: log.other?.name ?? log.other_name ?? NEW_SIDE_NAME,
      상대구분: log.other_item_id ? "옷장" : NEW_SIDE_NAME,
      // 옷장에 있는 옷은 위 "옷" 목록에 실측이 이미 있으므로 새 옷만 담는다
      상대실측:
        log.other_item_id || !category
          ? {}
          : Object.fromEntries(
              measurementFields(category)
                .filter((field) => typeof values[field.key] === "number")
                .map((field) => [field.label, `${values[field.key]}${field.unit}`]),
            ),
    };
  });

  return {
    내보낸시각: new Date().toISOString(),
    기본지역: base.name,
    옷: exportItems,
    코디: exportOutfits,
    착용기록: exportLogs,
    비교기록: exportCompares,
  };
}
