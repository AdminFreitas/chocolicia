import { useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

type BorderGlowProps = {
  children: ReactNode;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number | string;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  className?: string;
};

export default function BorderGlow({
  children,
  edgeSensitivity = 30,
  glowColor = "40 80 80",
  backgroundColor = "#120F17",
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1,
  coneSpread = 25,
  animated = true,
  colors = ["#c084fc", "#f472b6", "#38bdf8"],
  className = "",
}: BorderGlowProps) {
  const [pointer, setPointer] = useState({ x: 50, y: 50, active: false });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      if (pointer.active) setPointer((current) => ({ ...current, active: false }));
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const distanceToEdge = Math.min(x, y, 100 - x, 100 - y);
    setPointer({ x, y, active: distanceToEdge <= edgeSensitivity });
  };

  const style = {
    "--border-glow-x": `${pointer.x}%`,
    "--border-glow-y": `${pointer.y}%`,
    "--border-glow-alpha": pointer.active ? Math.max(0, Math.min(glowIntensity, 1)) : 0,
    "--border-glow-radius": `${glowRadius}px`,
    "--border-glow-color": glowColor,
    "--border-glow-background": backgroundColor,
    "--border-glow-colors": colors.join(", "),
    "--border-glow-spread": `${coneSpread}%`,
    "--border-glow-animation": animated ? "border-glow-shift 4s linear infinite" : "none",
    borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
  } as CSSProperties;

  return (
    <div className={`border-glow ${className}`} style={style} onPointerMove={handlePointerMove} onPointerLeave={() => setPointer((current) => ({ ...current, active: false }))}>
      <div className="border-glow-content">{children}</div>
    </div>
  );
}
