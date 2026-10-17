import { WeatherGlyph } from "@/components/weather-glyph";
import { advice, swing, type DayParts } from "@/lib/day-parts";
import type { Place } from "@/lib/places";
import {
  compareLine,
  getWeather,
  weatherKind,
  weatherLabel,
  type HourPoint,
  type Weather,
} from "@/lib/weather";

function deg(value: number | null) {
  return value === null ? "―" : `${Math.round(value)}°`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold">{value}</dd>
    </div>
  );
}

/**
 * 나갈 때 · 낮 · 돌아올 때.
 *
 * **최고·최저로 옷을 고르면 틀린다.** 최저는 새벽 값이라 겪지 않는 시간이고
 * 최고는 오후 2~3시다. 정작 집을 나서는 아침 기온이 그 사이에 숨어 있어서,
 * 최고 20°에 맞춰 입고 14°에 서 있게 된다. 그래서 크게 따로 뺀다.
 */
export function DayPartsBlock({ parts }: { parts: DayParts }) {
  const gap = swing(parts);
  const tip = advice(gap);
  const columns: [string, number | null][] = [
    ["아침", parts.morning],
    ["낮", parts.day],
    ["밤", parts.night],
  ];
  // 셋 다 모르면 보여줄 게 없다 (예보가 그 시간대를 안 줬을 때)
  if (columns.every(([, value]) => value === null)) return null;

  return (
    <div className="mt-5 rounded-xl bg-mist px-5 py-4">
      {/* 칸 너비를 똑같이 나눠야 이름과 숫자가 한 줄로 선다.
          flex + justify-between 으로 벌리면 값 길이에 따라 들쭉날쭉해진다. */}
      <dl className="grid grid-cols-3 gap-2">
        {columns.map(([label, value], index) => (
          <div
            key={label}
            className={index === 1 ? "text-center" : index === 2 ? "text-right" : ""}
          >
            <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
            <dd className="display mt-1 text-2xl leading-none">{deg(value)}</dd>
          </div>
        ))}
      </dl>

      {tip && (
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 border-t border-line pt-3">
          <span className="text-sm font-semibold">{tip.text}</span>
          <span className="text-xs text-muted">일교차 {Math.round(gap!)}°</span>
        </p>
      )}
    </div>
  );
}

function Hour({ point }: { point: HourPoint }) {
  return (
    <div className={`shrink-0 text-center ${point.past ? "opacity-35" : ""}`}>
      <p className="text-[11px] tracking-[0.12em] text-muted">
        {String(point.hour).padStart(2, "0")}시
      </p>
      <p className="mt-1.5 text-sm font-semibold">{deg(point.temp)}</p>
      <p className="mt-0.5 h-4 text-[11px] text-muted">
        {point.rainChance !== null && point.rainChance >= 20 ? `${point.rainChance}%` : ""}
      </p>
    </div>
  );
}

/**
 * 오전엔 오늘, 오후 5시부터는 내일 예보.
 * 날씨를 못 불러오면 아무것도 그리지 않는다 (홈의 본체는 옷장이라서).
 */
export async function WeatherBand({ place }: { place: Place }) {
  const weather = await getWeather(place);
  if (!weather) return null;
  return <WeatherCard weather={weather} />;
}

/** 그리기만 하는 부분 (예보 값만 있으면 렌더된다) */
export function WeatherCard({ weather }: { weather: Weather }) {
  const tomorrow = weather.target === "tomorrow";
  // 오늘은 지금 기온이 제일 궁금하고, 내일은 아직 없으니 최고기온을 크게 보여준다
  const headline = tomorrow ? weather.high : (weather.now ?? weather.high);
  const compare = compareLine(weather);

  const metrics = [
    {
      // 내일은 뺀다. 여기 들어오는 값이 **하루 최저 체감**이라 새벽 값인데,
      // 위 블록의 "아침" 은 07~09시라 숫자가 달라서 둘이 같이 있으면 헷갈린다.
      label: "체감",
      value: tomorrow || weather.feelsLike === null ? null : deg(weather.feelsLike),
    },
    {
      label: "강수확률",
      value: weather.rainChance === null ? null : `${Math.round(weather.rainChance)}%`,
    },
    {
      label: "강수량",
      value:
        weather.rainAmount === null
          ? null
          : `${weather.rainAmount < 10 ? weather.rainAmount.toFixed(1) : Math.round(weather.rainAmount)}mm`,
    },
    {
      label: "최대 풍속",
      value: weather.windMax === null ? null : `${Math.round(weather.windMax)}m/s`,
    },
  ].filter((metric): metric is { label: string; value: string } => metric.value !== null);

  return (
    <div className="rounded-xl bg-paper p-6 lg:p-7">
      <p className="eyebrow">
        {tomorrow ? "내일" : "오늘"}
        {weather.city ? ` · ${weather.city}` : ""}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <WeatherGlyph kind={weatherKind(weather.code)} className="h-12 w-12 shrink-0" />
        <div>
          <p className="display text-5xl leading-none">{deg(headline)}</p>
          <p className="mt-1.5 text-sm text-muted">
            {tomorrow ? "예상 최고" : "지금"} · {weatherLabel(weather.code)}
          </p>
        </div>
        <div className="ml-auto shrink-0 text-right text-sm text-muted">
          {/* 아래 아침·낮·밤이 옷을 고르는 숫자다. 최고·최저는 참고로만 작게 둔다 */}
          <p>최고 {deg(weather.high)}</p>
          <p className="mt-1">최저 {deg(weather.low)}</p>
        </div>
      </div>

      <DayPartsBlock parts={weather.parts} />

      {compare && <p className="mt-5 text-base font-semibold">{compare}</p>}

      {metrics.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5">
          {metrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </dl>
      )}

      {weather.hours.length > 0 && (
        <div className="no-scrollbar mt-5 flex justify-between gap-3 overflow-x-auto border-t border-line pt-4">
          {weather.hours.map((point) => (
            <Hour key={point.hour} point={point} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 날씨를 기다리는 동안 자리를 잡아둔다 (뒤 내용이 밀리지 않게) */
export function WeatherBandSkeleton() {
  return <div className="h-[320px] animate-pulse rounded-xl bg-paper/60" />;
}
