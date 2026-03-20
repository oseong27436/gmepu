"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth";
import { type UserProfile } from "@/lib/supabase";

interface Props {
  profile: UserProfile | null;
  memoCount: number;
  loading: boolean;
  onMyMemos: () => void;
  onLoginRequired: () => void;
}

export default function MapHeader({ profile, memoCount, loading, onMyMemos, onLoginRequired }: Props) {
  return (
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
      <Link
        href="/"
        className="btn-chunky font-display font-black px-4 py-2 rounded-xl text-sm pointer-events-auto"
        style={{ background: "var(--yellow)", color: "var(--dark)" }}
      >
        ← 지메뿌
      </Link>
      <div className="flex gap-2">
        {profile ? (
          <>
            <button
              className="btn-chunky font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
              style={{ background: "white", color: "var(--dark)" }}
              onClick={onMyMemos}
            >
              📋 내 메모
            </button>
            <button
              className="btn-chunky font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
              style={{ background: "white", color: "var(--dark)" }}
              onClick={() => signOut()}
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            className="btn-chunky font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
            style={{ background: "white", color: "var(--dark)" }}
            onClick={onLoginRequired}
          >
            로그인
          </button>
        )}
        <div
          className="font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
          style={{ background: "white", color: "var(--dark)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          {loading ? "불러오는 중..." : `📍 ${memoCount}개`}
        </div>
      </div>
    </div>
  );
}
