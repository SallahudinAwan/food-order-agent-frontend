import { useEffect, useState } from "react";
import type { SpeechLanguage } from "../types";

const messages = {
  "en-PK": [
    "Understanding your request",
    "Checking menu and order details",
    "Preparing your answer",
  ],
  "ur-PK": [
    "آپ کی درخواست سمجھی جا رہی ہے",
    "ریستوران کی معلومات چیک کی جا رہی ہیں",
    "آپ کا جواب تیار کیا جا رہا ہے",
  ],
} satisfies Record<SpeechLanguage, string[]>;

export function ThinkingOverlay({ language, visible }: { language: SpeechLanguage; visible: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) return null;
  const phase = messages[language][Math.floor(elapsed / 2) % messages[language].length];
  const isUrdu = language === "ur-PK";
  const waitingMessage = isUrdu
    ? "براہ کرم انتظار کریں۔ ایجنٹ آپ کی درخواست پر کام کر رہا ہے۔"
    : "Please wait. I am thinking and checking your order.";

  return (
    <div
      aria-busy="true"
      aria-describedby="thinking-description"
      aria-labelledby="thinking-title"
      aria-modal="true"
      className="thinking-overlay"
      role="dialog"
    >
      <span aria-live="assertive" className="sr-only" role="status">{waitingMessage}</span>
      <div className="thinking-card">
        <div aria-hidden="true" className="thinking-visual">
          <div className="thinking-orbit">
            <span />
            <span />
            <span />
          </div>
          <div className="thinking-bars">
            {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
          </div>
        </div>
        <div className="thinking-copy" dir={isUrdu ? "rtl" : "ltr"}>
          <span className="thinking-label">{isUrdu ? "آپ کا آرڈر چیک کیا جا رہا ہے" : "We are checking your order"}</span>
          <h2 id="thinking-title">{phase}<span className="thinking-dots" aria-hidden="true" /></h2>
          <p id="thinking-description">{isUrdu ? "براہ کرم انتظار کریں اور دوبارہ کلک نہ کریں" : "Please wait—your request is still being processed."}</p>
        </div>
        <div className="thinking-progress" aria-hidden="true"><span /></div>
        <small>{isUrdu ? `${elapsed} سیکنڈ` : `${elapsed}s elapsed`}</small>
      </div>
    </div>
  );
}
