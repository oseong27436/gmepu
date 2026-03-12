"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Memo } from "@/components/MemoPin";
import { MEMO_COLORS } from "@/components/MemoPin";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";

// 샘플 데이터
const INITIAL_MEMOS: Memo[] = [
  {
    id: "1",
    text: "여기 붕어빵 진짜 맛있음 🐟",
    author: "익명의 미식가",
    likes: 12,
    createdAt: "10분 전",
    color: MEMO_COLORS[0],
    lat: 37.5665,
    lng: 126.978,
  },
  {
    id: "2",
    text: "이 골목 야경 예쁨 ✨ 사진 꼭 찍어봐요",
    author: "야경러버",
    likes: 28,
    createdAt: "1시간 전",
    color: MEMO_COLORS[1],
    lat: 37.5672,
    lng: 126.9795,
  },
  {
    id: "3",
    text: "조용해서 공부하기 최고 📚 와이파이도 됨",
    author: "카공족",
    likes: 7,
    createdAt: "3시간 전",
    color: MEMO_COLORS[2],
    lat: 37.5658,
    lng: 126.9768,
  },
  {
    id: "4",
    text: "숨겨진 카페 발견! 오너분 친절하심 ☕",
    author: "카페탐험가",
    likes: 34,
    createdAt: "어제",
    color: MEMO_COLORS[3],
    lat: 37.5679,
    lng: 126.9755,
  },
  {
    id: "5",
    text: "고양이 항상 여기 있음 🐱 밥 주지 마세요",
    author: "냥이지킴이",
    likes: 56,
    createdAt: "2일 전",
    color: MEMO_COLORS[4],
    lat: 37.5648,
    lng: 126.9805,
  },
];

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

function MapContent() {
  const map = useMap();
  const [memos, setMemos] = useState<Memo[]>(INITIAL_MEMOS);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const handleAddMemo = useCallback(
    (text: string, color: string) => {
      if (!map) return;
      const center = map.getCenter();
      if (!center) return;

      const newMemo: Memo = {
        id: Date.now().toString(),
        text,
        author: "나",
        likes: 0,
        createdAt: "방금",
        color,
        lat: center.lat(),
        lng: center.lng(),
      };
      setMemos((prev) => [...prev, newMemo]);
      setShowAddSheet(false);
    },
    [map]
  );

  const handleLike = useCallback((id: string) => {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
    setSelectedMemo((prev) =>
      prev?.id === id ? { ...prev, likes: prev.likes + 1 } : prev
    );
  }, []);

  return (
    <>
      {/* 지도 */}
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 37.5665, lng: 126.978 }}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        className="w-full h-full"
        style={{ background: "#f5f0e8" }}
      >
        {memos.map((memo) => (
          <AdvancedMarker
            key={memo.id}
            position={{ lat: memo.lat, lng: memo.lng }}
            onClick={() => setSelectedMemo(memo)}
          >
            <div
              className="memo-card px-2.5 py-2 text-xs font-medium leading-snug cursor-pointer max-w-[110px] relative"
              style={{
                background: memo.color,
                borderRadius: "4px",
                transform: `rotate(${memo.id.charCodeAt(0) % 2 === 0 ? "2deg" : "-2deg"})`,
              }}
            >
              <p className="line-clamp-2">{memo.text}</p>
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
          style={{ background: "white", color: "var(--dark)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          📍 메모 {memos.length}개
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
              map?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
          }}
        >
          📍
        </button>
      </div>

      {/* 시트들 */}
      {showAddSheet && (
        <AddMemoSheet
          onSubmit={handleAddMemo}
          onClose={() => setShowAddSheet(false)}
        />
      )}
      {selectedMemo && (
        <MemoDetailSheet
          memo={selectedMemo}
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
