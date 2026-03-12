"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { MEMO_COLORS } from "@/components/MemoPin";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { signInWithGoogle, signOut, getProfile, createProfile } from "@/lib/auth";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// 연세대학교 중심 좌표
const YONSEI_CENTER = { lat: 37.5643, lng: 126.9389 };

// 지도 이동 제한 범위 (약 2km 반경)
const MAP_RESTRICTION = {
  latLngBounds: {
    north: 37.5843,
    south: 37.5443,
    east: 126.9639,
    west: 126.9139,
  },
  strictBounds: true,
};

// 메모 작성 허용 반경 (미터)
const MEMO_ALLOW_RADIUS_M = 1500;

function getDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// 위치 권한 요청 화면
function LocationPermissionScreen({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "var(--yellow)" }}>
      <div className="text-center max-w-xs">
        <div className="text-7xl mb-6">📍</div>
        <h2 className="font-display font-black text-3xl mb-3" style={{ color: "var(--dark)" }}>
          내 위치를 알려줘요
        </h2>
        <p className="mb-8 leading-relaxed opacity-70" style={{ color: "var(--dark)", fontSize: "15px" }}>
          주변 메모를 발견하고<br />지금 있는 곳에 메모를 남기려면<br />위치 권한이 필요해요.
        </p>
        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-lg mb-3"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={onAllow}
        >
          내 위치 허용하기 🗺️
        </button>
        <button
          className="w-full font-display font-bold py-3 opacity-50"
          style={{ color: "var(--dark)" }}
          onClick={onSkip}
        >
          나중에
        </button>
      </div>
    </div>
  );
}

// 로그인 유도 모달
function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-3xl p-6"
        style={{ background: "var(--yellow)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✏️</div>
          <h2 className="font-display font-black text-2xl mb-2" style={{ color: "var(--dark)" }}>
            메모를 남기려면
          </h2>
          <p className="text-sm opacity-60" style={{ color: "var(--dark)" }}>
            구글 로그인이 필요해요
          </p>
        </div>
        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={() => signInWithGoogle()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>
      </div>
    </div>
  );
}

// 첫 로그인 닉네임 설정
function NicknameSetupModal({ userId, onDone }: { userId: string; onDone: (profile: UserProfile) => void }) {
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

interface MapContentProps {
  user: { id: string } | null;
  profile: UserProfile | null;
  onLoginRequired: () => void;
}

function MapContent({ user, profile, onLoginRequired }: MapContentProps) {
  const map = useMap();
  const [memos, setMemos] = useState<GmepuMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<GmepuMemo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMyMemos, setShowMyMemos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  // 메모 로드
  useEffect(() => {
    const loadMemos = async () => {
      const { data } = await supabase
        .from("gmepu_memos")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setMemos(data);
      setLoading(false);
    };
    loadMemos();

    const channel = supabase
      .channel("gmepu_memos_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gmepu_memos" }, () => loadMemos())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 현재 위치 추적
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const handleAddMemo = useCallback(async (text: string, color: string) => {
    if (!map || !profile || !user) return;
    const center = map.getCenter();
    if (!center) return;

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color, lat: center.lat(), lng: center.lng(), nickname: profile.nickname, user_id: user.id, likes: 0 })
      .select()
      .single();

    if (data) setMemos((prev) => [data, ...prev]);
    setShowAddSheet(false);
  }, [map, profile, user]);

  const goToMyLocation = () => {
    if (userPos) map?.panTo(userPos);
    else navigator.geolocation?.getCurrentPosition((pos) => {
      const pos2 = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(pos2);
      map?.panTo(pos2);
    });
  };

  const myMemos = user ? memos.filter((m) => m.user_id === user.id) : [];

  return (
    <>
      <Map
        mapId={MAP_ID}
        defaultCenter={YONSEI_CENTER}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        scaleControl
        restriction={MAP_RESTRICTION}
        className="w-full h-full"
      >
        {/* 내 위치 마커 */}
        {userPos && profile && (
          <AdvancedMarker position={userPos}>
            <div className="flex flex-col items-center">
              <div
                className="font-bold px-3 py-1.5 rounded-full text-xs border-2 shadow-lg whitespace-nowrap"
                style={{ background: "var(--yellow)", borderColor: "var(--dark)", color: "var(--dark)" }}
              >
                {profile.nickname}
              </div>
              <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid var(--dark)" }} />
            </div>
          </AdvancedMarker>
        )}

        {/* 메모 핀들 */}
        {memos.map((memo) => (
          <AdvancedMarker
            key={memo.id}
            position={{ lat: memo.lat, lng: memo.lng }}
            onClick={() => setSelectedMemo(memo)}
          >
            <div
              className="memo-card px-2.5 py-2 text-xs font-medium leading-snug cursor-pointer relative"
              style={{
                background: memo.color,
                borderRadius: "4px",
                maxWidth: "110px",
                transform: `rotate(${parseInt(memo.id[0], 16) % 2 === 0 ? "2deg" : "-2deg"})`,
              }}
            >
              <p className="line-clamp-2">{memo.text}</p>
              <div style={{ position: "absolute", bottom: "-7px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${memo.color}` }} />
            </div>
          </AdvancedMarker>
        ))}
      </Map>

      {/* 상단 헤더 */}
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
                onClick={() => setShowMyMemos(true)}
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
            {loading ? "불러오는 중..." : `📍 ${memos.length}개`}
          </div>
        </div>
      </div>

      {/* 하단 버튼들 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={() => {
            if (!profile) { onLoginRequired(); return; }
            if (!userPos) { alert("위치 정보를 가져오는 중이에요. 잠시 후 다시 시도해주세요."); return; }
            if (getDistanceM(userPos, YONSEI_CENTER) > MEMO_ALLOW_RADIUS_M) {
              alert("신촌 연세대 근처에서만 메모를 남길 수 있어요 📍");
              return;
            }
            setShowAddSheet(true);
          }}
        >
          + 메모 뿌리기
        </button>
      </div>
      <div className="absolute bottom-8 right-4">
        <button
          className="btn-chunky w-14 h-14 rounded-2xl text-xl flex items-center justify-center"
          style={{ background: "white", color: "var(--dark)" }}
          onClick={goToMyLocation}
        >
          📍
        </button>
      </div>

      {/* 내 메모 패널 */}
      {showMyMemos && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={() => setShowMyMemos(false)}
        >
          <div
            className="w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto"
            style={{ background: "var(--yellow)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-5 opacity-30" style={{ background: "var(--dark)" }} />
            <h2 className="font-display font-black text-xl mb-1" style={{ color: "var(--dark)" }}>
              {profile?.nickname}
            </h2>
            <p className="text-xs opacity-50 mb-5">내가 남긴 메모들</p>
            {myMemos.length === 0 ? (
              <p className="text-center opacity-40 py-8">아직 남긴 메모가 없어요 ✏️</p>
            ) : myMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="memo-card p-3 rounded-lg mb-3 cursor-pointer"
                  style={{ background: memo.color }}
                  onClick={() => { setSelectedMemo(memo); setShowMyMemos(false); }}
                >
                  <p className="text-sm font-medium">{memo.text}</p>
                  <p className="text-xs opacity-50 mt-1">{timeAgo(memo.created_at)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {showAddSheet && (
        <AddMemoSheet
          onSubmit={handleAddMemo}
          onClose={() => setShowAddSheet(false)}
        />
      )}
      {selectedMemo && (
        <MemoDetailSheet
          memo={selectedMemo}
          userId={user?.id ?? null}
          userNickname={profile?.nickname ?? null}
          onClose={() => setSelectedMemo(null)}
          timeAgo={timeAgo(selectedMemo.created_at)}
          onLoginRequired={onLoginRequired}
        />
      )}
    </>
  );
}

export default function MapPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showNicknameSetup, setShowNicknameSetup] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [locationAsked, setLocationAsked] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const p = await getProfile(userId);
    if (!p) setShowNicknameSetup(true);
    else setProfile(p);
  };

  useEffect(() => {
    const asked = localStorage.getItem("gmepu_location_asked");
    if (asked) setShowMap(true);
    else setLocationAsked(true);
  }, []);

  const handleAllow = () => {
    navigator.geolocation?.getCurrentPosition(() => {});
    localStorage.setItem("gmepu_location_asked", "true");
    setLocationAsked(false);
    setShowMap(true);
  };

  const handleSkip = () => {
    localStorage.setItem("gmepu_location_asked", "true");
    setLocationAsked(false);
    setShowMap(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {locationAsked && <LocationPermissionScreen onAllow={handleAllow} onSkip={handleSkip} />}
      {showNicknameSetup && session && (
        <NicknameSetupModal
          userId={session.user.id}
          onDone={(p) => { setProfile(p); setShowNicknameSetup(false); }}
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showMap && (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
          <MapContent
            user={session?.user ?? null}
            profile={profile}
            onLoginRequired={() => setShowLoginModal(true)}
          />
        </APIProvider>
      )}
    </div>
  );
}
