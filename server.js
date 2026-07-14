require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

const SHOP_NAME = process.env.SHOP_NAME || "Card Vault";
const SELLER_USERNAME = process.env.SELLER_USERNAME || "your_vinted_username";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-before-deployment";

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  name: "cardvault.sid",
  secret: process.env.SESSION_SECRET || "development-only-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(express.static(path.join(__dirname, "public"), { maxAge: isProduction ? "1h" : 0 }));

const COUNTRY_NAMES = {
  ARG: "Argentina", BRA: "Brazil", ENG: "England", FRA: "France",
  GER: "Germany", ITA: "Italy", NED: "Netherlands", POR: "Portugal",
  ESP: "Spain", BEL: "Belgium", CRO: "Croatia", MAR: "Morocco"
};

function defaultInventory() {
  const rows = [];
  for (const [prefix, country] of Object.entries(COUNTRY_NAMES)) {
    for (let number = 1; number <= 20; number += 1) {
      rows.push({ code: `${prefix}${number}`, country, quantity: number % 7 === 0 ? 0 : 2 + (number % 4) });
    }
  }
  for (let number = 0; number <= 20; number += 1) {
    rows.push({ code: `FWC${String(number).padStart(2, "0")}`, country: "Special cards", quantity: number === 0 ? 1 : 2 });
  }
  return rows;
}

function priceFor(code) {
  if (code === "FWC00") return 2;
  if (code.startsWith("FWC") || Number(code.replace(/\D/g, "")) === 1) return 0.5;
  return 0.3;
}

function discountFor(quantity) {
  if (quantity >= 200) return 0.15;
  if (quantity >= 100) return 0.10;
  if (quantity >= 50) return 0.07;
  if (quantity >= 30) return 0.05;
  return 0;
}

function calculate(items) {
  let quantity = 0;
  let subtotal = 0;
  for (const [code, rawQty] of Object.entries(items || {})) {
    const qty = Math.max(0, Math.floor(Number(rawQty) || 0));
    quantity += qty;
    subtotal += priceFor(code) * qty;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const discountRate = discountFor(quantity);
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const discounted = Math.round((subtotal - discount) * 100) / 100;
  const minimumApplied = quantity > 0 && quantity < 10 && discounted < 3;
  return { quantity, subtotal, discountRate, discount, minimumApplied, total: minimumApplied ? 3 : discounted };
}

function cleanUsername(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 60);
}

function requireUser(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Please sign in first." });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") return res.status(403).json({ error: "Administrator access required." });
  next();
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      code VARCHAR(20) PRIMARY KEY,
      country VARCHAR(80) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS carts (
      username VARCHAR(60) PRIMARY KEY,
      items JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(60) NOT NULL,
      items JSONB NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL,
      discount NUMERIC(10,2) NOT NULL DEFAULT 0,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  const count = await pool.query("SELECT COUNT(*)::int AS count FROM inventory");
  if (count.rows[0].count === 0) {
    const seed = defaultInventory();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < seed.length; i += 1) {
        const row = seed[i];
        await client.query("INSERT INTO inventory(code,country,quantity,sort_order) VALUES($1,$2,$3,$4)", [row.code, row.country, row.quantity, i]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/config", (_req, res) => res.json({ shopName: SHOP_NAME, sellerUsername: SELLER_USERNAME, adminUsername: ADMIN_USERNAME }));
app.get("/api/auth/me", (req, res) => res.json({ user: req.session.user || null }));

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const username = cleanUsername(req.body.username);
    if (!username) return res.status(400).json({ error: "Enter a valid username." });
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      const valid = await bcrypt.compare(String(req.body.password || ""), await bcrypt.hash(ADMIN_PASSWORD, 10));
      if (!valid) return res.status(401).json({ error: "Incorrect administrator password." });
      req.session.user = { username: ADMIN_USERNAME, role: "admin" };
    } else {
      req.session.user = { username, role: "customer" };
    }
    res.json(req.session.user);
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", (req, res, next) => req.session.destroy(error => error ? next(error) : res.json({ ok: true })));

app.get("/api/inventory", requireUser, async (_req, res, next) => {
  try {
    const result = await pool.query("SELECT code,country,quantity FROM inventory ORDER BY sort_order,code");
    res.json(result.rows.map(row => ({ ...row, price: priceFor(row.code) })));
  } catch (error) { next(error); }
});

app.get("/api/cart", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT items FROM carts WHERE username=$1", [req.session.user.username.toLowerCase()]);
    res.json(result.rows[0]?.items || {});
  } catch (error) { next(error); }
});

app.put("/api/cart", requireUser, async (req, res, next) => {
  try {
    const requested = req.body.items || {};
    const codes = Object.keys(requested);
    const valid = {};
    if (codes.length) {
      const stock = await pool.query("SELECT code,quantity FROM inventory WHERE code=ANY($1)", [codes]);
      for (const row of stock.rows) {
        const qty = Math.min(row.quantity, Math.max(0, Math.floor(Number(requested[row.code]) || 0)));
        if (qty > 0) valid[row.code] = qty;
      }
    }
    await pool.query(`INSERT INTO carts(username,items,updated_at) VALUES($1,$2,NOW())
      ON CONFLICT(username) DO UPDATE SET items=EXCLUDED.items,updated_at=NOW()`, [req.session.user.username.toLowerCase(), JSON.stringify(valid)]);
    res.json({ items: valid, totals: calculate(valid) });
  } catch (error) { next(error); }
});

app.get("/api/orders/my", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM orders WHERE LOWER(username)=LOWER($1) ORDER BY created_at DESC", [req.session.user.username]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post("/api/orders", requireUser, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cartResult = await client.query("SELECT items FROM carts WHERE username=$1 FOR UPDATE", [req.session.user.username.toLowerCase()]);
    const items = cartResult.rows[0]?.items || {};
    if (!Object.keys(items).length) throw Object.assign(new Error("Your cart is empty."), { status: 400 });
    const stock = await client.query("SELECT code,quantity FROM inventory WHERE code=ANY($1) FOR UPDATE", [Object.keys(items)]);
    const stockMap = Object.fromEntries(stock.rows.map(row => [row.code, row.quantity]));
    for (const [code, qty] of Object.entries(items)) {
      if (!stockMap[code] || stockMap[code] < qty) throw Object.assign(new Error(`${code} no longer has enough stock.`), { status: 409 });
    }
    const totals = calculate(items);
    for (const [code, qty] of Object.entries(items)) await client.query("UPDATE inventory SET quantity=quantity-$1 WHERE code=$2", [qty, code]);
    const list = Object.entries(items).map(([code, qty]) => qty > 1 ? `${code}(${qty})` : code).join(", ");
    const message = `Selection from ${req.session.user.username} for €${totals.total.toFixed(2)}, including: ${list}`;
    const result = await client.query(`INSERT INTO orders(username,items,quantity,subtotal,discount,amount,message)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.session.user.username, JSON.stringify(items), totals.quantity, totals.subtotal, totals.discount, totals.total, message]);
    await client.query("DELETE FROM carts WHERE username=$1", [req.session.user.username.toLowerCase()]);
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally { client.release(); }
});

app.get("/api/admin/orders", requireAdmin, async (_req, res, next) => {
  try { res.json((await pool.query("SELECT * FROM orders ORDER BY created_at DESC")).rows); }
  catch (error) { next(error); }
});

app.patch("/api/admin/inventory/:code", requireAdmin, async (req, res, next) => {
  try {
    const quantity = Math.max(0, Math.min(9999, Math.floor(Number(req.body.quantity) || 0)));
    const result = await pool.query("UPDATE inventory SET quantity=$1 WHERE code=$2 RETURNING code,country,quantity", [quantity, req.params.code]);
    if (!result.rowCount) return res.status(404).json({ error: "Card not found." });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

app.post("/api/admin/inventory/bulk", requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [code, rawQty] of Object.entries(req.body.items || {})) {
      const qty = Math.max(0, Math.min(999, Math.floor(Number(rawQty) || 0)));
      if (qty) await client.query("UPDATE inventory SET quantity=quantity+$1 WHERE code=$2", [qty, code]);
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); next(error); }
  finally { client.release(); }
});

app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res, next) => {
  const status = String(req.body.status || "");
  if (!['paid', 'cancelled'].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [req.params.id]);
    const order = found.rows[0];
    if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
    if (order.status !== "pending") throw Object.assign(new Error("Only pending orders can be changed."), { status: 409 });
    if (status === "cancelled") {
      for (const [code, qty] of Object.entries(order.items)) await client.query("UPDATE inventory SET quantity=quantity+$1 WHERE code=$2", [qty, code]);
    }
    const updated = await client.query("UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *", [status, req.params.id]);
    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); next(error); }
  finally { client.release(); }
});

app.post("/api/admin/reset", requireAdmin, async (_req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE orders,carts,inventory");
    const seed = defaultInventory();
    for (let i = 0; i < seed.length; i += 1) {
      const row = seed[i];
      await client.query("INSERT INTO inventory(code,country,quantity,sort_order) VALUES($1,$2,$3,$4)", [row.code,row.country,row.quantity,i]);
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); next(error); }
  finally { client.release(); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : "Something went wrong." });
});

initializeDatabase()
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log(`${SHOP_NAME} running on port ${PORT}`)))
  .catch(error => { console.error("Database initialization failed", error); process.exit(1); });
