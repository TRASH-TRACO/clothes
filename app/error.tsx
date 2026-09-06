"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-24">
      <p className="eyebrow">Error</p>
      <h1 className="display mt-3 text-5xl">문제가 발생했습니다</h1>
      <p className="mt-6 break-words text-sm text-muted">{error.message}</p>
      <button type="button" onClick={reset} className="btn-dark mt-8 self-start">
        다시 시도
      </button>
    </div>
  );
}
