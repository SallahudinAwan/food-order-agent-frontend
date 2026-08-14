import { describe, expect, it } from "vitest";
import { detectLanguage } from "./language";

describe("automatic ordering language", () => {
  it("detects Urdu script", () => {
    expect(detectLanguage("مجھے ایک زنگر برگر چاہیے")).toBe("ur-PK");
  });

  it("uses English for Latin-script messages", () => {
    expect(detectLanguage("Please add one Zinger Burger")).toBe("en-PK");
  });

  it("detects Roman Urdu confirmations", () => {
    expect(detectLanguage("G confirm kar den aap order")).toBe("ur-PK");
    expect(detectLanguage("order final kar de")).toBe("ur-PK");
  });

  it("does not confuse Gmail with the Roman Urdu word ji", () => {
    expect(detectLanguage("Gmail ID confirm")).toBe("en-PK");
  });
});
