"use client";

import * as React from "react";

// Browser-native speech-to-text (Web Speech API). No API cost. Chrome/Edge/Safari
// support it; unsupported browsers simply don't show the mic.

interface RecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}
interface RecognitionEvent {
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Dictate into a text field. `setValue` receives the base text + live transcript. */
export function useSpeechInput(setValue: (value: string) => void) {
  const [listening, setListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  const recRef = React.useRef<Recognition | null>(null);
  const baseRef = React.useRef("");
  const setValueRef = React.useRef(setValue);
  React.useEffect(() => { setValueRef.current = setValue; });

  React.useEffect(() => {
    // One-time feature detection, deferred to mount so SSR (no SpeechRecognition)
    // and the client agree on the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognition() !== null);
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stop = React.useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = React.useCallback((current: string) => {
    const rec = getRecognition();
    if (!rec) return;
    baseRef.current = current ? current.replace(/\s+$/, "") + " " : "";
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      setValueRef.current(baseRef.current + full.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  const toggle = React.useCallback(
    (current: string) => {
      if (listening) stop();
      else start(current);
    },
    [listening, start, stop]
  );

  return { listening, supported, toggle };
}
