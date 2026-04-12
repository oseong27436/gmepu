"use client";

import { useState, useEffect } from "react";
import { supabase, REACTION_EMOJIS, type GmepuMemo, type GmepuReply } from "@/lib/supabase";

interface MemoSheetProps {
  onSubmit: (text: string, isAnonymous: boolean) => void;
  onClose: () => void;
}

export function AddMemoSheet({ onSubmit, onClose }: MemoSheetProps) {
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), isAnonymous);
    setText("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(74,55,40,0.2)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--foam)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sand)", margin: "0 auto 20px" }} />

        <h2 style={{
          fontSize: 17, fontWeight: 800,
          color: "var(--espresso)",
          marginBottom: 16,
          letterSpacing: "-0.3px",
        }}>
          지금 이 순간을 뿌려요 ✨
        </h2>

        {/* 텍스트 입력 */}
        <div style={{
          background: "var(--cream)",
          border: `1.5px solid var(--sand)`,
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 12,
          boxShadow: "inset 0 2px 8px rgba(74,55,40,0.04)",
        }}>
          <textarea
            className="w-full bg-transparent outline-none text-sm font-medium resize-none"
            style={{ color: "var(--espresso)", minHeight: "80px", fontFamily: "inherit" }}
            placeholder="짧고 가볍게 남겨봐요 ✨"
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "var(--latte)", opacity: 0.6 }}>
            {text.length}/100
          </div>
        </div>

        {/* 익명 체크 */}
        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: "var(--espresso)" }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--latte)" }}>익명으로 뿌리기</span>
        </label>

        <button
          className="btn-chunky w-full py-4 rounded-2xl text-base"
          style={{
            background: text.trim()
              ? "var(--espresso)"
              : "var(--sand)",
            color: text.trim() ? "var(--cream)" : "var(--sand-dark)",
            fontWeight: 800,
            fontSize: 15,
            border: "none",
            cursor: text.trim() ? "pointer" : "default",
          }}
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          뿌리기 🗺️
        </button>
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
      style={{ background: "rgba(74,55,40,0.2)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--foam)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--sand)", margin: "0 auto 20px" }} />

        {/* 메모 카드 */}
        <div
          className="memo-card p-5 mb-5"
          style={{
            background: "var(--cream)",
            borderRadius: 16,
            border: `1.5px solid var(--sand)`,
            rotate: "-1deg",
          }}
        >
          <p style={{
            fontSize: 16, fontWeight: 600,
            color: "var(--espresso)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}>{memo.text}</p>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: "var(--latte)",
          }}>
            <span style={{ fontWeight: 700 }}>{memo.nickname}</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* 반응 버튼들 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            style={{
              background: myReactions.has("🔥") ? "var(--espresso)" : "var(--sand)",
              color: myReactions.has("🔥") ? "var(--cream)" : "var(--latte)",
              border: "none",
              borderRadius: 14,
              padding: "8px 16px",
              fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: myReactions.has("🔥") ? "0 4px 12px rgba(74,55,40,0.25)" : "none",
            }}
            onClick={() => toggleReaction("🔥")}
          >
            <span>🔥</span>
            {reactions["🔥"] ? <span>{reactions["🔥"]}</span> : null}
          </button>

          {/* 스크랩 버튼 */}
          <div style={{ position: "relative" }}>
            <button
              onMouseEnter={() => setShowScrapTooltip(true)}
              onMouseLeave={() => setShowScrapTooltip(false)}
              onTouchStart={() => setShowScrapTooltip(true)}
              onTouchEnd={() => setTimeout(() => setShowScrapTooltip(false), 2000)}
              style={{
                background: "var(--sand)",
                border: "none",
                borderRadius: 14,
                padding: "8px 14px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 16,
              }}
            >🔖</button>
            {showScrapTooltip && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--espresso)",
                color: "var(--cream)",
                borderRadius: 10,
                padding: "7px 12px",
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(74,55,40,0.3)",
                zIndex: 10,
                pointerEvents: "none",
              }}>
                ✨ 멤버십 가입 시 이용 가능해요
                <div style={{
                  position: "absolute",
                  top: "100%", left: "50%",
                  transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid var(--espresso)",
                }} />
              </div>
            )}
          </div>

          {reactions["🔥"] ? (
            <span style={{ fontSize: 12, color: "var(--latte)", opacity: 0.7 }}>
              {reactions["🔥"]}명이 불태웠어요
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--latte)", opacity: 0.5 }}>첫 번째로 불태워봐요</span>
          )}
        </div>

        {/* 답글 목록 */}
        {replies.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {replies.map((reply) => (
              <div
                key={reply.id}
                style={{
                  background: "var(--cream)",
                  border: `1px solid var(--sand)`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--espresso)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 11, color: "var(--latte)", display: "block", marginBottom: 3 }}>
                  {reply.nickname}
                </span>
                <p>{reply.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* 답글 입력 */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 14,
              border: `1.5px solid var(--sand)`,
              background: "var(--cream)",
              color: "var(--espresso)",
              fontSize: 13, fontWeight: 500,
              outline: "none",
              fontFamily: "inherit",
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
            style={{
              background: "var(--espresso)",
              color: "var(--cream)",
              border: "none",
              borderRadius: 14,
              padding: "12px 16px",
              fontWeight: 800,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(74,55,40,0.25)",
            }}
            onClick={submitReply}
          >↑</button>
        </div>
        {userId && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isReplyAnonymous}
              onChange={(e) => setIsReplyAnonymous(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: "var(--espresso)" }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--latte)" }}>익명으로 달기</span>
          </label>
        )}
      </div>
    </div>
  );
}
