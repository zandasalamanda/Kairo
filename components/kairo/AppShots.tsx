"use client";

import * as React from "react";
import Image, { type StaticImageData } from "next/image";
import { X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Imported, not referenced by path. Next then derives each image's real size and
// fingerprints the URL by CONTENT — so replacing a shot can never serve a stale
// cached copy (the optimizer keys on the URL), and nobody hand-maintains w/h.
import mapPng from "@/public/shots/map.png";
import solaPng from "@/public/shots/sola.png";
import listPng from "@/public/shots/list.png";
import reviewPng from "@/public/shots/review.png";
import focusPng from "@/public/shots/focus.png";

interface Shot {
  img: StaticImageData;
  alt: string;
}

/** A point on the shot worth explaining. x/y are percentages of the image. */
interface Beat {
  x: number;
  y: number;
  label: string;
}

const MAP: Shot = { img: mapPng, alt: "The living goal map with a step open, showing the video picked for it" };
const MAP_BEATS: Beat[] = [
  { x: 47, y: 41, label: "Every goal becomes a map, with real progress on its face." },
  { x: 61, y: 46, label: "Each step in order. The ones you finished light the trail." },
  { x: 94, y: 84, label: "One clear next move, always marked." },
  { x: 50, y: 90, label: "The exact video you need, already found and attached." },
];

const SIDE: (Shot & { beats: Beat[] })[] = [
  {
    img: solaPng,
    alt: "The Ask Sola panel proposing plan changes to accept or dismiss",
    beats: [
      // Sit beside the text, not on top of it — the pin points, it shouldn't cover.
      { x: 20, y: 17, label: "Ask for what you want, in plain words." },
      { x: 13, y: 49, label: "Sola proposes the exact changes it would make." },
      { x: 24, y: 91, label: "Nothing moves until you say so." },
    ],
  },
  {
    img: listPng,
    alt: "List view of goals with steps checked off and research attached",
    beats: [
      { x: 85, y: 8, label: "Every goal and step, plainly listed." },
      { x: 78, y: 38, label: "Your next step, marked for you." },
      { x: 50, y: 61, label: "The research sits right on the step." },
    ],
  },
  {
    img: reviewPng,
    alt: "Weekly review showing true pace to each deadline",
    beats: [
      { x: 74, y: 23, label: "Ahead or behind, told to you straight." },
      { x: 50, y: 57, label: "How much is done against how much time is gone." },
      { x: 18, y: 83, label: "Proof you actually showed up." },
    ],
  },
  {
    img: focusPng,
    alt: "A focus session with a timer and a first-move checklist",
    beats: [
      { x: 67, y: 27, label: "One step, one timer, nothing else." },
      { x: 52, y: 68, label: "It hands you the first move." },
      { x: 45, y: 81, label: "Tick them off and just start." },
    ],
  },
];

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(m.matches);
    read();
    m.addEventListener("change", read);
    return () => m.removeEventListener("change", read);
  }, []);
  return reduced;
}

/**
 * A screenshot that explains itself: a hotspot walks the image, pausing on each
 * region while the line underneath says what it is. Only runs while on screen.
 * Under reduced motion it stops cycling and lists every note at once instead.
 */
function ShotTour({ shot, beats, rounded, onZoom }: { shot: Shot; beats: Beat[]; rounded: string; onZoom: (s: Shot) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [i, setI] = React.useState(0);
  const [live, setLive] = React.useState(false);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!live || reduced) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % beats.length), 3200);
    return () => window.clearInterval(id);
  }, [live, reduced, beats.length]);

  return (
    <figure ref={ref} className="panel-2 rounded-3xl p-2 md:p-3">
      <div className="group relative overflow-hidden rounded-2xl">
        <Image src={shot.img} alt={shot.alt} className={cn("w-full", rounded)} />

        {/* the walking hotspot */}
        {beats.map((b, k) => {
          const on = reduced || k === i;
          return (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={b.label}
              className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
            >
              {on && !reduced && (
                <span className="absolute inset-0 animate-ping rounded-full" style={{ background: "rgba(230,184,119,0.35)" }} />
              )}
              <span
                className={cn("relative block rounded-full transition-all duration-300", on ? "h-3 w-3" : "h-1.5 w-1.5")}
                style={{
                  background: on ? "#e6b877" : "rgba(230,184,119,0.4)",
                  boxShadow: on ? "0 0 0 3px rgba(230,184,119,0.25), 0 1px 6px rgba(0,0,0,0.6)" : "none",
                }}
              />
            </button>
          );
        })}

        <button
          onClick={() => onZoom(shot)}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white/70 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100"
          aria-label="Enlarge screenshot"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* the line that explains whatever the hotspot is sitting on */}
      <figcaption className="px-2 pb-1 pt-4 text-center">
        {reduced ? (
          <span className="text-[14px] leading-relaxed text-muted">{beats.map((b) => b.label).join(" ")}</span>
        ) : (
          <span key={i} className="animate-fade-in block text-[14.5px] leading-relaxed text-muted">
            {beats[i].label}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

export function AppShots() {
  const [zoom, setZoom] = React.useState<Shot | null>(null);

  React.useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      {/* Held a touch narrower than the section so the shots feel composed, not overwhelming. */}
      <div className="mx-auto max-w-5xl">
        <ShotTour shot={MAP} beats={MAP_BEATS} rounded="rounded-2xl" onZoom={setZoom} />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {SIDE.map((s) => (
            <ShotTour key={s.img.src} shot={s} beats={s.beats} rounded="rounded-xl" onZoom={setZoom} />
          ))}
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label={zoom.alt}>
          <button onClick={() => setZoom(null)} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
          {/* Full-res raw asset scaled to fit — most reliable for a lightbox. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.img.src}
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
