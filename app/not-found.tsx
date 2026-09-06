import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-24">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-6xl">페이지를 찾을 수 없습니다</h1>
      <p className="mt-6 text-muted">주소가 바뀌었거나 삭제된 항목일 수 있습니다.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/closet" className="btn-dark">
          옷장으로
        </Link>
        <Link href="/" className="btn-light">
          홈으로
        </Link>
      </div>
    </div>
  );
}
