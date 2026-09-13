"use client";

import { useState } from "react";

/**
 * 옷장을 다른 AI 에게 넘기려고 꺼내는 자리.
 *
 * 복사는 **화면에 이미 있는 글을 그대로** 집는다. 눌러서 받아오고 나서 복사하면
 * 사파리가 "사용자가 누른 김에 하는 일" 로 안 봐서 클립보드를 막는다.
 */
export function ExportPanel({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드를 막는 환경 (구형 사파리 등) — 아래 미리보기에서 직접 고르면 된다
      setCopied(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => void copy()} className="btn-dark px-6 py-3">
          {copied ? "복사했습니다" : "마크다운 복사"}
        </button>
        <a href="/api/export?format=md" download className="btn-light px-6 py-3">
          마크다운 파일
        </a>
        <a href="/api/export" download className="btn-light px-6 py-3">
          JSON 파일
        </a>
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-muted underline underline-offset-4">
          내보낼 내용 보기
        </summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-mist p-4 text-xs leading-relaxed">
          {markdown}
        </pre>
      </details>
    </div>
  );
}
