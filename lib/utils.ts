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

export function getMemoAgeStyle(_createdAt: string) {
  return { bgColor: "#FFF9B0", borderRadius: "4px", filter: "", opacity: 1 };
}
