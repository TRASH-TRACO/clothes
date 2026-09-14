import Link from "next/link";

/**
 * 곧 갈 만한 주소를 미리 받아 둔다.
 *
 * **왜 안 보이는 Link 인가**
 *
 * loading.tsx 가 있는 화면은 Link 의 기본 미리받기가 **스켈레톤까지만** 가져온다.
 * 눌러 봐야 본문은 그때부터 받는 거라 매번 기다린다. `prefetch` 를 켜야 그 너머
 * 본문까지 받아 둔다.
 *
 * `useRouter().prefetch()` 로는 안 된다 — 재 보니 그쪽은 켜도 스켈레톤까지만
 * 가져와서 눌렀을 때 여전히 스켈레톤을 거친다. 그래서 진짜 Link 를 놓는다.
 *
 * **감추는 방법이 까다롭다.** 미리받기는 그 Link 가 화면에 들어왔을 때 시작된다.
 *   - `display:none` 이나 잘라내는 부모 안에 두면 화면에 안 들어와서 영영 안 불린다.
 *     (부모에 overflow-hidden 을 걸었더니 실제로 안 불렸다)
 *   - 그래서 Link 자신을 1px 로 만들어 화면 귀퉁이에 고정한다. 눈에는 안 보이고
 *     손에도 안 잡히지만 화면 안에는 있다.
 */
export function PrefetchLinks({ hrefs }: { hrefs: string[] }) {
  return (
    <>
      {hrefs.map((href) => (
        <Link
          key={href}
          prefetch
          href={href}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 size-px overflow-hidden opacity-0"
        >
          {href}
        </Link>
      ))}
    </>
  );
}
