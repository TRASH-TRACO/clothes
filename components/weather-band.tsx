import { WeatherGlyph } from "@/components/weather-glyph";
import { getWeather, weatherKind, weatherLabel, type HourPoint, type Weather } from "@/lib/weather";

function deg(value: number | null) {
  return value === null ? "―" : `${Math.round(value)}°`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function Hour({ point }: { point: HourPoint }) {
  return (
    <div className={`shrink-0 text-center ${point.past ? "opacity-35" : ""}`}>
      <p className="text-[11px] tracking-[0.12em] text-muted">
        {String(point.hour).padStart(2, "0")}시
      </p>
      <p className="mt-1.5 text-base font-semibold">{deg(point.temp)}</p>
      <p className="mt-1 h-4 text-[11px] text-muted">
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
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">
              {tomorrow ? "내일" : "오늘"}
              {weather.city ? ` · ${weather.city}` : ""}
            </p>

            <div className="mt-4 flex items-center gap-5">
              <WeatherGlyph kind={weatherKind(weather.code)} className="h-14 w-14 shrink-0" />
              <div>
                <p className="display text-6xl leading-none sm:text-7xl">{deg(headline)}</p>
                <p className="mt-2 text-sm text-muted">
                  {tomorrow ? "예상 최고" : "지금"} · {weatherLabel(weather.code)}
                </p>
              </div>
            </div>

            {/* 내일은 최고기온을 이미 크게 띄웠으니 최저만 덧붙인다 */}
            <p className="mt-4 text-sm text-muted">
              {tomorrow
                ? `최저 ${deg(weather.low)} · 내일 뭐 입을지 미리 봅니다`
                : `최고 ${deg(weather.high)} / 최저 ${deg(weather.low)}`}
            </p>
          </div>

          {metrics.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:max-w-3xl lg:flex-1">
              {metrics.map((metric) => (
                <Metric key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </dl>
          )}
        </div>

        {weather.hours.length > 0 && (
          <div className="no-scrollbar mt-8 flex justify-between gap-6 overflow-x-auto border-t border-line pt-5">
            {weather.hours.map((point) => (
              <Hour key={point.hour} point={point} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** 날씨를 기다리는 동안 자리를 잡아둔다 (뒤 내용이 밀리지 않게) */
export function WeatherBandSkeleton() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="h-[132px] animate-pulse rounded-xl bg-mist" />
      </div>
    </section>
  );
}
