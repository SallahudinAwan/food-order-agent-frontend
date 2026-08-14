import { useState, type FormEvent } from "react";
import type { ConnectionState } from "../types";

export function QuestionInput({
  state,
  onSubmit,
  onVoiceStart,
  onVoiceStop,
}: {
  state: ConnectionState;
  onSubmit: (question: string) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}) {
  const [question, setQuestion] = useState("");
  const enabled = state !== "connecting" && state !== "speaking";
  const voiceActive = state !== "disconnected" && state !== "error";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = question.trim();
    if (!value || !enabled) return;
    onSubmit(value);
    setQuestion("");
  };

  return (
    <form className="question-input" onSubmit={submit}>
      <input
        aria-label="Type your order or menu question"
        disabled={!enabled}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder={enabled ? "Type your order in English or Urdu..." : "Please wait for the response..."}
        value={question}
      />
      <button aria-label="Send order message" className="send-button" disabled={!enabled || !question.trim()} type="submit">
        <span className="send-label">Send</span>
        <svg aria-hidden="true" className="send-icon" viewBox="0 0 24 24">
          <path d="M3 4l18 8-18 8 4-8-4-8Z" />
          <path d="M7 12h14" />
        </svg>
      </button>
      <button
        aria-label={voiceActive ? "Pause listening" : "Start listening"}
        className={`mobile-voice-button${voiceActive ? " is-active" : ""}`}
        onClick={voiceActive ? onVoiceStop : onVoiceStart}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect height="11" rx="3" width="6" x="9" y="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 17v4M9 21h6" />
        </svg>
      </button>
    </form>
  );
}
