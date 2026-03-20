"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "@/lib/auth";
import { type UserProfile } from "@/lib/supabase";

type FilterType = "all" | "friends" | "hot";

interface Props {
  profile: UserProfile | null;
  avatarUrl: string | null;
  onMyMemos: () => void;
  onLoginRequired: () => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "friends", label: "친구" },
  { key: "hot", label: "🔥 핫" },
];

export default function MapHeader({ profile, avatarUrl, onMyMemos, onLoginRequired, activeFilter, onFilterChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ zIndex: 10 }}>
      {/* 헤더 바 */}
      <div className="flex items-center justify-between px-4 pt-5">
        {/* 로고 */}
        <span
          className="font-display font-black text-xl pointer-events-none select-none"
          style={{ color: "var(--dark)", textShadow: "0 1px 4px rgba(255,255,255,0.9)" }}
        >
          지메뿌
        </span>

        {/* 프로필 아바타 */}
        <div className="relative pointer-events-auto" ref={menuRef}>
          <button
            onClick={() => profile ? setMenuOpen((v) => !v) : onLoginRequired()}
            style={{
              width: 38, height: 38,
              borderRadius: "50%",
              background: profile ? (avatarUrl ? "transparent" : "var(--dark)") : "white",
              border: "none",
              boxShadow: "0 1px 6px rgba(0,0,0,0.22)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: profile ? 15 : 18,
              fontWeight: 900,
              color: profile ? "var(--yellow)" : "#555",
              fontFamily: "Nunito",
            }}
          >
            {profile ? (
              avatarUrl ? (
                <img src={avatarUrl} alt={profile.nickname} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
              ) : (
                profile.nickname[0]
              )
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </button>

          {/* 드롭다운 메뉴 */}
          {menuOpen && profile && (
            <div style={{
              position: "absolute",
              top: 46, right: 0,
              background: "white",
              borderRadius: 16,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              overflow: "hidden",
              minWidth: 140,
            }}>
              <button
                onClick={() => { onMyMemos(); setMenuOpen(false); }}
                style={menuItemStyle}
              >
                📋 내 메모
              </button>
              <div style={{ height: 1, background: "#f0f0f0" }} />
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                style={{ ...menuItemStyle, color: "#e53e3e" }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 px-4 mt-3 pointer-events-auto">
        {FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              style={{
                padding: "7px 18px",
                borderRadius: 999,
                border: "none",
                background: isActive ? "var(--dark)" : "rgba(255,255,255,0.92)",
                color: isActive ? "var(--yellow)" : "var(--dark)",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "Nunito, Pretendard Variable, sans-serif",
                boxShadow: isActive
                  ? "0 2px 8px rgba(0,0,0,0.25)"
                  : "0 1px 4px rgba(0,0,0,0.12)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  textAlign: "left",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--dark)",
  cursor: "pointer",
};
