export function ListeningOverlay({
  heardText,
  onStop,
  speaking,
  visible,
}: {
  heardText: string;
  onStop: () => void;
  speaking: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  const finishing = Boolean(heardText) && !speaking;
  const title = speaking ? "I can hear you" : finishing ? "Finishing your message" : "Listening";
  const description = speaking
    ? "Keep speaking. Your message will be sent when you finish."
    : finishing
      ? "One moment while your speech is completed."
      : "Start speaking, or tap the microphone to stop.";

  return (
    <div
      aria-describedby="listening-description"
      aria-labelledby="listening-title"
      aria-modal="true"
      className={`listening-overlay${speaking ? " is-speaking" : ""}`}
      role="dialog"
    >
      <div className="listening-content">
        <button aria-label="Stop listening" className="listening-bubble" onClick={onStop} type="button">
          <span aria-hidden="true" className="listening-ring listening-ring-one" />
          <span aria-hidden="true" className="listening-ring listening-ring-two" />
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect height="11" rx="3" width="6" x="9" y="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4M9 21h6" />
          </svg>
        </button>
        <div aria-live="polite" className="listening-copy">
          <span className="listening-label">Voice input</span>
          <h2 id="listening-title">{title}</h2>
          {heardText && <blockquote>{heardText}</blockquote>}
          <p id="listening-description">{description}</p>
        </div>
        <button className="listening-stop" onClick={onStop} type="button">Stop listening</button>
      </div>
    </div>
  );
}
