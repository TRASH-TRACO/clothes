import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { addDays, seoulNow } from "@/lib/calendar";
import { DEFAULT_PLACE, isPlace, type Place } from "@/lib/places";
import { hasPushKeys, sendPush, type StoredSubscription } from "@/lib/push";
import { tomorrowMessage } from "@/lib/push-message";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { getDailyRange, weatherLabel } from "@/lib/weather";

/** 정해진 시각에 도는 일이라 미리 만들어 둘 수 없다 */
export const dynamic = "force-dynamic";
/** 사람이 늘면 지역별로 날씨를 받는 시간이 붙는다 */
export const maxDuration = 60;

type Row = StoredSubscription & { user_id: string };

/**
 * 저녁 6시에 "내일은 뭐 입을까요?" 를 보낸다 (vercel.json 의 crons).
 *
 * 앱이 오후 5시부터 내일 예보를 보여주므로, 눌러서 들어가면 알림에 적힌 그
 * 날씨가 그대로 홈에 떠 있다.
 *
 * 로그인한 사람이 없는 일이다. 아무나 부르면 남의 폰이 울리므로 CRON_SECRET
 * 으로 막는다. Vercel 이 이 값을 Authorization 헤더에 담아 부른다.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  if (!hasPushKeys() || !hasAdminKey()) {
    // 환경변수를 아직 안 넣었으면 조용히 넘어간다. 매일 500 을 남길 일이 아니다.
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth");
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0, gone: 0, failed: 0 });

  const date = addDays(seoulNow().date, 1);

  // 사람별로 묶는다. 한 사람이 폰과 노트북에서 켰으면 날씨는 한 번만 받으면 된다.
  const byUser = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row);
    else byUser.set(row.user_id, [row]);
  }

  const places = await basePlaces(supabase, [...byUser.keys()]);
  const counts = { sent: 0, gone: 0, failed: 0 };
  const gone: string[] = [];
  const sent: string[] = [];

  for (const [userId, subscriptions] of byUser) {
    const place = places.get(userId) ?? DEFAULT_PLACE;
    const day = (await getDailyRange(place, date, date).catch(() => null))?.get(date) ?? null;
    const message = tomorrowMessage(
      day
        ? { placeName: place.name, high: day.high, low: day.low, label: weatherLabel(day.code) }
        : null,
      date,
    );

    // 한 사람의 기기들은 같이 보낸다. 서로 기다릴 이유가 없다.
    const results = await Promise.all(
      subscriptions.map(async (row) => [row.endpoint, await sendPush(row, message)] as const),
    );
    for (const [endpoint, result] of results) {
      counts[result] += 1;
      if (result === "gone") gone.push(endpoint);
      if (result === "sent") sent.push(endpoint);
    }
  }

  // 죽은 구독은 지운다. 안 그러면 매일 같은 실패를 되풀이한다.
  if (gone.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", gone);
  }
  // 보낸 것만 시각을 적는다. 설정 화면에서 "마지막으로 보낸 때" 를 보여준다.
  if (sent.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_sent_at: new Date().toISOString() })
      .in("endpoint", sent);
  }

  return NextResponse.json({ ok: true, date, ...counts });
}

/** 사람마다 정해 둔 기본 지역. 안 정했으면 목록에서 빠진다 (기본값으로 본다) */
async function basePlaces(
  supabase: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, Place>> {
  const out = new Map<string, Place>();
  const { data } = await supabase
    .from("user_settings")
    .select("user_id, place_name, place_lat, place_lon")
    .in("user_id", userIds);

  for (const row of data ?? []) {
    const place = { name: row.place_name, lat: row.place_lat, lon: row.place_lon };
    if (isPlace(place)) out.set(row.user_id, place);
  }
  return out;
}

/**
 * Vercel 이 부른 게 맞는지.
 *
 * CRON_SECRET 을 안 넣었으면 **아무도 못 부르게** 막는다. 열어 두는 쪽으로
 * 기울면 주소만 알면 남의 폰을 울릴 수 있다.
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
