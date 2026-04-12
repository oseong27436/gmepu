"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "@/lib/auth";
import { type UserProfile } from "@/lib/supabase";

type FilterType = "all" | "friends" | "hot";

interface Props {
  profile: UserProfile | null;
  avatarUrl: string | null;
  onMyMemos: () => void;
  onFriends: () => void;
  onLoginRequired: () => void;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "friends", label: "친구" },
  { key: "hot", label: "🔥 핫" },
];

export default function MapHeader({ profile, avatarUrl, onMyMemos, onFriends, onLoginRequired, activeFilter, onFilterChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <div
        className="flex items-center justify-between px-4 pt-12 pb-3"
        style={{
          background: "linear-gradient(to bottom, var(--cream) 60%, transparent)",
        }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-2 pointer-events-none select-none">
          <div style={{
            width: 30, height: 30,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--rose), var(--lavender))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15,
            boxShadow: "0 2px 8px rgba(74,55,40,0.15)",
          }}>📍</div>
          <span style={{
            fontSize: 18, fontWeight: 800,
            color: "var(--espresso)",
            letterSpacing: "-0.5px",
            fontFamily: "Pretendard Variable, sans-serif",
          }}>지메뿌</span>
        </div>

        {/* 프로필 아바타 */}
        <div className="relative pointer-events-auto" ref={menuRef}>
          <button
            onClick={() => profile ? setMenuOpen((v) => !v) : onLoginRequired()}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: profile
                ? (avatarUrl ? "transparent" : "linear-gradient(135deg, var(--rose-dark), var(--latte))")
                : "var(--foam)",
              border: `2px solid var(--sand)`,
              boxShadow: "0 2px 8px rgba(74,55,40,0.12)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700,
              color: profile ? "white" : "var(--latte)",
            }}
          >
            {profile ? (
              avatarUrl ? (
                <img src={avatarUrl} alt={profile.nickname} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
              ) : (
                profile.nickname[0]
              )
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </button>

          {/* 드롭다운 */}
          {menuOpen && profile && (
            <div style={{
              position: "absolute",
              top: 44, right: 0,
              background: "var(--foam)",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(74,55,40,0.15)",
              border: `1px solid var(--sand)`,
              overflow: "hidden",
              minWidth: 148,
            }}>
              <button onClick={() => { onMyMemos(); setMenuOpen(false); }} style={menuItemStyle}>
                📋 내 메모
              </button>
              <div style={{ height: 1, background: "var(--sand)" }} />
              <button onClick={() => { onFriends(); setMenuOpen(false); }} style={menuItemStyle}>
                👥 친구 관리
              </button>
              <div style={{ height: 1, background: "var(--sand)" }} />
              <button onClick={() => { signOut(); setMenuOpen(false); }} style={{ ...menuItemStyle, color: "#C0524A" }}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 px-4 pb-2 pointer-events-auto">
        {FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              style={{
                padding: "6px 16px",
                borderRadius: 999,
                border: isActive ? "none" : `1.5px solid var(--sand)`,
                background: isActive ? "var(--espresso)" : "var(--foam)",
                color: isActive ? "var(--cream)" : "var(--latte)",
                fontWeight: 700,
                fontSize: 13,
                fontFamily: "Pretendard Variable, sans-serif",
                boxShadow: isActive
                  ? "0 4px 12px rgba(74,55,40,0.3)"
                  : "0 1px 4px rgba(74,55,40,0.08)",
                cursor: "pointer",
                transition: "all 0.2s ease",
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
  color: "var(--espresso)",
  cursor: "pointer",
};
