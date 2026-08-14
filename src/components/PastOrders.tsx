import type { PastOrder } from "../types";

const money = (value: string) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })
    .format(Number(value))
    .replace("PKR", "Rs.");

const date = (value: string) =>
  new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function OrderCard({ order, className = "" }: { order: PastOrder; className?: string }) {
  return (
    <article className={`order-card ${className}`.trim()}>
      <div className="order-heading">
        <div>
          <strong>{order.order_number}</strong>
          <small>{date(order.created_at)}</small>
        </div>
        <span className={`order-status status-${order.status}`}>{order.status}</span>
      </div>
      <ul>
        {order.items.map((item, index) => (
          <li key={`${order.order_number}-${index}`}>
            <span>{item.quantity} x {item.name}</span>
            <span>{money(item.line_total)}</span>
          </li>
        ))}
      </ul>
      <div className="order-total">
        <span>Total</span>
        <strong>{money(order.total)}</strong>
      </div>
    </article>
  );
}

export function PastOrders({
  orders,
  loading,
  className = "",
  headingId,
}: {
  orders: PastOrder[];
  loading: boolean;
  className?: string;
  headingId?: string;
}) {
  return (
    <section className={`panel orders-panel ${className}`.trim()}>
      <div className="panel-title">
        <h2 id={headingId}>Past orders</h2>
        {loading && <span className="muted">Refreshing...</span>}
      </div>
      {!orders.length ? (
        <p className="empty">Your completed orders will appear here.</p>
      ) : (
        <div className="order-history">
          {orders.map((order) => (
            <OrderCard key={order.order_number} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}
