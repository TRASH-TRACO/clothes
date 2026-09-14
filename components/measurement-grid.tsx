import { measurementFields } from "@/lib/categories";
import { PART_FIT_LABELS, readPartFits } from "@/lib/feedback";
import type { Item } from "@/lib/types";

/**
 * 옷 상세의 실측 칸.
 *
 * **숫자만 있으면 판단이 안 된다.** 어깨 53cm 가 큰 건지 작은 건지는 재 본 사람만
 * 안다. 그래서 그 옆에 몸으로 느낀 것(부위별 사이즈감)을 같이 놓는다.
 *
 * 안 재고 느낌만 적어 둔 항목도 보여준다 (숫자 자리는 ―). "어깨가 크더라" 만
 * 적어 둔 것도 다음에 살 때 쓰는 정보라 숨길 이유가 없다.
 */
export function MeasurementGrid({ item }: { item: Item }) {
  const notes = readPartFits(item.fit_notes);
  const fields = measurementFields(item.category).filter(
    (field) => typeof item.measurements?.[field.key] === "number" || notes[field.key],
  );

  if (fields.length === 0) {
    return <p className="text-sm text-muted">기록된 실측값이 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
      {fields.map((field) => {
        const value = item.measurements?.[field.key];
        return (
          <div key={field.key} className="bg-paper px-4 py-5">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{field.label}</p>
            <p className="display mt-2 text-3xl">
              {typeof value === "number" ? (
                <>
                  {value}
                  <span className="ml-1 text-base">{field.unit}</span>
                </>
              ) : (
                <span className="text-line">―</span>
              )}
            </p>
            {notes[field.key] ? (
              <p className="mt-3 inline-block rounded-full bg-mist px-2.5 py-1 text-xs font-medium">
                {PART_FIT_LABELS[notes[field.key]]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
