/** 날씨를 볼 지역 한 곳 */
export type Place = {
  name: string;
  lat: number;
  lon: number;
};

/** 아무것도 정하지 않았을 때 */
export const DEFAULT_PLACE: Place = { name: "서울", lat: 37.57, lon: 126.98 };

/** 검색하지 않고 바로 고를 수 있는 곳 */
export const QUICK_PLACES: Place[] = [
  DEFAULT_PLACE,
  { name: "부산", lat: 35.18, lon: 129.08 },
  { name: "대구", lat: 35.87, lon: 128.6 },
  { name: "인천", lat: 37.46, lon: 126.71 },
  { name: "광주", lat: 35.16, lon: 126.85 },
  { name: "대전", lat: 36.35, lon: 127.38 },
  { name: "울산", lat: 35.54, lon: 129.31 },
  { name: "수원", lat: 37.26, lon: 127.03 },
  { name: "제주", lat: 33.5, lon: 126.53 },
  { name: "강릉", lat: 37.75, lon: 128.88 },
  { name: "전주", lat: 35.82, lon: 127.15 },
  { name: "경주", lat: 35.86, lon: 129.22 },
];

export function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<Place>;
  return (
    typeof place.name === "string" &&
    place.name.trim().length > 0 &&
    typeof place.lat === "number" &&
    Number.isFinite(place.lat) &&
    Math.abs(place.lat) <= 90 &&
    typeof place.lon === "number" &&
    Number.isFinite(place.lon) &&
    Math.abs(place.lon) <= 180
  );
}

/**
 * 좌표를 소수점 둘째 자리로 자른다.
 * 1km 남짓이면 날씨는 같고, 캐시도 같이 쓰게 된다.
 */
export function roundPlace(place: Place): Place {
  return {
    name: place.name.trim().slice(0, 60),
    lat: Math.round(place.lat * 100) / 100,
    lon: Math.round(place.lon * 100) / 100,
  };
}

export function samePlace(a: Place, b: Place) {
  return a.lat === b.lat && a.lon === b.lon;
}

/** 날씨 캐시·조회를 좌표 단위로 묶기 위한 키 */
export function placeKey(place: Place) {
  return `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
}
