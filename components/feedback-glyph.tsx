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

/** 추웠다 · 적당 · 더웠다 */
export function FeltGlyph({ value, className }: { value: Felt } & Props) {
  if (value === "cold") {
    // 눈송이
    return (
      <Svg className={className}>
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
        <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
        <path d="M9 5.5 12 3l3 2.5M9 18.5 12 21l3-2.5" />
      </Svg>
    );
  }

  if (value === "hot") {
    // 불꽃
    return (
      <Svg className={className}>
        {/* 좌우 대칭이면 물방울로 보인다. 한쪽으로 휘어 불꽃처럼 */}
        <path d="M13.2 2.2c.4 2.4-.7 3.7-2 5C9.7 8.6 8 10.1 8 12.6a5 5 0 0 0 10 0c0-1.7-.6-3.1-1.8-4.3-.3 1.1-.9 1.8-1.8 2.1.5-2.9-.5-5.6-1.2-8.2Z" />
      </Svg>
    );
  }

  // 적당: 딱 맞는 두 줄
  return (
    <Svg className={className}>
      <line x1="5" y1="9.5" x2="19" y2="9.5" />
      <line x1="5" y1="14.5" x2="19" y2="14.5" />
    </Svg>
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
