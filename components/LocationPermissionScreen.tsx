"use client";

interface Props {
  onAllow: () => void;
  onSkip: () => void;
}

export default function LocationPermissionScreen({ onAllow, onSkip }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "var(--yellow)" }}>
      <div className="text-center max-w-xs">
        <div className="text-7xl mb-6">📍</div>
        <h2 className="font-display font-black text-3xl mb-3" style={{ color: "var(--dark)" }}>
          내 위치를 알려줘요
        </h2>
        <p className="mb-8 leading-relaxed opacity-70" style={{ color: "var(--dark)", fontSize: "15px" }}>
          주변 메모를 발견하고<br />지금 있는 곳에 메모를 남기려면<br />위치 권한이 필요해요.
        </p>
        <button
          className="btn-chunky w-full font-display font-black py-4 rounded-2xl text-lg mb-3"
          style={{ background: "var(--dark)", color: "var(--yellow)" }}
          onClick={onAllow}
        >
          내 위치 허용하기 🗺️
        </button>
        <button
          className="w-full font-display font-bold py-3 opacity-50"
          style={{ color: "var(--dark)" }}
          onClick={onSkip}
        >
          나중에
        </button>
      </div>
    </div>
  );
}
