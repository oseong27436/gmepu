"use client";

export interface Memo {
  id: string;
  text: string;
  author: string;
  likes: number;
  createdAt: string;
  color: string;
  lat: number;
  lng: number;
}

const MEMO_COLORS = ["#FFF9B0", "#FFD6EA", "#C5E8FF", "#D4F5D4", "#FFE5C0", "#E8D4FF"];

interface MemoPinProps {
  memo: Memo;
  onClick?: (memo: Memo) => void;
}

export default function MemoPin({ memo, onClick }: MemoPinProps) {
  return (
    <div
      className="memo-card absolute cursor-pointer w-32 p-2.5 text-xs font-medium leading-snug select-none"
      style={{
        background: memo.color,
        borderRadius: "4px",
        transform: `rotate(${Math.random() > 0.5 ? 2 : -2}deg)`,
        maxWidth: "120px",
      }}
      onClick={() => onClick?.(memo)}
    >
      <p className="mb-1 line-clamp-3">{memo.text}</p>
      <div className="flex items-center justify-between opacity-60" style={{ fontSize: "10px" }}>
        <span>{memo.author}</span>
        <span>♥ {memo.likes}</span>
      </div>
      {/* 핀 꼬리 */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `8px solid ${memo.color}`,
        }}
      />
    </div>
  );
}

export { MEMO_COLORS };
