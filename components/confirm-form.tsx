"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 확인을 누르면 부를 서버 액션 */
  action: (formData: FormData) => void | Promise<void>;
  /** 폼에 같이 실을 값 */
  hidden?: Record<string, string>;
  /** 누르면 물어보는 버튼 */
  label: string;
  triggerClassName?: string;
  title: string;
  body: string;
  confirmLabel: string;
};

/**
 * 되돌릴 수 없는 일을 하기 전에 한 번 묻는다.
 *
 * window.confirm 을 안 쓰는 이유: 브라우저마다 생김새가 다르고, 설치해서 앱처럼
 * 쓰는 화면에서 갑자기 사파리 상자가 뜨면 남의 앱처럼 보인다. 무엇을 지우는지
 * 설명할 자리도 없다.
 *
 * 확인 버튼만 submit 이고 나머지는 전부 type="button" 이다.
 * form 안의 버튼은 기본이 submit 이라, 안 적으면 "취소" 가 지워 버린다.
 */
export function ConfirmForm({
  action,
  hidden = {},
  label,
  triggerClassName = "",
  title,
  body,
  confirmLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // 뒤에서 본문이 같이 스크롤되면 무엇을 묻는지 놓친다
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <form action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {label}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />

          <div
            className="relative w-full max-w-sm rounded-t-2xl bg-paper p-6
              pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-6"
          >
            <p className="text-lg font-semibold">{title}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>

            <div className="mt-7 flex gap-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="btn-light flex-1 py-3"
              >
                그대로 두기
              </button>
              <button type="submit" className="btn-dark flex-1 py-3">
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
