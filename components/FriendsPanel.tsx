"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Friend {
  friendshipId: string;
  userId: string;
  nickname: string;
  status: "pending" | "accepted";
  direction: "sent" | "received";
}

interface Props {
  userId: string;
  onClose: () => void;
}

type Tab = "friends" | "requests" | "search";

export default function FriendsPanel({ userId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; nickname: string }[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const loadFriends = async () => {
    const { data } = await supabase
      .from("gmepu_friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (!data) return;

    const friendIds = data.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, nickname")
      .in("id", friendIds.length ? friendIds : ["none"]);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname]));

    setFriends(data.map((f) => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
      return {
        friendshipId: f.id,
        userId: friendId,
        nickname: profileMap[friendId] ?? "알 수 없음",
        status: f.status,
        direction: f.requester_id === userId ? "sent" : "received",
      };
    }));

    setSentIds(new Set(
      data.filter((f) => f.requester_id === userId).map((f) => f.addressee_id)
    ));
  };

  useEffect(() => { loadFriends(); }, []);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("user_profiles")
      .select("id, nickname")
      .ilike("nickname", `%${searchQuery.trim()}%`)
      .neq("id", userId)
      .limit(10);
    setSearchResults(data ?? []);
  };

  const sendRequest = async (targetId: string) => {
    await supabase.from("gmepu_friendships").insert({ requester_id: userId, addressee_id: targetId });
    setSentIds((prev) => new Set([...prev, targetId]));
    loadFriends();
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("gmepu_friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadFriends();
  };

  const remove = async (friendshipId: string) => {
    await supabase.from("gmepu_friendships").delete().eq("id", friendshipId);
    loadFriends();
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const received = friends.filter((f) => f.status === "pending" && f.direction === "received");
  const sent = friends.filter((f) => f.status === "pending" && f.direction === "sent");

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "friends", label: "친구", badge: accepted.length || undefined },
    { key: "requests", label: "요청", badge: received.length || undefined },
    { key: "search", label: "찾기" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl pb-10"
        style={{ background: "var(--yellow)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 rounded-full mx-auto mt-4 mb-2 opacity-30" style={{ background: "var(--dark)" }} />

        {/* 헤더 */}
        <div className="px-6 pb-3">
          <h2 className="font-display font-black text-xl" style={{ color: "var(--dark)" }}>친구 관리</h2>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 px-6 mb-4">
          {TABS.map(({ key, label, badge }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: "none",
                  background: isActive ? "var(--dark)" : "rgba(26,19,6,0.1)",
                  color: isActive ? "var(--yellow)" : "var(--dark)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {label}
                {badge ? (
                  <span style={{
                    background: isActive ? "var(--yellow)" : "var(--dark)",
                    color: isActive ? "var(--dark)" : "var(--yellow)",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "1px 6px",
                  }}>{badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-6">

          {/* 친구 목록 */}
          {tab === "friends" && (
            accepted.length === 0 ? (
              <p className="text-sm opacity-40 text-center mt-8" style={{ color: "var(--dark)" }}>
                아직 친구가 없어요.<br />찾기 탭에서 추가해봐요!
              </p>
            ) : (
              <div className="space-y-2">
                {accepted.map((f) => (
                  <FriendRow key={f.friendshipId} nickname={f.nickname}>
                    <button onClick={() => remove(f.friendshipId)} style={dangerBtnStyle}>삭제</button>
                  </FriendRow>
                ))}
              </div>
            )
          )}

          {/* 친구 요청 */}
          {tab === "requests" && (
            <div className="space-y-4">
              {received.length > 0 && (
                <>
                  <p className="text-xs font-bold opacity-50" style={{ color: "var(--dark)" }}>받은 요청</p>
                  <div className="space-y-2">
                    {received.map((f) => (
                      <FriendRow key={f.friendshipId} nickname={f.nickname}>
                        <button onClick={() => acceptRequest(f.friendshipId)} style={primaryBtnStyle}>수락</button>
                        <button onClick={() => remove(f.friendshipId)} style={dangerBtnStyle}>거절</button>
                      </FriendRow>
                    ))}
                  </div>
                </>
              )}
              {sent.length > 0 && (
                <>
                  <p className="text-xs font-bold opacity-50 mt-4" style={{ color: "var(--dark)" }}>보낸 요청</p>
                  <div className="space-y-2">
                    {sent.map((f) => (
                      <FriendRow key={f.friendshipId} nickname={f.nickname}>
                        <button onClick={() => remove(f.friendshipId)} style={dangerBtnStyle}>취소</button>
                      </FriendRow>
                    ))}
                  </div>
                </>
              )}
              {received.length === 0 && sent.length === 0 && (
                <p className="text-sm opacity-40 text-center mt-8" style={{ color: "var(--dark)" }}>친구 요청이 없어요.</p>
              )}
            </div>
          )}

          {/* 검색 */}
          {tab === "search" && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium outline-none"
                  style={{ background: "rgba(26,19,6,0.1)", color: "var(--dark)" }}
                  placeholder="닉네임으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <button
                  className="btn-chunky px-4 py-3 rounded-2xl font-display font-black text-sm"
                  style={{ background: "var(--dark)", color: "var(--yellow)" }}
                  onClick={searchUsers}
                >
                  검색
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map((u) => {
                  const alreadyFriend = friends.some((f) => f.userId === u.id && f.status === "accepted");
                  const alreadySent = sentIds.has(u.id);
                  return (
                    <FriendRow key={u.id} nickname={u.nickname}>
                      {alreadyFriend ? (
                        <span style={{ fontSize: 12, opacity: 0.5, color: "var(--dark)" }}>친구</span>
                      ) : alreadySent ? (
                        <span style={{ fontSize: 12, opacity: 0.5, color: "var(--dark)" }}>요청됨</span>
                      ) : (
                        <button onClick={() => sendRequest(u.id)} style={primaryBtnStyle}>추가</button>
                      )}
                    </FriendRow>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendRow({ nickname, children }: { nickname: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-2xl"
      style={{ background: "rgba(26,19,6,0.07)" }}
    >
      <div className="flex items-center gap-3">
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--dark)", color: "var(--yellow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 14, fontFamily: "Nunito",
        }}>
          {nickname[0]}
        </div>
        <span className="font-bold text-sm" style={{ color: "var(--dark)" }}>{nickname}</span>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 999, border: "none",
  background: "var(--dark)", color: "var(--yellow)",
  fontWeight: 700, fontSize: 12, cursor: "pointer",
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 999, border: "none",
  background: "rgba(26,19,6,0.12)", color: "var(--dark)",
  fontWeight: 700, fontSize: 12, cursor: "pointer",
};
