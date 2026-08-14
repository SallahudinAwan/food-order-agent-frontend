import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeechInput, isSpeechRecognitionSupported } from "./speech";

type FakeResult = { isFinal: boolean; 0: { transcript: string } };

class FakeRecognition {
  static latest: FakeRecognition | null = null;
  continuous = true;
  interimResults = false;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();

  constructor() {
    FakeRecognition.latest = this;
  }

  emitResult(transcript: string, isFinal: boolean) {
    const results: FakeResult[] = [{ isFinal, 0: { transcript } }];
    this.onresult?.({ resultIndex: 0, results });
  }
}

const speechScope = globalThis as typeof globalThis & { SpeechRecognition?: typeof FakeRecognition };
const originalRecognition = speechScope.SpeechRecognition;

afterEach(() => {
  FakeRecognition.latest = null;
  if (originalRecognition) speechScope.SpeechRecognition = originalRecognition;
  else delete speechScope.SpeechRecognition;
});

describe("browser speech support", () => {
  it("detects the standard browser speech recognition API", () => {
    const fakeScope = { SpeechRecognition: class {} } as unknown as typeof globalThis;
    expect(isSpeechRecognitionSupported(fakeScope)).toBe(true);
  });

  it("returns false when the browser has no recognition API", () => {
    expect(isSpeechRecognitionSupported({} as typeof globalThis)).toBe(false);
  });

  it("listens once, reports speech activity, and submits when speech ends", () => {
    speechScope.SpeechRecognition = FakeRecognition;
    const onTranscript = vi.fn();
    const onInterimTranscript = vi.fn();
    const onSpeechChange = vi.fn();
    const onEnd = vi.fn();
    const input = new BrowserSpeechInput({
      onTranscript,
      onError: vi.fn(),
      onListening: vi.fn(),
      onInterimTranscript,
      onSpeechChange,
      onEnd,
    });

    input.start();
    const recognition = FakeRecognition.latest;
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(true);
    recognition?.onspeechstart?.();
    recognition?.emitResult("add one pizza", false);
    recognition?.onspeechend?.();
    recognition?.onend?.();

    expect(onSpeechChange).toHaveBeenCalledWith(true);
    expect(onSpeechChange).toHaveBeenLastCalledWith(false);
    expect(onInterimTranscript).toHaveBeenCalledWith("add one pizza");
    expect(onTranscript).toHaveBeenCalledOnce();
    expect(onTranscript).toHaveBeenCalledWith("add one pizza");
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("submits a final result only once", () => {
    speechScope.SpeechRecognition = FakeRecognition;
    const onTranscript = vi.fn();
    const input = new BrowserSpeechInput({
      onTranscript,
      onError: vi.fn(),
      onListening: vi.fn(),
      onInterimTranscript: vi.fn(),
      onSpeechChange: vi.fn(),
      onEnd: vi.fn(),
    });

    input.start();
    const recognition = FakeRecognition.latest;
    recognition?.emitResult("show me burgers", true);
    recognition?.onend?.();

    expect(recognition?.abort).toHaveBeenCalledOnce();
    expect(onTranscript).toHaveBeenCalledOnce();
    expect(onTranscript).toHaveBeenCalledWith("show me burgers");
  });
});
