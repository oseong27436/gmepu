"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const SAMPLE_MEMOS = [
  { id: 1, text: "여기 붕어빵 진짜 맛있음 🐟", color: "#FFF9B0", rotate: -3, top: "18%", left: "8%" },
  { id: 2, text: "이 골목 야경 예쁨 ✨", color: "#FFD6EA", rotate: 2, top: "12%", right: "10%" },
  { id: 3, text: "조용해서 공부하기 최고 📚", color: "#C5E8FF", rotate: -1, bottom: "22%", left: "6%" },
  { id: 4, text: "숨겨진 카페 발견! ☕", color: "#D4F5D4", rotate: 3, bottom: "18%", right: "8%" },
  { id: 5, text: "뷰 미쳤다 여기서 사진 찍어", color: "#FFE5C0", rotate: -2, top: "42%", left: "4%" },
  { id: 6, text: "고양이 항상 여기 있음 🐱", color: "#E8D4FF", rotate: 1, top: "38%", right: "5%" },
];

const spring = { type: "spring" as const, stiffness: 400, damping: 18 };
const bouncySpring = { type: "spring" as const, stiffness: 500, damping: 14 };

export default function Home() {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "var(--yellow)" }}
    >
      {/* 배경 원 - 살짝 떠다니는 효과 */}
      <motion.div
        className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 rounded-full"
        style={{ width: "140vw", height: "140vw", background: "var(--blue)", opacity: 0.18 }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 흩어진 포스트잇들 - 위아래 둥실둥실 */}
      {SAMPLE_MEMOS.map((memo, i) => (
        <motion.div
          key={memo.id}
          className="memo-card absolute hidden md:block w-40 p-3 text-sm font-medium leading-snug cursor-default select-none"
          style={{
            background: memo.color,
            borderRadius: "4px",
            top: memo.top,
            left: memo.left,
            right: memo.right,
            bottom: memo.bottom,
          }}
          initial={{ opacity: 0, scale: 0.5, rotate: memo.rotate - 10 }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: memo.rotate,
            y: [0, i % 2 === 0 ? -10 : -14, 0],
          }}
          transition={{
            opacity: { delay: 0.3 + i * 0.1, duration: 0.4 },
            scale: { ...bouncySpring, delay: 0.3 + i * 0.1 },
            rotate: { delay: 0.3 + i * 0.1, duration: 0.4 },
            y: {
              delay: 0.8 + i * 0.1,
              duration: 2.5 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          whileHover={{ scale: 1.08, rotate: 0, transition: spring }}
        >
          {memo.text}
        </motion.div>
      ))}

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* 서브타이틀 */}
        <motion.div
          className="font-display mb-3 text-lg font-bold tracking-widest opacity-60 uppercase"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          Ji · Me · Ppu
        </motion.div>

        {/* 타이틀 - 글자 하나씩 튀어오르기 */}
        <div className="flex font-display font-black leading-none mb-4 select-none" style={{ fontSize: "clamp(72px, 16vw, 160px)" }}>
          {"지메뿌".split("").map((char, i) => (
            <motion.span
              key={i}
              style={{
                color: "var(--dark)",
                textShadow: "4px 6px 0px rgba(0,0,0,0.12)",
                letterSpacing: "-2px",
                display: "inline-block",
              }}
              initial={{ opacity: 0, y: 60, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...bouncySpring, delay: 0.2 + i * 0.12 }}
              whileHover={{
                y: -12,
                scale: 1.15,
                transition: { ...bouncySpring },
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* 슬로건 */}
        <motion.p
          className="font-display font-bold mb-2"
          style={{ fontSize: "clamp(18px, 3vw, 28px)", color: "var(--dark)", opacity: 0.75 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.75, y: 0 }}
          transition={{ ...spring, delay: 0.55 }}
        >
          지도에 메모 뿌리기
        </motion.p>

        <motion.p
          className="mb-10 max-w-sm leading-relaxed"
          style={{ color: "var(--dark)", opacity: 0.6, fontSize: "15px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ ...spring, delay: 0.65 }}
        >
          길을 걷다 발견하는 낯선 사람의 한마디.
          <br />
          당신의 메모도 누군가에게 닿을 거예요.
        </motion.p>

        {/* CTA 버튼들 */}
        <motion.div
          className="flex gap-4 flex-wrap justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.8 }}
        >
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} transition={bouncySpring}>
            <Link
              href="/map"
              className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg inline-block"
              style={{ background: "var(--dark)", color: "var(--yellow)", fontSize: "18px" }}
            >
              지도 열기 🗺️
            </Link>
          </motion.div>
          <motion.button
            className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg border-4"
            style={{ background: "transparent", color: "var(--dark)", borderColor: "var(--dark)", fontSize: "18px" }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={bouncySpring}
          >
            메모 쓰기 ✏️
          </motion.button>
        </motion.div>

        {/* 태그들 - 순서대로 통통 튀며 등장 */}
        <div className="mt-12 flex gap-2 flex-wrap justify-center">
          {["#위치기반", "#포스트잇", "#공간낙서", "#숏폼리뷰"].map((tag, i) => (
            <motion.span
              key={tag}
              className="font-display font-bold px-3 py-1 rounded-full text-sm cursor-default"
              style={{ background: "rgba(26,19,6,0.12)", color: "var(--dark)" }}
              initial={{ opacity: 0, scale: 0, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...bouncySpring, delay: 1.0 + i * 0.08 }}
              whileHover={{ scale: 1.12, background: "rgba(26,19,6,0.22)", transition: spring }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>

      {/* 하단 물결 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
        <svg viewBox="0 0 1440 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 96V48C240 0 480 0 720 48C960 96 1200 96 1440 48V96H0Z" fill="rgba(26,19,6,0.08)" />
        </svg>
      </div>
    </div>
  );
}
