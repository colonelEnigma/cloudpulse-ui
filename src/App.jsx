import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { useCart } from "@/cart/cart-context";
import { createOrder, getMyOrders, getOrderById, getPaymentByOrderId } from "@/checkout/api";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { apiConfig } from "@/config/api";
import { AUTH_EXPIRED_EVENT } from "@/lib/http";
import { AdminAccessDeniedPage } from "@/pages/admin/admin-access-denied-page";
import {
  AdminAiPage,
  AdminAuditPage,
  AdminIncidentsPage,
  AdminLogsPage,
  AdminResiliencePage,
} from "@/pages/admin/admin-extra-pages";
import {
  AdminDeploymentsPage,
  AdminOverviewPage,
  AdminServiceDetailPage,
} from "@/pages/admin/admin-read-pages";
import { getProducts } from "@/products/api";

function RequireAdmin({ children }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || role !== "admin") {
    return <AdminAccessDeniedPage />;
  }

  return children;
}

function HomePage() {
  const { isAuthenticated, user, role } = useAuth();

  return (
    <section className="space-y-4 py-10">
      <p className="text-sm text-muted-foreground">Phase 1 auth foundation is ready.</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Self-Healing Cloud Platform Shop
      </h1>
      <p className="max-w-2xl text-muted-foreground">
        Login and signup are now wired against user-service with JWT stored in localStorage and
        profile role loaded from the live API.
      </p>
      <div className="rounded-lg border bg-card p-4 text-left text-sm">
        <p className="font-medium">Auth status</p>
        <p className="text-muted-foreground">
          {isAuthenticated ? `Logged in as ${user?.email || "user"} (${role})` : "Not logged in"}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4 text-left text-sm text-muted-foreground">
        <p>API foundation loaded:</p>
        <p>users path: /api/users</p>
        <p>products path: /api/products</p>
        <p>{`control-plane path: ${apiConfig.controlPlane}`}</p>
        <p>{`control-plane ai path: ${apiConfig.controlPlaneAI}`}</p>
      </div>
    </section>
  );
}

const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#f4f4f5"/>
      <rect x="100" y="120" width="440" height="240" rx="18" fill="#e4e4e7"/>
      <text x="320" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#71717a">Product Image</text>
    </svg>`,
  );

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { notify } = useShopNotice();
  const price = Number(product.price || 0);

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <img
        src={PRODUCT_PLACEHOLDER}
        alt={`${product.name} placeholder`}
        className="h-48 w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-2 p-4">
        <h2 className="line-clamp-1 text-lg font-medium">{product.name}</h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {product.description || "No description available yet."}
        </p>
        <p className="text-xs text-muted-foreground">{product.category || "Uncategorized"}</p>
        <p className="text-base font-semibold">${price.toFixed(2)}</p>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            addToCart(product);
            notify(`${product.name} added to cart`);
          }}
        >
          Add to cart
        </Button>
      </div>
    </article>
  );
}

const ShopNoticeContext = createContext(null);

function ShopNoticeProvider({ children }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef(null);

  function notify(nextMessage) {
    setMessage(nextMessage);
    setVisible(true);

    window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 1800);
  }

  const value = useMemo(() => ({ notify }), []);

  return (
    <ShopNoticeContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-0 right-0 top-4 z-50 flex justify-center px-4">
        <div
          className={`rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg transition-all duration-500 ${
            visible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
        >
          {message}
        </div>
      </div>
    </ShopNoticeContext.Provider>
  );
}

function useShopNotice() {
  const context = useContext(ShopNoticeContext);
  if (!context) {
    throw new Error("useShopNotice must be used inside ShopNoticeProvider");
  }
  return context;
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    const unique = new Set(
      products.map((product) => (product.category || "Uncategorized").trim() || "Uncategorized"),
    );
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") {
      return products;
    }
    return products.filter(
      (product) =>
        ((product.category || "Uncategorized").trim() || "Uncategorized") === selectedCategory,
    );
  }, [products, selectedCategory]);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setError("");
      try {
        const data = await getProducts();
        const nextProducts = Array.isArray(data) ? data : [];
        setProducts(nextProducts);
        setSelectedCategory("All");
      } catch (loadError) {
        setError(loadError.message || "Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <section className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Products</h1>
        <p className="text-muted-foreground">Live catalog from product-service.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading products...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isLoading && !error && products.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {!isLoading && !error && products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products found.</p>
      ) : null}

      {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No products found in <span className="font-medium">{selectedCategory}</span>.
        </p>
      ) : null}

      {!isLoading && !error && filteredProducts.length > 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredProducts.length}</span> product(s) in{" "}
            <span className="font-medium">{selectedCategory}</span>
          </p>
        </div>
      ) : null}

      {!isLoading && !error && filteredProducts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();
  const [checkoutState, setCheckoutState] = useState({
    loading: false,
    error: "",
    success: "",
  });

  async function handleCheckout() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      return;
    }

    setCheckoutState({
      loading: true,
      error: "",
      success: "",
    });

    const orderItems = items.map((item) => ({
      product_id: item.id,
      quantity: Number(item.quantity),
    }));

    try {
      const order = await createOrder(orderItems);
      const orderId = order.order_id;
      const total = Number(order.total_amount || 0);

      clearCart();
      setCheckoutState({
        loading: false,
        error: "",
        success: `Order #${orderId} created successfully. Total: $${total.toFixed(2)}.`,
      });
    } catch (orderError) {
      setCheckoutState({
        loading: false,
        error: orderError.message || "Order creation failed. Please try again.",
        success: "",
      });
    }
  }

  return (
    <section className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cart</h1>
        <p className="text-muted-foreground">Review items and complete checkout.</p>
      </div>

      {items.length === 0 ? <p className="text-sm text-muted-foreground">Your cart is empty.</p> : null}

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-base font-medium">{item.name}</h2>
                <p className="text-sm text-muted-foreground">{item.category}</p>
                <p className="text-sm text-muted-foreground">${Number(item.price).toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="h-9 w-20 rounded-md border bg-background px-2 text-sm"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, event.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => removeFromCart(item.id)}>
                  Remove
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total</p>
        <p className="text-2xl font-semibold">${totalAmount.toFixed(2)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutState.loading || items.length === 0}
          >
            {checkoutState.loading ? "Processing checkout..." : "Checkout"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={clearCart}
            disabled={checkoutState.loading || items.length === 0}
          >
            Clear cart
          </Button>
        </div>
        {checkoutState.error ? (
          <p className="mt-3 text-sm text-destructive">{checkoutState.error}</p>
        ) : null}
        {checkoutState.success ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{checkoutState.success}</p>
        ) : null}
      </div>
    </section>
  );
}

function OrdersPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      if (!isAuthenticated) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const data = await getMyOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (loadError) {
        setError(loadError.message || "Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Orders</h1>
        <p className="text-sm text-muted-foreground">Please login to view your orders.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Orders</h1>
        <p className="text-muted-foreground">Your order history from order-service.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading orders...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isLoading && !error && orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : null}

      {!isLoading && !error && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{`Order #${order.id}`}</p>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{order.status}</p>
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View details
                  </Link>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {`Total: $${Number(order.total_amount || 0).toFixed(2)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Created: ${new Date(order.created_at).toLocaleString()}`}
              </p>
              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                  {order.items.map((item, index) => (
                    <p key={`${order.id}-${item.product_id}-${index}`} className="text-muted-foreground">
                      {`Product ${item.product_id} x ${item.quantity} @ $${Number(item.price || 0).toFixed(2)}`}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OrderDetailsPage() {
  const { orderId } = useParams();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrderDetails() {
      if (!isAuthenticated || !orderId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const [orderData, paymentData] = await Promise.all([
          getOrderById(orderId),
          getPaymentByOrderId(orderId),
        ]);
        setOrder(orderData);
        setPayment(paymentData);
      } catch (loadError) {
        setError(loadError.message || "Failed to load order details");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrderDetails();
  }, [isAuthenticated, orderId]);

  if (!isAuthenticated) {
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Order details</h1>
        <p className="text-sm text-muted-foreground">Please login to view order details.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{`Order #${orderId}`}</h1>
        <p className="text-muted-foreground">Order details and payment status.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading order details...</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!isLoading && !error && order ? (
        <article className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="font-medium">Status:</span> {order.status}
            </p>
            <p>
              <span className="font-medium">Total:</span> $
              {Number(order.total_amount || 0).toFixed(2)}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium">Created:</span>{" "}
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="font-medium">Items</p>
            {Array.isArray(order.items) && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <p key={`${order.id}-${item.product_id}-${index}`} className="text-sm text-muted-foreground">
                  {`Product ${item.product_id} x ${item.quantity} @ $${Number(item.price || 0).toFixed(2)}`}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No items found.</p>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="font-medium">Payment</p>
            {payment ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {`Status: ${payment.status || "unknown"}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {`Amount: $${Number(payment.amount || 0).toFixed(2)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {`Payment ID: ${payment.id}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Payment not found for this order.
              </p>
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Login" subtitle="Use your user-service credentials.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm">
          <span>Email</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Password</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signup({ name, email, password });
      navigate("/login", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create account" subtitle="Register a new user in user-service.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm">
          <span>Name</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Email</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Password</span>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function App() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleAuthExpired() {
      logout();
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [logout, navigate, location.pathname]);

  return (
    <ShopNoticeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader
          isAuthenticated={isAuthenticated}
          role={role}
          userEmail={user?.email}
          totalItems={totalItems}
          onLogout={logout}
        />
        <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Navigate to="/admin/overview" replace />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/overview"
              element={
                <RequireAdmin>
                  <AdminOverviewPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/deployments"
              element={
                <RequireAdmin>
                  <AdminDeploymentsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/services/:service"
              element={
                <RequireAdmin>
                  <AdminServiceDetailPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <RequireAdmin>
                  <AdminLogsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/incidents"
              element={
                <RequireAdmin>
                  <AdminIncidentsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/resilience"
              element={
                <RequireAdmin>
                  <AdminResiliencePage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/ai"
              element={
                <RequireAdmin>
                  <AdminAiPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <RequireAdmin>
                  <AdminAuditPage />
                </RequireAdmin>
              }
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </main>
      </div>
    </ShopNoticeProvider>
  );
}
