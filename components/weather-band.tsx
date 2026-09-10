import { WeatherGlyph } from "@/components/weather-glyph";
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
export async function WeatherBand() {
  const weather = await getWeather();
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
      label: tomorrow ? "아침 체감" : "체감",
      value: weather.feelsLike === null ? null : deg(weather.feelsLike),
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
          {/* 내일은 최고기온을 이미 크게 띄웠으니 최저만 붙인다 */}
          {!tomorrow && <p>최고 {deg(weather.high)}</p>}
          <p className={tomorrow ? "" : "mt-1"}>최저 {deg(weather.low)}</p>
        </div>
      </div>

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
