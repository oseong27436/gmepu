"use client";

import { useState } from "react";

interface Props {
  roomName: string;
  onClose: () => void;
}

export default function ChatRoomPanel({ roomName, onClose }: Props) {
  const [message, setMessage] = useState("");

  return (
    <>
      {/* 데스크탑: 좌측 패널 / 모바일: 하단 시트 */}
      <div className="chat-panel flex flex-col">
        {/* 모바일 핸들 */}
        <div className="md:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-2 opacity-30 bg-white" />

        <div
          className="flex-1 flex flex-col rounded-t-3xl md:rounded-none md:rounded-r-2xl overflow-hidden"
          style={{ background: "var(--dark)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--yellow)">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                <span className="font-display font-black text-base" style={{ color: "var(--yellow)" }}>
                  {roomName}
                </span>
              </div>
              <p className="text-xs opacity-40 mt-0.5" style={{ color: "white" }}>0명 참여 중</p>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 20 }}
            >
              ✕
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-center items-center">
            <p className="text-sm opacity-30 text-center" style={{ color: "white" }}>
              아직 대화가 없어요.<br />첫 번째로 말 걸어봐요!
            </p>
          </div>

          {/* 입력창 */}
          <div className="flex gap-2 px-4 pb-6 pt-3 border-t border-white/10">
            <input
              className="flex-1 px-4 py-3 rounded-2xl text-sm font-medium outline-none"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
              placeholder="메시지 입력..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              className="btn-chunky px-4 py-3 rounded-2xl font-display font-black text-sm"
              style={{ background: "var(--yellow)", color: "var(--dark)" }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* 배경 오버레이 (모바일) */}
      <div
        className="fixed inset-0 z-30 md:hidden"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />
    </>
  );
}
