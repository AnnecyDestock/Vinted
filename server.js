require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sharp = require("sharp");
const multer = require("multer");
const ExcelJS = require("exceljs");
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
const SELLER_DISPLAY_NAME = process.env.SELLER_DISPLAY_NAME || "mudonjo";
const ORDER_EMAIL_TO = process.env.ORDER_EMAIL_TO || "";
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
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  maxAge: 0,
  setHeaders: res => res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate")
}));

const COUNTRY_NAMES = {
  FWC:"FIFA World Cup",MEX:"Mexico",RSA:"South Africa",KOR:"South Korea",CZE:"Czechia",
  CAN:"Canada",BIH:"Bosnia and Herzegovina",QAT:"Qatar",SUI:"Switzerland",BRA:"Brazil",MAR:"Morocco",
  HAI:"Haiti",SCO:"Scotland",USA:"United States",PAR:"Paraguay",AUS:"Australia",TUR:"Türkiye",
  GER:"Germany",CUW:"Curaçao",CIV:"Ivory Coast",ECU:"Ecuador",NED:"Netherlands",JPN:"Japan",
  SWE:"Sweden",TUN:"Tunisia",BEL:"Belgium",EGY:"Egypt",IRN:"Iran",NZL:"New Zealand",
  ESP:"Spain",CPV:"Cape Verde",KSA:"Saudi Arabia",URU:"Uruguay",FRA:"France",SEN:"Senegal",
  IRQ:"Iraq",NOR:"Norway",ARG:"Argentina",ALG:"Algeria",AUT:"Austria",JOR:"Jordan",
  POR:"Portugal",COD:"DR Congo",UZB:"Uzbekistan",COL:"Colombia",ENG:"England",CRO:"Croatia",
  GHA:"Ghana",PAN:"Panama"
};
const COUNTRY_ORDER = Object.keys(COUNTRY_NAMES);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
}) : null;

function defaultInventory() {
  const rows = [];
  for (const [prefix, country] of Object.entries(COUNTRY_NAMES)) {
    if (prefix === "FWC") {
      for (let number = 0; number <= 20; number += 1) rows.push({ code: `FWC${String(number).padStart(2, "0")}`, country, quantity: number === 0 ? 1 : 2 });
      continue;
    }
    for (let number = 1; number <= 20; number += 1) {
      rows.push({ code: `${prefix}${number}`, country, quantity: number % 7 === 0 ? 0 : 2 + (number % 4) });
    }
  }
  return rows;
}

function priceFor(code) {
  if (code.startsWith("FWC")) return 1;
  if ([1,13].includes(Number(code.replace(/\D/g, "")))) return 0.5;
  return 0.3;
}

function discountFor(quantity) {
  if (quantity >= 200) return 0.15;
  if (quantity >= 100) return 0.10;
  if (quantity >= 50) return 0.07;
  if (quantity >= 30) return 0.05;
  return 0;
}

function calculate(items, prices = {}) {
  let quantity = 0;
  let subtotal = 0;
  for (const [code, rawQty] of Object.entries(items || {})) {
    const qty = Math.max(0, Math.floor(Number(rawQty) || 0));
    quantity += qty;
    subtotal += Number(prices[code] ?? priceFor(code)) * qty;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const discountRate = discountFor(quantity);
  const discount = Math.round(subtotal * discountRate * 100) / 100;
  const discounted = Math.round((subtotal - discount) * 100) / 100;
  const minimumApplied = quantity > 0 && discounted < 1;
  return { quantity, subtotal, discountRate, discount, minimumApplied, total: minimumApplied ? 1 : discounted };
}

function itemSort(a, b) {
  const prefixA = String(a).match(/^[A-Z]+/)?.[0] || "";
  const prefixB = String(b).match(/^[A-Z]+/)?.[0] || "";
  const countryDiff = COUNTRY_ORDER.indexOf(prefixA) - COUNTRY_ORDER.indexOf(prefixB);
  if (countryDiff) return countryDiff;
  return Number(String(a).match(/\d+$/)?.[0] || 0) - Number(String(b).match(/\d+$/)?.[0] || 0);
}

function groupedOrderItems(items) {
  const groups = [];
  for (const code of Object.keys(items || {}).sort(itemSort)) {
    const prefix = code.match(/^[A-Z]+/)?.[0] || "";
    let group = groups.find(item => item.prefix === prefix);
    if (!group) { group = { prefix, country: COUNTRY_NAMES[prefix] || prefix, cards: [] }; groups.push(group); }
    group.cards.push({ code, quantity: Number(items[code]) });
  }
  return groups;
}

function orderPlainText(order) {
  const groups = groupedOrderItems(order.items);
  return `Hello ${SELLER_DISPLAY_NAME},\n\nVinted user: @${String(order.username).replace(/^@/, "")}\n\nWants to buy ${order.quantity} cards with a value of €${Number(order.amount).toFixed(2)}.\n\nList:\n\n${groups.map(group => `${group.country}\n${group.cards.map(card => `${card.quantity}x - ${card.code}`).join("\n")}`).join("\n\n")}\n\nPlease contact this buyer via Vinted.`;
}

async function orderSheetJpeg(order) {
  const groups = groupedOrderItems(order.items);
  const lines = groups.flatMap(group => [group.country, ...group.cards.map(card => `   ${card.quantity}x   ${card.code}`), ""]);
  const width = 1100;
  const height = Math.max(650, 190 + lines.length * 34);
  const escapeXml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]));
  let y = 145;
  const rows = lines.map(line => {
    const isCountry = line && !line.startsWith("   ");
    const text = `<text x="${isCountry ? 72 : 92}" y="${y}" font-family="Arial, sans-serif" font-size="${isCountry ? 27 : 23}" font-weight="${isCountry ? 700 : 400}" fill="${isCountry ? "#0e6c61" : "#172b3a"}">${escapeXml(line)}</text>`;
    y += line ? 34 : 18;
    return text;
  }).join("");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fffefa"/><rect x="34" y="34" width="${width-68}" height="${height-68}" rx="28" fill="#f7faf8" stroke="#34d6b0" stroke-width="3"/><text x="72" y="92" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#081b2c">STICKER SELECTION</text>${rows}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function sendOrderEmail(order) {
  if (!mailer || !ORDER_EMAIL_TO) return { sent: false, reason: "Email is not configured." };
  const jpeg = await orderSheetJpeg(order);
  const groups = groupedOrderItems(order.items);
  const listHtml = groups.map(group => `<h3 style="margin:22px 0 7px;color:#0e6c61">${group.country}</h3>${group.cards.map(card => `<div style="padding:5px 0;border-bottom:1px solid #e6ece9">${card.quantity}x – <strong>${card.code}</strong></div>`).join("")}`).join("");
  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: ORDER_EMAIL_TO,
    subject: `New card request from @${String(order.username).replace(/^@/, "")} · €${Number(order.amount).toFixed(2)}`,
    text: orderPlainText(order),
    html: `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;background:#fffefa;color:#172b3a"><div style="padding:28px;background:#081b2c;color:white"><div style="color:#34d6b0;font-size:12px;letter-spacing:2px">ANNECY DESTOCK</div><h1 style="margin:8px 0 0">New sticker request</h1></div><div style="padding:28px"><p>Hello ${SELLER_DISPLAY_NAME},</p><p>Vinted user <strong>@${String(order.username).replace(/^@/, "")}</strong> wants to buy <strong>${order.quantity} cards</strong> with a value of <strong>€${Number(order.amount).toFixed(2)}</strong>.</p>${listHtml}<p style="margin-top:28px;padding:16px;background:#e8f8f3;border-radius:10px">Contact this buyer via Vinted. A listing-ready JPEG selection sheet is attached.</p></div></div>`,
    attachments: [{ filename: `sticker-selection-${order.id}.jpg`, content: jpeg, contentType: "image/jpeg" }]
  });
  return { sent: true };
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
      price NUMERIC(6,2),
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
  await pool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price NUMERIC(6,2)");
  await pool.query(`UPDATE inventory SET price=CASE
    WHEN code LIKE 'FWC%' THEN 1.00
    WHEN regexp_replace(code, '[^0-9]', '', 'g')::int IN (1,13) THEN 0.50
    ELSE 0.30 END WHERE price IS NULL`);
  const seed = defaultInventory();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM inventory WHERE NOT (regexp_replace(code, '[0-9]', '', 'g') = ANY($1))", [COUNTRY_ORDER]);
    for (let i = 0; i < seed.length; i += 1) {
      const row = seed[i];
      await client.query(`INSERT INTO inventory(code,country,quantity,price,sort_order) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(code) DO UPDATE SET country=EXCLUDED.country,sort_order=EXCLUDED.sort_order`, [row.code, row.country, row.quantity, priceFor(row.code), i]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/config", (_req, res) => res.json({ shopName: SHOP_NAME, sellerUsername: SELLER_USERNAME, adminUsername: ADMIN_USERNAME, emailConfigured: Boolean(mailer && ORDER_EMAIL_TO) }));
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
    const result = await pool.query("SELECT code,country,quantity,price::float AS price FROM inventory ORDER BY sort_order,code");
    res.json(result.rows);
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
    const prices = {};
    if (codes.length) {
      const stock = await pool.query("SELECT code,quantity,price::float AS price FROM inventory WHERE code=ANY($1)", [codes]);
      for (const row of stock.rows) {
        prices[row.code] = Number(row.price);
        const qty = Math.min(row.quantity, Math.max(0, Math.floor(Number(requested[row.code]) || 0)));
        if (qty > 0) valid[row.code] = qty;
      }
    }
    await pool.query(`INSERT INTO carts(username,items,updated_at) VALUES($1,$2,NOW())
      ON CONFLICT(username) DO UPDATE SET items=EXCLUDED.items,updated_at=NOW()`, [req.session.user.username.toLowerCase(), JSON.stringify(valid)]);
    res.json({ items: valid, totals: calculate(valid, prices) });
  } catch (error) { next(error); }
});

app.get("/api/orders/my", requireUser, async (req, res, next) => {
  try {
    const result = await pool.query("SELECT * FROM orders WHERE LOWER(username)=LOWER($1) ORDER BY created_at DESC", [req.session.user.username]);
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.post("/api/orders", requireUser, async (req, res, next) => {
  if (req.body.notifySeller !== true) return res.status(400).json({ error: "You must confirm that the seller may be notified by email." });
  const client = await pool.connect();
  let createdOrder;
  try {
    await client.query("BEGIN");
    const cartResult = await client.query("SELECT items FROM carts WHERE username=$1 FOR UPDATE", [req.session.user.username.toLowerCase()]);
    const items = cartResult.rows[0]?.items || {};
    if (!Object.keys(items).length) throw Object.assign(new Error("Your cart is empty."), { status: 400 });
    const stock = await client.query("SELECT code,quantity,price::float AS price FROM inventory WHERE code=ANY($1) FOR UPDATE", [Object.keys(items)]);
    const stockMap = Object.fromEntries(stock.rows.map(row => [row.code, row.quantity]));
    for (const [code, qty] of Object.entries(items)) {
      if (!stockMap[code] || stockMap[code] < qty) throw Object.assign(new Error(`${code} no longer has enough stock.`), { status: 409 });
    }
    const prices = Object.fromEntries(stock.rows.map(row => [row.code,Number(row.price)]));
    const totals = calculate(items, prices);
    for (const [code, qty] of Object.entries(items)) await client.query("UPDATE inventory SET quantity=quantity-$1 WHERE code=$2", [qty, code]);
    const list = Object.keys(items).sort(itemSort).map(code => Number(items[code]) > 1 ? `${code}(${items[code]})` : code).join(", ");
    const message = `Selection from ${req.session.user.username} for €${totals.total.toFixed(2)}, including: ${list}`;
    const result = await client.query(`INSERT INTO orders(username,items,quantity,subtotal,discount,amount,message)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.session.user.username, JSON.stringify(items), totals.quantity, totals.subtotal, totals.discount, totals.total, message]);
    await client.query("DELETE FROM carts WHERE username=$1", [req.session.user.username.toLowerCase()]);
    await client.query("COMMIT");
    createdOrder = result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally { client.release(); }
  try {
    const email = await sendOrderEmail(createdOrder);
    res.status(201).json({ ...createdOrder, emailSent: email.sent, emailWarning: email.sent ? null : email.reason });
  } catch (emailError) {
    console.error("Order email failed", emailError);
    res.status(201).json({ ...createdOrder, emailSent: false, emailWarning: "The reservation was saved, but the email could not be sent." });
  }
});

app.get("/api/admin/inventory/template", requireAdmin, async (_req, res, next) => {
  try {
    const rows = (await pool.query("SELECT code,country,quantity,price::float AS price FROM inventory ORDER BY sort_order,code")).rows;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory", { views: [{ state: "frozen", ySplit: 4 }] });
    sheet.columns = [{ header:"Card code",key:"code",width:18 },{ header:"Country",key:"country",width:30 },{ header:"Quantity",key:"quantity",width:16 },{ header:"Price EUR",key:"price",width:16 }];
    sheet.insertRow(1, ["ANNECY DESTOCK · INVENTORY IMPORT"]);
    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").font = { bold:true,size:18,color:{argb:"FFFFFFFF"} };
    sheet.getCell("A1").fill = { type:"pattern",pattern:"solid",fgColor:{argb:"FF081B2C"} };
    sheet.getCell("A2").value = "Edit the Quantity and Price EUR columns. Keep card codes unchanged, then upload this file in the admin dashboard.";
    sheet.mergeCells("A2:D2");
    sheet.getCell("A2").font = { italic:true,color:{argb:"FF536671"} };
    sheet.getRow(4).values = ["Card code","Country","Quantity","Price EUR"];
    sheet.getRow(4).font = { bold:true,color:{argb:"FF081B2C"} };
    sheet.getRow(4).fill = { type:"pattern",pattern:"solid",fgColor:{argb:"FF9FE8D6"} };
    rows.forEach(row => sheet.addRow([row.code,row.country,row.quantity,Number(row.price)]));
    sheet.autoFilter = `A4:D${sheet.rowCount}`;
    sheet.getColumn(3).numFmt = "0";
    sheet.getColumn(4).numFmt = '€0.00';
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="annecy-destock-inventory.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (error) { next(error); }
});

app.post("/api/admin/inventory/import", requireAdmin, upload.single("inventory"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error:"Choose an Excel file first." });
  const client = await pool.connect();
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.getWorksheet("Inventory") || workbook.worksheets[0];
    if (!sheet) throw Object.assign(new Error("The workbook has no Inventory sheet."), { status:400 });
    const items = [];
    sheet.eachRow((row, number) => {
      if (number <= 4) return;
      const code = String(row.getCell(1).text || "").trim().toUpperCase();
      const quantity = Number(row.getCell(3).value);
      const price = Number(row.getCell(4).value);
      if (code && Number.isInteger(quantity) && quantity >= 0 && quantity <= 9999 && price >= 0.10 && price <= 9.99) items.push({ code, quantity, price:Math.round(price*100)/100 });
    });
    if (!items.length) throw Object.assign(new Error("No valid inventory rows were found."), { status:400 });
    await client.query("BEGIN");
    let updated = 0;
    for (const item of items) {
      const result = await client.query("UPDATE inventory SET quantity=$1,price=$2 WHERE code=$3", [item.quantity,item.price,item.code]);
      updated += result.rowCount;
    }
    await client.query("COMMIT");
    res.json({ ok:true, updated });
  } catch (error) { await client.query("ROLLBACK"); next(error); }
  finally { client.release(); }
});

app.get("/api/admin/orders", requireAdmin, async (_req, res, next) => {
  try { res.json((await pool.query("SELECT * FROM orders ORDER BY created_at DESC")).rows); }
  catch (error) { next(error); }
});

app.patch("/api/admin/inventory/:code", requireAdmin, async (req, res, next) => {
  try {
    const quantity = Math.max(0, Math.min(9999, Math.floor(Number(req.body.quantity) || 0)));
    const price = Math.round(Math.max(0.10, Math.min(9.99, Number(req.body.price) || 0.30)) * 100) / 100;
    const result = await pool.query("UPDATE inventory SET quantity=$1,price=$2 WHERE code=$3 RETURNING code,country,quantity,price::float AS price", [quantity, price, req.params.code]);
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
      await client.query("INSERT INTO inventory(code,country,quantity,price,sort_order) VALUES($1,$2,$3,$4,$5)", [row.code,row.country,row.quantity,priceFor(row.code),i]);
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
