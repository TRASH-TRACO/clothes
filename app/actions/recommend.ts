"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CATEGORY_META, SLOT_ORDER, type Category } from "@/lib/categories";
import { addDays, seoulToday } from "@/lib/calendar";
import { claude, claudeKey, RECOMMEND_MODEL } from "@/lib/claude";
import { FIT_LABELS } from "@/lib/feedback";
import { getBasePlace, getItems, getWearLogs } from "@/lib/data";
import {
  buildUserMessage,
  SYSTEM_PROMPT,
  type PromptHistory,
  type PromptItem,
} from "@/lib/recommend-prompt";
import { compareLine, getWeather, weatherLabel } from "@/lib/weather";

/** 참고할 최근 기록 (일). 너무 길면 프롬프트만 길어지고 도움이 안 된다 */
const HISTORY_DAYS = 14;

const Suggestion = z.object({
  name: z.string(),
  itemIds: z.array(z.string()),
  reason: z.string(),
});
const Answer = z.object({ suggestions: z.array(Suggestion) });

export type Recommendation = {
  name: string;
  reason: string;
  /** 분류별로 정리한 옷 id. 화면에서 코디 보드처럼 보여준다 */
  picks: { slot: Category; itemId: string }[];
};

export type RecommendState =
  | { ok: true; recommendations: Recommendation[] }
  | { ok: false; message: string }
  | null;

/**
 * 옷장·날씨·최근 기록을 보고 오늘 입을 조합을 받아 온다.
 *
 * 모델이 없는 옷을 지어낼 수 있으므로 돌아온 id 는 전부 옷장과 대조한다.
 * 한 분류에 두 벌이 오면 앞의 것만 남긴다.
 */
export async function recommendOutfits(
  _prev: RecommendState,
  formData: FormData,
): Promise<RecommendState> {
  const apiKey = await claudeKey();
  if (!apiKey) {
    return { ok: false, message: "설정에서 Anthropic API 키를 먼저 등록해주세요." };
  }

  const request = String(formData.get("request") ?? "").slice(0, 200);

  const [items, place] = await Promise.all([getItems({ sort: "recent" }), getBasePlace()]);
  if (items.length < 2) {
    return { ok: false, message: "옷을 두 벌 이상 등록해야 추천할 수 있습니다." };
  }

  const today = seoulToday();
  const [weather, logs] = await Promise.all([
    getWeather(place).catch(() => null),
    getWearLogs(addDays(today, -HISTORY_DAYS), today).catch(() => []),
  ]);

  const promptItems: PromptItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: CATEGORY_META[item.category].label,
    subcategory: item.subcategory,
    color_name: item.color_name,
    fit: item.fit ? FIT_LABELS[item.fit] : null,
    brand: item.brand,
    notes: item.notes,
  }));

  const history: PromptHistory[] = logs
    .slice()
    .reverse()
    .map((log) => ({
      date: log.worn_on,
      itemIds: log.items.map((item) => item.id),
      felt: log.felt,
    }))
    .filter((entry) => entry.itemIds.length > 0);

  const message = buildUserMessage(
    promptItems,
    weather
      ? {
          target: weather.target,
          city: weather.city,
          label: weatherLabel(weather.code),
          high: weather.high,
          low: weather.low,
          feelsLike: weather.feelsLike,
          rainChance: weather.rainChance,
          windMax: weather.windMax,
          compare: compareLine(weather),
        }
      : null,
    history,
    request,
  );

  try {
    const response = await claude(apiKey).messages.parse({
      model: RECOMMEND_MODEL,
      max_tokens: 4000,
      // 옷 몇십 벌 중에 고르는 일이라 깊게 생각할 필요는 없다.
      // 낮춰 두면 사람이 기다리는 시간도 짧아진다.
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: zodOutputFormat(Answer) },
      // 지시는 안 바뀌므로 캐시에 태운다
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: message }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, message: "추천을 만들지 못했습니다. 다시 시도해 주세요." };
    }

    const answer = response.parsed_output;
    if (!answer) return { ok: false, message: "추천 결과를 읽지 못했습니다." };

    const byId = new Map(items.map((item) => [item.id, item]));
    const recommendations: Recommendation[] = [];

    for (const suggestion of answer.suggestions.slice(0, 3)) {
      const used = new Set<Category>();
      const picks: { slot: Category; itemId: string }[] = [];
      for (const id of suggestion.itemIds) {
        const item = byId.get(id);
        // 없는 옷을 지어냈거나 같은 분류를 두 번 넣은 경우
        if (!item || used.has(item.category)) continue;
        used.add(item.category);
        picks.push({ slot: item.category, itemId: item.id });
      }
      if (picks.length < 2) continue;
      // 코디 보드와 같은 순서로 (모자 → 아우터 → 상의 …)
      picks.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
      recommendations.push({
        name: suggestion.name.slice(0, 60),
        reason: suggestion.reason.slice(0, 300),
        picks,
      });
    }

    if (recommendations.length === 0) {
      return { ok: false, message: "쓸 만한 조합을 찾지 못했습니다. 옷을 조금 더 등록해 보세요." };
    }
    return { ok: true, recommendations };
  } catch (cause) {
    console.error("[recommend] 실패:", cause);
    return { ok: false, message: "추천을 받아오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
