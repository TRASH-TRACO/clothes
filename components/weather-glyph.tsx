type Kind = "clear" | "cloud" | "rain" | "snow" | "fog" | "thunder";

const CLOUD = "M7 18h9.5a3.5 3.5 0 0 0 .3-7 5.5 5.5 0 0 0-10.6-1.1A4 4 0 0 0 7 18Z";

/**
 * 흑백 선 아이콘. 화면 톤에 맞춰 색은 currentColor를 따른다.
 */
export function WeatherGlyph({ kind, className = "" }: { kind: Kind; className?: string }) {
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
      {kind === "clear" && (
        <>
          <circle cx="12" cy="12" r="4.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="4.6"
              x2="12"
              y2="2"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </>
      )}

      {kind === "cloud" && <path d={CLOUD} />}

      {kind === "fog" && (
        <>
          <path d={CLOUD} />
          <line x1="4" y1="21" x2="12" y2="21" />
          <line x1="15" y1="21" x2="20" y2="21" />
        </>
      )}

      {kind === "rain" && (
        <>
          <path d={CLOUD} />
          <line x1="9" y1="20" x2="8" y2="22.5" />
          <line x1="13" y1="20" x2="12" y2="22.5" />
          <line x1="17" y1="20" x2="16" y2="22.5" />
        </>
      )}

      {kind === "snow" && (
        <>
          <path d={CLOUD} />
          <line x1="8.5" y1="21.5" x2="8.5" y2="21.5" />
          <line x1="12.5" y1="21.5" x2="12.5" y2="21.5" />
          <line x1="16.5" y1="21.5" x2="16.5" y2="21.5" />
        </>
      )}

      {kind === "thunder" && (
        <>
          <path d={CLOUD} />
          <path d="M13 19.5l-3 3h3l-1 3" />
        </>
      )}
    </svg>
  );
}
