const $ = id => document.getElementById(id);
const state = { config: {}, user: null, inventory: [], cart: {}, orders: [], tab: "inventory" };
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
const safe = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
const priceFor = code => code === "FWC00" ? 2 : code.startsWith("FWC") || Number(code.replace(/\D/g, "")) === 1 ? .5 : .3;
const setLoading = value => $("loading").classList.toggle("hidden", !value);
let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function showView(id) {
  ["loginView", "customerView", "adminView"].forEach(view => $(view).classList.toggle("hidden", view !== id));
}

function calculate(items = state.cart) {
  let quantity = 0, subtotal = 0;
  Object.entries(items).forEach(([code, qty]) => { quantity += Number(qty); subtotal += priceFor(code) * Number(qty); });
  subtotal = Math.round(subtotal * 100) / 100;
  const rate = quantity >= 200 ? .15 : quantity >= 100 ? .1 : quantity >= 50 ? .07 : quantity >= 30 ? .05 : 0;
  const discount = Math.round(subtotal * rate * 100) / 100;
  const discounted = Math.round((subtotal - discount) * 100) / 100;
  const minimumApplied = quantity > 0 && quantity < 10 && discounted < 3;
  return { quantity, subtotal, discount, rate, minimumApplied, total: minimumApplied ? 3 : discounted };
}

async function login(event) {
  event.preventDefault();
  setLoading(true);
  try {
    const user = await api("/api/auth/login", { method: "POST", body: { username: $("username").value, password: $("password").value } });
    state.user = user;
    await enterApplication();
  } catch (error) { toast(error.message); }
  finally { setLoading(false); }
}

async function logout() {
  setLoading(true);
  try {
    await api("/api/auth/logout", { method: "POST" });
    state.user = null; state.cart = {}; state.orders = [];
    $("loginForm").reset(); $("passwordGroup").classList.add("hidden"); showView("loginView");
  } finally { setLoading(false); }
}

async function enterApplication() {
  const inventory = await api("/api/inventory");
  state.inventory = inventory;
  if (state.user.role === "admin") {
    state.orders = await api("/api/admin/orders");
    $("adminName").textContent = state.user.username;
    showView("adminView"); renderAdmin();
  } else {
    [state.cart, state.orders] = await Promise.all([api("/api/cart"), api("/api/orders/my")]);
    $("customerName").textContent = state.user.username;
    showView("customerView"); renderCustomer();
  }
}

function renderCustomer() {
  $("availableCount").textContent = state.inventory.reduce((sum, item) => sum + item.quantity, 0);
  renderCatalog(); renderCart(); renderOrderBanner();
}

function renderCatalog() {
  const query = $("catalogSearch").value.trim().toLowerCase();
  const visible = state.inventory.filter(item => !query || item.code.toLowerCase().includes(query) || item.country.toLowerCase().includes(query));
  const groups = Object.groupBy ? Object.groupBy(visible, item => item.country) : visible.reduce((all, item) => ((all[item.country] ||= []).push(item), all), {});
  $("resultCount").textContent = `${visible.filter(x => x.quantity > 0).length} card references in stock`;
  $("catalogRows").innerHTML = Object.entries(groups).map(([country, cards]) => `
    <section class="country-row"><div class="country-label"><strong>${safe(country)}</strong><small>${cards.filter(x => x.quantity > 0).length} available</small></div>
    <div class="card-grid">${cards.map(card => {
      const qty = Number(state.cart[card.code] || 0);
      return `<article class="card-tile ${qty ? "selected" : ""} ${card.quantity < 1 ? "sold" : ""}">
        <div class="card-top"><span>${safe(card.code)}</span><span class="chip">${money(card.price)}</span></div><div class="stock">${card.quantity ? `${card.quantity} in stock` : "Sold out"}</div>
        <div class="stepper"><button data-code="${safe(card.code)}" data-delta="-1" ${qty < 1 ? "disabled" : ""}>−</button><span>${qty}</span><button data-code="${safe(card.code)}" data-delta="1" ${qty >= card.quantity ? "disabled" : ""}>+</button></div></article>`;
    }).join("")}</div></section>`).join("") || `<div class="cart-empty">No cards match your search.</div>`;
  $("catalogRows").querySelectorAll("button[data-code]").forEach(button => button.onclick = () => changeCart(button.dataset.code, Number(button.dataset.delta)));
}

async function changeCart(code, delta) {
  const card = state.inventory.find(item => item.code === code);
  const next = Math.max(0, Math.min(card?.quantity || 0, Number(state.cart[code] || 0) + delta));
  if (next) state.cart[code] = next; else delete state.cart[code];
  renderCatalog(); renderCart();
  try { state.cart = (await api("/api/cart", { method: "PUT", body: { items: state.cart } })).items; }
  catch (error) { toast(error.message); }
}

function renderCart() {
  const entries = Object.entries(state.cart);
  const totals = calculate();
  $("cartBadge").textContent = totals.quantity;
  $("cartList").innerHTML = entries.length ? entries.map(([code, qty]) => `<div class="cart-line"><div><strong>${safe(code)}</strong><small>${qty} × ${money(priceFor(code))}</small></div><strong>${money(qty * priceFor(code))}</strong></div>`).join("") : `<div class="cart-empty">Your vault is empty.<br><small>Add cards from the catalogue.</small></div>`;
  $("subtotal").textContent = money(totals.subtotal); $("discount").textContent = `−${money(totals.discount)}`; $("total").textContent = money(totals.total);
  $("discountRow").classList.toggle("hidden", !totals.discount); $("minimumNote").classList.toggle("hidden", !totals.minimumApplied);
  $("orderBtn").disabled = !entries.length; $("clearCart").disabled = !entries.length;
}

function renderOrderBanner() {
  const pending = state.orders.find(order => order.status === "pending");
  $("orderBanner").classList.toggle("hidden", !pending);
  if (pending) $("orderBanner").innerHTML = `<strong>You have a pending reservation.</strong> ${pending.quantity} cards · ${money(pending.amount)} · Send its message to <strong>${safe(state.config.sellerUsername)}</strong> on Vinted.`;
}

async function clearCart() {
  state.cart = {}; renderCatalog(); renderCart();
  await api("/api/cart", { method: "PUT", body: { items: {} } });
}

async function createOrder() {
  const totals = calculate();
  openModal(`<p class="eyebrow mint">CONFIRM RESERVATION</p><h2>Reserve ${totals.quantity} cards?</h2><p>Your total is <strong>${money(totals.total)}</strong>. Stock will be reserved immediately.</p><div class="modal-actions"><button class="button secondary" data-close>Go back</button><button id="confirmOrder" class="button primary">Confirm reservation</button></div>`);
  $("confirmOrder").onclick = async () => {
    setLoading(true);
    try {
      const order = await api("/api/orders", { method: "POST" });
      state.cart = {}; state.orders.unshift(order); state.inventory = await api("/api/inventory");
      openModal(`<p class="eyebrow mint">RESERVATION CONFIRMED</p><h2>Your cards are reserved!</h2><p>Copy this message and send it to <strong>${safe(state.config.sellerUsername)}</strong> in Vinted messages.</p><div id="orderMessage" class="message-box">${safe(order.message)}</div><button id="copyMessage" class="button primary wide">Copy Vinted message <span>⧉</span></button>`);
      $("copyMessage").onclick = () => copyText(order.message);
      renderCustomer();
    } catch (error) { closeModal(); toast(error.message); }
    finally { setLoading(false); }
  };
}

function renderAdmin() { renderStats(); renderInventory(); renderBulkCountry(); renderOrders(); switchTab(state.tab); }
function renderStats() {
  const pending = state.orders.filter(o => o.status === "pending");
  const values = [["Card references",state.inventory.length],["Units in stock",state.inventory.reduce((s,x)=>s+x.quantity,0)],["Pending orders",pending.length],["Pending value",money(pending.reduce((s,x)=>s+Number(x.amount),0))]];
  $("stats").innerHTML = values.map(([label,value]) => `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderInventory() {
  const query = $("inventorySearch").value.trim().toLowerCase();
  $("inventoryBody").innerHTML = state.inventory.filter(x => !query || x.code.toLowerCase().includes(query) || x.country.toLowerCase().includes(query)).map(card => `<tr><td><strong>${safe(card.code)}</strong></td><td>${safe(card.country)}</td><td>${money(card.price)}</td><td><div class="stock-edit"><button data-stock="${safe(card.code)}" data-delta="-1">−</button><input data-input="${safe(card.code)}" type="number" min="0" value="${card.quantity}"><button data-stock="${safe(card.code)}" data-delta="1">+</button></div></td></tr>`).join("");
  $("inventoryBody").querySelectorAll("button[data-stock]").forEach(btn => btn.onclick = () => setStock(btn.dataset.stock, Number(btn.dataset.delta), true));
  $("inventoryBody").querySelectorAll("input[data-input]").forEach(input => input.onchange = () => setStock(input.dataset.input, Number(input.value), false));
}

async function setStock(code, value, relative) {
  const card = state.inventory.find(x => x.code === code); const quantity = Math.max(0, relative ? card.quantity + value : value);
  try { const updated = await api(`/api/admin/inventory/${code}`, { method:"PATCH", body:{ quantity } }); Object.assign(card, updated); renderStats(); renderInventory(); }
  catch (error) { toast(error.message); }
}

function renderBulkCountry() {
  const countries = [...new Set(state.inventory.map(x => x.country))];
  if (!$("countrySelect").options.length) $("countrySelect").innerHTML = countries.map(c => `<option>${safe(c)}</option>`).join("");
  renderBulkGrid();
}
function renderBulkGrid() {
  const cards = state.inventory.filter(x => x.country === $("countrySelect").value);
  $("bulkGrid").innerHTML = cards.map(card => `<label class="bulk-item"><input type="checkbox" data-bulk="${safe(card.code)}"><strong>${safe(card.code)}</strong><input type="number" min="1" max="999" value="1" disabled></label>`).join("");
  $("bulkGrid").querySelectorAll("input[type=checkbox]").forEach(box => box.onchange = () => { box.parentElement.querySelector("input[type=number]").disabled = !box.checked; });
}
async function bulkAdd() {
  const items = {}; $("bulkGrid").querySelectorAll("input[data-bulk]:checked").forEach(box => items[box.dataset.bulk] = Number(box.parentElement.querySelector("input[type=number]").value));
  if (!Object.keys(items).length) return toast("Select at least one card.");
  setLoading(true); try { await api("/api/admin/inventory/bulk", { method:"POST", body:{ items } }); state.inventory = await api("/api/inventory"); renderAdmin(); toast("Stock added."); } catch(error){toast(error.message)} finally{setLoading(false)}
}

function renderOrders() {
  const query = $("orderSearch").value.trim().toLowerCase();
  const orders = state.orders.filter(o => !query || o.username.toLowerCase().includes(query) || Object.keys(o.items).join(" ").toLowerCase().includes(query));
  $("ordersGrid").innerHTML = orders.map(order => `<article class="order-card"><div class="order-head"><div><h3>${safe(order.username)}</h3><span class="badge ${order.status}">${safe(order.status.toUpperCase())}</span> <span class="muted">${new Date(order.created_at).toLocaleString()}</span></div><strong>${money(order.amount)}</strong></div><div class="order-items">${safe(Object.entries(order.items).map(([c,q])=>q>1?`${c}(${q})`:c).join(", "))}</div><div class="order-actions"><button class="button secondary" data-copy="${order.id}">Copy message</button>${order.status === "pending" ? `<button class="button primary" data-status="paid" data-id="${order.id}">Confirm payment</button><button class="button danger" data-status="cancelled" data-id="${order.id}">Cancel & restore</button>` : ""}</div></article>`).join("") || `<div class="cart-empty panel">No orders found.</div>`;
  $("ordersGrid").querySelectorAll("button[data-copy]").forEach(btn => btn.onclick = () => copyText(state.orders.find(x=>x.id===btn.dataset.copy).message));
  $("ordersGrid").querySelectorAll("button[data-status]").forEach(btn => btn.onclick = () => updateOrder(btn.dataset.id, btn.dataset.status));
}

async function updateOrder(id, status) {
  const label = status === "paid" ? "confirm this payment" : "cancel this order and restore its stock";
  if (!confirm(`Are you sure you want to ${label}?`)) return;
  setLoading(true); try { const updated = await api(`/api/admin/orders/${id}/status`, { method:"PATCH", body:{status} }); state.orders[state.orders.findIndex(x=>x.id===id)] = updated; state.inventory = await api("/api/inventory"); renderAdmin(); toast("Order updated."); } catch(error){toast(error.message)} finally{setLoading(false)}
}

function switchTab(tab) {
  state.tab = tab; document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $("inventoryTab").classList.toggle("hidden", tab !== "inventory"); $("addTab").classList.toggle("hidden", tab !== "add"); $("ordersTab").classList.toggle("hidden", tab !== "orders");
}
function openModal(html) { $("modalBody").innerHTML = html; $("modal").classList.remove("hidden"); $("modal").querySelectorAll("[data-close]").forEach(x=>x.onclick=closeModal); }
function closeModal() { $("modal").classList.add("hidden"); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); toast("Copied to clipboard."); } catch { toast("Select and copy the message manually."); } }

$("loginForm").addEventListener("submit", login);
$("username").addEventListener("input", () => $("passwordGroup").classList.toggle("hidden", $("username").value.trim().toLowerCase() !== String(state.config.adminUsername).toLowerCase()));
document.querySelectorAll(".logout").forEach(button => button.onclick = logout);
$("catalogSearch").oninput = renderCatalog; $("clearCart").onclick = clearCart; $("orderBtn").onclick = createOrder;
$("inventorySearch").oninput = renderInventory; $("countrySelect").onchange = renderBulkGrid; $("bulkAdd").onclick = bulkAdd; $("orderSearch").oninput = renderOrders;
document.querySelectorAll(".tabs button").forEach(button => button.onclick = () => switchTab(button.dataset.tab));
$("copyPending").onclick = () => { const messages = state.orders.filter(x=>x.status==="pending").map(x=>x.message); messages.length ? copyText(messages.join("\n\n")) : toast("No pending orders."); };
$("resetDatabase").onclick = async () => { if (!confirm("This permanently erases every cart and order and restores the sample inventory. Continue?")) return; setLoading(true); try{await api("/api/admin/reset",{method:"POST"});state.inventory=await api("/api/inventory");state.orders=[];renderAdmin();toast("Database reset.")}catch(e){toast(e.message)}finally{setLoading(false)}};
$("modalClose").onclick = closeModal; $("modal").onclick = event => { if (event.target === $("modal")) closeModal(); };

(async function init() {
  setLoading(true);
  try {
    state.config = await api("/api/config");
    document.title = state.config.shopName; $("loginTitle").textContent = state.config.shopName; document.querySelectorAll(".shop-name").forEach(x => x.textContent = state.config.shopName);
    state.user = (await api("/api/auth/me")).user;
    if (state.user) await enterApplication(); else showView("loginView");
  } catch (error) { toast("The application could not start. Check the database connection."); }
  finally { setLoading(false); }
})();
