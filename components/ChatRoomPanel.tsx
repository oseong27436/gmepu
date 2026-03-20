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
  isOpen: boolean;
  onClose: () => void;
  onLoginRequired: () => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
}

export default function ChatRoomPanel({ room, userId, userNickname, isOpen, onClose, onLoginRequired }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);

    supabase
      .from("gmepu_chat_messages")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase
      .channel(`chat_${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gmepu_chat_messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // 이미 있으면 무시
            if (prev.some(m => m.id === newMsg.id)) return prev;
            // 낙관적 메시지 교체 (같은 유저 + 같은 텍스트)
            const optIdx = prev.findIndex(m =>
              m.id.startsWith("opt-") && m.user_id === newMsg.user_id && m.text === newMsg.text
            );
            if (optIdx !== -1) {
              const next = [...prev];
              next[optIdx] = newMsg;
              return next;
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const send = async () => {
    if (!userId || !userNickname) { onLoginRequired(); return; }
    if (!text.trim()) return;

    const trimmed = text.trim();
    const optId = `opt-${Date.now()}`;
    const optimistic: Message = {
      id: optId,
      nickname: userNickname,
      text: trimmed,
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    setMessages(prev => [...prev, optimistic]);
    setText("");

    const { error } = await supabase.from("gmepu_chat_messages").insert({
      room_id: room.id,
      user_id: userId,
      nickname: userNickname,
      text: trimmed,
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optId));
    }
  };

  const expiresIn = Math.max(0, Math.round((new Date(room.expires_at).getTime() - Date.now()) / 3600000));

  return (
    <div
      className="chat-panel flex flex-col"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
    >
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--dark)" }}>

        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingTop: "env(safe-area-inset-top, 52px)", minHeight: 80 }}
        >
          <div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--yellow)">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
              <span className="font-display font-black text-sm" style={{ color: "var(--yellow)" }}>{room.name}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {expiresIn}시간 후 사라져요
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 18, padding: 4 }}
          >✕</button>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ paddingTop: 60 }}>
              <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                아직 대화가 없어요.<br />첫 마디를 건네봐요!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.user_id === userId;
              const prev = idx > 0 ? messages[idx - 1] : null;
              const next = idx < messages.length - 1 ? messages[idx + 1] : null;

              const showNickname = !isMine && prev?.user_id !== msg.user_id;
              const isOptimistic = msg.id.startsWith("opt-");

              // 같은 분·같은 유저 연속이면 마지막에만 시간 표시
              const sameMinNext = next
                && next.created_at.slice(0, 16) === msg.created_at.slice(0, 16)
                && next.user_id === msg.user_id;
              const showTime = !sameMinNext;

              const topGap = showNickname ? 10 : prev?.user_id !== msg.user_id ? 6 : 2;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                  style={{ marginTop: topGap }}
                >
                  {showNickname && (
                    <span className="text-xs mb-1 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {msg.nickname}
                    </span>
                  )}
                  <div className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <div style={{
                      background: isMine ? "var(--yellow)" : "rgba(255,255,255,0.12)",
                      color: isMine ? "var(--dark)" : "white",
                      borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      padding: "8px 12px",
                      maxWidth: "72%",
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.45,
                      opacity: isOptimistic ? 0.65 : 1,
                      transition: "opacity 0.2s",
                      wordBreak: "break-word",
                    }}>
                      {msg.text}
                    </div>
                    {showTime && (
                      <span style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.3)",
                        whiteSpace: "nowrap",
                        marginBottom: 2,
                      }}>
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div
          className="flex gap-2 px-4 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
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
            style={{ background: "var(--yellow)", color: "var(--dark)", flexShrink: 0 }}
            onClick={send}
          >↑</button>
        </div>
      </div>
    </div>
  );
}
