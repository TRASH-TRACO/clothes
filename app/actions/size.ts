"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CATEGORY_META, isCategory, measurementFields } from "@/lib/categories";
import { claude, claudeKey, RECOMMEND_MODEL } from "@/lib/claude";
import { FIT_LABELS, PART_FIT_LABELS, readPartFits } from "@/lib/feedback";
import { getItem } from "@/lib/data";
import { buildSizeMessage, SIZE_SYSTEM_PROMPT, type SizeRefItem } from "@/lib/size-prompt";

/** 한 번에 읽을 사진 수. 상세 페이지 캡처 두어 장이면 충분하다 */
const MAX_IMAGES = 3;
/** 줄여서 보내도 장당 수백 KB 다. 본문 제한(6MB)에 여유를 둔다 */
const MAX_BYTES = 1_500_000;

const Answer = z.object({
  /** 사진에서 읽어낸 사이즈 표기 (M, 100 …). 못 읽었으면 빈 문자열 */
  sizeLabel: z.string(),
  /** 사진에서 읽어낸 실측 */
  read: z.array(z.object({ label: z.string(), value: z.string() })),
  /** 기준 옷과의 차이 */
  diffs: z.array(
    z.object({
      part: z.string(),
      /** "+3cm" / "-1.5cm" / "" (못 견줌) */
      diff: z.string(),
      note: z.string(),
    }),
  ),
  /** 한 줄 결론 */
  verdict: z.string(),
  /** 알아둘 점 (없으면 빈 배열) */
  cautions: z.array(z.string()),
});

export type SizeAnswer = z.infer<typeof Answer>;

export type SizeState = { ok: true; answer: SizeAnswer } | { ok: false; message: string } | null;

/**
 * 사려는 옷의 실측표 사진을 읽어, 가지고 있는 옷과 견준다.
 *
 * 숫자만 견주면 "어깨 3cm 크다" 까지밖에 못 간다. 그 사람이 그 숫자를 어떻게
 * 느꼈는지(사이즈감·부위별 느낌)를 같이 줘야 "그때도 크다고 했으니 이건 더
 * 크게 느낄 것" 같은 말이 나온다. 그게 이 기능의 값어치다.
 */
export async function compareSize(_prev: SizeState, formData: FormData): Promise<SizeState> {
  const apiKey = await claudeKey();
  if (!apiKey) return { ok: false, message: "설정에서 Anthropic API 키를 먼저 등록해주세요." };

  const rawCategory = formData.get("category");
  if (!isCategory(rawCategory)) return { ok: false, message: "분류를 골라주세요." };
  const category = rawCategory;

  const images = formData
    .getAll("images")
    .map(String)
    .filter((value) => value.length > 0)
    .slice(0, MAX_IMAGES);
  if (images.length === 0) return { ok: false, message: "실측표가 보이는 사진을 올려주세요." };
  if (images.some((data) => data.length > MAX_BYTES)) {
    return { ok: false, message: "사진이 너무 큽니다. 화면 캡처 정도 크기로 올려주세요." };
  }

  const note = String(formData.get("note") ?? "").slice(0, 300);
  const refId = String(formData.get("ref") ?? "");
  const refItem = refId ? await getItem(refId) : null;

  let ref: SizeRefItem | null = null;
  if (refItem) {
    const notes = readPartFits(refItem.fit_notes);
    ref = {
      name: refItem.name,
      category: CATEGORY_META[refItem.category].label,
      subcategory: refItem.subcategory,
      brand: refItem.brand,
      sizeLabel: refItem.size_label,
      fit: refItem.fit ? FIT_LABELS[refItem.fit] : null,
      fields: measurementFields(refItem.category).map((field) => ({
        label: field.label,
        unit: field.unit,
        value: typeof refItem.measurements?.[field.key] === "number"
          ? refItem.measurements[field.key]
          : null,
        note: notes[field.key] ? PART_FIT_LABELS[notes[field.key]] : null,
      })),
    };
  }

  const message = buildSizeMessage(ref, CATEGORY_META[category].label, note);

  try {
    const response = await claude(apiKey).messages.parse({
      model: RECOMMEND_MODEL,
      max_tokens: 4000,
      // 표를 읽고 숫자를 견주는 일이라 얕게 생각해서는 틀리기 쉽다
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: zodOutputFormat(Answer) },
      system: [{ type: "text", text: SIZE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            // 사진을 글보다 먼저 둔다
            ...images.map(
              (data) =>
                ({
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
                }),
            ),
            { type: "text" as const, text: message },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, message: "읽지 못했습니다. 다른 사진으로 다시 시도해 주세요." };
    }
    const answer = response.parsed_output;
    if (!answer) return { ok: false, message: "결과를 읽지 못했습니다." };
    return { ok: true, answer };
  } catch (cause) {
    console.error("[size] 실패:", cause instanceof Error ? cause.message : cause);
    return { ok: false, message: "불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
