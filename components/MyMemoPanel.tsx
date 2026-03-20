"use client";

import { type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { timeAgo } from "@/lib/utils";

interface Props {
  profile: UserProfile;
  myMemos: GmepuMemo[];
  onClose: () => void;
  onSelectMemo: (memo: GmepuMemo) => void;
}

export default function MyMemoPanel({ profile, myMemos, onClose, onSelectMemo }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto"
        style={{ background: "var(--yellow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5 opacity-30" style={{ background: "var(--dark)" }} />
        <h2 className="font-display font-black text-xl mb-1" style={{ color: "var(--dark)" }}>
          {profile.nickname}
        </h2>
        <p className="text-xs opacity-50 mb-5">내가 남긴 메모들</p>
        {myMemos.length === 0 ? (
          <p className="text-center opacity-40 py-8">아직 남긴 메모가 없어요 ✏️</p>
        ) : myMemos.map((memo) => (
          <div
            key={memo.id}
            className="memo-card p-3 rounded-lg mb-3 cursor-pointer"
            style={{ background: memo.color }}
            onClick={() => { onSelectMemo(memo); onClose(); }}
          >
            <p className="text-sm font-medium">{memo.text}</p>
            <p className="text-xs opacity-50 mt-1">{timeAgo(memo.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
