import type { SpeechLanguage } from "../types";

export const detectLanguage = (text: string): SpeechLanguage => {
  if (/[\u0600-\u06FF]/.test(text)) return "ur-PK";
  const normalized = text.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const romanUrdu = anyRomanUrduPhrase.some((pattern) => pattern.test(normalized));
  return romanUrdu ? "ur-PK" : "en-PK";
};

const anyRomanUrduPhrase = [
  /\b(?:g|ji|jee|haan|han)\b.*\b(?:confirm|final|order)\b/,
  /\b(?:confirm|final)\s+kar\s+(?:de|den|dain|do)\b/,
  /\border\b.*\bkar\s+(?:de|den|dain|do)\b/,
  /\b(?:mujhe|mujhko|chahiye|aap|mera|meri|kitna|kitni|rupay|nahi|nahin)\b/,
];
