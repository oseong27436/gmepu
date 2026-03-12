"use client";

import { useState } from "react";
import { MEMO_COLORS } from "./MemoPin";

interface Memo {
  id: string;
  text: string;
  author: string;
  likes: number;
  createdAt: string;
  color: string;
}

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

        {/* 색상 선택 */}
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

        {/* 메모 입력 */}
        <div
          className="memo-card p-4 mb-4 rounded-lg"
          style={{ background: selectedColor }}
        >
          <textarea
            className="w-full bg-transparent outline-none text-sm font-medium resize-none"
            style={{ color: "var(--dark)", minHeight: "80px" }}
            placeholder="짧고 가볍게 남겨봐요 ✨&#10;Ex) 여기 붕어빵 맛있음"
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
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
  memo: Memo;
  onClose: () => void;
  onLike: (id: string) => void;
}

export function MemoDetailSheet({ memo, onClose, onLike }: MemoDetailProps) {
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
        <div
          className="memo-card p-5 rounded-lg mb-5"
          style={{ background: memo.color, rotate: "-1deg" }}
        >
          <p className="font-medium text-base leading-relaxed mb-3">{memo.text}</p>
          <div className="flex items-center justify-between text-xs opacity-60">
            <span>{memo.author}</span>
            <span>{memo.createdAt}</span>
          </div>
        </div>

        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
          style={{ background: "var(--red)", color: "#fff" }}
          onClick={() => onLike(memo.id)}
        >
          <span>♥</span>
          <span>좋아요 {memo.likes}</span>
        </button>
      </div>
    </div>
  );
}
