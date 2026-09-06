import { isLight } from "@/lib/colors";

export function ColorDot({ hex, size = 12 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: hex,
        boxShadow: isLight(hex) ? "inset 0 0 0 1px #e5e5e5" : undefined,
      }}
    />
  );
}
