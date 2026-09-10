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
| `/` | 홈. 카테고리별 개수, 최근 등록한 옷, 저장한 코디 |
| `/closet` | 옷장. 카테고리·색상 필터, 이름/브랜드 검색, 정렬 |
| `/closet/new`, `/closet/[id]/edit` | 옷 등록·수정 |
| `/closet/[id]` | 옷 상세. 실측값 카드, 이 옷으로 코디 시작 |
| `/studio` | 코디 만들기. 슬롯 6칸을 채우고 저장 (`?edit=<id>`로 수정, `?top=<itemId>`로 미리 채우기) |
| `/outfits`, `/outfits/[id]` | 저장한 코디 목록·상세 |

## 데이터 모델

```
items         id, user_id, name, brand, category, color_name, color_hex,
              size_label, photo_path, measurements(jsonb), notes, created_at
outfits       id, user_id, name, memo, created_at
outfit_items  outfit_id, item_id, slot   -- (outfit_id, slot) unique
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
