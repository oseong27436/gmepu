"use client";

import { useState, useCallback, useEffect } from "react";
import { Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { supabase, type GmepuMemo, type UserProfile } from "@/lib/supabase";
import { AddMemoSheet, MemoDetailSheet } from "@/components/MemoSheet";
import { timeAgo } from "@/lib/utils";
import { MAP_ID, KOREA_CENTER, MAP_RESTRICTION } from "@/lib/mapConstants";
import MapHeader from "@/components/MapHeader";
import MyMemoPanel from "@/components/MyMemoPanel";

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

  const handleAddMemo = useCallback(async (text: string, color: string, isAnonymous: boolean) => {
    if (!map || !profile || !user) return;
    const center = map.getCenter();
    if (!center) return;

    const { data } = await supabase
      .from("gmepu_memos")
      .insert({ text, color, lat: center.lat(), lng: center.lng(), nickname: isAnonymous ? "익명" : profile.nickname, user_id: user.id, likes: 0 })
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
