import type { Metadata } from "next";

import { AiKeyForm } from "@/components/ai-key-form";
import { BasePlaceForm } from "@/components/base-place-form";
import { getBasePlace, getClaudeKeyHint, hasBasePlace } from "@/lib/data";
import { hasAppSecret } from "@/lib/secret";
import { weatherStoreStatus } from "@/lib/weather-store";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const [place, chosen, store, keyHint] = await Promise.all([
    getBasePlace(),
    hasBasePlace(),
    weatherStoreStatus(),
    getClaudeKeyHint(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Settings</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">기본 지역</h1>

      <p className="mt-6 max-w-xl text-muted">
        홈과 캘린더의 기온·강수량을 이 지역 기준으로 보여줍니다. 접속한 위치로 추측하지 않습니다 —
        날씨는 그날의 기록이라, 나중에 다른 곳에서 열어봐도 값이 흔들리면 안 되니까요.
      </p>
      <p className="mt-3 max-w-xl text-sm text-muted">
        여행처럼 하루만 다른 지역이었다면, 캘린더에서 그 날짜를 열어 따로 적어두면 됩니다.
      </p>

      {!chosen ? (
        <p className="mt-6 rounded-xl bg-mist px-5 py-4 text-sm">
          아직 정하지 않아 <span className="font-semibold">{place.name}</span> 기준으로 보고 있습니다.
        </p>
      ) : null}

      <BasePlaceForm current={place} />

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="eyebrow mb-3">AI 코디 추천</h2>
        <p className="mb-6 max-w-xl text-sm text-muted">
          추천은 <span className="font-semibold text-ink">각자 자기 키</span>로 부릅니다. 요금도
          각자 내고, 한 사람이 많이 써도 다른 사람이 막히지 않습니다. 키는{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-ink"
          >
            console.anthropic.com
          </a>
          에서 만듭니다. 맡긴 키는 서버에서 잠가 보관하고 화면으로 다시 내보내지 않습니다.
        </p>

        {hasAppSecret() ? (
          <AiKeyForm hint={keyHint} />
        ) : (
          <p className="rounded-xl bg-mist px-5 py-4 text-sm text-muted">
            서버에 <code className="rounded bg-paper px-1.5 py-0.5">APP_SECRET</code> 이 없어 키를
            받을 수 없습니다. 키를 잠글 때 쓰는 값이라 없으면 평문으로 두게 되므로 아예 막아 뒀습니다.
          </p>
        )}
      </section>

      {/* 기본 지역을 바꿔도 지난 날씨는 그대로여야 한다. 그게 되려면 저장이 돼야 하는데,
          안 돼도 화면은 멀쩡히 뜨므로 여기서 상태를 보여준다. */}
      <section className="mt-16 border-t border-line pt-8">
        <h2 className="eyebrow mb-3">날씨 기록</h2>
        {store.ok ? (
          <p className="text-sm text-muted">
            {store.days > 0 ? (
              <>
                <span className="font-semibold text-ink">{store.days}일치</span>를 저장해 뒀습니다.
                지나간 날과 기록을 남긴 날은 그때 지역으로 굳어 있어, 여기서 기본 지역을 바꿔도
                따라 바뀌지 않습니다.
              </>
            ) : (
              <>
                아직 저장된 날이 없습니다. 캘린더를 한 번 열면 보이는 날짜들이 저장됩니다.
              </>
            )}
          </p>
        ) : (
          <div className="rounded-xl bg-mist px-5 py-4 text-sm">
            <p className="font-semibold text-accent">날씨를 기록하지 못하고 있습니다.</p>
            <p className="mt-2 text-muted">
              그래서 날짜를 볼 때마다 <span className="font-semibold">지금</span> 기본 지역으로 다시
              받습니다. 지역을 바꾸면 지난 날씨까지 따라 바뀌는 건 이 때문입니다.
              <code className="mx-1 rounded bg-paper px-1.5 py-0.5">supabase/schema.sql</code>을 다시
              실행해 주세요 (여러 번 돌려도 안전합니다).
            </p>
            <p className="mt-2 break-all text-xs text-muted">{store.detail}</p>
          </div>
        )}
      </section>
    </div>
  );
}
