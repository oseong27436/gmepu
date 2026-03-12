import Link from "next/link";

const SAMPLE_MEMOS = [
  { id: 1, text: "여기 붕어빵 진짜 맛있음 🐟", color: "#FFF9B0", rotate: "-3deg", top: "18%", left: "8%" },
  { id: 2, text: "이 골목 야경 예쁨 ✨", color: "#FFD6EA", rotate: "2deg", top: "12%", right: "10%" },
  { id: 3, text: "조용해서 공부하기 최고 📚", color: "#C5E8FF", rotate: "-1deg", bottom: "22%", left: "6%" },
  { id: 4, text: "숨겨진 카페 발견! ☕", color: "#D4F5D4", rotate: "3deg", bottom: "18%", right: "8%" },
  { id: 5, text: "뷰 미쳤다 여기서 사진 찍어", color: "#FFE5C0", rotate: "-2deg", top: "42%", left: "4%" },
  { id: 6, text: "고양이 항상 여기 있음 🐱", color: "#E8D4FF", rotate: "1deg", top: "38%", right: "5%" },
];

export default function Home() {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "var(--yellow)" }}
    >
      {/* 배경 원 */}
      <div
        className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 rounded-full"
        style={{
          width: "140vw",
          height: "140vw",
          background: "var(--blue)",
          opacity: 0.18,
        }}
      />

      {/* 흩어진 포스트잇들 */}
      {SAMPLE_MEMOS.map((memo) => (
        <div
          key={memo.id}
          className="memo-card absolute hidden md:block w-40 p-3 text-sm font-medium leading-snug cursor-default select-none"
          style={{
            background: memo.color,
            rotate: memo.rotate,
            top: memo.top,
            left: memo.left,
            right: memo.right,
            bottom: memo.bottom,
            borderRadius: "4px",
          }}
        >
          {memo.text}
        </div>
      ))}

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* 타이틀 */}
        <div className="font-display mb-3 text-lg font-bold tracking-widest opacity-60 uppercase">
          Ji · Me · Ppu
        </div>
        <h1
          className="font-display font-black leading-none mb-4 select-none"
          style={{
            fontSize: "clamp(72px, 16vw, 160px)",
            color: "var(--dark)",
            textShadow: "4px 6px 0px rgba(0,0,0,0.12)",
            letterSpacing: "-2px",
          }}
        >
          지메뿌
        </h1>
        <p
          className="font-display font-bold mb-2"
          style={{ fontSize: "clamp(18px, 3vw, 28px)", color: "var(--dark)", opacity: 0.75 }}
        >
          지도에 메모 뿌리기
        </p>
        <p
          className="mb-10 max-w-sm leading-relaxed"
          style={{ color: "var(--dark)", opacity: 0.6, fontSize: "15px" }}
        >
          길을 걷다 발견하는 낯선 사람의 한마디.
          <br />
          당신의 메모도 누군가에게 닿을 거예요.
        </p>

        {/* CTA 버튼들 */}
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/map"
            className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg"
            style={{
              background: "var(--dark)",
              color: "var(--yellow)",
              fontSize: "18px",
            }}
          >
            지도 열기 🗺️
          </Link>
          <button
            className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg border-4"
            style={{
              background: "transparent",
              color: "var(--dark)",
              borderColor: "var(--dark)",
              fontSize: "18px",
            }}
          >
            메모 쓰기 ✏️
          </button>
        </div>

        {/* 하단 태그 */}
        <div className="mt-12 flex gap-2 flex-wrap justify-center">
          {["#위치기반", "#포스트잇", "#공간낙서", "#숏폼리뷰"].map((tag) => (
            <span
              key={tag}
              className="font-display font-bold px-3 py-1 rounded-full text-sm"
              style={{ background: "rgba(26,19,6,0.12)", color: "var(--dark)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 하단 물결 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
        <svg viewBox="0 0 1440 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path
            d="M0 96V48C240 0 480 0 720 48C960 96 1200 96 1440 48V96H0Z"
            fill="rgba(26,19,6,0.08)"
          />
        </svg>
      </div>
    </div>
  );
}
