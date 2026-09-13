/**
 * "살까 말까" 를 물을 때 모델에 보내는 내용.
 *
 * 아무 모듈도 물지 않게 해 뒀다 (bin/check-size-prompt.ts 에서 바로 돌린다).
 */

export type SizeRefField = {
  label: string;
  unit: string;
  value: number | null;
  /** 그 부위를 어떻게 느꼈는지 ("길다" 등). 안 적었으면 null */
  note: string | null;
};

export type SizeRefItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  sizeLabel: string | null;
  /** 전체 사이즈감 ("오버핏" 등) */
  fit: string | null;
  fields: SizeRefField[];
};

/**
 * 숫자만 견주면 "어깨 3cm 크다" 까지밖에 못 간다.
 * 그 사람이 그 숫자를 어떻게 느꼈는지(fit, note)를 같이 줘야
 * "그때도 크다고 했으니 이건 더 크게 느낄 것" 같은 말을 할 수 있다.
 *
 * 견줄 옷도 모델이 고른다. 사용자한테 "무엇과 견줄까요" 를 묻는 건
 * 답을 내야 할 쪽이 되묻는 것이다 — 어느 옷이 견줄 만한지는
 * 실측과 사이즈감을 다 보고 있는 쪽이 더 잘 안다.
 */
export const SIZE_SYSTEM_PROMPT = [
  "너는 옷 실측표를 읽고, 그 사람이 이미 가진 옷과 견줘 주는 사람이다.",
  "",
  "하는 일:",
  "1. 사진에서 실측값을 읽는다. 표가 여러 사이즈면 사용자가 말한 사이즈를 고르고,",
  "   말이 없으면 가진 옷과 가장 가까운 사이즈를 고른 뒤 어느 사이즈인지 밝힌다.",
  "2. **견줄 옷을 직접 고른다.** 아래 목록에서 사려는 옷과 가장 비슷한 한 벌을 고른다.",
  "   세분류가 같은 것, 사이즈감을 적어 둔 것, 실측이 많이 적힌 것을 먼저 본다.",
  "   고른 옷 이름을 basedOn 에 적는다. 견줄 만한 게 없으면 basedOn 을 비운다.",
  "3. 고른 옷의 같은 부위와 견준다. 차이는 (사려는 옷 − 고른 옷) 이다.",
  "4. 그 차이가 입었을 때 어떻게 느껴질지 말한다.",
  "",
  "규칙:",
  "- **사진에서 읽은 값만 쓴다.** 안 보이는 항목은 비워 두고 지어내지 않는다.",
  "- 단위를 확인한다. cm 인지 inch 인지 표에 적혀 있다. inch 면 cm 로 바꾼다.",
  "- 고른 옷에 없는 부위는 견줄 수 없다. 그 항목은 차이를 비워 둔다.",
  "- **사용자가 적어 둔 느낌을 반드시 반영한다.** 고른 옷의 어깨를 '크다' 고 적어 뒀으면,",
  "  그보다 넓은 옷은 더 크게 느낄 것이다. 숫자만 보고 말하지 않는다.",
  "- 한 벌로 다 못 말할 때만 다른 옷을 덧대 말한다. 기본은 한 벌 기준이다.",
  "- 어깨·가슴·허리는 2cm 안쪽이면 비슷하게 느껴진다. 기장은 3cm 안쪽이면 비슷하다.",
  "  그보다 크면 입었을 때 티가 난다. 이 기준을 말에 반영하되 규칙을 그대로 읊지는 않는다.",
  "- 확신이 안 서면 확신이 안 선다고 말한다. 사진이 흐리거나 표가 잘렸으면 그렇게 말한다.",
  "",
  "말투: 한국어 존댓말. 짧게. 미사여구 빼고.",
  "verdict 는 한 줄로 결론만 (예: 어깨가 3cm 넓어 오버핏으로 떨어집니다).",
].join("\n");

function refBlock(ref: SizeRefItem) {
  const head = [
    ref.name,
    ref.brand,
    ref.category + (ref.subcategory ? `/${ref.subcategory}` : ""),
    ref.sizeLabel ? `표기 ${ref.sizeLabel}` : null,
    ref.fit ? `입어보니 ${ref.fit}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = ref.fields.map((field) => {
    const value = field.value === null ? "안 잼" : `${field.value}${field.unit}`;
    return `  - ${field.label}: ${value}${field.note ? ` (입어보니 ${field.note})` : ""}`;
  });

  return [`* ${head}`, ...lines].join("\n");
}

export function buildSizeMessage(
  refs: SizeRefItem[],
  category: string,
  kind: string | null,
  note: string,
) {
  const target = kind ? `${category} / ${kind}` : category;
  const blocks = [`사려는 옷: ${target}`, ""];

  if (refs.length === 0) {
    blocks.push("가지고 있는 옷: 없음 (사진에서 읽은 값만 알려주면 된다)");
  } else {
    blocks.push(`가지고 있는 ${category} ${refs.length}개 — 이 중에서 견줄 옷을 골라라:`);
    blocks.push(...refs.map(refBlock));
  }

  if (note.trim()) blocks.push("", `사용자 메모: ${note.trim()}`);
  blocks.push("", "첨부한 사진은 사려는 옷의 상세 페이지·실측표다.");
  return blocks.join("\n");
}
