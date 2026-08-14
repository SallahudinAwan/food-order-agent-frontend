import { useState, type FormEvent } from "react";
import type { ConnectionState } from "../types";

export function QuestionInput({ state, onSubmit }: { state: ConnectionState; onSubmit: (question: string) => void }) {
  const [question, setQuestion] = useState("");
  const enabled = state !== "connecting" && state !== "speaking";

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
      <button disabled={!enabled || !question.trim()} type="submit">
        Send
      </button>
    </form>
  );
}
