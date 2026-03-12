"use client";

import { useState, useEffect } from "react";
import { MEMO_COLORS } from "./MemoPin";
import { supabase, REACTION_EMOJIS, type GmepuMemo, type GmepuReply } from "@/lib/supabase";
import { getNicknameEmoji } from "@/lib/nickname";

interface MemoSheetProps {
  onSubmit: (text: string, color: string) => void;
  onClose: () => void;
}

export function AddMemoSheet({ onSubmit, onClose }: MemoSheetProps) {
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState(MEMO_COLORS[0]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), selectedColor);
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

        <div className="flex gap-2 mb-4">
          {MEMO_COLORS.map((color) => (
            <button
              key={color}
              className="w-8 h-8 rounded-md border-2 transition-transform"
              style={{
                background: color,
                borderColor: selectedColor === color ? "var(--dark)" : "transparent",
                transform: selectedColor === color ? "scale(1.2)" : "scale(1)",
              }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>

        <div className="memo-card p-4 mb-4 rounded-lg" style={{ background: selectedColor }}>
          <textarea
            className="w-full bg-transparent outline-none text-sm font-medium resize-none"
            style={{ color: "var(--dark)", minHeight: "80px" }}
            placeholder={"짧고 가볍게 남겨봐요 ✨\nEx) 여기 붕어빵 맛있음"}
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="text-right text-xs opacity-40">{text.length}/100</div>
        </div>

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
  fingerprint: string;
  onClose: () => void;
  timeAgo: string;
}

export function MemoDetailSheet({ memo, fingerprint, onClose, timeAgo }: MemoDetailProps) {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<GmepuReply[]>([]);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    // 반응 로드
    const loadReactions = async () => {
      const { data } = await supabase
        .from("gmepu_reactions")
        .select("emoji, fingerprint")
        .eq("memo_id", memo.id);
      if (!data) return;

      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      data.forEach(({ emoji, fingerprint: fp }) => {
        counts[emoji] = (counts[emoji] ?? 0) + 1;
        if (fp === fingerprint) mine.add(emoji);
      });
      setReactions(counts);
      setMyReactions(mine);
    };

    // 답글 로드
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
  }, [memo.id, fingerprint]);

  const toggleReaction = async (emoji: string) => {
    if (myReactions.has(emoji)) {
      await supabase
        .from("gmepu_reactions")
        .delete()
        .eq("memo_id", memo.id)
        .eq("fingerprint", fingerprint)
        .eq("emoji", emoji);
      setMyReactions((prev) => { const s = new Set(prev); s.delete(emoji); return s; });
      setReactions((prev) => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] ?? 1) - 1) }));
    } else {
      await supabase.from("gmepu_reactions").insert({ memo_id: memo.id, fingerprint, emoji });
      setMyReactions((prev) => new Set([...prev, emoji]));
      setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    }
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    const nickname = localStorage.getItem("gmepu_nickname") ?? "익명";
    const { data } = await supabase
      .from("gmepu_replies")
      .insert({ memo_id: memo.id, text: replyText.trim(), nickname, fingerprint })
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
        <div className="memo-card p-5 rounded-lg mb-5" style={{ background: memo.color, rotate: "-1deg" }}>
          <p className="font-medium text-base leading-relaxed mb-3">{memo.text}</p>
          <div className="flex items-center justify-between text-xs opacity-60">
            <span>{getNicknameEmoji(memo.nickname)} {memo.nickname}</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* 이모지 반응 */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="font-display font-bold px-3 py-2 rounded-2xl text-sm flex items-center gap-1 transition-transform active:scale-90"
              style={{
                background: myReactions.has(emoji) ? "var(--dark)" : "rgba(26,19,6,0.1)",
                color: myReactions.has(emoji) ? "var(--yellow)" : "var(--dark)",
                boxShadow: myReactions.has(emoji) ? "0 3px 0 rgba(0,0,0,0.2)" : "none",
              }}
              onClick={() => toggleReaction(emoji)}
            >
              <span>{emoji}</span>
              {reactions[emoji] ? <span>{reactions[emoji]}</span> : null}
            </button>
          ))}
        </div>

        {/* 답글 목록 */}
        {replies.length > 0 && (
          <div className="mb-4 space-y-2">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(26,19,6,0.07)" }}
              >
                <span className="font-bold opacity-70 text-xs">
                  {getNicknameEmoji(reply.nickname)} {reply.nickname}
                </span>
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
            placeholder="답글 달기... (80자)"
            maxLength={80}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
          />
          <button
            className="btn-chunky px-4 py-3 rounded-2xl font-display font-black text-sm"
            style={{ background: "var(--dark)", color: "var(--yellow)" }}
            onClick={submitReply}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
