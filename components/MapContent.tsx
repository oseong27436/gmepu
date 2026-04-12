"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { timeAgo, getMemoAgeStyle, reverseGeocode } from "@/lib/utils";
import { MAP_ID, KOREA_CENTER, MAP_RESTRICTION } from "@/lib/mapConstants";
import MapHeader from "@/components/MapHeader";
import MyMemoPanel from "@/components/MyMemoPanel";
import FriendsPanel from "@/components/FriendsPanel";

// zoom >= 이 값이면 개별 핀 표시
const SHOW_PINS_ZOOM = 19;

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  memos: GmepuMemo[];
  label?: string;
}

function getAdminKey(memo: GmepuMemo, zoom: number): string {
  if (zoom < 10) {
    // 시도 단위
    return memo.sido ?? `grid:${Math.floor(memo.lat / 1.5)},${Math.floor(memo.lng / 1.5)}`;
  }
  if (zoom < 14) {
    // 시군구 단위
    return memo.sigungu
      ? `${memo.sido}/${memo.sigungu}`
      : `grid:${Math.floor(memo.lat / 0.12)},${Math.floor(memo.lng / 0.12)}`;
  }
  if (zoom < 17) {
    // 동 단위
    return memo.dong
      ? `${memo.sigungu}/${memo.dong}`
      : `grid:${Math.floor(memo.lat / 0.03)},${Math.floor(memo.lng / 0.03)}`;
  }
  if (zoom < 18) {
    // ~300m 격자 (zoom 17, 50m 눈금 단계)
    return `grid:${Math.floor(memo.lat / 0.003)},${Math.floor(memo.lng / 0.003)}`;
  }
  // ~100m 격자 (zoom 18, 20m 눈금 단계)
  return `grid:${Math.floor(memo.lat / 0.001)},${Math.floor(memo.lng / 0.001)}`;
}

function clusterMemos(memos: GmepuMemo[], zoom: number): Cluster[] {
  const cells: Record<string, GmepuMemo[]> = {};

  for (const memo of memos) {
    const key = getAdminKey(memo, zoom);
    if (!cells[key]) cells[key] = [];
    cells[key].push(memo);
  }

  return Object.values(cells).map((group: GmepuMemo[]) => {
    const rep = group[0];
    const label = zoom < 10
      ? (rep.sido ?? undefined)
      : zoom < 14
        ? (rep.sigungu ?? undefined)
        : (rep.dong ?? undefined);
    return {
      lat: group.reduce((s: number, m: GmepuMemo) => s + m.lat, 0) / group.length,
      lng: group.reduce((s: number, m: GmepuMemo) => s + m.lng, 0) / group.length,
      count: group.length,
      memos: group,
      label,
    };
  });
}

interface Props {
  user: { id: string } | null;
  profile: UserProfile | null;
  avatarUrl: string | null;
  onLoginRequired: () => void;
}

export default function MapContent({ user, profile, avatarUrl, onLoginRequired }: Props) {
  const map = useMap();
  const [memos, setMemos] = useState<GmepuMemo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<GmepuMemo | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showMyMemos, setShowMyMemos] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "friends" | "hot">("all");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
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

  // 방향 감지 (Android: 자동, iOS: enableHeading() 호출 필요)
  const enableHeading = useCallback(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const ext = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (ext.webkitCompassHeading != null) {
        setHeading(ext.webkitCompassHeading); // iOS
      } else if (e.absolute && e.alpha != null) {
        setHeading((360 - e.alpha) % 360); // Android
      }
    };
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission().then((state) => {
        if (state === "granted") window.addEventListener("deviceorientation", handler);
      });
    } else {
      window.addEventListener("deviceorientationabsolute" as "deviceorientation", handler, true);
      window.addEventListener("deviceorientation", handler);
    }
  }, []);

  // 줌 레벨 추적
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      setZoom(map.getZoom() ?? 15);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  const handleAddMemo = useCallback(async (text: string, isAnonymous: boolean) => {
    if (!map || !profile || !user || !userPos) return;

    const lat = userPos.lat;
    const lng = userPos.lng;
    const { sido, sigungu, dong } = await reverseGeocode(lat, lng);

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color: "#FFF9B0", lat, lng, nickname: isAnonymous ? "익명" : profile.nickname, user_id: user.id, sido, sigungu, dong })
      .select()
      .single();

    if (data) setMemos((prev) => [data, ...prev]);
    setShowAddSheet(false);
  }, [map, profile, user, userPos]);

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

  const filteredMemos = activeFilter === "hot"
    ? memos.filter((m) => (m.fire_count ?? 0) >= 5)
    : activeFilter === "friends"
      ? [] // 친구 기능 준비 중
      : memos;

  const showPins = zoom >= SHOW_PINS_ZOOM;
  const clusters = showPins ? [] : clusterMemos(filteredMemos, zoom);

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
        styles={[
          { elementType: "geometry", stylers: [{ color: "#f5ede0" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#8b6f5a" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#fdf6ec" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#faf0e6" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e8dcc8" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f2c4ce" }] },
          { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e8a4b0" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#d4c8e8" }] },
          { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8b6f5a" }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#b8d4c8" }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e8dcc8" }] },
          { featureType: "transit", elementType: "geometry", stylers: [{ color: "#d4c8e8" }] },
          { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5ede0" }] },
        ]}
      >
        {/* 내 위치 마커 — 파스텔 */}
        {userPos && (
          <AdvancedMarker position={userPos}>
            <div style={{ position: "relative", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* 방향 콘 */}
              {heading !== null && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transform: `rotate(${heading}deg)`,
                  transformOrigin: "center",
                }}>
                  <div style={{
                    position: "absolute",
                    bottom: "50%", left: "50%", marginLeft: -18,
                    width: 36, height: 44,
                    background: "rgba(232,164,176,0.35)",
                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                    transformOrigin: "bottom center",
                  }} />
                </div>
              )}
              {/* 정확도 링 */}
              <div style={{
                position: "absolute", inset: 0,
                borderRadius: "50%",
                background: "rgba(242,196,206,0.25)",
              }} />
              {/* 포인트 */}
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "linear-gradient(135deg, #E8A4B0, #D4C8E8)",
                border: "2.5px solid white",
                boxShadow: "0 2px 8px rgba(232,164,176,0.5)",
                zIndex: 1, flexShrink: 0,
              }} />
              {/* 닉네임 라벨 */}
              {profile && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)", left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--foam)",
                  border: "1.5px solid var(--rose)",
                  borderRadius: 8,
                  padding: "2px 8px",
                  fontSize: 11, fontWeight: 700,
                  color: "var(--espresso)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(74,55,40,0.12)",
                }}>
                  {profile.nickname}
                </div>
              )}
            </div>
          </AdvancedMarker>
        )}

        {/* 클러스터 메모 아이콘 */}
        {!showPins && (() => {
          const minCount = Math.min(...clusters.map(c => c.count));
          const maxCount = Math.max(...clusters.map(c => c.count));
          const getIntensity = (count: number) => {
            const relative = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
            const absolute = Math.min(Math.sqrt(count) / 10, 1);
            return Math.min(relative, absolute);
          };

          return clusters.map((cluster, i) => {
          const intensity = getIntensity(cluster.count);
          const isNear = zoom >= 17;

          // 파스텔: 크림 → 로즈 → 라벤더
          const baseColors = [
            [253, 246, 236], // cream
            [242, 196, 206], // rose
            [212, 200, 232], // lavender
          ];
          const ci = Math.min(Math.floor(intensity * 2), 1);
          const t = (intensity * 2) - ci;
          const cr = Math.round(baseColors[ci][0] + (baseColors[ci+1][0] - baseColors[ci][0]) * t);
          const cg = Math.round(baseColors[ci][1] + (baseColors[ci+1][1] - baseColors[ci][1]) * t);
          const cb = Math.round(baseColors[ci][2] + (baseColors[ci+1][2] - baseColors[ci][2]) * t);
          const color = `rgb(${cr},${cg},${cb})`;

          const glowSpread = Math.round(4 + intensity * 8);
          const glowAlpha = 0.15 + intensity * 0.25;
          const animDur = isNear ? "0" : (2.2 - intensity * 1.2).toFixed(1);

          // 아이콘 크기: 줌과 강도 기반
          const zoomScale = Math.pow(1.25, Math.max(0, zoom - 12));
          const size = Math.round(Math.min((32 + intensity * 14) * (isNear ? 1.3 : zoomScale), 80));

          const rot = (i % 3 === 0) ? "2deg" : i % 3 === 1 ? "-2deg" : "1deg";
          const cornerSize = Math.max(8, Math.round(size * 0.26));

          return (
            <AdvancedMarker
              key={`cluster-${i}`}
              position={{ lat: cluster.lat, lng: cluster.lng }}
              onClick={() => handleClusterClick(cluster)}
            >
              {/* 배지가 잘리지 않도록 패딩 래퍼 */}
              <div style={{ padding: "10px 10px 0 0", cursor: "pointer", position: "relative" }}>
                <div
                  className={isNear ? "near-cluster" : "glow-marker"}
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    filter: `drop-shadow(0 0 ${glowSpread}px rgba(${cr},${cg},${cb},${glowAlpha}))`,
                    ["--glow-dur" as string]: `${animDur}s`,
                    transform: `rotate(${rot})`,
                    clipPath: `polygon(0 0, calc(100% - ${cornerSize}px) 0, 100% ${cornerSize}px, 100% 100%, 0 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: Math.max(2, Math.round(size * 0.08)),
                    padding: `${Math.round(size * 0.2)}px ${Math.round(size * 0.18)}px ${Math.round(size * 0.2)}px ${Math.round(size * 0.18)}px`,
                    position: "relative",
                  }}
                >
                  {/* 접힌 모서리 */}
                  <div style={{
                    position: "absolute", top: 0, right: 0,
                    width: 0, height: 0,
                    borderStyle: "solid",
                    borderWidth: `${cornerSize}px ${cornerSize}px 0 0`,
                    borderColor: "rgba(0,0,0,0.15) transparent transparent transparent",
                  }} />
                  {/* 텍스트 줄 암시 */}
                  <div style={{ height: Math.max(2, Math.round(size * 0.06)), borderRadius: 2, background: "rgba(74,55,40,0.3)" }} />
                  <div style={{ height: Math.max(2, Math.round(size * 0.06)), borderRadius: 2, background: "rgba(74,55,40,0.3)", width: "75%" }} />
                  <div style={{ height: Math.max(2, Math.round(size * 0.06)), borderRadius: 2, background: "rgba(74,55,40,0.3)", width: "55%" }} />
                </div>
                {/* 개수 배지 */}
                {cluster.count > 1 && (
                  <div style={{
                    position: "absolute",
                    top: 0, right: 0,
                    background: "var(--espresso)",
                    color: "var(--cream)",
                    borderRadius: 99,
                    padding: "1px 6px",
                    fontSize: Math.max(9, Math.round(size * 0.22)),
                    fontWeight: 900,
                    fontFamily: "Pretendard Variable, sans-serif",
                    lineHeight: 1.4,
                    boxShadow: "0 2px 8px rgba(74,55,40,0.3)",
                    whiteSpace: "nowrap",
                  }}>
                    {cluster.count}
                  </div>
                )}
              </div>
            </AdvancedMarker>
          );
        });})()}

        {/* 개별 메모 핀 (줌 인 시) */}
        {showPins && filteredMemos.map((memo) => {
          const { opacity } = getMemoAgeStyle(memo.created_at);
          const rot = parseInt(memo.id[0], 16) % 2 === 0 ? "2deg" : "-2deg";
          const isHot = (memo.fire_count ?? 0) >= 10;
          const fireGlow = isHot
            ? ` drop-shadow(0 0 ${Math.min(4 + memo.fire_count / 5, 10)}px rgba(255,107,53,0.7))`
            : "";
          return (
            <AdvancedMarker
              key={memo.id}
              position={{ lat: memo.lat, lng: memo.lng }}
              onClick={() => setSelectedMemo(memo)}
            >
              {/* 포스트잇 핀 */}
              <div
                className="memo-card cursor-pointer relative"
                style={{
                  width: 44,
                  height: 44,
                  background: "#FAF0E6",
                  border: "1.5px solid #E8DCC8",
                  filter: fireGlow || undefined,
                  opacity,
                  transform: `rotate(${rot})`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 5,
                  padding: "10px 10px 10px 9px",
                  clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)",
                  borderRadius: 4,
                }}
              >
                {/* 접힌 모서리 */}
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  width: 0, height: 0,
                  borderStyle: "solid",
                  borderWidth: "12px 12px 0 0",
                  borderColor: "rgba(74,55,40,0.1) transparent transparent transparent",
                }} />
                {/* 텍스트 줄 암시 */}
                <div style={{ height: 2.5, borderRadius: 2, background: "rgba(74,55,40,0.25)" }} />
                <div style={{ height: 2.5, borderRadius: 2, background: "rgba(74,55,40,0.25)", width: "75%" }} />
                <div style={{ height: 2.5, borderRadius: 2, background: "rgba(74,55,40,0.25)", width: "55%" }} />
                {/* 꼬리 */}
                <div style={{ position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "7px solid #E8DCC8" }} />
                {/* 🔥 배지 */}
                {isHot && (
                  <div style={{
                    position: "absolute", top: -7, right: -7,
                    background: "#E8A4B0", borderRadius: "50%",
                    width: 18, height: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, boxShadow: "0 2px 6px rgba(232,164,176,0.6)",
                  }}>🔥</div>
                )}
              </div>
            </AdvancedMarker>
          );
        })}

      </Map>

      <MapHeader
        profile={profile}
        avatarUrl={avatarUrl}
        onMyMemos={() => setShowMyMemos(true)}
        onFriends={() => setShowFriends(true)}
        onLoginRequired={onLoginRequired}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* 하단 버튼들 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        <button
          className="btn-chunky font-black px-7 py-4 rounded-2xl text-base"
          style={{
            background: "var(--espresso)",
            color: "var(--cream)",
            border: "none",
            fontSize: 15,
            letterSpacing: "-0.3px",
          }}
          onClick={() => {
            if (!profile) { onLoginRequired(); return; }
            if (!userPos) { alert("위치 정보를 가져오는 중이에요. 잠시 후 다시 시도해주세요."); return; }
            setShowAddSheet(true);
          }}
        >
          + 메모 뿌리기
        </button>
      </div>
      <div className="absolute bottom-8 right-3 flex flex-col gap-2 items-center">
        {/* 줌 +/- 버튼 */}
        <div style={{
          background: "var(--foam)",
          borderRadius: 12,
          border: "1.5px solid var(--sand)",
          boxShadow: "0 2px 8px rgba(74,55,40,0.1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          <button
            onClick={() => map?.setZoom(Math.min((map.getZoom() ?? zoom) + 1, 21))}
            style={{
              width: 40, height: 40,
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--sand)",
              cursor: "pointer",
              fontSize: 22, fontWeight: 300,
              color: "var(--latte)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >+</button>
          <button
            onClick={() => map?.setZoom(Math.max((map.getZoom() ?? zoom) - 1, 3))}
            style={{
              width: 40, height: 40,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 22, fontWeight: 300,
              color: "var(--latte)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >−</button>
        </div>

        {/* 내 위치 버튼 */}
        <button
          onClick={() => { goToMyLocation(); enableHeading(); }}
          title="내 위치"
          style={{
            width: 40, height: 40,
            borderRadius: "50%",
            background: "var(--foam)",
            border: "1.5px solid var(--sand)",
            boxShadow: "0 2px 8px rgba(74,55,40,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={heading !== null ? "#E8A4B0" : "#8B6F5A"} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="4" fill={heading !== null ? "#E8A4B0" : "#8B6F5A"}/>
            <circle cx="12" cy="12" r="9" stroke={heading !== null ? "#E8A4B0" : "#C8B898"} strokeWidth="1.5"/>
          </svg>
        </button>
      </div>


      {showFriends && user && (
        <FriendsPanel
          userId={user.id}
          onClose={() => setShowFriends(false)}
        />
      )}

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
