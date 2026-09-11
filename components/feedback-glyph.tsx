import type { Felt, Rating } from "@/lib/feedback";

type Props = { className?: string };

function Svg({ className = "", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const FELT_EMOJI: Record<Felt, string> = {
  cold: "🥶",
  ok: "😊",
  hot: "🥵",
};

/**
 * 추웠다 · 적당 · 더웠다.
 * 선으로 그린 아이콘보다 이모지가 한눈에 읽혀서 이쪽을 쓴다.
 * 크기는 글자 크기로 잡는다 (className 에 text-2xl 같은 걸 준다).
 */
export function FeltGlyph({ value, className = "" }: { value: Felt } & Props) {
  return (
    <span aria-hidden="true" className={`inline-block leading-none ${className}`}>
      {FELT_EMOJI[value]}
    </span>
  );
}

/** 별로다 · 적당 · 맘에 들었다 */
export function RatingGlyph({ value, className }: { value: Rating } & Props) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="10" x2="9" y2="10.5" />
      <line x1="15" y1="10" x2="15" y2="10.5" />
      {value === "good" && <path d="M8.2 14.2a4.5 4.5 0 0 0 7.6 0" />}
      {value === "ok" && <line x1="8.8" y1="15" x2="15.2" y2="15" />}
      {value === "bad" && <path d="M8.2 15.8a4.5 4.5 0 0 1 7.6 0" />}
    </Svg>
  );
}
