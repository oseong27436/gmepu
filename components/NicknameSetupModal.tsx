"use client";

import { useState } from "react";
import { createProfile } from "@/lib/auth";
import { type UserProfile } from "@/lib/supabase";

interface Props {
  userId: string;
  onDone: (profile: UserProfile) => void;
}

export default function NicknameSetupModal({ userId, onDone }: Props) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    setLoading(true);
    setError("");
    try {
      const profile = await createProfile(userId, nickname.trim());
      onDone(profile);
    } catch (e: any) {
      setError(e.message?.includes("unique") ? "이미 사용 중인 닉네임이에요" : "오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "var(--yellow)" }}>
      <div className="w-full max-w-xs text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="font-display font-black text-2xl mb-2" style={{ color: "var(--dark)" }}>
          닉네임을 정해요
        </h2>
        <p className="text-sm opacity-60 mb-6" style={{ color: "var(--dark)" }}>
          지메뿌에서 사용할 이름이에요
        </p>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <input
          className="w-full px-4 py-3 rounded-2xl text-center font-bold text-lg outline-none mb-4"
          style={{ background: "rgba(26,19,6,0.1)", color: "var(--dark)" }}
          placeholder="닉네임 입력 (최대 12자)"
          maxLength={12}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-lg"
          style={{
            background: nickname.trim() ? "var(--dark)" : "rgba(26,19,6,0.2)",
            color: nickname.trim() ? "var(--yellow)" : "rgba(26,19,6,0.4)",
          }}
          onClick={handleSubmit}
          disabled={!nickname.trim() || loading}
        >
          {loading ? "저장 중..." : "시작하기 🗺️"}
        </button>
      </div>
    </div>
  );
}
