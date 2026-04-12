"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, type GmepuMemo, type GmepuReply } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

// 바텀시트 높이 비율 (화면의 38%)
const SHEET_HEIGHT = "38dvh";
// 지도 가시 영역(62%) 중앙에 핀이 오도록 오프셋
const MAP_OFFSET_RATIO = 0.12; // 화면 높이의 12% 위로 올림

interface Props {
  memos: GmepuMemo[];
  initialIndex: number;
  userId: string | null;
  userNickname: string | null;
  onClose: () => void;
  onFocusMemo: (memo: GmepuMemo) => void;
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
      {/* 딤 — 클릭 시 닫기 */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40 }}
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: SHEET_HEIGHT,
        zIndex: 50,
        borderRadius: "20px 20px 0 0",
        background: "var(--dark)",
        boxShadow: "0 -6px 32px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        padding: "0 0 env(safe-area-inset-bottom)",
        overflow: "hidden",
      }}>
        {/* 핸들 + 인디케이터 + 닫기 */}
        <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* 인디케이터 도트 */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {memos.slice(0, 8).map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setShowReplies(false); }}
                  style={{
                    width: i === index ? 16 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: i === index ? "var(--yellow)" : "rgba(255,255,255,0.22)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                />
              ))}
              {memos.length > 8 && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>
                  +{memos.length - 8}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                {index + 1} / {memos.length}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.1)", border: "none",
                  borderRadius: 7, padding: "3px 10px",
                  color: "rgba(255,255,255,0.5)", fontSize: 11,
                  fontWeight: 600, cursor: "pointer",
                }}
              >닫기</button>
            </div>
          </div>
        </div>

        {/* 스와이프 카드 */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 16px" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={memo.id}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 48, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -48, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -40) goNext();
                else if (info.offset.x > 40) goPrev();
              }}
              style={{ cursor: "grab", height: "100%" }}
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
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 16px 12px",
          flexShrink: 0,
        }}>
          <button
            onClick={goPrev}
            disabled={index === 0}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: 10, padding: "8px 18px",
              color: index === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
              fontSize: 16, cursor: index === 0 ? "default" : "pointer",
            }}
          >←</button>
          <button
            onClick={goNext}
            disabled={index === memos.length - 1}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: 10, padding: "8px 18px",
              color: index === memos.length - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
              fontSize: 16, cursor: index === memos.length - 1 ? "default" : "pointer",
            }}
          >→</button>
        </div>
      </div>

      {/* 답글 드로어 — 시트 위에 올라옴 */}
      <AnimatePresence>
        {showReplies && (
          <ReplyDrawer
            memo={memo}
            userId={userId}
            userNickname={userNickname}
            onLoginRequired={onLoginRequired}
            onClose={() => setShowReplies(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── 메모 카드 ────────────────────────────────────────────────────

interface MemoCardProps {
  memo: GmepuMemo;
  userId: string | null;
  userNickname: string | null;
  onLoginRequired: () => void;
  showReplies: boolean;
  onToggleReplies: () => void;
}

function MemoCard({ memo, userId, onLoginRequired, showReplies, onToggleReplies }: MemoCardProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replyCount, setReplyCount] = useState(0);

  useEffect(() => {
    setReactions({});
    setMyReactions(new Set());
    setReplyCount(0);

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

    supabase.from("gmepu_replies").select("id", { count: "exact" }).eq("memo_id", memo.id)
      .then(({ count }) => { if (count != null) setReplyCount(count); });
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

  const isHot = myReactions.has("🔥");

  return (
    <div style={{
      background: "var(--yellow)",
      borderRadius: 14,
      padding: "14px 16px 12px",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      userSelect: "none",
    }}>
      {/* 메타: 작성자 | 지역 | 시간 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 11, fontWeight: 700,
        color: "rgba(26,19,6,0.45)",
        marginBottom: 10,
        flexShrink: 0,
      }}>
        <span>{memo.nickname}</span>
        {(memo.dong || memo.sigungu) && (
          <>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{memo.dong ?? memo.sigungu}</span>
          </>
        )}
        <span style={{ opacity: 0.4 }}>|</span>
        <span>{timeAgo(memo.created_at)}</span>
      </div>

      {/* 메모 본문 */}
      <p style={{
        fontSize: 16, fontWeight: 600,
        color: "var(--dark)",
        lineHeight: 1.55,
        flex: 1,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
      }}>{memo.text}</p>

      {/* 하단 버튼들 */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        marginTop: 12, flexShrink: 0,
      }}>
        {/* 🔥 */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleFire}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: isHot ? "var(--dark)" : "rgba(26,19,6,0.1)",
            border: "none", borderRadius: 10,
            padding: "7px 12px",
            color: isHot ? "var(--yellow)" : "rgba(26,19,6,0.6)",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          🔥 <span>{reactions["🔥"] ?? 0}</span>
        </motion.button>

        {/* 💬 댓글 */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onToggleReplies}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: showReplies ? "var(--dark)" : "rgba(26,19,6,0.1)",
            border: "none", borderRadius: 10,
            padding: "7px 12px",
            color: showReplies ? "var(--yellow)" : "rgba(26,19,6,0.6)",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          💬 <span>{replyCount}</span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── 답글 드로어 ─────────────────────────────────────────────────

interface ReplyDrawerProps {
  memo: GmepuMemo;
  userId: string | null;
  userNickname: string | null;
  onLoginRequired: () => void;
  onClose: () => void;
}

function ReplyDrawer({ memo, userId, userNickname, onLoginRequired, onClose }: ReplyDrawerProps) {
  const [replies, setReplies] = useState<GmepuReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    supabase.from("gmepu_replies").select("*").eq("memo_id", memo.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setReplies(data); });
  }, [memo.id]);

  const submitReply = async () => {
    if (!userId || !userNickname) { onLoginRequired(); return; }
    if (!replyText.trim()) return;
    const { data } = await supabase.from("gmepu_replies")
      .insert({ memo_id: memo.id, text: replyText.trim(), nickname: isAnonymous ? "익명" : userNickname, user_id: userId })
      .select().single();
    if (data) { setReplies((p) => [...p, data]); setReplyText(""); }
  };

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 55 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed", bottom: "38dvh", left: 0, right: 0,
          zIndex: 60,
          background: "#222",
          borderRadius: "16px 16px 0 0",
          padding: "14px 16px",
          maxHeight: "40dvh",
          overflowY: "auto",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            댓글 {replies.length}개
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12 }}>닫기</button>
        </div>

        {replies.length === 0 && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "12px 0" }}>
            첫 댓글을 남겨봐요
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {replies.map((r) => (
            <div key={r.id} style={{
              background: "rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "8px 12px",
              fontSize: 13, color: "white",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginRight: 6 }}>
                {r.nickname}
              </span>
              {r.text}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{
              flex: 1, padding: "10px 13px", borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: "none", color: "white", fontSize: 13,
              outline: "none", fontFamily: "inherit",
            }}
            placeholder={userId ? "댓글 달기... (80자)" : "로그인 후 댓글을 달 수 있어요"}
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
              borderRadius: 10, padding: "10px 14px",
              fontWeight: 900, fontSize: 15,
              color: "var(--dark)", cursor: "pointer",
            }}
          >↑</button>
        </div>
        {userId && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 6 }}>
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} style={{ accentColor: "var(--yellow)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>익명으로 달기</span>
          </label>
        )}
      </motion.div>
    </>
  );
}
