"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { supabase, type GmepuMemo } from "@/lib/supabase";
import { MEMO_COLORS } from "@/components/MemoPin";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { generateNickname, getNicknameEmoji } from "@/lib/nickname";

function getFingerprint(): string {
  const key = "gmepu_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
}

function getOrCreateNickname(): string {
  const key = "gmepu_nickname";
  let name = localStorage.getItem(key);
  if (!name) {
    name = generateNickname();
    localStorage.setItem(key, name);
  }
  return name;
}

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

function MapContent() {
  const map = useMap();
  const [memos, setMemos] = useState<GmepuMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<GmepuMemo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMyMemos, setShowMyMemos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nickname, setNickname] = useState("");
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    setFingerprint(getFingerprint());
    setNickname(getOrCreateNickname());
  }, []);

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
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color, lat: center.lat(), lng: center.lng(), nickname, likes: 0 })
      .select()
      .single();

    if (data) {
      setMemos((prev) => [data, ...prev]);
      const myIds: string[] = JSON.parse(localStorage.getItem("gmepu_my_memo_ids") ?? "[]");
      localStorage.setItem("gmepu_my_memo_ids", JSON.stringify([...myIds, data.id]));
    }
    setShowAddSheet(false);
  }, [map, nickname]);

  const goToMyLocation = () => {
    if (userPos) map?.panTo(userPos);
    else navigator.geolocation?.getCurrentPosition((pos) => {
      const pos2 = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(pos2);
      map?.panTo(pos2);
    });
  };

  const myMemos = memos.filter((m) => {
    // fingerprint 기반으로 내 메모 판별은 클라이언트 로컬스토리지에 저장된 ID 목록으로
    const myIds: string[] = JSON.parse(localStorage.getItem("gmepu_my_memo_ids") ?? "[]");
    return myIds.includes(m.id);
  });

  return (
    <>
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 37.5665, lng: 126.978 }}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
      >
        {/* 내 위치 캐릭터 */}
        {userPos && (
          <AdvancedMarker position={userPos}>
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 shadow-lg"
                style={{ background: "var(--yellow)", borderColor: "var(--dark)" }}
              >
                {getNicknameEmoji(nickname)}
              </div>
              <div
                className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap"
                style={{ background: "var(--dark)", color: "var(--yellow)" }}
              >
                {nickname}
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
          {/* 내 메모 버튼 */}
          <button
            className="btn-chunky font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
            style={{ background: "white", color: "var(--dark)" }}
            onClick={() => setShowMyMemos(true)}
          >
            📋 내 메모
          </button>
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
          onClick={() => setShowAddSheet(true)}
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
          {getNicknameEmoji(nickname)}
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
              {getNicknameEmoji(nickname)} {nickname}
            </h2>
            <p className="text-xs opacity-50 mb-5">내가 남긴 메모들</p>
            {(() => {
              const myIds: string[] = JSON.parse(localStorage.getItem("gmepu_my_memo_ids") ?? "[]");
              const my = memos.filter((m) => myIds.includes(m.id));
              if (my.length === 0) return (
                <p className="text-center opacity-40 py-8">아직 남긴 메모가 없어요 ✏️</p>
              );
              return my.map((memo) => (
                <div
                  key={memo.id}
                  className="memo-card p-3 rounded-lg mb-3 cursor-pointer"
                  style={{ background: memo.color }}
                  onClick={() => { setSelectedMemo(memo); setShowMyMemos(false); }}
                >
                  <p className="text-sm font-medium">{memo.text}</p>
                  <p className="text-xs opacity-50 mt-1">{timeAgo(memo.created_at)}</p>
                </div>
              ));
            })()}
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
          fingerprint={fingerprint}
          onClose={() => setSelectedMemo(null)}
          timeAgo={timeAgo(selectedMemo.created_at)}
        />
      )}
    </>
  );
}

export default function MapPage() {
  const [locationAsked, setLocationAsked] = useState(false);
  const [showMap, setShowMap] = useState(false);

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
      {showMap && (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
          <MapContent />
        </APIProvider>
      )}
    </div>
  );
}
