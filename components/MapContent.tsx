"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { timeAgo, getMemoAgeStyle, reverseGeocode } from "@/lib/utils";
import { MAP_ID, KOREA_CENTER, MAP_RESTRICTION } from "@/lib/mapConstants";
import MapHeader from "@/components/MapHeader";
import MyMemoPanel from "@/components/MyMemoPanel";

// zoom >= 이 값이면 개별 핀 표시, 미만이면 클러스터 글로우 표시
const SHOW_PINS_ZOOM = 17;

interface Cluster {
  lat: number;
  lng: number;
  count: number;
  fireCount: number;
  memos: GmepuMemo[];
  label?: string;
}

function getAdminKey(memo: GmepuMemo, zoom: number): string {
  // 행정구역 데이터 있으면 그걸로, 없으면 격자 폴백
  if (zoom < 10) {
    return memo.sido ?? `grid:${Math.floor(memo.lat / 1.5)},${Math.floor(memo.lng / 1.5)}`;
  }
  if (zoom < 14) {
    return memo.sigungu
      ? `${memo.sido}/${memo.sigungu}`
      : `grid:${Math.floor(memo.lat / 0.12)},${Math.floor(memo.lng / 0.12)}`;
  }
  // zoom 14~16: 동 단위
  return memo.dong
    ? `${memo.sigungu}/${memo.dong}`
    : `grid:${Math.floor(memo.lat / 0.03)},${Math.floor(memo.lng / 0.03)}`;
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
      fireCount: group.reduce((s: number, m: GmepuMemo) => s + (m.fire_count ?? 0), 0),
      memos: group,
      label,
    };
  });
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
    if (!map || !profile || !user) return;
    const center = map.getCenter();
    if (!center) return;

    const lat = center.lat();
    const lng = center.lng();
    const { sido, sigungu, dong } = await reverseGeocode(lat, lng);

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color: "#FFF9B0", lat, lng, nickname: isAnonymous ? "익명" : profile.nickname, user_id: user.id, sido, sigungu, dong })
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
        {/* 내 위치 마커 — 파란 점 */}
        {userPos && (
          <AdvancedMarker position={userPos}>
            <div style={{ position: "relative", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* 방향 콘 */}
              {heading !== null && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `rotate(${heading}deg)`,
                  transformOrigin: "center",
                }}>
                  <div style={{
                    position: "absolute",
                    bottom: "50%",
                    left: "50%",
                    marginLeft: -18,
                    width: 36,
                    height: 44,
                    background: "rgba(66,133,244,0.22)",
                    clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                    transformOrigin: "bottom center",
                  }} />
                </div>
              )}
              {/* 정확도 링 */}
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(66,133,244,0.15)",
              }} />
              {/* 파란 점 */}
              <div style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#4285F4",
                border: "2.5px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                zIndex: 1,
                flexShrink: 0,
              }} />
              {/* 닉네임 라벨 (로그인 시) */}
              {profile && (
                <div style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "white",
                  border: "1.5px solid #4285F4",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--dark)",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}>
                  {profile.nickname}
                </div>
              )}
            </div>
          </AdvancedMarker>
        )}

        {/* 클러스터 글로우 (줌 아웃 시) */}
        {!showPins && clusters.map((cluster, i) => {
          // log 스케일로 밀도 강도 계산 (1개=0, 10개≈1)
          // 🔥가 많을수록 heatScore 가중치 증가 (🔥 1개 = 메모 3개 가치)
          const heatScore = cluster.count + cluster.fireCount * 3;
          const intensity = Math.min(Math.log10(heatScore + 1) / 3, 1);
          // 🔥 비율: 클러스터 내 메모당 평균 🔥 수 기반
          const fireRatio = Math.min(cluster.fireCount / Math.max(cluster.count * 3, 1), 1);
          const size = Math.round(22 + intensity * 32); // 22px ~ 54px

          // 🔥 많으면 주황→붉은주황으로, 기본은 노란→주황
          const r = 255;
          const g = Math.round(220 - intensity * 80 - fireRatio * 60); // 🔥 많으면 더 붉게
          const b = Math.round(30 - intensity * 30);
          const color = `rgb(${r},${Math.max(g, 80)},${b})`;
          const glowSpread = Math.round(4 + intensity * 8 + fireRatio * 6);
          const glowAlpha = 0.2 + intensity * 0.2 + fireRatio * 0.15;
          const animDur = (2.2 - intensity * 1.2).toFixed(1); // 2.2s → 1.0s

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
              <div
                className="memo-card px-2.5 py-2 text-xs font-medium leading-snug cursor-pointer relative"
                style={{
                  background: bgColor,
                  borderRadius,
                  filter: filter + fireGlow,
                  opacity,
                  maxWidth: "110px",
                  transform: `rotate(${rot})`,
                }}
              >
                <p className="line-clamp-2">{memo.text}</p>
                <div style={{ position: "absolute", bottom: "-7px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `7px solid ${bgColor}` }} />
                {isHot && (
                  <div style={{
                    position: "absolute",
                    top: -8, right: -8,
                    background: "#FF6B35",
                    borderRadius: "50%",
                    width: 20, height: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10,
                    boxShadow: "0 0 6px rgba(255,107,53,0.7)",
                  }}>
                    🔥
                  </div>
                )}
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
      <div className="absolute bottom-8 right-4 flex flex-col gap-2">
        <button
          className="btn-chunky w-14 h-14 rounded-2xl text-xl flex items-center justify-center"
          style={{
            background: heading !== null ? "#4285F4" : "white",
            color: heading !== null ? "white" : "var(--dark)",
          }}
          onClick={enableHeading}
          title="방향 감지"
        >
          🧭
        </button>
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
