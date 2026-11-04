import { useEffect, useState } from "react";

export const PROMOTION_DEADLINE = new Date("2026-12-22T23:59:59-03:00").getTime();

export type PromotionCountdown = {
  days: string;
  hours: string;
  minutes: string;
  ended: boolean;
};

const initialCountdown: PromotionCountdown = {
  days: "--",
  hours: "--",
  minutes: "--",
  ended: false,
};

export function usePromotionCountdown() {
  const [remaining, setRemaining] = useState<PromotionCountdown>(initialCountdown);

  useEffect(() => {
    const update = () => {
      const distance = PROMOTION_DEADLINE - Date.now();
      if (distance <= 0) {
        setRemaining({ days: "00", hours: "00", minutes: "00", ended: true });
        return;
      }
      setRemaining({
        days: String(Math.floor(distance / 86_400_000)).padStart(2, "0"),
        hours: String(Math.floor((distance / 3_600_000) % 24)).padStart(2, "0"),
        minutes: String(Math.floor((distance / 60_000) % 60)).padStart(2, "0"),
        ended: false,
      });
    };

    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return remaining;
}
