# CLOSET

내가 가진 옷을 **사진 · 실측 · 색상**으로 기록하고, 모자/아우터/상의/하의/신발/액세서리를 한 화면에서 조합해 **코디를 저장**하는 앱.

- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage)
- **Vercel** 배포 전제
- 디자인은 나이키 페이지 톤 — 흰 바탕, 굵은 대문자 헤드라인, 정사각 이미지 그리드, 검은 필 버튼

## 왜 Supabase인가

| | Supabase | Firebase |
|---|---|---|
| 옷 ↔ 코디 다대다 | 조인 테이블 하나로 끝 | 문서 비정규화 필요 |
| 실측/색상 필터링 | SQL(`where`, `jsonb`)로 바로 | 복합 인덱스 수동 관리 |
| 사진 | Storage 공개 URL → `next/image` | Storage + 토큰 URL |
| 사용자 격리 | RLS 정책으로 선언적 | 보안 규칙 DSL |

실시간 동기화가 핵심이 아닌 앱이라 관계형 쪽이 유리해서 Supabase로 갔습니다.
데이터 접근은 `lib/data.ts`와 `app/actions/*`에 모여 있어 다른 백엔드로 바꿔도 화면 코드는 그대로입니다.

## 시작하기

### 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행
   - 테이블(`items`, `outfits`, `outfit_items`), RLS 정책, `clothes` Storage 버킷이 한 번에 만들어집니다
   - Storage 정책 생성에서 권한 오류가 나면 대시보드 **Storage → clothes → Policies**에서 같은 규칙을 UI로 추가하세요
3. **Authentication → Providers → Email**에서 이메일 로그인이 켜져 있는지 확인
   - 혼자 쓸 거라면 **Confirm email**을 꺼두면 가입 즉시 로그인됩니다

### 2. 환경변수

```bash
cp .env.example .env.local
```

`Project Settings → API`에서 값을 복사해 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. 실행

```bash
npm install
npm run dev
```

http://localhost:3000 → 회원가입 → 옷 등록.

### 4. Vercel 배포

1. GitHub 저장소를 Vercel에 Import (프레임워크 자동 감지)
2. **Environment Variables**에 위 두 값을 등록
3. Deploy

`next.config.ts`가 `NEXT_PUBLIC_SUPABASE_URL` 호스트를 이미지 도메인으로 자동 등록하므로 별도 설정이 필요 없습니다.

### 5. 홈 화면에 설치 (PWA)

배포한 주소를 폰에서 열면 주소창 없는 앱처럼 쓸 수 있습니다. **HTTPS에서만** 동작하므로
`localhost`가 아니라 Vercel 주소로 접속해야 합니다.

- **iOS (사파리)**: 공유 버튼 → **홈 화면에 추가**
- **안드로이드 (크롬)**: 주소창 메뉴 → **앱 설치** (조건이 맞으면 설치 배너가 뜹니다)

설치하면 상태바까지 검정으로 덮인 전체화면으로 뜨고, 안드로이드에서는 아이콘을 길게 눌러
`옷 등록 / 코디 만들기 / 옷장` 바로가기를 쓸 수 있습니다.

| 파일 | 하는 일 |
|---|---|
| `app/manifest.ts` | 이름·아이콘·시작 URL·바로가기 (`/manifest.webmanifest`로 나감) |
| `app/layout.tsx` | `viewport`(테마색·`viewport-fit=cover`)와 애플 전용 메타 |
| `app/apple-icon.png` | iOS 홈 화면 아이콘 180px |
| `public/icon-*.png` | 매니페스트 아이콘 192·512, 안드로이드용 maskable 512 |

아이콘은 헤드라인 폰트(Anton)의 `C`를 잉크색 바탕에 얹은 레터마크입니다.
maskable 쪽은 안드로이드가 원형으로 잘라내는 걸 감안해 글자를 더 작게 넣었습니다.

**오프라인은 아직 안 됩니다.** 모든 화면이 로그인 사용자 데이터라 `force-dynamic`이고,
서비스 워커를 두지 않았습니다. 설치와 전체화면 실행에는 서비스 워커가 필요 없습니다.

## 화면

| 경로 | 하는 일 |
|---|---|
| `/` | 홈. 날씨, 카테고리별 개수, 최근 등록한 옷, 저장한 코디 |
| `/closet` | 옷장. 카테고리·색상 필터, 이름/브랜드 검색, 정렬 |
| `/closet/new`, `/closet/[id]/edit` | 옷 등록·수정 |
| `/closet/[id]` | 옷 상세. 실측값 카드, 이 옷으로 코디 시작 |
| `/studio` | 코디 만들기. 슬롯 6칸을 채우고 저장 (`?edit=<id>`로 수정, `?top=<itemId>`로 미리 채우기) |
| `/outfits`, `/outfits/[id]` | 저장한 코디 목록·상세 |
| `/calendar` | 달력. 날짜마다 기온·강수량과 그날 입은 옷 |
| `/calendar/[date]` | 그날 입은 옷 기록·수정 |

## 날씨

옷은 날씨를 따라가므로 홈 맨 위에 기온·강수량을 띄웁니다.

- **오전에는 오늘, 오후 5시(KST)부터는 내일 예보**를 봅니다. 저녁엔 내일 뭘 입을지 고민하니까요.
- 위치는 홈 헤드라인(`오늘 뭐 입지 고민 끝`) 옆입니다. 스크롤 없이 바로 보이라고 로그인한 사람의
  히어로에서는 소개 문구를 빼고 여백을 줄였습니다 (`components/home-hero.tsx`).
- 보여주는 값: 기온(오늘은 현재, 내일은 예상 최고), 최고/최저, 체감, 강수확률, 강수량, 최대 풍속,
  그리고 06·09·12·15·18·21시 기온 (오늘 예보에서 이미 지난 시간은 흐리게).
- 기온 밑에 **전날과 비교한 한 줄**이 붙습니다 — `어제보다 6° 추워요`, `오늘과 비슷해요 · 바람도 많이 불어요`.
  오늘 예보면 어제와, 내일 예보면 오늘과 비교합니다 (내일 옷은 오늘 입은 것과 견주는 게 자연스러워서).
  최고기온 차가 2° 미만이면 "비슷해요", 그 이상이면 몇 도 차이인지 말합니다. 바람이 전날보다
  3m/s 이상 세지면서 6m/s를 넘거나, 일교차가 12°를 넘으면 한마디가 더 붙습니다 (`compareLine()`).
- [Open-Meteo](https://open-meteo.com)를 쓰기 때문에 **API 키가 필요 없습니다.** 응답은 30분 캐시합니다.
- 날씨를 못 불러와도 홈은 그대로 뜹니다 (`getWeather()`가 `null`을 주면 그 영역만 사라집니다).

### 위치는 이렇게 정합니다

1. `WEATHER_LAT` / `WEATHER_LON` 환경변수 (있으면 이걸 씁니다. `WEATHER_CITY`로 표시 이름도 지정 가능)
2. Vercel이 붙여주는 IP 기반 좌표 (`x-vercel-ip-latitude` 등) — 권한 팝업이 없는 대신 이동통신망에선 부정확할 수 있습니다
3. 둘 다 없으면 서울

브라우저 위치 권한은 쓰지 않습니다. 정확한 현재 위치가 필요해지면 `lib/weather.ts`의
`resolveLocation()`만 바꾸면 됩니다.

## 캘린더

달력에서 하루하루가 어떤 날씨였고 뭘 입었는지 봅니다.

- **기본으로 채워지는 값**: 최고/최저 기온, 강수량. 비가 온(올) 날은 날짜 옆에 주황 점이 붙습니다.
- **직접 남기는 값**: 그날 입은 옷. 저장한 코디를 고르면 그 구성 옷이 그대로 채워지고,
  거기서 하나씩 빼거나 더할 수 있습니다. 메모도 남길 수 있습니다.
- 하루에 한 줄입니다 (`user_id + worn_on` 유니크). 같은 날짜에 다시 저장하면 덮어씁니다.
- 코디를 골라 저장해도 **구성 옷을 복사해 둡니다.** 나중에 그 코디를 고치거나 지워도
  지난 기록은 그대로 남습니다.
- 날씨는 [Open-Meteo](https://open-meteo.com) 예보 API가 주는 **과거 92일 ~ 이후 15일** 구간만
  채워집니다. 그 밖의 달을 보면 날씨 칸만 비고 기록은 정상적으로 보입니다.

> **이미 배포한 프로젝트라면 `supabase/schema.sql`을 SQL Editor에서 다시 실행하세요.**
> `wear_logs` / `wear_log_items` 테이블과 RLS 정책이 새로 추가됐습니다.
> 여러 번 실행해도 안전합니다. 실행 전에는 캘린더가 날씨만 보여주고 기록은 저장되지 않습니다.

## 데이터 모델

```
items         id, user_id, name, brand, category, color_name, color_hex,
              size_label, photo_path, measurements(jsonb), notes, created_at
outfits       id, user_id, name, memo, created_at
outfit_items  outfit_id, item_id, slot   -- (outfit_id, slot) unique

wear_logs      id, user_id, worn_on, outfit_id, memo, created_at
               -- (user_id, worn_on) unique. 하루에 한 줄
wear_log_items wear_log_id, item_id  -- 그날 입은 옷
```

카테고리는 `hat / outer / top / bottom / shoes / acc` 6종이고,
카테고리마다 입력받는 실측 항목이 다릅니다 (`lib/categories.ts`).

- 상의·아우터: 어깨, 가슴, 총장, 소매
- 하의: 허리, 엉덩이, 허벅지, 밑위, 총장, 밑단
- 모자: 머리둘레, 챙 길이, 높이
- 신발: 사이즈(mm), 발볼
- 액세서리: 길이, 너비

항목을 늘리려면 `lib/categories.ts`의 `CATEGORY_META`만 고치면 폼·상세·카드가 함께 따라옵니다.
(값은 `jsonb`라 마이그레이션이 필요 없습니다.)

## 사진 업로드

파일은 서버 액션 본문 대신 **브라우저에서 Supabase Storage로 직접** 올립니다
(`components/photo-input.tsx`). 업로드 전에 캔버스로 긴 변 1600px / JPEG 85%로 압축하고,
경로는 `clothes/<user_id>/<uuid>.jpg` 형태라 Storage 정책으로 본인 폴더만 쓰게 막혀 있습니다.

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드 + 타입체크
npm run lint    # ESLint
```
