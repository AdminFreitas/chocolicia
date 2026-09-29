import { ReactNode, useEffect, useRef, useState } from "react";

type DockItem = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

type DockProps = {
  items: DockItem[];
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
};

export default function Dock({ items, panelHeight = 68, baseItemSize = 50, magnification = 70 }: DockProps) {
  const [active, setActive] = useState<number | null>(null);
  const [clicked, setClicked] = useState<number | null>(null);
  const clickTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
  }, []);

  const handleClick = (index: number, onClick: () => void) => {
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
    setClicked(index);
    clickTimer.current = window.setTimeout(() => setClicked(null), 420);
    onClick();
  };

  return (
    <nav className="dock" style={{ height: panelHeight }} aria-label="Navegação rápida">
      <div className="dock-panel">
        {items.map((item, index) => {
          const isActive = active === index;
          const size = isActive ? magnification : baseItemSize;
          return (
            <button
              key={item.label}
              type="button"
              className={`dock-item${clicked === index ? " is-clicked" : ""}`}
              style={{ width: size, height: size }}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => handleClick(index, item.onClick)}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
              <span className="dock-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
