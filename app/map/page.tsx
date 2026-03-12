"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo } from "@/lib/supabase";
import { MEMO_COLORS } from "@/components/MemoPin";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";

// 브라우저 핑거프린트 (간단 버전)
function getFingerprint(): string {
  const key = "gmepu_fp";
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(key, fp);
  }
  return fp;
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

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

function MapContent() {
  const map = useMap();
  const [memos, setMemos] = useState<GmepuMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<GmepuMemo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [loading, setLoading] = useState(true);

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

    // 실시간 업데이트
    const channel = supabase
      .channel("gmepu_memos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gmepu_memos" },
        () => loadMemos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 현재 지도 영역 기준 메모만 필터
  const [bounds, setBounds] = useState<google.maps.LatLngBounds | null>(null);
  const visibleMemos = bounds
    ? memos.filter((m) =>
        bounds.contains({ lat: m.lat, lng: m.lng })
      )
    : memos;

  const handleAddMemo = useCallback(
    async (text: string, color: string) => {
      if (!map) return;
      const center = map.getCenter();
      if (!center) return;

      const { data } = await supabase
        .from("gmepu_memos")
        .insert({
          text,
          color,
          lat: center.lat(),
          lng: center.lng(),
          author: "익명",
        })
        .select()
        .single();

      if (data) setMemos((prev) => [data, ...prev]);
      setShowAddSheet(false);
    },
    [map]
  );

  const handleLike = useCallback(async (id: string) => {
    const fp = getFingerprint();

    // 중복 좋아요 체크
    const { error: dupError } = await supabase
      .from("gmepu_likes")
      .insert({ memo_id: id, fingerprint: fp });

    if (dupError) return; // 이미 좋아요

    const { data } = await supabase.rpc
      ? await supabase
          .from("gmepu_memos")
          .update({ likes: (memos.find((m) => m.id === id)?.likes ?? 0) + 1 })
          .eq("id", id)
          .select()
          .single()
      : { data: null };

    if (data) {
      setMemos((prev) => prev.map((m) => (m.id === id ? data : m)));
      setSelectedMemo((prev) => (prev?.id === id ? data : prev));
    }
  }, [memos]);

  return (
    <>
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 37.5665, lng: 126.978 }}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
        onBoundsChanged={(e) => setBounds(e.map.getBounds() ?? null)}
      >
        {visibleMemos.map((memo) => (
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
              {memo.likes > 0 && (
                <p className="text-[10px] opacity-50 mt-0.5">♥ {memo.likes}</p>
              )}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `7px solid ${memo.color}`,
                }}
              />
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
        <div
          className="font-display font-bold px-3 py-2 rounded-xl text-xs pointer-events-auto"
          style={{
            background: "white",
            color: "var(--dark)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {loading ? "불러오는 중..." : `📍 메모 ${visibleMemos.length}개`}
        </div>
      </div>

      {/* 메모 추가 버튼 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={() => setShowAddSheet(true)}
        >
          + 메모 뿌리기
        </button>
      </div>

      {/* 현재 위치 버튼 */}
      <div className="absolute bottom-8 right-4">
        <button
          className="btn-chunky w-14 h-14 rounded-2xl text-xl flex items-center justify-center"
          style={{ background: "white", color: "var(--dark)" }}
          onClick={() => {
            navigator.geolocation?.getCurrentPosition((pos) => {
              map?.panTo({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            });
          }}
        >
          📍
        </button>
      </div>

      {showAddSheet && (
        <AddMemoSheet
          onSubmit={handleAddMemo}
          onClose={() => setShowAddSheet(false)}
        />
      )}
      {selectedMemo && (
        <MemoDetailSheet
          memo={{
            ...selectedMemo,
            createdAt: timeAgo(selectedMemo.created_at),
          }}
          onClose={() => setSelectedMemo(null)}
          onLike={handleLike}
        />
      )}
    </>
  );
}

export default function MapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <APIProvider apiKey={apiKey}>
        <MapContent />
      </APIProvider>
    </div>
  );
}
