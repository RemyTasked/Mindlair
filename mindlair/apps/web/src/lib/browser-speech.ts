/**
 * Live speech-to-text in the browser (Web Speech API).
 * Used when OPENAI_API_KEY is not set — Anthropic does not support audio input.
 */

/* Minimal Web Speech API types (not in all TS libs) */
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechAvailable(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export interface LiveSpeechSession {
  start: () => void;
  stop: () => void;
  getTranscript: () => string;
}

/** Runs continuous recognition; call stop() when recording ends. */
export function createLiveSpeechSession(lang = "en-US"): LiveSpeechSession | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return null;

  let recognition: SpeechRecognitionInstance | null = null;
  let finalParts: string[] = [];
  let interim = "";

  recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let nextInterim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalParts.push(text);
        interim = "";
      } else {
        nextInterim += text;
      }
    }
    if (nextInterim) interim = nextInterim;
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error !== "aborted" && event.error !== "no-speech") {
      console.warn("[browser-speech]", event.error);
    }
  };

  return {
    start() {
      finalParts = [];
      interim = "";
      try {
        recognition?.start();
      } catch {
        // already started
      }
    },
    stop() {
      try {
        recognition?.stop();
      } catch {
        /* ignore */
      }
    },
    getTranscript() {
      const final = finalParts.join(" ").replace(/\s+/g, " ").trim();
      const combined = [final, interim.trim()].filter(Boolean).join(" ").trim();
      return combined;
    },
  };
}
