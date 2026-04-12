"use client";

import { useState, useEffect } from "react";
import { supabase, REACTION_EMOJIS, type GmepuMemo, type GmepuReply } from "@/lib/supabase";
import { getMemoAgeStyle } from "@/lib/utils";

interface MemoSheetProps {
  onSubmit: (text: string, isAnonymous: boolean) => void;
  onClose: () => void;
  userPos: { lat: number; lng: number } | null;
  nickname: string;
}

export function AddMemoSheet({ onSubmit, onClose, userPos, nickname }: MemoSheetProps) {
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), isAnonymous);
    setText("");
  };

  const displayName = isAnonymous ? "익명" : nickname;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* 메모 위치 미리보기 — 지도 중앙에 반투명 포스트잇 */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, calc(-50% - 21dvh))",
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div style={{
          background: "rgba(255,242,52,0.72)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          borderRadius: 14,
          padding: "12px 16px",
          width: 180,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,242,52,0.5)",
        }}>
          {/* 텍스트 줄 암시 or 실제 입력 미리보기 */}
          {text.trim() ? (
            <p style={{
              fontSize: 13, fontWeight: 600,
              color: "var(--dark)", lineHeight: 1.45,
              marginBottom: 8,
              wordBreak: "break-all",
            }}>{text.slice(0, 40)}{text.length > 40 ? "…" : ""}</p>
          ) : (
            <div style={{ marginBottom: 8 }}>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(26,19,6,0.2)", marginBottom: 5 }} />
              <div style={{ height: 3, borderRadius: 2, background: "rgba(26,19,6,0.2)", width: "75%", marginBottom: 5 }} />
              <div style={{ height: 3, borderRadius: 2, background: "rgba(26,19,6,0.2)", width: "50%" }} />
            </div>
          )}
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,19,6,0.4)" }}>
            {displayName} · 지금
          </div>
        </div>
        {/* 핀 꼬리 */}
        <div style={{
          width: 0, height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "9px solid rgba(255,242,52,0.72)",
        }} />
        {/* 핀 점 */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "rgba(26,19,6,0.35)",
          marginTop: 2,
        }} />
      </div>

      {/* 바텀시트 */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "white",
          borderRadius: "20px 20px 0 0",
          padding: "12px 16px calc(env(safe-area-inset-bottom) + 16px)",
          boxShadow: "0 -6px 32px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div style={{ width: 32, height: 3, borderRadius: 2, background: "rgba(0,0,0,0.1)", margin: "0 auto 14px" }} />

        {/* 입력 */}
        <div style={{
          background: "#f7f7f7",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 12,
          border: "1px solid rgba(0,0,0,0.07)",
        }}>
          <textarea
            style={{
              width: "100%", background: "transparent",
              border: "none", outline: "none",
              fontSize: 15, fontWeight: 500,
              color: "var(--dark)", resize: "none",
              fontFamily: "inherit", minHeight: 64,
              boxSizing: "border-box",
            }}
            placeholder="짧고 가볍게 남겨봐요 ✨"
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "rgba(0,0,0,0.25)", fontWeight: 600 }}>
            {text.length}/100
          </div>
        </div>

        {/* 하단 옵션 + 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ accentColor: "var(--dark)", width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.4)" }}>익명</span>
          </label>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            style={{
              background: text.trim() ? "var(--dark)" : "rgba(0,0,0,0.1)",
              color: text.trim() ? "var(--yellow)" : "rgba(0,0,0,0.25)",
              border: "none", borderRadius: 14,
              padding: "12px 28px",
              fontSize: 14, fontWeight: 800,
              cursor: text.trim() ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >뿌리기 🗺️</button>
        </div>
      </div>
    </div>
  );
}

interface MemoDetailProps {
  memo: GmepuMemo;
  userId: string | null;
  userNickname: string | null;
  onClose: () => void;
  timeAgo: string;
  onLoginRequired: () => void;
}

export function MemoDetailSheet({ memo, userId, userNickname, onClose, timeAgo, onLoginRequired }: MemoDetailProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<GmepuReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isReplyAnonymous, setIsReplyAnonymous] = useState(false);
  const [showScrapTooltip, setShowScrapTooltip] = useState(false);

  useEffect(() => {
    const loadReactions = async () => {
      const { data } = await supabase
        .from("gmepu_reactions")
        .select("emoji, user_id")
        .eq("memo_id", memo.id);
      if (!data) return;

      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      data.forEach(({ emoji, user_id }: { emoji: string; user_id: string }) => {
        counts[emoji] = (counts[emoji] ?? 0) + 1;
        if (userId && user_id === userId) mine.add(emoji);
      });
      setReactions(counts);
      setMyReactions(mine);
    };

    const loadReplies = async () => {
      const { data } = await supabase
        .from("gmepu_replies")
        .select("*")
        .eq("memo_id", memo.id)
        .order("created_at", { ascending: true });
      if (data) setReplies(data);
    };

    loadReactions();
    loadReplies();
  }, [memo.id, userId]);

  const toggleReaction = async (emoji: string) => {
    if (!userId) { onLoginRequired(); return; }

    if (myReactions.has(emoji)) {
      await supabase
        .from("gmepu_reactions")
        .delete()
        .eq("memo_id", memo.id)
        .eq("user_id", userId)
        .eq("emoji", emoji);
      setMyReactions((prev) => { const s = new Set(prev); s.delete(emoji); return s; });
      setReactions((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 1) - 1) }));
    } else {
      await supabase.from("gmepu_reactions").insert({ memo_id: memo.id, user_id: userId, emoji });
      setMyReactions((prev) => new Set([...prev, emoji]));
      setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    }
  };

  const submitReply = async () => {
    if (!userId || !userNickname) { onLoginRequired(); return; }
    if (!replyText.trim()) return;
    const { data } = await supabase
      .from("gmepu_replies")
      .insert({ memo_id: memo.id, text: replyText.trim(), nickname: isReplyAnonymous ? "익명" : userNickname, user_id: userId })
      .select()
      .single();
    if (data) {
      setReplies((prev) => [...prev, data]);
      setReplyText("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--yellow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5 opacity-30" style={{ background: "var(--dark)" }} />

        {/* 메모 카드 */}
        {(() => {
          const { bgColor, borderRadius, filter, opacity } = getMemoAgeStyle(memo.created_at);
          return (
            <div
              className="memo-card p-5 mb-5"
              style={{ background: bgColor, borderRadius, filter, opacity, rotate: "-1deg" }}
            >
              <p className="font-medium text-base leading-relaxed mb-3">{memo.text}</p>
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>{memo.nickname}</span>
                <span>{timeAgo}</span>
              </div>
            </div>
          );
        })()}

        {/* 🔥 반응 + 스크랩 */}
        <div className="flex items-center gap-3 mb-2">
          <button
            className="font-display font-bold px-4 py-2 rounded-2xl text-base flex items-center gap-2 transition-transform active:scale-90"
            style={{
              background: myReactions.has("🔥") ? "var(--dark)" : "rgba(26,19,6,0.1)",
              color: myReactions.has("🔥") ? "var(--yellow)" : "var(--dark)",
              boxShadow: myReactions.has("🔥") ? "0 3px 0 rgba(0,0,0,0.2)" : "none",
            }}
            onClick={() => toggleReaction("🔥")}
          >
            <span>🔥</span>
            {reactions["🔥"] ? <span className="font-black">{reactions["🔥"]}</span> : null}
          </button>

          {/* 스크랩 버튼 */}
          <div style={{ position: "relative" }}>
            <button
              onMouseEnter={() => setShowScrapTooltip(true)}
              onMouseLeave={() => setShowScrapTooltip(false)}
              onTouchStart={() => setShowScrapTooltip(true)}
              onTouchEnd={() => setTimeout(() => setShowScrapTooltip(false), 2000)}
              style={{
                background: "rgba(26,19,6,0.1)",
                border: "none",
                borderRadius: 16,
                padding: "8px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 16,
              }}
            >
              🔖
            </button>
            {showScrapTooltip && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--dark)",
                color: "var(--yellow)",
                borderRadius: 10,
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                zIndex: 10,
                pointerEvents: "none",
              }}>
                ✨ 멤버십 가입 시 이용 가능해요
                {/* 말풍선 꼬리 */}
                <div style={{
                  position: "absolute",
                  top: "100%", left: "50%",
                  transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid var(--dark)",
                }} />
              </div>
            )}
          </div>

          {reactions["🔥"] ? (
            <span className="text-xs opacity-40" style={{ color: "var(--dark)" }}>
              {reactions["🔥"]}명이 불태웠어요
            </span>
          ) : (
            <span className="text-xs opacity-30" style={{ color: "var(--dark)" }}>첫 번째로 불태워봐요</span>
          )}
        </div>
        {(memo.fire_count ?? 0) >= 5 && (
          <p className="text-xs mb-5" style={{ color: "#FF6B35" }}>
            🔥 열기가 식지 않아 소멸이 연장됩니다 (최대 14일)
          </p>
        )}

        {/* 답글 목록 */}
        {replies.length > 0 && (
          <div className="mb-4 space-y-2">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(26,19,6,0.07)" }}
              >
                <span className="font-bold opacity-70 text-xs">{reply.nickname}</span>
                <p className="mt-0.5">{reply.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* 답글 입력 */}
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium outline-none"
            style={{ background: "rgba(26,19,6,0.1)", color: "var(--dark)" }}
            placeholder={userId ? "답글 달기... (80자)" : "로그인 후 답글을 달 수 있어요"}
            maxLength={80}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
            onFocus={() => { if (!userId) onLoginRequired(); }}
            readOnly={!userId}
          />
          <button
            className="btn-chunky px-4 py-3 rounded-2xl font-display font-black text-sm"
            style={{ background: "var(--dark)", color: "var(--yellow)" }}
            onClick={submitReply}
          >
            ↑
          </button>
        </div>
        {userId && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isReplyAnonymous}
              onChange={(e) => setIsReplyAnonymous(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--dark)] cursor-pointer"
            />
            <span className="text-xs font-medium opacity-50" style={{ color: "var(--dark)" }}>익명으로 달기</span>
          </label>
        )}
      </div>
    </div>
  );
}
