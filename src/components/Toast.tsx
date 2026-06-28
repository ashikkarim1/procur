'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800); // DESIGN_SPEC §6
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div
          role="status"
          className="fixed bottom-7 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-[10px] bg-rail-bg px-4 py-2.5 text-[13px] font-medium text-rail-text-active shadow-[0_10px_30px_rgba(0,0,0,.3)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
