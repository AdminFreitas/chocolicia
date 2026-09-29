import { CSSProperties, PointerEvent, ReactNode, useRef, useState } from "react";

type FlipCardProps = {
  front: ReactNode;
  back: ReactNode;
  axis?: "x" | "y";
  flipOnClick?: boolean;
  draggable?: boolean;
  dragDistance?: number;
  tilt?: boolean;
  tiltMax?: number;
  glare?: boolean;
  glareOpacity?: number;
  hoverScale?: number;
  perspective?: number;
  stiffness?: number;
  damping?: number;
  width?: number | string;
  height?: number | string;
  radius?: number;
  background?: string;
  color?: string;
  shadow?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  onFlipChange?: (flipped: boolean) => void;
};

export default function FlipCard({
  front,
  back,
  axis = "y",
  flipOnClick = true,
  draggable = true,
  dragDistance = 0,
  tilt = true,
  tiltMax = 12,
  glare = true,
  glareOpacity = 0.22,
  hoverScale = 1.03,
  perspective = 1100,
  width = "100%",
  height = 460,
  radius = 22,
  background = "#fff9f0",
  color = "#5a3428",
  shadow = true,
  shadowColor = "#3a241d",
  shadowOpacity = 0.18,
  onFlipChange,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const setFlippedState = (next: boolean) => {
    setFlipped(next);
    onFlipChange?.(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    draggingRef.current = true;
    start.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setRotation({ x: -py * tiltMax, y: px * tiltMax });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return;
    const distance = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
    if (distance >= dragDistance && distance > 8) setFlippedState(!flipped);
    draggingRef.current = false;
    setRotation({ x: 0, y: 0 });
  };

  const transform = axis === "y" ? `rotateY(${flipped ? 180 : 0}deg)` : `rotateX(${flipped ? 180 : 0}deg)`;
  const tiltTransform = tilt ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` : "";
  const cardStyle: CSSProperties = {
    width,
    height,
    perspective,
    color,
    cursor: draggable || flipOnClick ? "pointer" : "default",
  };
  const innerStyle: CSSProperties = {
    transform: `${transform} ${tiltTransform}`,
    transition: draggingRef.current ? "none" : "transform 520ms cubic-bezier(.23,1,.32,1)",
    transformStyle: "preserve-3d",
    borderRadius: radius,
    boxShadow: shadow ? `0 18px 42px ${shadowColor}${Math.round(shadowOpacity * 255).toString(16).padStart(2, "0")}` : undefined,
    scale: hovered ? hoverScale : 1,
  };

  return (
    <div
      className="flip-card"
      style={cardStyle}
      onClick={() => flipOnClick && !draggingRef.current && setFlippedState(!flipped)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setRotation({ x: 0, y: 0 }); }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role={flipOnClick ? "button" : undefined}
      tabIndex={flipOnClick ? 0 : undefined}
      onKeyDown={(event) => { if (flipOnClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setFlippedState(!flipped); } }}
      aria-label={flipped ? "Voltar ao produto" : "Ver detalhes do produto"}
    >
      <div className="flip-card-inner" style={innerStyle}>
        <div className="flip-card-face flip-card-front" style={{ background }} aria-hidden={flipped}>{front}</div>
        <div className="flip-card-face flip-card-back" style={{ background, color, transform: axis === "y" ? "rotateY(180deg)" : "rotateX(180deg)" }} aria-hidden={!flipped}>{back}</div>
        {glare && <span className="flip-card-glare" style={{ opacity: hovered ? glareOpacity : 0 }} aria-hidden="true" />}
      </div>
    </div>
  );
}
