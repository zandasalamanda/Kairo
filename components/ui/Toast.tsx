"use client";

import * as React from "react";

// One shared, floating confirmation toast for the whole app, so every surface
// (map, inbox, today, focus) confirms actions the same way. `chrome` + fade-in,
// bottom-centred, auto-dismiss — the same feel the map's toast had, now global.

type ToastFn = (message: string) => void;

const ToastContext = React.createContext<ToastFn | null>(null);

/** Fire a confirmation toast. No-ops safely if used outside a ToastProvider. */
export function useToast(): ToastFn {
  const ctx = React.useContext(ToastContext);
  return ctx ?? (() => {});
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<{ id: number; message: string } | null>(null);
  const idRef = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = React.useCallback((message: string) => {
    if (!message) return;
    const id = idRef.current + 1;
    idRef.current = id;
    setToast({ id, message });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  }, []);

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-[140] flex justify-center px-4 md:bottom-8">
          <div key={toast.id} className="chrome animate-fade-in max-w-sm rounded-xl px-4 py-2.5 text-center text-[13px] text-accent">
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
