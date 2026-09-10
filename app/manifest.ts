import type { MetadataRoute } from "next";

/**
 * 홈 화면에 설치했을 때 쓰이는 정보.
 * Next가 이 파일을 /manifest.webmanifest 로 내보내고 <link rel="manifest">도 자동으로 넣는다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CLOSET — 내 옷장과 코디",
    short_name: "CLOSET",
    description: "가지고 있는 옷을 사진·실측·색상으로 기록하고, 조합해서 코디를 저장하는 앱.",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    // 상단 띠가 검정이라 안드로이드 상태바도 같은 색으로 맞춘다
    theme_color: "#111111",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 안드로이드는 아이콘을 원형·스쿼클로 잘라내므로 여백이 넉넉한 버전을 따로 준다
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // 안드로이드에서 아이콘 길게 누르면 나오는 바로가기
    shortcuts: [
      { name: "옷 등록", url: "/closet/new" },
      { name: "코디 만들기", url: "/studio" },
      { name: "옷장", url: "/closet" },
    ],
  };
}
