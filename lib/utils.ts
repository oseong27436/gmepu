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

  // 노란색 #FFF9B0 → 회색 #AEAAA0
  const r = Math.round(255 - (255 - 174) * ratio);
  const g = Math.round(249 - (249 - 170) * ratio);
  const b = Math.round(176 - (176 - 160) * ratio);
  const bgColor = `rgb(${r}, ${g}, ${b})`;

  // 50% 이후부터 낡은 이펙트
  const wornRatio = ratio > 0.5 ? (ratio - 0.5) * 2 : 0;

  // border-radius 비대칭으로 틀어짐
  const borderRadius = wornRatio > 0
    ? `${Math.round(4 + wornRatio * 4)}px ${Math.round(3 + wornRatio * 6)}px ${Math.round(5 + wornRatio * 3)}px ${Math.round(4 + wornRatio * 5)}px`
    : "4px";

  // 채도 감소 + 살짝 대비 증가
  const saturate = Math.round(100 - ratio * 80);
  const contrast = Math.round(100 + wornRatio * 15);
  const filter = `saturate(${saturate}%) contrast(${contrast}%)`;

  // 살짝 투명해짐
  const opacity = 1 - ratio * 0.2;

  return { bgColor, borderRadius, filter, opacity };
}
