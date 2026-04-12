"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, type GmepuMemo, type GmepuReply } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

interface Props {
  memos: GmepuMemo[];          // 표시할 메모 목록 (클러스터 or 전체)
  initialIndex: number;         // 처음 열릴 메모 인덱스
  userId: string | null;
  userNickname: string | null;
  onClose: () => void;
  onFocusMemo: (memo: GmepuMemo) => void; // 스와이프 시 지도 이동
  onLoginRequired: () => void;
}

export default function MemoSwipeSheet({
  memos,
  initialIndex,
  userId,
  userNickname,
  onClose,
  onFocusMemo,
  onLoginRequired,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showReplies, setShowReplies] = useState(false);

  const memo = memos[index];

  // 인덱스 바뀔 때 지도 이동
  useEffect(() => {
    if (memo) onFocusMemo(memo);
  }, [index]);

  const goNext = useCallback(() => {
    if (index < memos.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
      setShowReplies(false);
    }
  }, [index, memos.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
      setShowReplies(false);
    }
  }, [index]);

  if (!memo) return null;

  return (
    <>
      {/* 딤 배경 */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.25)" }}
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 50,
        borderRadius: "24px 24px 0 0",
        background: "var(--dark)",
        padding: "0 0 env(safe-area-inset-bottom)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
      }}>
        {/* 핸들 */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* 인디케이터 + 닫기 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px 0",
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {memos.map((_, i) => (
              <div
                key={i}
                onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setShowReplies(false); }}
                style={{
                  width: i === index ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === index ? "var(--yellow)" : "rgba(255,255,255,0.25)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: 8, padding: "4px 12px",
              color: "rgba(255,255,255,0.6)", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
            }}
          >닫기</button>
        </div>

        {/* 스와이프 카드 영역 */}
        <div style={{ position: "relative", overflow: "hidden", padding: "12px 20px 0" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={memo.id}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50) goNext();
                else if (info.offset.x > 50) goPrev();
              }}
              style={{ cursor: "grab" }}
            >
              <MemoCard
                memo={memo}
                userId={userId}
                userNickname={userNickname}
                onLoginRequired={onLoginRequired}
                showReplies={showReplies}
                onToggleReplies={() => setShowReplies((v) => !v)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 좌우 화살표 */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "12px 20px 20px",
        }}>
          <button
            onClick={goPrev}
            disabled={index === 0}
            style={{
              background: index === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
              border: "none", borderRadius: 12,
              padding: "10px 20px",
              color: index === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)",
              fontSize: 18, cursor: index === 0 ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >←</button>

          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, alignSelf: "center" }}>
            {index + 1} / {memos.length}
          </span>

          <button
            onClick={goNext}
            disabled={index === memos.length - 1}
            style={{
              background: index === memos.length - 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
              border: "none", borderRadius: 12,
              padding: "10px 20px",
              color: index === memos.length - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)",
              fontSize: 18, cursor: index === memos.length - 1 ? "default" : "pointer",
              transition: "all 0.15s",
            }}
          >→</button>
        </div>
      </div>
    </>
  );
}

// ─── 개별 메모 카드 ─────────────────────────────────────────────

interface MemoCardProps {
  memo: GmepuMemo;
  userId: string | null;
  userNickname: string | null;
  onLoginRequired: () => void;
  showReplies: boolean;
  onToggleReplies: () => void;
}

function MemoCard({ memo, userId, userNickname, onLoginRequired, showReplies, onToggleReplies }: MemoCardProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<GmepuReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showScrapTooltip, setShowScrapTooltip] = useState(false);

  useEffect(() => {
    setReactions({});
    setMyReactions(new Set());
    setReplies([]);
    setReplyText("");

    supabase.from("gmepu_reactions").select("emoji, user_id").eq("memo_id", memo.id)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        const mine = new Set<string>();
        data.forEach(({ emoji, user_id }: { emoji: string; user_id: string }) => {
          counts[emoji] = (counts[emoji] ?? 0) + 1;
          if (userId && user_id === userId) mine.add(emoji);
        });
        setReactions(counts);
        setMyReactions(mine);
      });

    supabase.from("gmepu_replies").select("*").eq("memo_id", memo.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setReplies(data); });
  }, [memo.id, userId]);

  const toggleFire = async () => {
    if (!userId) { onLoginRequired(); return; }
    const has = myReactions.has("🔥");
    if (has) {
      await supabase.from("gmepu_reactions").delete()
        .eq("memo_id", memo.id).eq("user_id", userId).eq("emoji", "🔥");
      setMyReactions((p) => { const s = new Set(p); s.delete("🔥"); return s; });
      setReactions((p) => ({ ...p, "🔥": Math.max(0, (p["🔥"] ?? 1) - 1) }));
    } else {
      await supabase.from("gmepu_reactions").insert({ memo_id: memo.id, user_id: userId, emoji: "🔥" });
      setMyReactions((p) => new Set([...p, "🔥"]));
      setReactions((p) => ({ ...p, "🔥": (p["🔥"] ?? 0) + 1 }));
    }
  };

  const submitReply = async () => {
    if (!userId || !userNickname) { onLoginRequired(); return; }
    if (!replyText.trim()) return;
    const { data } = await supabase.from("gmepu_replies")
      .insert({ memo_id: memo.id, text: replyText.trim(), nickname: isAnonymous ? "익명" : userNickname, user_id: userId })
      .select().single();
    if (data) { setReplies((p) => [...p, data]); setReplyText(""); }
  };

  return (
    <div>
      {/* 메모 본문 카드 */}
      <div style={{
        background: "var(--yellow)",
        borderRadius: 16,
        padding: "20px",
        marginBottom: 14,
        userSelect: "none",
      }}>
        {/* 위치 태그 */}
        {(memo.dong || memo.sigungu) && (
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: "rgba(26,19,6,0.5)",
            marginBottom: 8,
          }}>
            📍 {memo.dong ?? memo.sigungu}
          </div>
        )}

        <p style={{
          fontSize: 17, fontWeight: 600,
          color: "var(--dark)",
          lineHeight: 1.55,
          marginBottom: 14,
          minHeight: 52,
        }}>{memo.text}</p>

        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "rgba(26,19,6,0.5)", fontWeight: 600,
        }}>
          <span>{memo.nickname}</span>
          <span>{timeAgo(memo.created_at)}</span>
        </div>
      </div>

      {/* 리액션 바 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        {/* 🔥 불태우기 */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleFire}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: myReactions.has("🔥") ? "var(--yellow)" : "rgba(255,255,255,0.1)",
            border: "none", borderRadius: 12,
            padding: "10px 16px",
            color: myReactions.has("🔥") ? "var(--dark)" : "white",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          🔥 {reactions["🔥"] ? <span>{reactions["🔥"]}</span> : <span style={{ opacity: 0.5 }}>0</span>}
        </motion.button>

        {/* 🔖 스크랩 */}
        <div style={{ position: "relative" }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onMouseEnter={() => setShowScrapTooltip(true)}
            onMouseLeave={() => setShowScrapTooltip(false)}
            onTouchStart={() => setShowScrapTooltip(true)}
            onTouchEnd={() => setTimeout(() => setShowScrapTooltip(false), 2000)}
            style={{
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: 12, padding: "10px 14px",
              fontSize: 16, cursor: "pointer",
            }}
          >🔖</motion.button>
          {showScrapTooltip && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
              transform: "translateX(-50%)",
              background: "white", color: "var(--dark)",
              borderRadius: 10, padding: "6px 12px",
              fontSize: 11, fontWeight: 700,
              whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              zIndex: 10, pointerEvents: "none",
            }}>
              ✨ 멤버십 가입 시 이용 가능해요
              <div style={{
                position: "absolute", top: "100%", left: "50%",
                transform: "translateX(-50%)",
                borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                borderTop: "6px solid white",
              }} />
            </div>
          )}
        </div>

        {/* 💬 답글 토글 */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onToggleReplies}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: showReplies ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
            border: "none", borderRadius: 12,
            padding: "10px 16px",
            color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
            marginLeft: "auto",
            transition: "background 0.15s",
          }}
        >
          💬 {replies.length > 0 ? replies.length : ""}
        </motion.button>
      </div>

      {/* 답글 영역 */}
      <AnimatePresence>
        {showReplies && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            {/* 답글 목록 */}
            {replies.length > 0 && (
              <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {replies.map((r) => (
                  <div key={r.id} style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "8px 12px",
                    fontSize: 13, color: "white",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginRight: 6 }}>
                      {r.nickname}
                    </span>
                    {r.text}
                  </div>
                ))}
              </div>
            )}

            {/* 답글 입력 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <input
                style={{
                  flex: 1, padding: "11px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.1)",
                  border: "none", color: "white", fontSize: 13,
                  outline: "none", fontFamily: "inherit",
                }}
                placeholder={userId ? "답글 달기... (80자)" : "로그인 후 답글을 달 수 있어요"}
                maxLength={80}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitReply()}
                onFocus={() => { if (!userId) onLoginRequired(); }}
                readOnly={!userId}
              />
              <button
                onClick={submitReply}
                style={{
                  background: "var(--yellow)", border: "none",
                  borderRadius: 12, padding: "11px 16px",
                  fontWeight: 900, fontSize: 16,
                  color: "var(--dark)", cursor: "pointer",
                }}
              >↑</button>
            </div>
            {userId && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ accentColor: "var(--yellow)" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>익명으로 달기</span>
              </label>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
