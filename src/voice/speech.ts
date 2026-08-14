type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = Event & { error: string; message?: string };

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => BrowserRecognition;
type SpeechWindow = typeof globalThis & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

function recognitionConstructor(scope: typeof globalThis = globalThis): RecognitionConstructor | undefined {
  const speechScope = scope as SpeechWindow;
  return speechScope.SpeechRecognition ?? speechScope.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(scope: typeof globalThis = globalThis): boolean {
  return Boolean(recognitionConstructor(scope));
}

export class BrowserSpeechInput {
  private recognition: BrowserRecognition | null = null;
  private active = false;
  private paused = false;
  private latestTranscript = "";

  constructor(
    private callbacks: {
      onTranscript: (text: string) => void;
      onError: (message: string) => void;
      onListening: () => void;
      onInterimTranscript: (text: string) => void;
      onSpeechChange: (speaking: boolean) => void;
      onEnd: () => void;
    },
    private language: "en-PK" | "ur-PK" = "en-PK",
  ) {}

  start(): void {
    if (!isSpeechRecognitionSupported()) {
      throw new Error("Voice recognition is not supported in this browser. Use Chrome or Edge, or type your order.");
    }
    this.active = true;
    this.paused = false;
    this.latestTranscript = "";
    this.beginRecognition();
  }

  pause(): void {
    this.paused = true;
    this.recognition?.abort();
    this.recognition = null;
  }

  resume(): void {
    if (!this.active) return;
    this.paused = false;
    this.beginRecognition();
  }

  setLanguage(language: "en-PK" | "ur-PK"): void {
    this.language = language;
  }

  stop(): void {
    this.active = false;
    this.paused = true;
    this.recognition?.abort();
    this.recognition = null;
    this.latestTranscript = "";
    this.callbacks.onSpeechChange(false);
    this.callbacks.onInterimTranscript("");
  }

  private beginRecognition(): void {
    if (!this.active || this.paused || this.recognition) return;
    const Recognition = recognitionConstructor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = this.language;
    recognition.onresult = (event) => {
      const phrases: string[] = [];
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result[0]?.transcript?.trim();
        if (phrase) phrases.push(phrase);
        if (index >= event.resultIndex && result.isFinal) hasFinalResult = true;
      }
      const text = phrases.join(" ").trim();
      this.latestTranscript = text;
      this.callbacks.onInterimTranscript(text);
      if (!text || !hasFinalResult) return;

      this.active = false;
      this.paused = true;
      this.recognition = null;
      recognition.abort();
      this.callbacks.onSpeechChange(false);
      this.callbacks.onTranscript(text);
    };
    recognition.onerror = (event) => {
      if (this.recognition !== recognition || event.error === "aborted") return;
      this.recognition = null;
      this.active = false;
      this.paused = true;
      this.callbacks.onSpeechChange(false);
      if (event.error === "no-speech") {
        this.callbacks.onInterimTranscript("");
        this.callbacks.onEnd();
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.callbacks.onError("Microphone permission is needed for voice ordering. You can still type your order below.");
        return;
      }
      this.callbacks.onError(event.message || "I could not hear that clearly. Please try again or type your order.");
    };
    recognition.onend = () => {
      if (this.recognition !== recognition) return;
      this.recognition = null;
      this.active = false;
      this.paused = true;
      this.callbacks.onSpeechChange(false);
      const text = this.latestTranscript.trim();
      if (text) this.callbacks.onTranscript(text);
      else this.callbacks.onEnd();
    };
    recognition.onspeechstart = () => this.callbacks.onSpeechChange(true);
    recognition.onspeechend = () => this.callbacks.onSpeechChange(false);
    this.recognition = recognition;
    recognition.start();
    this.callbacks.onListening();
  }
}
