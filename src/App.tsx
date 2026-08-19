import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import foodOrderingHero from "./assets/food-ordering-hero.png";
import { Cart } from "./components/Cart";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { ListeningOverlay } from "./components/ListeningOverlay";
import { QuestionInput } from "./components/QuestionInput";
import { PastOrders } from "./components/PastOrders";
import { Transcript } from "./components/Transcript";
import { VoiceControls } from "./components/VoiceControls";
import type { Cart as CartType, ConnectionState, PastOrder, SpeechLanguage, TranscriptLine } from "./types";
import { BrowserSpeechInput } from "./voice/speech";
import { detectLanguage } from "./voice/language";

const STORAGE_KEY = "voice_order_session_id";
const CUSTOMER_STORAGE_KEY = "voice_order_customer_id";
const LANGUAGE_STORAGE_KEY = "voice_order_detected_language";
const LANGUAGE_PREFERENCE_STORAGE_KEY = "voice_order_language_preference";

type LanguagePreference = "auto" | SpeechLanguage;

const newSession = () => {
  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
};

const initialSession = () => localStorage.getItem(STORAGE_KEY) || newSession();
const initialCustomer = () => {
  const existing = localStorage.getItem(CUSTOMER_STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(CUSTOMER_STORAGE_KEY, id);
  return id;
};

const initialLanguagePreference = (): LanguagePreference => {
  const saved = localStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
  return saved === "en-PK" || saved === "ur-PK" ? saved : "auto";
};

const initialLanguage = (): SpeechLanguage => {
  const preference = initialLanguagePreference();
  if (preference !== "auto") return preference;
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === "en-PK" || saved === "ur-PK") return saved;
  return navigator.language.toLowerCase().startsWith("ur") ? "ur-PK" : "en-PK";
};

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl = "";
let activeSpeechCancel: (() => void) | null = null;
let speechGeneration = 0;

function stopSpeaking(): void {
  speechGeneration += 1;
  const cancelPlayback = activeSpeechCancel;
  activeSpeechCancel = null;
  cancelPlayback?.();
  window.speechSynthesis?.cancel();
  activeAudio?.pause();
  activeAudio = null;
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  activeAudioUrl = "";
}

function availableVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 1000);
  });
}

async function browserSpeak(text: string, language: SpeechLanguage, requireMatchingVoice = false, generation = speechGeneration): Promise<void> {
  if (!("speechSynthesis" in window)) throw new Error("Speech synthesis is not supported in this browser.");
  const voices = await availableVoices();
  if (generation !== speechGeneration) return;
  const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)));
  if (requireMatchingVoice && !matchingVoice) throw new Error("No Urdu browser voice is installed.");
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (activeSpeechCancel === finish) activeSpeechCancel = null;
      resolve();
    };
    utterance.lang = language;
    if (matchingVoice) utterance.voice = matchingVoice;
    utterance.rate = 1;
    utterance.onend = finish;
    utterance.onerror = finish;
    activeSpeechCancel = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function speak(text: string): Promise<void> {
  stopSpeaking();
  const generation = speechGeneration;
  const isUrdu = /[\u0600-\u06FF]/.test(text);
  if (!isUrdu) return browserSpeak(text, "en-PK", false, generation);

  try {
    const blob = await api.synthesizeSpeech(text, "ur-PK");
    if (generation !== speechGeneration) return;
    activeAudioUrl = URL.createObjectURL(blob);
    const audio = new Audio(activeAudioUrl);
    activeAudio = audio;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (activeSpeechCancel === finish) activeSpeechCancel = null;
        resolve();
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        if (activeSpeechCancel === finish) activeSpeechCancel = null;
        reject(new Error("The Urdu audio could not be played."));
      };
      activeSpeechCancel = finish;
      audio.onended = finish;
      audio.onerror = fail;
      void audio.play().catch(fail);
    });
    activeAudio = null;
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = "";
  } catch (backendError) {
    try {
      if (generation !== speechGeneration) return;
      await browserSpeak(text, "ur-PK", true, generation);
    } catch {
      throw backendError;
    }
  }
}

const waitingAnnouncements: Record<SpeechLanguage, string[]> = {
  "en-PK": [
    "Please wait. I am thinking and checking your order now.",
    "I am still working on your request. Please wait a little longer.",
    "Thank you for waiting. I am preparing your answer.",
  ],
  "ur-PK": [
    "براہ کرم انتظار کریں۔ میں آپ کے آرڈر کے بارے میں سوچ رہا ہوں اور معلومات چیک کر رہا ہوں۔",
    "میں ابھی آپ کی درخواست پر کام کر رہا ہوں۔ براہ کرم تھوڑا مزید انتظار کریں۔",
    "انتظار کرنے کا شکریہ۔ میں آپ کا جواب تیار کر رہا ہوں۔",
  ],
};

export default function App() {
  const [sessionId, setSessionId] = useState(initialSession);
  const customerIdRef = useRef(initialCustomer());
  const sessionIdRef = useRef(sessionId);
  const [cart, setCart] = useState<CartType | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [speechLanguage, setSpeechLanguage] = useState<SpeechLanguage>(initialLanguage);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(initialLanguagePreference);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState("");
  const [heardText, setHeardText] = useState("");
  const [voiceDetected, setVoiceDetected] = useState(false);
  const voiceRef = useRef<BrowserSpeechInput | null>(null);
  const voiceActiveRef = useRef(false);
  const busyRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const processQuestionRef = useRef<(question: string) => void>(() => undefined);
  const startListeningRef = useRef<() => void>(() => undefined);
  const voiceModeEnabledRef = useRef(true);
  const automaticStartAttemptedRef = useRef(false);
  const cartCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const ordersCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousCartItemCountRef = useRef<number | null>(null);
  const languagePreferenceRef = useRef(languagePreference);

  const cartItemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    languagePreferenceRef.current = languagePreference;
  }, [languagePreference]);

  useEffect(() => {
    if (!cart) return;
    const previousCount = previousCartItemCountRef.current;
    previousCartItemCountRef.current = cartItemCount;
    if (
      previousCount !== null
      && cartItemCount > previousCount
      && window.matchMedia("(max-width: 760px)").matches
    ) {
      setCartOpen(true);
    }
  }, [cart, cartItemCount]);

  useEffect(() => {
    if (!cartOpen && !ordersOpen) return;
    document.body.classList.add("cart-drawer-open");
    if (cartOpen) cartCloseButtonRef.current?.focus();
    else ordersCloseButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCartOpen(false);
        setOrdersOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("cart-drawer-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [cartOpen, ordersOpen]);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    try {
      setCart(await api.getCart(sessionIdRef.current));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      setOrders(await api.getOrders(customerIdRef.current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load past orders.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const changeCartItemQuantity = useCallback(async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      if (quantity < 1) {
        await api.removeItem(itemId);
        setCart(await api.getCart(sessionIdRef.current));
      } else {
        setCart(await api.updateItem(itemId, quantity));
      }
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCart();
    void refreshOrders();
  }, [refreshCart, refreshOrders, sessionId]);

  const processQuestion = useCallback(async (question: string) => {
    const cleaned = question.trim();
    if (!cleaned || busyRef.current) return;
    const preference = languagePreferenceRef.current;
    const questionLanguage = preference === "auto" ? detectLanguage(cleaned) : preference;
    setSpeechLanguage(questionLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, questionLanguage);

    busyRef.current = true;
    const generation = ++requestGenerationRef.current;
    voiceRef.current?.stop();
    voiceRef.current = null;
    voiceActiveRef.current = false;
    setHeardText("");
    setVoiceDetected(false);
    stopSpeaking();
    setError("");
    setState("connecting");
    setTranscript((lines) => [...lines, { id: crypto.randomUUID(), role: "user", text: cleaned }]);
    const announcements = waitingAnnouncements[questionLanguage];
    let announcementIndex = 0;
    void speak(announcements[announcementIndex]).catch(() => undefined);
    const waitingTimer = window.setInterval(() => {
      announcementIndex = (announcementIndex + 1) % announcements.length;
      void speak(announcements[announcementIndex]).catch(() => undefined);
    }, 8000);

    try {
      const response = await api.askAgent(sessionIdRef.current, customerIdRef.current, cleaned, questionLanguage);
      window.clearInterval(waitingTimer);
      stopSpeaking();
      if (generation !== requestGenerationRef.current) return;
      const placedOrder = response.order_placed ? response.orders[0] : undefined;
      setTranscript((lines) => [
        ...lines,
        { id: crypto.randomUUID(), role: "assistant", text: response.reply, products: response.products, order: placedOrder },
      ]);
      setCart(response.cart);
      setOrders(response.orders);

      if (response.order_placed) {
        const id = newSession();
        sessionIdRef.current = id;
        setSessionId(id);
      }

      setState("speaking");
      try {
        await speak(response.speech_reply);
      } catch (speechError) {
        setError(
          speechError instanceof Error
            ? `The Urdu answer is displayed, but audio failed: ${speechError.message}`
            : "The Urdu answer is displayed, but its audio could not be played.",
        );
      }
      if (generation !== requestGenerationRef.current) return;
      setState("disconnected");
      if (voiceModeEnabledRef.current) {
        window.setTimeout(() => startListeningRef.current(), 0);
      }
    } catch (caught) {
      window.clearInterval(waitingTimer);
      stopSpeaking();
      if (generation !== requestGenerationRef.current) return;
      const message = caught instanceof Error ? caught.message : "I could not process your order right now. Please try again.";
      setError(message);
      voiceRef.current = null;
      voiceActiveRef.current = false;
      setState("error");
    } finally {
      window.clearInterval(waitingTimer);
      if (generation === requestGenerationRef.current) busyRef.current = false;
    }
  }, []);

  processQuestionRef.current = (question) => void processQuestion(question);

  const start = useCallback(() => {
    if (busyRef.current || voiceActiveRef.current) return;
    voiceModeEnabledRef.current = true;
    setError("");
    setHeardText("");
    setVoiceDetected(false);
    let voice: BrowserSpeechInput;
    voice = new BrowserSpeechInput(
      {
        onTranscript: (text) => {
          if (voiceRef.current !== voice) return;
          voiceActiveRef.current = false;
          voiceRef.current = null;
          setVoiceDetected(false);
          processQuestionRef.current(text);
        },
        onError: (message) => {
          if (voiceRef.current !== voice) return;
          voiceModeEnabledRef.current = false;
          setError(message);
          voiceActiveRef.current = false;
          voiceRef.current = null;
          setHeardText("");
          setVoiceDetected(false);
          setState("error");
        },
        onListening: () => setState("listening"),
        onInterimTranscript: setHeardText,
        onSpeechChange: (speaking) => {
          setVoiceDetected(speaking);
          if (speaking) {
            setCartOpen(false);
          }
        },
        onEnd: () => {
          if (voiceRef.current !== voice) return;
          voiceActiveRef.current = false;
          voiceRef.current = null;
          setHeardText("");
          setVoiceDetected(false);
          setState("disconnected");
          if (voiceModeEnabledRef.current) {
            window.setTimeout(() => startListeningRef.current(), 250);
          }
        },
      },
      speechLanguage,
    );
    voiceRef.current = voice;
    voiceActiveRef.current = true;
    try {
      voice.start();
    } catch (caught) {
      voiceModeEnabledRef.current = false;
      voice.stop();
      voiceRef.current = null;
      voiceActiveRef.current = false;
      setError(caught instanceof Error ? caught.message : "Could not start voice recognition.");
      setState("error");
    }
  }, [speechLanguage]);

  startListeningRef.current = start;

  useEffect(() => {
    if (automaticStartAttemptedRef.current) return;
    const timer = window.setTimeout(() => {
      automaticStartAttemptedRef.current = true;
      startListeningRef.current();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [start]);

  const stop = () => {
    const message = heardText.trim();
    voiceModeEnabledRef.current = false;
    requestGenerationRef.current += 1;
    busyRef.current = false;
    voiceActiveRef.current = false;
    voiceRef.current?.stop();
    voiceRef.current = null;
    setHeardText("");
    setVoiceDetected(false);
    stopSpeaking();
    setState("disconnected");
    if (message) processQuestionRef.current(message);
  };

  const changeLanguagePreference = (preference: LanguagePreference) => {
    setLanguagePreference(preference);
    languagePreferenceRef.current = preference;
    localStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, preference);
    if (preference === "auto") return;

    setSpeechLanguage(preference);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
    const voice = voiceRef.current;
    if (voice && voiceActiveRef.current) {
      voice.stop();
      voiceRef.current = null;
      voiceActiveRef.current = false;
      setHeardText("");
      setVoiceDetected(false);
      setState("disconnected");
      if (voiceModeEnabledRef.current) {
        window.setTimeout(() => startListeningRef.current(), 0);
      }
    }
  };

  useEffect(() => () => {
    voiceModeEnabledRef.current = false;
    voiceRef.current?.stop();
    stopSpeaking();
  }, []);

  return (
    <main className="app-shell">
      <ListeningOverlay
        heardText={heardText}
        onStop={stop}
        speaking={voiceDetected}
        visible={state === "listening" && voiceDetected}
      />
      <header className="app-header">
        <div className="brand-area">
          <div className="brand-copy">
            <div className="eyebrow"><span aria-hidden="true">✦</span> FRESH &amp; FAST VOICE ORDERING</div>
            <h1>Your cravings, <em>served.</em></h1>
            <p>Say what sounds delicious—we'll help build your perfect order.</p>
            <div aria-label="Popular food searches" className="quick-picks">
              <button disabled={state === "connecting" || state === "speaking"} onClick={() => void processQuestion("Show me chicken biryani")} type="button"><span aria-hidden="true">🍗</span> Biryani</button>
              <button disabled={state === "connecting" || state === "speaking"} onClick={() => void processQuestion("Show me pizza")} type="button"><span aria-hidden="true">🍕</span> Pizza</button>
              <button disabled={state === "connecting" || state === "speaking"} onClick={() => void processQuestion("Show me burgers")} type="button"><span aria-hidden="true">🍔</span> Burgers</button>
            </div>
          </div>
          <div className="mobile-header-actions">
            <button
              aria-expanded={ordersOpen}
              aria-label={`Open past orders, ${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
              className="mobile-cart-button mobile-orders-button"
              onClick={() => { setCartOpen(false); setOrdersOpen(true); }}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 7h16M6 3h12a2 2 0 0 1 2 2v15H4V5a2 2 0 0 1 2-2Z" />
                <path d="M8 11h8M8 15h6" />
              </svg>
              <span>Orders</span>
              <strong>{orders.length}</strong>
            </button>
            <button
              aria-expanded={cartOpen}
              aria-label={`Open cart, ${cartItemCount} ${cartItemCount === 1 ? "item" : "items"}`}
              className="mobile-cart-button"
              onClick={() => { setOrdersOpen(false); setCartOpen(true); }}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7" />
                <circle cx="10" cy="20" r="1.3" />
                <circle cx="18" cy="20" r="1.3" />
              </svg>
              <span>Cart</span>
              <strong>{cartItemCount}</strong>
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="food-hero">
          <div className="food-hero-glow" />
          <img alt="" src={foodOrderingHero} />
          <span className="food-spark food-spark-one">✦</span>
          <span className="food-spark food-spark-two">●</span>
          <div className="fresh-badge"><span>★</span><strong>Freshly made</strong><small>Every order</small></div>
        </div>
        <div className="order-entry">
          <div className="status-row">
            <ConnectionStatus state={state} />
            <label className="language-selector">
              <span className="sr-only">Order language</span>
              <select
                aria-label="Order language"
                disabled={state === "connecting" || state === "speaking"}
                onChange={(event) => changeLanguagePreference(event.target.value as LanguagePreference)}
                value={languagePreference}
              >
                <option value="auto">Auto</option>
                <option value="en-PK">English</option>
                <option value="ur-PK">اردو</option>
              </select>
            </label>
          </div>
          <VoiceControls state={state} onStart={start} onStop={stop} />
          <QuestionInput
            onSubmit={(question) => void processQuestion(question)}
            onVoiceStart={start}
            onVoiceStop={stop}
            state={state}
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
      </header>
      <div className="grid dashboard-grid">
        <Cart cart={cart} className="desktop-cart" loading={loading} onChangeQuantity={changeCartItemQuantity} />
        <Transcript
          disabled={state === "connecting" || state === "speaking"}
          thinking={state === "connecting"}
          lines={transcript}
          onAddProduct={(name) => void processQuestion(
            speechLanguage === "ur-PK" ? `${name} ایک عدد آرڈر میں شامل کریں` : `Add one ${name} to my order`,
          )}
        />
        <PastOrders className="desktop-orders" orders={orders} loading={ordersLoading} />
      </div>
      {cartOpen && (
        <div className="cart-drawer-layer">
          <button
            aria-label="Close cart"
            className="cart-drawer-backdrop"
            onClick={() => setCartOpen(false)}
            type="button"
          />
          <aside aria-labelledby="mobile-cart-title" aria-modal="true" className="cart-drawer" role="dialog">
            <button
              aria-label="Close cart"
              className="cart-drawer-close"
              onClick={() => setCartOpen(false)}
              ref={cartCloseButtonRef}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
            <Cart cart={cart} className="drawer-cart" headingId="mobile-cart-title" loading={loading} onChangeQuantity={changeCartItemQuantity} />
          </aside>
        </div>
      )}
      {ordersOpen && (
        <div className="cart-drawer-layer">
          <button
            aria-label="Close past orders"
            className="cart-drawer-backdrop"
            onClick={() => setOrdersOpen(false)}
            type="button"
          />
          <aside aria-labelledby="mobile-orders-title" aria-modal="true" className="cart-drawer" role="dialog">
            <button
              aria-label="Close past orders"
              className="cart-drawer-close"
              onClick={() => setOrdersOpen(false)}
              ref={ordersCloseButtonRef}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
            <PastOrders
              className="drawer-orders"
              headingId="mobile-orders-title"
              loading={ordersLoading}
              orders={orders}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
