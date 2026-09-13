"use server";

import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CATEGORY_META, isCategory, isKindOf, measurementFields } from "@/lib/categories";
import { claude, claudeKey, RECOMMEND_MODEL } from "@/lib/claude";
import { FIT_LABELS, PART_FIT_LABELS, readPartFits } from "@/lib/feedback";
import { getItems } from "@/lib/data";
import { buildSizeMessage, SIZE_SYSTEM_PROMPT, type SizeRefItem } from "@/lib/size-prompt";

/** 한 번에 읽을 사진 수. 상세 페이지 캡처 두어 장이면 충분하다 */
const MAX_IMAGES = 3;
/**
 * 같이 보낼 옷 수. 옷장이 커도 프롬프트가 한없이 길어지면 안 된다.
 * 견줄 만한 순서로 추려서 이만큼만 보낸다.
 */
const MAX_REFS = 8;
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
  /** 무엇과 견줬는지 (모델이 고른다). 견줄 게 없으면 빈 문자열 */
  basedOn: z.string(),
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
  const rawKind = formData.get("kind");
  const kind = isKindOf(category, rawKind) ? String(rawKind) : null;

  const fields = measurementFields(category);

  /**
   * 견줄 옷은 사용자한테 안 묻는다. 어느 옷이 견줄 만한지는 실측과 사이즈감을
   * 다 보고 있는 쪽이 더 잘 안다. 같은 분류를 통째로 넘기고 모델이 고르게 한다.
   *
   * 다만 아무거나 다 넘기면 프롬프트만 길어지므로 쓸모 있는 순서로 추린다:
   * 실측이 있어야 견줄 수 있고, 사이즈감이 적혀 있으면 훨씬 나은 기준이 된다.
   */
  const refs: SizeRefItem[] = (await getItems({ sort: "recent" }))
    .filter((item) => item.category === category)
    .map((item) => {
      const notes = readPartFits(item.fit_notes);
      const measured = fields.filter(
        (field) => typeof item.measurements?.[field.key] === "number",
      ).length;
      return { item, notes, measured };
    })
    .filter((entry) => entry.measured > 0)
    .sort((a, b) => {
      // 사이즈감을 적어 둔 옷이 먼저 (숫자만으로는 "어떻게 느껴질지" 를 못 말한다)
      const felt = (entry: typeof a) =>
        (entry.item.fit ? 2 : 0) + (Object.keys(entry.notes).length > 0 ? 1 : 0);
      const gap = felt(b) - felt(a);
      if (gap !== 0) return gap;
      // 그다음은 사려는 세분류와 같은 것, 그다음은 실측이 많이 적힌 것
      const sameKind = (entry: typeof a) => (kind && entry.item.subcategory === kind ? 1 : 0);
      const kindGap = sameKind(b) - sameKind(a);
      if (kindGap !== 0) return kindGap;
      return b.measured - a.measured;
    })
    .slice(0, MAX_REFS)
    .map(({ item, notes }) => ({
      id: item.id,
      name: item.name,
      category: CATEGORY_META[item.category].label,
      subcategory: item.subcategory,
      brand: item.brand,
      sizeLabel: item.size_label,
      fit: item.fit ? FIT_LABELS[item.fit] : null,
      fields: fields.map((field) => ({
        label: field.label,
        unit: field.unit,
        value:
          typeof item.measurements?.[field.key] === "number"
            ? item.measurements[field.key]
            : null,
        note: notes[field.key] ? PART_FIT_LABELS[notes[field.key]] : null,
      })),
    }));

  const message = buildSizeMessage(refs, CATEGORY_META[category].label, kind, note);

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
