import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
import { usePage } from "../hooks/usePage";
import { formatCurrency } from "../utils/format";
import { loginConRetorno } from "../utils/redireccion";
import { mensajeDeError } from "../api/errores";

type Notice = {
  message: string;
  onConfirm?: () => void | Promise<void>;
  // Botón principal distinto de "Confirmar" (ej. "Iniciar sesión")
  action?: { label: string; onClick: () => void };
} | null;

export default function Carrito() {
  usePage("Carrito | Clínica NutriDifs", "cart-page-body");
  const {
    cart,
    cartTotal,
    changeQuantity,
    removeFromCart,
    clearCart,
    checkout,
    getStock,
    session,
  } = useApp();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<Notice>(null);

  const pay = () => {
    if (cart.length === 0) {
      setNotice({ message: "Agrega al menos un producto antes de pagar." });
      return;
    }
    // Para comprar hay que iniciar sesión (la boleta queda en el historial del usuario).
    // El carrito se conserva: después del login se vuelve aquí.
    if (!session) {
      setNotice({
        message:
          "Debes iniciar sesión para comprar. Tu carrito se mantendrá guardado.",
        action: {
          label: "Iniciar sesión",
          onClick: () => navigate(loginConRetorno("/carrito")),
        },
      });
      return;
    }
    setNotice({
      message: `El total de tu compra es ${formatCurrency(cartTotal)}. ¿Deseas continuar con el pago?`,
      onConfirm: async () => {
        setNotice({ message: "Procesando tu compra..." });
        try {
          const boleta = await checkout(cart);
          setNotice({
            message:
              `¡Compra confirmada! Boleta ${boleta.number}: ${formatCurrency(boleta.total)} ` +
              `(neto ${formatCurrency(boleta.netAmount)} + IVA ${formatCurrency(boleta.taxAmount)}). Gracias por tu compra.`,
          });
        } catch (error) {
          // Ej. 409 "Stock insuficiente..." o "El precio cambió...": el carrito ya se ajustó al catálogo actual
          setNotice({
            message: mensajeDeError(error, (error as Error).message),
          });
        }
      },
    });
  };

  return (
    <main className="cart-page">
      <section className="cart-page-shell" aria-labelledby="cart-page-title">
        <div className="cart-page-header">
          <div>
            <p className="profile-kicker">Carrito</p>
            <h1 id="cart-page-title">Mis productos</h1>
          </div>
          <Link className="profile-back-link" to="/productos">
            Seguir comprando
          </Link>
        </div>

        <div className="cart-page-layout">
          <div className="cart-page-items-wrap">
            <div className="cart-page-items">
              {cart.map((product) => (
                <article className="cart-item" key={product.code}>
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : null}
                  <div className="cart-item-info">
                    <h2>{product.name}</h2>
                    <strong>{formatCurrency(product.price)}</strong>
                    <div className="cart-item-actions">
                      <button
                        className="btn"
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() => changeQuantity(product.code, -1)}
                      >
                        −
                      </button>
                      <span>{product.quantity}</span>
                      <button
                        className="btn"
                        type="button"
                        aria-label="Aumentar cantidad"
                        disabled={product.quantity >= getStock(product.code)}
                        onClick={() => changeQuantity(product.code, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn remove-cart-item"
                        onClick={() => removeFromCart(product.code)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="cart-page-empty" hidden={cart.length > 0}>
              Tu carrito está vacío.
            </p>
          </div>

          <div className="card cart-page-summary">
            <h2>Resumen</h2>
            <div className="cart-page-summary-row">
              <span>Productos</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </div>
            <button
              type="button"
              className="btn cart-page-button"
              onClick={clearCart}
            >
              Vaciar carrito
            </button>
            <button
              type="button"
              className="btn cart-page-button primary"
              onClick={pay}
            >
              Pagar
            </button>
            {!session && cart.length > 0 && !notice ? (
              <p className="cart-page-login-hint">
                Para pagar debes{" "}
                <Link to={loginConRetorno("/carrito")}>iniciar sesión</Link>.
              </p>
            ) : null}

            {notice ? (
              <div className="cart-notice" role="status">
                <p>{notice.message}</p>
                <div className="cart-notice-actions">
                  {notice.action ? (
                    <>
                      <button
                        type="button"
                        className="btn cart-page-button primary"
                        onClick={notice.action.onClick}
                      >
                        {notice.action.label}
                      </button>
                      <button
                        type="button"
                        className="btn cart-page-button"
                        onClick={() => setNotice(null)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : notice.onConfirm ? (
                    <>
                      <button
                        type="button"
                        className="btn cart-page-button primary"
                        onClick={notice.onConfirm}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        className="btn cart-page-button"
                        onClick={() => setNotice(null)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn cart-page-button"
                      onClick={() => setNotice(null)}
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
