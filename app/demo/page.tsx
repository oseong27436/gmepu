"use client";

import { useState } from "react";

const PASTEL = {
  cream: "#FDF6EC",
  rose: "#F2C4CE",
  roseDark: "#E8A4B0",
  sage: "#B8D4C8",
  sageDark: "#8FBFAE",
  lavender: "#D4C8E8",
  sand: "#E8DCC8",
  sandDark: "#C8B898",
  espresso: "#4A3728",
  latte: "#8B6F5A",
  foam: "#FAF0E6",
  mochaccino: "#6B4C3B",
};

const MEMOS = [
  { id: "1", text: "오늘 커피가 유독 맛있었던 날", nickname: "민지", time: "방금", lat: 37.521, lng: 127.021, tag: "일상" },
  { id: "2", text: "여기 골목 진짜 예쁘다 꼭 다시 와야지", nickname: "익명", time: "3분 전", lat: 37.522, lng: 127.022, tag: "장소" },
  { id: "3", text: "비 오는 날 이 카페 창가 자리 최고임", nickname: "수아", time: "11분 전", lat: 37.520, lng: 127.020, tag: "카페" },
  { id: "4", text: "혼자 걷기 좋은 산책로 발견 🌿", nickname: "익명", time: "1시간 전", lat: 37.523, lng: 127.023, tag: "산책" },
  { id: "5", text: "이 동네 고양이 세 마리 삼남매야", nickname: "태양", time: "2시간 전", lat: 37.519, lng: 127.019, tag: "일상" },
];

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  일상: { bg: PASTEL.rose, text: PASTEL.espresso },
  장소: { bg: PASTEL.sage, text: PASTEL.espresso },
  카페: { bg: PASTEL.sand, text: PASTEL.espresso },
  산책: { bg: PASTEL.lavender, text: PASTEL.espresso },
};

const PIN_POSITIONS = [
  { top: "28%", left: "38%" },
  { top: "42%", left: "58%" },
  { top: "55%", left: "30%" },
  { top: "35%", left: "68%" },
  { top: "65%", left: "52%" },
];

export default function DemoPage() {
  const [selected, setSelected] = useState<typeof MEMOS[0] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"전체" | "카페" | "산책" | "일상">("전체");

  const tabs = ["전체", "카페", "산책", "일상"] as const;

  return (
    <div style={{
      minHeight: "100dvh",
      background: PASTEL.cream,
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* 헤더 */}
      <div style={{
        padding: "52px 20px 16px",
        background: PASTEL.cream,
        borderBottom: `1px solid ${PASTEL.sand}`,
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* 로고 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${PASTEL.rose}, ${PASTEL.lavender})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>📍</div>
            <span style={{
              fontSize: 20, fontWeight: 800,
              color: PASTEL.espresso,
              letterSpacing: "-0.5px",
            }}>지메뿌</span>
          </div>

          {/* 우측 아이콘 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              width: 36, height: 36, borderRadius: 12,
              background: PASTEL.foam,
              border: `1.5px solid ${PASTEL.sand}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16,
            }}>🔔</button>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: `linear-gradient(135deg, ${PASTEL.roseDark}, ${PASTEL.latte})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "white",
            }}>민</div>
          </div>
        </div>

        {/* 탭 필터 */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 16px",
                borderRadius: 99,
                border: activeTab === tab ? "none" : `1.5px solid ${PASTEL.sand}`,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: activeTab === tab ? PASTEL.espresso : PASTEL.foam,
                color: activeTab === tab ? PASTEL.cream : PASTEL.latte,
                transition: "all 0.2s",
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* 지도 영역 */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        minHeight: 420,
      }}>
        {/* 지도 배경 — 파스텔 격자 */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            linear-gradient(${PASTEL.sand}55 1px, transparent 1px),
            linear-gradient(90deg, ${PASTEL.sand}55 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          backgroundColor: "#F5EDE0",
        }} />

        {/* 도로 느낌 */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 28,
          background: "rgba(255,255,255,0.6)",
          transform: "translateY(-50%)",
          borderTop: `1px solid ${PASTEL.sandDark}44`,
          borderBottom: `1px solid ${PASTEL.sandDark}44`,
        }} />
        <div style={{
          position: "absolute", left: "40%", top: 0, bottom: 0,
          width: 24,
          background: "rgba(255,255,255,0.6)",
          borderLeft: `1px solid ${PASTEL.sandDark}44`,
          borderRight: `1px solid ${PASTEL.sandDark}44`,
        }} />

        {/* 메모 핀들 */}
        {MEMOS.map((memo, i) => (
          <button
            key={memo.id}
            onClick={() => setSelected(memo)}
            style={{
              position: "absolute",
              top: PIN_POSITIONS[i].top,
              left: PIN_POSITIONS[i].left,
              transform: "translate(-50%, -100%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              zIndex: selected?.id === memo.id ? 20 : 10,
            }}
          >
            {/* 포스트잇 핀 */}
            <div style={{
              background: selected?.id === memo.id
                ? PASTEL.espresso
                : PASTEL.foam,
              border: `2px solid ${selected?.id === memo.id ? PASTEL.espresso : PASTEL.sandDark}`,
              borderRadius: "12px 12px 12px 2px",
              padding: "8px 12px",
              maxWidth: 120,
              boxShadow: selected?.id === memo.id
                ? `0 8px 24px ${PASTEL.espresso}40`
                : `0 4px 12px ${PASTEL.sandDark}60`,
              transform: selected?.id === memo.id ? "scale(1.08)" : "scale(1)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: selected?.id === memo.id ? PASTEL.cream : PASTEL.latte,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {memo.text.slice(0, 12)}…
              </div>
              <div style={{
                fontSize: 9, marginTop: 2,
                color: selected?.id === memo.id ? `${PASTEL.cream}99` : PASTEL.sandDark,
                fontWeight: 600,
              }}>
                {memo.nickname} · {memo.time}
              </div>
            </div>
            {/* 핀 꼬리 */}
            <div style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `6px solid ${selected?.id === memo.id ? PASTEL.espresso : PASTEL.sandDark}`,
              margin: "0 auto",
            }} />
          </button>
        ))}

        {/* 내 위치 */}
        <div style={{
          position: "absolute", top: "50%", left: "48%",
          transform: "translate(-50%, -50%)",
          zIndex: 15,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: `linear-gradient(135deg, ${PASTEL.roseDark}, ${PASTEL.lavender})`,
            border: "3px solid white",
            boxShadow: `0 2px 8px ${PASTEL.roseDark}80`,
          }} />
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            borderRadius: 8,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 700,
            color: PASTEL.espresso,
            whiteSpace: "nowrap",
            boxShadow: `0 2px 8px ${PASTEL.sandDark}50`,
            border: `1px solid ${PASTEL.sand}`,
          }}>나</div>
        </div>
      </div>

      {/* 선택된 메모 바텀시트 */}
      {selected && (
        <>
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              background: "rgba(74,55,40,0.15)",
              backdropFilter: "blur(2px)",
            }}
            onClick={() => setSelected(null)}
          />
          <div style={{
            position: "fixed", bottom: 0, left: "50%",
            transform: "translateX(-50%)",
            width: "100%", maxWidth: 430,
            zIndex: 40,
            background: PASTEL.foam,
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px 36px",
            boxShadow: `0 -8px 40px ${PASTEL.espresso}20`,
          }}>
            {/* 핸들 */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: PASTEL.sand,
              margin: "0 auto 20px",
            }} />

            {/* 태그 + 닫기 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{
                background: TAG_COLORS[selected.tag]?.bg ?? PASTEL.sand,
                color: PASTEL.espresso,
                fontSize: 11, fontWeight: 700,
                padding: "4px 12px", borderRadius: 99,
              }}>{selected.tag}</span>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: PASTEL.sand, border: "none",
                  borderRadius: 8, padding: "4px 10px",
                  color: PASTEL.latte, fontSize: 12,
                  fontWeight: 600, cursor: "pointer",
                }}
              >닫기</button>
            </div>

            {/* 본문 */}
            <p style={{
              fontSize: 18, fontWeight: 700,
              color: PASTEL.espresso,
              lineHeight: 1.5,
              margin: "0 0 16px",
            }}>{selected.text}</p>

            {/* 메타 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `linear-gradient(135deg, ${PASTEL.rose}, ${PASTEL.lavender})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: PASTEL.espresso,
              }}>{selected.nickname[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: PASTEL.espresso }}>{selected.nickname}</div>
                <div style={{ fontSize: 11, color: PASTEL.latte }}>{selected.time}</div>
              </div>
            </div>

            {/* 리액션 */}
            <div style={{ display: "flex", gap: 8 }}>
              {["🔥", "💛", "🍀", "✨"].map((emoji) => (
                <button key={emoji} style={{
                  background: PASTEL.foam,
                  border: `1.5px solid ${PASTEL.sand}`,
                  borderRadius: 12, padding: "8px 14px",
                  fontSize: 16, cursor: "pointer",
                  flex: 1,
                }}>{emoji}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 메모 추가 바텀시트 */}
      {showAdd && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(74,55,40,0.15)", backdropFilter: "blur(2px)" }}
            onClick={() => setShowAdd(false)}
          />
          <div style={{
            position: "fixed", bottom: 0, left: "50%",
            transform: "translateX(-50%)",
            width: "100%", maxWidth: 430,
            zIndex: 40,
            background: PASTEL.foam,
            borderRadius: "24px 24px 0 0",
            padding: "20px 20px 36px",
            boxShadow: `0 -8px 40px ${PASTEL.espresso}20`,
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: PASTEL.sand, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: PASTEL.espresso, marginBottom: 12 }}>지금 이 순간을 뿌려요 ✨</p>
            <textarea
              placeholder="여기서 무슨 일이 있었나요?"
              style={{
                width: "100%",
                background: PASTEL.cream,
                border: `1.5px solid ${PASTEL.sand}`,
                borderRadius: 16,
                padding: "14px 16px",
                fontSize: 15,
                color: PASTEL.espresso,
                resize: "none",
                minHeight: 100,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setShowAdd(false)}
              style={{
                marginTop: 12,
                width: "100%",
                background: PASTEL.espresso,
                color: PASTEL.cream,
                border: "none",
                borderRadius: 16,
                padding: "16px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >뿌리기 🗺️</button>
          </div>
        </>
      )}

      {/* 하단 바 */}
      <div style={{
        padding: "12px 20px 28px",
        background: PASTEL.foam,
        borderTop: `1px solid ${PASTEL.sand}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        position: "relative",
        zIndex: 10,
      }}>
        {/* 내 메모 버튼 */}
        <button style={{
          flex: 1,
          padding: "12px",
          borderRadius: 16,
          background: PASTEL.cream,
          border: `1.5px solid ${PASTEL.sand}`,
          fontSize: 13, fontWeight: 700,
          color: PASTEL.latte,
          cursor: "pointer",
        }}>내 메모</button>

        {/* 메모 뿌리기 CTA */}
        <button
          onClick={() => setShowAdd(true)}
          style={{
            flex: 2,
            padding: "14px",
            borderRadius: 18,
            background: `linear-gradient(135deg, ${PASTEL.espresso}, ${PASTEL.mochaccino})`,
            border: "none",
            fontSize: 15, fontWeight: 800,
            color: PASTEL.cream,
            cursor: "pointer",
            boxShadow: `0 4px 16px ${PASTEL.espresso}40`,
            letterSpacing: "-0.3px",
          }}
        >+ 메모 뿌리기</button>

        {/* 친구 버튼 */}
        <button style={{
          flex: 1,
          padding: "12px",
          borderRadius: 16,
          background: PASTEL.cream,
          border: `1.5px solid ${PASTEL.sand}`,
          fontSize: 13, fontWeight: 700,
          color: PASTEL.latte,
          cursor: "pointer",
        }}>친구</button>
      </div>
    </div>
  );
}
