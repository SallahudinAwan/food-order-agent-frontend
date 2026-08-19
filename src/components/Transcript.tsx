import { useEffect, useRef } from "react";
import type { TranscriptLine } from "../types";
import { productImage } from "../productImages";
import { OrderCard } from "./PastOrders";

const money = (value: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value))
    .replace("PKR", "Rs.");

export function Transcript({
  lines,
  disabled,
  thinking,
  onAddProduct,
}: {
  lines: TranscriptLine[];
  disabled: boolean;
  thinking: boolean;
  onAddProduct: (name: string) => void;
}) {
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const messages = messagesRef.current;
    if (!messages || (!lines.length && !thinking)) return;
    const frame = window.requestAnimationFrame(() => {
      messages.scrollTo({
        top: messages.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lines, thinking]);

  return (
    <section aria-busy={thinking} className="panel transcript">
      <h2><span aria-hidden="true" className="panel-title-icon">💬</span> Conversation</h2>
      {lines.length === 0 && !thinking ? (
        <div className="empty empty-state conversation-empty"><span aria-hidden="true">👨‍🍳</span><p>Your food assistant is ready. Ask about the menu or start an order.</p></div>
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
                      <img alt={product.name} className="product-card-image" decoding="async" loading="lazy" src={productImage(product.name, product.category)} />
                      <div className="product-card-body">
                        <div className="product-card-heading">
                          <strong>{product.name}</strong>
                          <small>{product.category}</small>
                        </div>
                        <p>{product.description}</p>
                        <div className="product-action">
                          <strong>{money(product.price)}</strong>
                          <button disabled={disabled} onClick={() => onAddProduct(product.name)} type="button">
                            Add <span aria-hidden="true">+</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {line.order && (
                <div className="chat-order-confirmation">
                  <strong className="chat-order-title">Order placed successfully</strong>
                  <OrderCard className="chat-order-card" order={line.order} />
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div aria-label="Order assistant is thinking" className="message assistant thinking-message" role="status">
              <span>Order assistant</span>
              <div aria-hidden="true" className="chat-thinking-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          <div aria-hidden="true" className="conversation-end" />
        </div>
      )}
    </section>
  );
}
