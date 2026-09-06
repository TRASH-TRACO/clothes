export function SetupNotice() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="eyebrow">Setup required</p>
      <h1 className="display mt-3 text-5xl">Supabase 연결이 필요합니다</h1>
      <p className="mt-6 text-muted">
        <code className="rounded bg-mist px-1.5 py-0.5 text-ink">.env.local</code> (또는 Vercel
        Environment Variables)에 아래 값을 넣고 다시 실행하세요.
      </p>
      <pre className="mt-6 overflow-x-auto rounded-xl bg-ink p-6 text-sm text-paper">
        {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
      </pre>
      <p className="mt-6 text-sm text-muted">
        그리고 <code className="rounded bg-mist px-1.5 py-0.5 text-ink">supabase/schema.sql</code>{" "}
        내용을 Supabase SQL Editor에 붙여넣어 테이블과 Storage 버킷을 만들어 주세요. 자세한 순서는
        README에 있습니다.
      </p>
    </section>
  );
}
