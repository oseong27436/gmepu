"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, type GmepuChatRoom } from "@/lib/supabase";

interface Message {
  id: string;
  nickname: string;
  text: string;
  created_at: string;
  user_id: string;
}

interface Props {
  room: GmepuChatRoom;
  userId: string | null;
  userNickname: string | null;
  onClose: () => void;
  onLoginRequired: () => void;
}

export default function ChatRoomPanel({ room, userId, userNickname, onClose, onLoginRequired }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 메시지 로드
    supabase
      .from("gmepu_chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    // 실시간 구독
    const channel = supabase
      .channel(`chat_${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gmepu_chat_messages", filter: `room_id=eq.${room.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!userId || !userNickname) { onLoginRequired(); return; }
    if (!text.trim()) return;
    await supabase.from("gmepu_chat_messages").insert({
      room_id: room.id,
      user_id: userId,
      nickname: userNickname,
      text: text.trim(),
    });
    setText("");
  };

  const expiresIn = Math.max(0, Math.round((new Date(room.expires_at).getTime() - Date.now()) / 3600000));

  return (
    <>
      {/* 배경 오버레이 (모바일) */}
      <div className="fixed inset-0 z-30 md:hidden" style={{ background: "rgba(0,0,0,0.3)" }} onClick={onClose} />

      <div className="chat-panel flex flex-col" style={{ zIndex: 40 }}>
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--dark)", borderRadius: "16px 16px 0 0" }}>

          {/* 모바일 핸들 */}
          <div className="md:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1 opacity-20" style={{ background: "white" }} />

          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="var(--yellow)">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                <span className="font-display font-black text-sm" style={{ color: "var(--yellow)" }}>{room.name}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                {expiresIn}시간 후 사라져요
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  아직 대화가 없어요.<br />첫 마디를 건네봐요!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.user_id === userId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                    {!isMine && (
                      <span className="text-xs mb-1 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>{msg.nickname}</span>
                    )}
                    <div style={{
                      background: isMine ? "var(--yellow)" : "rgba(255,255,255,0.1)",
                      color: isMine ? "var(--dark)" : "white",
                      borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "8px 12px",
                      maxWidth: "75%",
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="flex gap-2 px-4 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <input
              className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium outline-none"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
              placeholder={userId ? "메시지 입력..." : "로그인 후 참여할 수 있어요"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              onFocus={() => { if (!userId) onLoginRequired(); }}
              readOnly={!userId}
            />
            <button
              className="btn-chunky px-4 py-3 rounded-2xl font-display font-black text-sm"
              style={{ background: "var(--yellow)", color: "var(--dark)" }}
              onClick={send}
            >↑</button>
          </div>
        </div>
      </div>
    </>
  );
}
