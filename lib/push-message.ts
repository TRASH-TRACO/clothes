/**
 * 알림에 뭐라고 쓸지.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-push-message.ts 에서 바로 돌린다).
 * 보내는 쪽은 app/api/push/daily, 받아서 띄우는 쪽은 public/sw.js.
 */

export type PushMessage = {
  title: string;
  body: string;
  /** 눌렀을 때 열 화면 */
  url: string;
  /** 같은 tag 끼리는 덮어쓴다. 하루치가 밀려서 여러 개 쌓이면 안 된다 */
  tag: string;
};

export type TomorrowWeather = {
  placeName: string;
  high: number | null;
  low: number | null;
  /** "흐림" 같은 말. 없으면 null */
  label: string | null;
};

/** 홈 화면 문구와 같은 말을 쓴다. 눌러서 들어가면 같은 문장이 보여야 한다 */
const TITLE = "내일은 뭐 입을까요?";

/** 날씨를 못 받았을 때. 알림을 거르는 대신 할 말만 한다 */
const NUDGE = "내일 입을 옷을 미리 생각해두세요.";

/**
 * "서울 · 최고 26° 최저 17° 흐림"
 *
 * 기온은 반올림한다. 알림은 한 줄이라 소수점까지 볼 자리가 아니다.
 * 받은 게 하나도 없으면 대신 할 말을 한다.
 */
export function tomorrowMessage(weather: TomorrowWeather | null, date: string): PushMessage {
  const bits = weather
    ? [
        weather.high === null ? null : `최고 ${Math.round(weather.high)}°`,
        weather.low === null ? null : `최저 ${Math.round(weather.low)}°`,
        weather.label,
      ].filter(Boolean)
    : [];

  return {
    title: TITLE,
    body: bits.length > 0 ? `${weather!.placeName} · ${bits.join(" ")}` : NUDGE,
    url: "/",
    // 날짜를 넣어 두면 어제 것이 남아 있어도 덮어쓰지 않는다
    tag: `tomorrow-${date}`,
  };
}
