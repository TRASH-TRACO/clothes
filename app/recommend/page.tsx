import { redirect } from "next/navigation";

/** 예전 주소. 홈 화면에 추가해 둔 사람이 있을 수 있어 살려둔다 */
export default function Page() {
  redirect("/ai/outfit");
}
