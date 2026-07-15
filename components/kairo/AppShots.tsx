"use client";

import * as React from "react";
import Image from "next/image";
import { X, Maximize2 } from "lucide-react";

interface Shot {
  src: string;
  w: number;
  h: number;
  alt: string;
}

const FEATURE: Shot = { src: "/shots/map.png", w: 1700, h: 941, alt: "The living goal map with a research panel open on a step" };
const SOLA: Shot = { src: "/shots/sola.png", w: 1700, h: 909, alt: "The Ask Sola panel proposing plan changes to accept or dismiss" };
const MOBILE: (Shot & { cap: React.ReactNode })[] = [
  { src: "/shots/review.png", w: 731, h: 900, alt: "Weekly review showing pace to each deadline", cap: <>An <b>honest weekly review</b>. Your <b>true pace</b> to every deadline.</> },
  { src: "/shots/focus.png", w: 751, h: 900, alt: "A focus session with a timer and a first-move checklist", cap: <><b>Focus sessions</b> with a first move and a checklist, so you <b>just start</b>.</> },
  { src: "/shots/list.png", w: 668, h: 900, alt: "List view of goals with steps checked off", cap: <>Every goal and every step, <b>checked off</b> as you go.</> },
];

function Frame({ shot, rounded, onZoom }: { shot: Shot; rounded: string; onZoom: (s: Shot) => void }) {
  return (
    <button onClick={() => onZoom(shot)} className={`group relative block w-full overflow-hidden ${rounded}`} aria-label={`Zoom into ${shot.alt}`}>
      <Image src={shot.src} width={shot.w} height={shot.h} alt={shot.alt} className={`w-full ${rounded}`} />
      <span className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/50 text-white/90 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <Maximize2 size={15} />
      </span>
    </button>
  );
}

// Real product screenshots on the landing, each clickable to zoom into a lightbox.
// Captions bold the words that matter and never use em dashes.
export function AppShots() {
  const [zoom, setZoom] = React.useState<Shot | null>(null);

  React.useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      <figure className="panel-2 rounded-3xl p-2 md:p-3">
        <Frame shot={FEATURE} rounded="rounded-2xl" onZoom={setZoom} />
        <figcaption className="px-2 pb-1 pt-4 text-center text-[15px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-accent [&_b]:[text-shadow:0_0_14px_rgba(230,184,119,0.55)]">
          Your <b>living goal map</b>. Every step placed in order, each with a <b>hand-picked video or cited guide</b> attached.
        </figcaption>
      </figure>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {MOBILE.map((s) => (
          <figure key={s.src} className="panel rounded-2xl p-1.5">
            <Frame shot={s} rounded="rounded-xl" onZoom={setZoom} />
            <figcaption className="px-2.5 pb-1.5 pt-3 text-center text-[13.5px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-accent [&_b]:[text-shadow:0_0_14px_rgba(230,184,119,0.55)]">
              {s.cap}
            </figcaption>
          </figure>
        ))}
      </div>

      <figure className="panel-2 mt-5 rounded-3xl p-2 md:p-3">
        <Frame shot={SOLA} rounded="rounded-2xl" onZoom={setZoom} />
        <figcaption className="px-2 pb-1 pt-4 text-center text-[15px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-accent [&_b]:[text-shadow:0_0_14px_rgba(230,184,119,0.55)]">
          <b>Ask Sola</b> to reshape your whole plan. It proposes the changes, you <b>accept or dismiss</b>.
        </figcaption>
      </figure>

      {zoom && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label={zoom.alt}>
          <button onClick={() => setZoom(null)} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
          {/* Full-res raw asset scaled to fit — most reliable for a lightbox. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.src}
            alt={zoom.alt}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in rounded-xl object-contain shadow-2xl"
            style={{ maxHeight: "90vh", maxWidth: "94vw" }}
          />
        </div>
      )}
    </>
  );
}
