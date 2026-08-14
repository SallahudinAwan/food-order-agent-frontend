import { useEffect, useRef } from "react";
import type { TranscriptLine } from "../types";

const money = (value: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value))
    .replace("PKR", "Rs.");

export function Transcript({
  lines,
  disabled,
  onAddProduct,
}: {
  lines: TranscriptLine[];
  disabled: boolean;
  onAddProduct: (name: string) => void;
}) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const messages = messagesRef.current;
    if (!messages || !lines.length) return;
    const frame = window.requestAnimationFrame(() => {
      messages.scrollTo({
        top: messages.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lines]);

  return (
    <section className="panel transcript">
      <h2>Conversation</h2>
      {lines.length === 0 ? (
        <p className="empty">Your conversation will appear here.</p>
      ) : (
        <div aria-live="polite" className="messages" ref={messagesRef}>
          {lines.map((line) => (
            <div className={`message ${line.role}`} key={line.id}>
              <span>{line.role === "user" ? "You" : "Order assistant"}</span>
              <p>{line.text}</p>
              {!!line.products?.length && (
                <div className="product-cards">
                  {line.products.map((product) => (
                    <article className="product-card" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <small>{product.category}</small>
                      </div>
                      <p>{product.description}</p>
                      <div className="product-action">
                        <strong>{money(product.price)}</strong>
                        <button disabled={disabled} onClick={() => onAddProduct(product.name)} type="button">
                          Add
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div aria-hidden="true" className="conversation-end" />
        </div>
      )}
    </section>
  );
}
