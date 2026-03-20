"use client";

import { useState, useEffect } from "react";
import { supabase, REACTION_EMOJIS, type GmepuMemo, type GmepuReply } from "@/lib/supabase";
import { getMemoAgeStyle } from "@/lib/utils";

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
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--yellow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5 opacity-30" style={{ background: "var(--dark)" }} />
        <h2 className="font-display font-black text-xl mb-4" style={{ color: "var(--dark)" }}>
          여기에 메모 남기기 ✏️
        </h2>

        <div className="memo-card p-4 mb-3 rounded-lg" style={{ background: "#FFF9B0" }}>
          <textarea
            className="w-full bg-transparent outline-none text-sm font-medium resize-none"
            style={{ color: "var(--dark)", minHeight: "80px" }}
            placeholder="짧고 가볍게 남겨봐요 ✨"
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="text-right text-xs opacity-40">{text.length}/100</div>
        </div>

        <p className="text-xs opacity-40 mb-4 text-center" style={{ color: "var(--dark)" }}>
          메모는 일주일 간 유지됩니다!
        </p>

        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--dark)] cursor-pointer"
          />
          <span className="text-sm font-medium opacity-60" style={{ color: "var(--dark)" }}>익명으로 뿌리기</span>
        </label>

        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-lg"
          style={{
            background: text.trim() ? "var(--dark)" : "rgba(26,19,6,0.2)",
            color: text.trim() ? "var(--yellow)" : "rgba(26,19,6,0.4)",
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

        {/* 🔥 반응 */}
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
