import { describe, expect, it } from "vitest";
import { isSpeechRecognitionSupported } from "./speech";

describe("browser speech support", () => {
  it("detects the standard browser speech recognition API", () => {
    const fakeScope = { SpeechRecognition: class {} } as unknown as typeof globalThis;
    expect(isSpeechRecognitionSupported(fakeScope)).toBe(true);
  });

  it("returns false when the browser has no recognition API", () => {
    expect(isSpeechRecognitionSupported({} as typeof globalThis)).toBe(false);
  });
});
