"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  tradeDateYmd: string;
  children: React.ReactNode;
};

export function TradeKillSwitchGate({ tradeDateYmd, children }: Props) {
  const [blocked, setBlocked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDateYmd)) {
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/trades/kill-switch?date=${encodeURIComponent(tradeDateYmd)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return;
    setBlocked(!!data.blocked);
    setSecondsLeft(typeof data.secondsRemaining === "number" ? data.secondsRemaining : 0);
  }, [tradeDateYmd]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!blocked || secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          refresh();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [blocked, secondsLeft, refresh]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  return (
    <>
      {children}
      {!loading && blocked && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center">
          <div className="max-w-lg space-y-6">
            <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
              Время сделать паузу. Твоя статистика говорит, что сейчас риск ошибки максимален.
            </p>
            <p className="text-slate-400 text-sm">
              Сегодня уже три убыточные сделки подряд. Осталось до разблокировки формы:
            </p>
            <div
              className="text-5xl font-mono font-bold text-amber-400 tabular-nums"
              aria-live="polite"
            >
              {timeLabel}
            </div>
            <p className="text-xs text-slate-500">
              После окончания таймера можно снова добавлять сделки на эту дату. Или выберите другой
              день в поле «Date», если запись относится к другому дню.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
