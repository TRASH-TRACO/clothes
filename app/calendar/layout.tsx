import { ClosetDataProvider } from "@/components/closet-data";
import { getItems, getOutfits } from "@/lib/data";

/**
 * 캘린더 구역 전체가 같이 쓰는 데이터.
 * 날짜를 옮겨 다녀도 레이아웃은 다시 받지 않으므로, 옷·코디 목록은 한 번만 불러온다.
 */
export default async function CalendarLayout({ children }: LayoutProps<"/calendar">) {
  const [items, outfits] = await Promise.all([getItems({ sort: "recent" }), getOutfits()]);

  return (
    <ClosetDataProvider items={items} outfits={outfits}>
      {children}
    </ClosetDataProvider>
  );
}
