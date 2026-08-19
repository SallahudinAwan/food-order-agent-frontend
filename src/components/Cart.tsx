import type { Cart as CartType } from "../types";
import { productImage } from "../productImages";

const money = (value: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value))
    .replace("PKR", "Rs.");

export function Cart({
  cart,
  loading,
  className = "",
  headingId,
  onChangeQuantity,
}: {
  cart: CartType | null;
  loading: boolean;
  className?: string;
  headingId?: string;
  onChangeQuantity: (itemId: number, quantity: number) => void;
}) {
  return (
    <section className={`panel cart ${className}`.trim()}>
      <div className="panel-title">
        <h2 id={headingId}><span aria-hidden="true" className="panel-title-icon">🛒</span> Current cart</h2>
        {loading && <span className="muted">Refreshing...</span>}
      </div>
      {!cart?.items.length ? (
        <div className="empty empty-state"><span aria-hidden="true">🥡</span><p>Your cart is hungry. Speak or type to add something delicious.</p></div>
      ) : (
        <>
          <div className="cart-lines">
            {cart.items.map((item) => (
              <div className="cart-line" key={item.id}>
                <img alt="" className="cart-product-image" decoding="async" loading="lazy" src={productImage(item.name)} />
                <div className="cart-line-details">
                  <div className="cart-line-copy">
                    <strong>{item.name}</strong>
                    <small>{money(item.unit_price)} each</small>
                  </div>
                  <div className="cart-line-bottom">
                    <div aria-label={`${item.name} quantity`} className="quantity-stepper">
                      <button aria-label={`Decrease ${item.name} quantity`} disabled={loading} onClick={() => onChangeQuantity(item.id, item.quantity - 1)} type="button">−</button>
                      <strong aria-live="polite">{item.quantity}</strong>
                      <button aria-label={`Increase ${item.name} quantity`} disabled={loading} onClick={() => onChangeQuantity(item.id, item.quantity + 1)} type="button">+</button>
                    </div>
                    <span className="cart-line-price">{money(item.line_total)}</span>
                    <button aria-label={`Remove ${item.name} from cart`} className="remove-cart-item" disabled={loading} onClick={() => onChangeQuantity(item.id, 0)} type="button">
                      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>
                    </button>
                  </div>
                </div>
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
