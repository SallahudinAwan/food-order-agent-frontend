import type { Cart as CartType } from "../types";

const money = (value: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value))
    .replace("PKR", "Rs.");

export function Cart({
  cart,
  loading,
  className = "",
  headingId,
}: {
  cart: CartType | null;
  loading: boolean;
  className?: string;
  headingId?: string;
}) {
  return (
    <section className={`panel cart ${className}`.trim()}>
      <div className="panel-title">
        <h2 id={headingId}>Current cart</h2>
        {loading && <span className="muted">Refreshing...</span>}
      </div>
      {!cart?.items.length ? (
        <p className="empty">Your cart is empty. Speak or type to start an order.</p>
      ) : (
        <>
          <div className="cart-lines">
            {cart.items.map((item) => (
              <div className="cart-line" key={item.id}>
                <div>
                  <strong>{item.quantity} x {item.name}</strong>
                  <small>{money(item.unit_price)} each</small>
                </div>
                <span>{money(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="total">
            <span>Total</span>
            <strong>{money(cart.total)}</strong>
          </div>
        </>
      )}
    </section>
  );
}
