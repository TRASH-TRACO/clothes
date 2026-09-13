/**
 * 아직 다듬는 중이라는 표시.
 *
 * AI 답은 늘 맞지 않는데, 다른 기능과 똑같이 생기면 똑같이 믿게 된다.
 * 들어가는 길목마다 붙여서 미리 알려준다.
 */
export function LabBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border border-line px-2 py-0.5 text-[10px]
        font-semibold uppercase tracking-[0.1em] text-muted ${className}`}
    >
      실험실
    </span>
  );
}
