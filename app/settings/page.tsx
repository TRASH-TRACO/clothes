import type { Metadata } from "next";

import { BasePlaceForm } from "@/components/base-place-form";
import { getBasePlace, hasBasePlace } from "@/lib/data";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const [place, chosen] = await Promise.all([getBasePlace(), hasBasePlace()]);

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
    </div>
  );
}
