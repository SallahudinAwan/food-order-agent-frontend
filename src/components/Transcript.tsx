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
  return (
    <section className="panel transcript">
      <h2>Conversation</h2>
      {lines.length === 0 ? (
        <p className="empty">Your conversation will appear here.</p>
      ) : (
        <div className="messages">
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
        </div>
      )}
    </section>
  );
}
