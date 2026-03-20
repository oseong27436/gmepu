"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { timeAgo, getMemoAgeStyle } from "@/lib/utils";
import { MAP_ID, KOREA_CENTER, MAP_RESTRICTION } from "@/lib/mapConstants";
import MapHeader from "@/components/MapHeader";
import MyMemoPanel from "@/components/MyMemoPanel";

// zoom >= 이 값이면 개별 핀 표시, 미만이면 클러스터 글로우 표시
const SHOW_PINS_ZOOM = 15;

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  memos: GmepuMemo[];
}

function clusterMemos(memos: GmepuMemo[], zoom: number): Cluster[] {
  const gridDeg = 0.1 * Math.pow(2, 14 - zoom);
  const cells: Record<string, GmepuMemo[]> = {};

  for (const memo of memos) {
    const key = `${Math.floor(memo.lat / gridDeg)},${Math.floor(memo.lng / gridDeg)}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(memo);
  }

  return Object.values(cells).map((group: GmepuMemo[]) => ({
    lat: group.reduce((s: number, m: GmepuMemo) => s + m.lat, 0) / group.length,
    lng: group.reduce((s: number, m: GmepuMemo) => s + m.lng, 0) / group.length,
    count: group.length,
    memos: group,
  }));
}

interface Props {
  user: { id: string } | null;
  profile: UserProfile | null;
  onLoginRequired: () => void;
}

export default function MapContent({ user, profile, onLoginRequired }: Props) {
  const map = useMap();
  const [memos, setMemos] = useState<GmepuMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<GmepuMemo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMyMemos, setShowMyMemos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(15);
  const hasInitialPanned = useRef(false);

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

  // 첫 위치 확인 시 지도 이동
  useEffect(() => {
    if (!map || !userPos || hasInitialPanned.current) return;
    hasInitialPanned.current = true;
    map.panTo(userPos);
  }, [map, userPos]);

  // 줌 레벨 추적
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      setZoom(map.getZoom() ?? 15);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  const handleAddMemo = useCallback(async (text: string, isAnonymous: boolean) => {
    if (!map || !profile || !user) return;
    const center = map.getCenter();
    if (!center) return;

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color: "#FFF9B0", lat: center.lat(), lng: center.lng(), nickname: isAnonymous ? "익명" : profile.nickname, user_id: user.id, likes: 0 })
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

  const handleClusterClick = (cluster: Cluster) => {
    if (!map) return;
    map.panTo({ lat: cluster.lat, lng: cluster.lng });
    map.setZoom(Math.min((map.getZoom() ?? zoom) + 3, SHOW_PINS_ZOOM));
  };

  const myMemos = user ? memos.filter((m) => m.user_id === user.id) : [];
  const showPins = zoom >= SHOW_PINS_ZOOM;
  const clusters = showPins ? [] : clusterMemos(memos, zoom);

  return (
    <>
      <Map
        mapId={MAP_ID}
        defaultCenter={KOREA_CENTER}
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

        {/* 클러스터 글로우 (줌 아웃 시) */}
        {!showPins && clusters.map((cluster, i) => {
          // log 스케일로 밀도 강도 계산 (1개=0, 10개≈1)
          const intensity = Math.min(Math.log2(cluster.count + 1) / Math.log2(11), 1);
          const size = Math.round(22 + intensity * 28); // 22px ~ 50px

          // 노란 → 주황 → 붉은주황
          const r = 255;
          const g = Math.round(220 - intensity * 110);
          const b = Math.round(40 - intensity * 40);
          const color = `rgb(${r},${g},${b})`;
          const glowSpread = Math.round(6 + intensity * 18);
          const glowAlpha = 0.35 + intensity * 0.35;
          const animDur = (2 - intensity * 0.8).toFixed(1); // 2s → 1.2s (핫할수록 빠름)

          return (
            <AdvancedMarker
              key={`cluster-${i}`}
              position={{ lat: cluster.lat, lng: cluster.lng }}
              onClick={() => handleClusterClick(cluster)}
            >
              <div
                className="glow-marker"
                style={{
                  width: size,
                  height: size,
                  background: color,
                  boxShadow: `0 0 ${glowSpread}px ${Math.round(glowSpread / 2)}px rgba(${r},${g},${b},${glowAlpha})`,
                  ["--glow-dur" as string]: `${animDur}s`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "900",
                  color: "white",
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                {cluster.count > 1 ? cluster.count : ""}
              </div>
            </AdvancedMarker>
          );
        })}

        {/* 개별 메모 핀 (줌 인 시) */}
        {showPins && memos.map((memo) => {
          const { bgColor, borderRadius, filter, opacity } = getMemoAgeStyle(memo.created_at);
          const rot = parseInt(memo.id[0], 16) % 2 === 0 ? "2deg" : "-2deg";
          return (
            <AdvancedMarker
              key={memo.id}
              position={{ lat: memo.lat, lng: memo.lng }}
              onClick={() => setSelectedMemo(memo)}
            >
              <div
                className="memo-card px-2.5 py-2 text-xs font-medium leading-snug cursor-pointer relative"
                style={{
                  background: bgColor,
                  borderRadius,
                  filter,
                  opacity,
                  maxWidth: "110px",
                  transform: `rotate(${rot})`,
                }}
              >
                <p className="line-clamp-2">{memo.text}</p>
                <div style={{ position: "absolute", bottom: "-7px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${bgColor}` }} />
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>

      <MapHeader
        profile={profile}
        memoCount={memos.length}
        loading={loading}
        onMyMemos={() => setShowMyMemos(true)}
        onLoginRequired={onLoginRequired}
      />

      {/* 하단 버튼들 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button
          className="btn-chunky font-display font-black px-8 py-4 rounded-2xl text-lg"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={() => {
            if (!profile) { onLoginRequired(); return; }
            if (!userPos) { alert("위치 정보를 가져오는 중이에요. 잠시 후 다시 시도해주세요."); return; }
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

      {showMyMemos && profile && (
        <MyMemoPanel
          profile={profile}
          myMemos={myMemos}
          onClose={() => setShowMyMemos(false)}
          onSelectMemo={setSelectedMemo}
        />
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
