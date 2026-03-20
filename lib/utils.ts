export async function reverseGeocode(lat: number, lng: number): Promise<{ sido: string | null; sigungu: string | null; dong: string | null }> {
  try {
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng }, language: "ko" });
    const components = result.results[0]?.address_components ?? [];

    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name ?? null;

    return {
      sido:    get("administrative_area_level_1"),
      sigungu: get("sublocality_level_1"),
      dong:    get("sublocality_level_2") ?? get("sublocality_level_3"),
    };
  } catch {
    return { sido: null, sigungu: null, dong: null };
  }
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function getMemoAgeStyle(createdAt: string) {
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const ageMs = Math.min(Date.now() - new Date(createdAt).getTime(), ONE_WEEK);
  const ratio = ageMs / ONE_WEEK; // 0 (새 메모) → 1 (7일)

  // 제곱 곡선: 초반엔 거의 안 변하고 후반에 빠르게 변함
  // 1일차(0.14): 0.02, 3일차(0.43): 0.18, 5일차(0.71): 0.51, 7일차: 1.0
  const curved = ratio * ratio;

  // 노란색 #FFF9B0 → 따뜻한 회색 #B8B5A8
  const r = Math.round(255 - (255 - 184) * curved);
  const g = Math.round(249 - (249 - 181) * curved);
  const b = Math.round(176 - (176 - 168) * curved);
  const bgColor = `rgb(${r}, ${g}, ${b})`;

  // 75% 이후부터 낡은 이펙트 (5일차~)
  const wornRatio = ratio > 0.75 ? (ratio - 0.75) * 4 : 0;

  const borderRadius = wornRatio > 0
    ? `${Math.round(4 + wornRatio * 4)}px ${Math.round(3 + wornRatio * 6)}px ${Math.round(5 + wornRatio * 3)}px ${Math.round(4 + wornRatio * 5)}px`
    : "4px";

  // 채도: 초반엔 거의 유지, 후반에 급감
  const saturate = Math.round(100 - curved * 70);
  const contrast = Math.round(100 + wornRatio * 15);
  const filter = `saturate(${saturate}%) contrast(${contrast}%)`;

  const opacity = 1 - curved * 0.2;

  return { bgColor, borderRadius, filter, opacity };
}
