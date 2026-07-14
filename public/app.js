const $ = id => document.getElementById(id);
const state = { config: {}, user: null, inventory: [], cart: {}, orders: [], tab: "inventory" };
const translations = {
  en:{tagline:"COLLECT · TRADE · COMPLETE",loginLead:"Build your selection from the cards currently available, then send a request to the seller.",language:"LANGUAGE",username:"YOUR VINTED USERNAME",enter:"Enter the vault",liveInventory:"Inventory updates in real time",heroTitle:"Find the cards your collection needs.",heroLead:"Only cards currently in stock can be reserved.",minimumNote:"Minimum order total: €1.00.",reserve:"Send my request"},
  fr:{tagline:"COLLECTIONNER · ÉCHANGER · COMPLÉTER",loginLead:"Composez votre sélection parmi les cartes disponibles, puis envoyez une demande au vendeur.",language:"LANGUE",username:"VOTRE PSEUDO VINTED",enter:"Entrer dans la collection",liveInventory:"Stock mis à jour en temps réel",heroTitle:"Trouvez les cartes qu’il manque à votre collection.",heroLead:"Seules les cartes en stock peuvent être réservées.",minimumNote:"Montant minimum de commande : 1,00 €.",reserve:"Envoyer ma demande"},
  de:{tagline:"SAMMELN · TAUSCHEN · VERVOLLSTÄNDIGEN",loginLead:"Wähle verfügbare Karten aus und sende dem Verkäufer eine Anfrage.",language:"SPRACHE",username:"DEIN VINTED-BENUTZERNAME",enter:"Sammlung öffnen",liveInventory:"Bestand wird live aktualisiert",heroTitle:"Finde die Karten, die deiner Sammlung fehlen.",heroLead:"Nur vorrätige Karten können reserviert werden.",minimumNote:"Mindestbestellwert: 1,00 €.",reserve:"Anfrage senden"},
  es:{tagline:"COLECCIONA · INTERCAMBIA · COMPLETA",loginLead:"Elige las cartas disponibles y envía una solicitud al vendedor.",language:"IDIOMA",username:"TU USUARIO DE VINTED",enter:"Entrar a la colección",liveInventory:"Inventario actualizado en tiempo real",heroTitle:"Encuentra las cartas que necesita tu colección.",heroLead:"Solo se pueden reservar cartas disponibles.",minimumNote:"Pedido mínimo: 1,00 €.",reserve:"Enviar mi solicitud"},
  it:{tagline:"COLLEZIONA · SCAMBIA · COMPLETA",loginLead:"Scegli le carte disponibili e invia una richiesta al venditore.",language:"LINGUA",username:"IL TUO NOME VINTED",enter:"Entra nella collezione",liveInventory:"Inventario aggiornato in tempo reale",heroTitle:"Trova le carte che mancano alla tua collezione.",heroLead:"Si possono prenotare solo carte disponibili.",minimumNote:"Ordine minimo: 1,00 €.",reserve:"Invia la richiesta"},
  nl:{tagline:"VERZAMEL · RUIL · VOLTOOI",loginLead:"Kies beschikbare kaarten en stuur de verkoper een aanvraag.",language:"TAAL",username:"JE VINTED-GEBRUIKERSNAAM",enter:"Open de collectie",liveInventory:"Voorraad wordt live bijgewerkt",heroTitle:"Vind de kaarten die je verzameling nodig heeft.",heroLead:"Alleen kaarten op voorraad kunnen worden gereserveerd.",minimumNote:"Minimale bestelling: €1,00.",reserve:"Mijn aanvraag sturen"},
  pt:{tagline:"COLECIONA · TROCA · COMPLETA",loginLead:"Escolhe os cartões disponíveis e envia um pedido ao vendedor.",language:"IDIOMA",username:"O TEU UTILIZADOR VINTED",enter:"Entrar na coleção",liveInventory:"Inventário atualizado em tempo real",heroTitle:"Encontra os cartões que faltam na tua coleção.",heroLead:"Apenas cartões disponíveis podem ser reservados.",minimumNote:"Pedido mínimo: 1,00 €.",reserve:"Enviar pedido"},
  pl:{tagline:"ZBIERAJ · WYMIENIAJ · UZUPEŁNIAJ",loginLead:"Wybierz dostępne karty i wyślij zapytanie sprzedawcy.",language:"JĘZYK",username:"TWOJA NAZWA VINTED",enter:"Otwórz kolekcję",liveInventory:"Stan magazynu aktualizowany na żywo",heroTitle:"Znajdź karty potrzebne w Twojej kolekcji.",heroLead:"Rezerwować można tylko dostępne karty.",minimumNote:"Minimalna wartość zamówienia: 1,00 €.",reserve:"Wyślij zapytanie"},
  cs:{tagline:"SBÍREJ · VYMĚŇUJ · DOPLŇUJ",loginLead:"Vyberte dostupné karty a odešlete žádost prodejci.",language:"JAZYK",username:"VAŠE JMÉNO NA VINTED",enter:"Vstoupit do sbírky",liveInventory:"Sklad se aktualizuje živě",heroTitle:"Najděte karty, které vaší sbírce chybí.",heroLead:"Rezervovat lze pouze dostupné karty.",minimumNote:"Minimální objednávka: 1,00 €.",reserve:"Odeslat žádost"},
  sk:{tagline:"ZBIERAJ · VYMIEŇAJ · DOPĹŇAJ",loginLead:"Vyberte dostupné karty a odošlite žiadosť predajcovi.",language:"JAZYK",username:"VAŠE MENO NA VINTED",enter:"Vstúpiť do zbierky",liveInventory:"Sklad sa aktualizuje naživo",heroTitle:"Nájdite karty, ktoré vašej zbierke chýbajú.",heroLead:"Rezervovať možno iba dostupné karty.",minimumNote:"Minimálna objednávka: 1,00 €.",reserve:"Odoslať žiadosť"},
  hu:{tagline:"GYŰJTS · CSERÉLJ · TELJESÍTS",loginLead:"Válaszd ki az elérhető kártyákat, és küldj kérést az eladónak.",language:"NYELV",username:"VINTED FELHASZNÁLÓNEVED",enter:"Belépés a gyűjteménybe",liveInventory:"Élő készletfrissítés",heroTitle:"Találd meg a gyűjteményedből hiányzó kártyákat.",heroLead:"Csak készleten lévő kártyák foglalhatók.",minimumNote:"Minimum rendelés: 1,00 €.",reserve:"Kérés küldése"},
  sv:{tagline:"SAMLA · BYT · KOMPLETTERA",loginLead:"Välj tillgängliga kort och skicka en förfrågan till säljaren.",language:"SPRÅK",username:"DITT VINTED-NAMN",enter:"Öppna samlingen",liveInventory:"Lagret uppdateras i realtid",heroTitle:"Hitta korten som din samling behöver.",heroLead:"Endast kort i lager kan reserveras.",minimumNote:"Minsta beställning: 1,00 €.",reserve:"Skicka förfrågan"},
  da:{tagline:"SAML · BYT · FULDFØR",loginLead:"Vælg tilgængelige kort og send en forespørgsel til sælgeren.",language:"SPROG",username:"DIT VINTED-NAVN",enter:"Åbn samlingen",liveInventory:"Lager opdateres i realtid",heroTitle:"Find kortene din samling mangler.",heroLead:"Kun kort på lager kan reserveres.",minimumNote:"Minimumsbestilling: 1,00 €.",reserve:"Send forespørgsel"},
  fi:{tagline:"KERÄÄ · VAIHDA · TÄYDENNÄ",loginLead:"Valitse saatavilla olevat kortit ja lähetä pyyntö myyjälle.",language:"KIELI",username:"VINTED-KÄYTTÄJÄNIMESI",enter:"Avaa kokoelma",liveInventory:"Varasto päivittyy reaaliajassa",heroTitle:"Löydä kokoelmastasi puuttuvat kortit.",heroLead:"Vain varastossa olevia kortteja voi varata.",minimumNote:"Minimitilaus: 1,00 €.",reserve:"Lähetä pyyntö"},
  ro:{tagline:"COLECȚIONEAZĂ · SCHIMBĂ · COMPLETEAZĂ",loginLead:"Alege cartonașele disponibile și trimite o cerere vânzătorului.",language:"LIMBĂ",username:"NUMELE TĂU VINTED",enter:"Intră în colecție",liveInventory:"Stoc actualizat în timp real",heroTitle:"Găsește cartonașele care lipsesc din colecția ta.",heroLead:"Pot fi rezervate doar cartonașele disponibile.",minimumNote:"Comandă minimă: 1,00 €.",reserve:"Trimite cererea"},
  hr:{tagline:"PRIKUPLJAJ · MIJENJAJ · DOVRŠI",loginLead:"Odaberi dostupne sličice i pošalji zahtjev prodavatelju.",language:"JEZIK",username:"TVOJE VINTED IME",enter:"Otvori kolekciju",liveInventory:"Zaliha se ažurira uživo",heroTitle:"Pronađi sličice koje nedostaju tvojoj kolekciji.",heroLead:"Mogu se rezervirati samo dostupne sličice.",minimumNote:"Minimalna narudžba: 1,00 €.",reserve:"Pošalji zahtjev"},
  el:{tagline:"ΣΥΛΛΕΞΕ · ΑΝΤΑΛΛΑΞΕ · ΣΥΜΠΛΗΡΩΣΕ",loginLead:"Επίλεξε διαθέσιμες κάρτες και στείλε αίτημα στον πωλητή.",language:"ΓΛΩΣΣΑ",username:"ΤΟ ΟΝΟΜΑ ΣΟΥ ΣΤΟ VINTED",enter:"Άνοιγμα συλλογής",liveInventory:"Ζωντανή ενημέρωση αποθέματος",heroTitle:"Βρες τις κάρτες που λείπουν από τη συλλογή σου.",heroLead:"Μόνο διαθέσιμες κάρτες μπορούν να κρατηθούν.",minimumNote:"Ελάχιστη παραγγελία: 1,00 €.",reserve:"Αποστολή αιτήματος"},
  lt:{tagline:"RINK · KEISK · UŽBAIK",loginLead:"Pasirink turimas korteles ir siųsk užklausą pardavėjui.",language:"KALBA",username:"TAVO VINTED VARDAS",enter:"Atverti kolekciją",liveInventory:"Atsargos atnaujinamos tiesiogiai",heroTitle:"Rask korteles, kurių trūksta tavo kolekcijai.",heroLead:"Rezervuoti galima tik turimas korteles.",minimumNote:"Minimali užsakymo suma: 1,00 €.",reserve:"Siųsti užklausą"}
};
const extraTranslations = {
  en:{standardCards:"STANDARD CARDS",standardCardsInfo:"All regular-numbered cards",numberOneCards:"NUMBER 1 CARDS",numberOneCardsInfo:"Every country card numbered 1",fwcCards:"FWC CARDS",fwcCardsInfo:"Every card in the FWC series",cardsAvailable:"cards available",catalogue:"THE CATALOGUE",availableCards:"Available cards",searchCards:"Search card or country...",referencesInStock:"{count} card references in stock",available:"available",inStock:"{count} in stock",soldOut:"Sold out",basketEmpty:"Your vault is empty.",basketHint:"Add cards from the catalogue.",subtotal:"Subtotal",discount:"Discount",total:"Total",pending:"You have a pending reservation.",pendingDetails:"{count} cards · {amount} · The seller has received your request and will contact you on Vinted.",noMatch:"No cards match your search."},
  hr:{standardCards:"STANDARDNE SLIČICE",standardCardsInfo:"Sve obične numerirane sličice",numberOneCards:"SLIČICE BROJ 1",numberOneCardsInfo:"Sličica broj 1 svake države",fwcCards:"FWC SLIČICE",fwcCardsInfo:"Sve sličice iz FWC serije",cardsAvailable:"dostupnih sličica",catalogue:"KATALOG",availableCards:"Dostupne sličice",searchCards:"Pretraži sličicu ili državu...",referencesInStock:"{count} vrsta sličica na zalihi",available:"dostupno",inStock:"{count} na zalihi",soldOut:"Rasprodano",basketEmpty:"Tvoj odabir je prazan.",basketHint:"Dodaj sličice iz kataloga.",subtotal:"Međuzbroj",discount:"Popust",total:"Ukupno",pending:"Imaš rezervaciju na čekanju.",pendingDetails:"{count} sličica · {amount} · Prodavatelj je primio tvoj zahtjev i kontaktirat će te na Vintedu.",noMatch:"Nema sličica koje odgovaraju pretraživanju."}
};
Object.assign(extraTranslations.en,{pending:"You have pending reservations.",pendingDetails:"{orders} order(s) · {units} cards in total · {unique} unique references · {amount}. The seller received your request and will contact you on Vinted.",yourSelection:"YOUR SELECTION",basket:"Basket",clearSelection:"Clear selection",reservedOnConfirm:"Cards are reserved when you confirm"});
extraTranslations.fr={standardCards:"CARTES STANDARD",standardCardsInfo:"Toutes les cartes numérotées classiques",numberOneCards:"CARTES NUMÉRO 1",numberOneCardsInfo:"La carte numéro 1 de chaque pays",fwcCards:"CARTES FWC",fwcCardsInfo:"Toutes les cartes de la série FWC",cardsAvailable:"cartes disponibles",catalogue:"LE CATALOGUE",availableCards:"Cartes disponibles",searchCards:"Rechercher une carte ou un pays…",referencesInStock:"{count} références de cartes en stock",available:"disponibles",inStock:"{count} en stock",soldOut:"Épuisée",basketEmpty:"Votre sélection est vide.",basketHint:"Ajoutez des cartes depuis le catalogue.",subtotal:"Sous-total",discount:"Remise",total:"Total",pending:"Vous avez des réservations en attente.",pendingDetails:"{orders} commande(s) · {units} carte(s) au total · {unique} référence(s) unique(s) · {amount}. Le vendeur a reçu votre demande et vous contactera sur Vinted.",noMatch:"Aucune carte ne correspond à votre recherche.",yourSelection:"VOTRE SÉLECTION",basket:"Panier",clearSelection:"Vider la sélection",reservedOnConfirm:"Les cartes sont réservées après confirmation"};
Object.assign(extraTranslations.hr,{pendingDetails:"{orders} narudžba/e · ukupno {units} sličica · {unique} jedinstvenih oznaka · {amount}. Prodavatelj je primio tvoj zahtjev i kontaktirat će te na Vintedu.",yourSelection:"TVOJ ODABIR",basket:"Košarica",clearSelection:"Isprazni odabir",reservedOnConfirm:"Sličice se rezerviraju nakon potvrde"});
Object.assign(extraTranslations.en,{confirmRequest:"CONFIRM REQUEST",sendRequestFor:"Send a request for {count} cards?",checkSelection:"Your total is {amount}. Please check your selection:",emailConsent:"I confirm that I want this request emailed to the seller. The seller will contact me through my Vinted username.",goBack:"Go back",confirmEmail:"Confirm and email seller",requestConfirmed:"REQUEST CONFIRMED",cardsReserved:"Your cards are reserved!",emailSuccess:"The seller received your email and will contact you on Vinted.",emailNotSent:"The request was saved, but email delivery needs attention.",copyBackup:"Copy backup message"});
Object.assign(extraTranslations.fr,{confirmRequest:"CONFIRMER LA DEMANDE",sendRequestFor:"Envoyer une demande pour {count} carte(s) ?",checkSelection:"Votre total est de {amount}. Vérifiez votre sélection :",emailConsent:"Je confirme vouloir envoyer cette demande au vendeur par e-mail. Le vendeur me contactera via mon pseudo Vinted.",goBack:"Retour",confirmEmail:"Confirmer et envoyer au vendeur",requestConfirmed:"DEMANDE CONFIRMÉE",cardsReserved:"Vos cartes sont réservées !",emailSuccess:"Le vendeur a reçu votre e-mail et vous contactera sur Vinted.",emailNotSent:"La demande a été enregistrée, mais l’envoi de l’e-mail nécessite votre attention.",copyBackup:"Copier le message de secours"});
Object.assign(extraTranslations.hr,{confirmRequest:"POTVRDA ZAHTJEVA",sendRequestFor:"Poslati zahtjev za {count} sličice?",checkSelection:"Ukupan iznos je {amount}. Provjeri svoj odabir:",emailConsent:"Potvrđujem da želim poslati ovaj zahtjev prodavatelju e-poštom. Prodavatelj će me kontaktirati putem mog Vinted korisničkog imena.",goBack:"Natrag",confirmEmail:"Potvrdi i pošalji prodavatelju",requestConfirmed:"ZAHTJEV JE POTVRĐEN",cardsReserved:"Tvoje sličice su rezervirane!",emailSuccess:"Prodavatelj je primio e-poruku i kontaktirat će te na Vintedu.",emailNotSent:"Zahtjev je spremljen, ali e-poruka nije uspješno poslana.",copyBackup:"Kopiraj rezervnu poruku"});
Object.assign(extraTranslations.en,{numberOneCards:"NUMBER 1 AND 13 CARDS",numberOneCardsInfo:"Every country card numbered 1 and 13"});
Object.assign(extraTranslations.fr,{numberOneCards:"CARTES NUMÉRO 1 ET 13",numberOneCardsInfo:"Les cartes numéro 1 et 13 de chaque pays"});
Object.assign(extraTranslations.hr,{numberOneCards:"SLIČICE BROJ 1 I 13",numberOneCardsInfo:"Sličice broj 1 i 13 svake države"});
for (const [language, dictionary] of Object.entries(translations)) Object.assign(dictionary, extraTranslations.en, extraTranslations[language] || {});
const countryIso = {MEX:"MX",RSA:"ZA",KOR:"KR",CZE:"CZ",CAN:"CA",BIH:"BA",QAT:"QA",SUI:"CH",BRA:"BR",MAR:"MA",HAI:"HT",USA:"US",PAR:"PY",AUS:"AU",TUR:"TR",GER:"DE",CUW:"CW",CIV:"CI",ECU:"EC",NED:"NL",JPN:"JP",SWE:"SE",TUN:"TN",BEL:"BE",EGY:"EG",IRN:"IR",NZL:"NZ",ESP:"ES",CPV:"CV",KSA:"SA",URU:"UY",FRA:"FR",SEN:"SN",IRQ:"IQ",NOR:"NO",ARG:"AR",ALG:"DZ",AUT:"AT",JOR:"JO",POR:"PT",COD:"CD",UZB:"UZ",COL:"CO",CRO:"HR",GHA:"GH",PAN:"PA"};
const specialCountryNames = { en:{FWC:"FIFA World Cup",SCO:"Scotland",ENG:"England"}, fr:{FWC:"Coupe du monde FIFA",SCO:"Écosse",ENG:"Angleterre"}, hr:{FWC:"FIFA Svjetsko prvenstvo",SCO:"Škotska",ENG:"Engleska"} };
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
const safe = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
const priceFor = code => Number(state.inventory.find(item => item.code === code)?.price ?? (code.startsWith("FWC") ? 1 : [1,13].includes(Number(code.replace(/\D/g, ""))) ? .5 : .3));
const setLoading = value => $("loading").classList.toggle("hidden", !value);
let toastTimer;
const tr = (key, values = {}) => {
  const language = $("languageSelect")?.value || "en";
  return String(translations[language]?.[key] || translations.en[key] || key).replace(/\{(\w+)\}/g, (_match, name) => values[name] ?? "");
};
function localizedCountry(item) {
  const language = $("languageSelect")?.value || "en";
  const prefix = String(item.code || "").match(/^[A-Z]+/)?.[0] || "";
  if (specialCountryNames[language]?.[prefix]) return specialCountryNames[language][prefix];
  if (specialCountryNames.en[prefix]) return specialCountryNames.en[prefix];
  const iso = countryIso[prefix];
  if (!iso) return item.country;
  try { return new Intl.DisplayNames([language],{type:"region"}).of(iso) || item.country; }
  catch (_error) { return item.country; }
}

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
  const minimumApplied = quantity > 0 && subtotal < 1;
  return { quantity, subtotal, discount: 0, rate: 0, minimumApplied, total: minimumApplied ? 1 : subtotal };
}

function applyLanguage(language) {
  const chosen = translations[language] ? language : "en";
  localStorage.setItem("cardVaultLanguage", chosen);
  document.documentElement.lang = chosen;
  $("languageSelect").value = chosen;
  document.querySelectorAll("[data-i18n]").forEach(element => { const value = translations[chosen][element.dataset.i18n]; if (value) element.textContent = value; });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => { const value = translations[chosen][element.dataset.i18nPlaceholder]; if (value) element.placeholder = value; });
  if (state.user?.role === "customer" && state.inventory.length) { renderCatalog(); renderCart(); renderOrderBanner(); }
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
  applyLanguage($("languageSelect").value);
  $("availableCount").textContent = state.inventory.reduce((sum, item) => sum + item.quantity, 0);
  renderCatalog(); renderCart(); renderOrderBanner();
}

function renderCatalog() {
  const query = $("catalogSearch").value.trim().toLowerCase();
  const visible = state.inventory.filter(item => !query || item.code.toLowerCase().includes(query) || item.country.toLowerCase().includes(query) || localizedCountry(item).toLowerCase().includes(query));
  const groups = Object.groupBy ? Object.groupBy(visible, localizedCountry) : visible.reduce((all, item) => { const country=localizedCountry(item); (all[country] ||= []).push(item); return all; }, {});
  $("resultCount").textContent = tr("referencesInStock", { count:visible.filter(x => x.quantity > 0).length });
  $("catalogRows").innerHTML = Object.entries(groups).map(([country, cards]) => `
    <section class="country-row"><div class="country-label"><strong>${safe(country)}</strong><small>${cards.filter(x => x.quantity > 0).length} ${tr("available")}</small></div>
    <div class="card-grid">${cards.map(card => {
      const qty = Number(state.cart[card.code] || 0);
      return `<article class="card-tile ${qty ? "selected" : ""} ${card.quantity < 1 ? "sold" : ""}">
        <div class="card-top"><span>${safe(card.code)}</span><span class="chip">${money(card.price)}</span></div><div class="stock">${card.quantity ? tr("inStock",{count:card.quantity}) : tr("soldOut")}</div>
        <div class="stepper"><button data-code="${safe(card.code)}" data-delta="-1" ${qty < 1 ? "disabled" : ""}>−</button><span>${qty}</span><button data-code="${safe(card.code)}" data-delta="1" ${qty >= card.quantity ? "disabled" : ""}>+</button></div></article>`;
  }).join("")}</div></section>`).join("") || `<div class="cart-empty">${tr("noMatch")}</div>`;
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
  $("cartList").innerHTML = entries.length ? entries.map(([code, qty]) => `<div class="cart-line"><div><strong>${safe(code)}</strong><small>${qty} × ${money(priceFor(code))}</small></div><strong>${money(qty * priceFor(code))}</strong></div>`).join("") : `<div class="cart-empty">${tr("basketEmpty")}<br><small>${tr("basketHint")}</small></div>`;
  $("subtotal").textContent = money(totals.subtotal); $("total").textContent = money(totals.total);
  $("minimumNote").classList.toggle("hidden", !totals.minimumApplied);
  $("orderBtn").disabled = !entries.length; $("clearCart").disabled = !entries.length;
}

function renderOrderBanner() {
  const pending = state.orders.filter(order => order.status === "pending");
  $("orderBanner").classList.toggle("hidden", !pending.length);
  if (pending.length) {
    const units = pending.reduce((sum, order) => sum + Number(order.quantity || 0), 0);
    const amount = pending.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const unique = new Set(pending.flatMap(order => Object.keys(order.items || {}))).size;
    $("orderBanner").innerHTML = `<strong>${tr("pending")}</strong> ${tr("pendingDetails",{orders:pending.length,units,unique,amount:money(amount)})}`;
  } else {
    $("orderBanner").innerHTML = "";
  }
}

async function refreshCustomerOrders() {
  if (state.user?.role !== "customer") return;
  try { state.orders = await api("/api/orders/my"); renderOrderBanner(); }
  catch (_error) { /* A temporary refresh failure should not interrupt shopping. */ }
}

async function clearCart() {
  state.cart = {}; renderCatalog(); renderCart();
  await api("/api/cart", { method: "PUT", body: { items: {} } });
}

async function createOrder() {
  const totals = calculate();
  const groups = [];
  for (const item of state.inventory) {
    const quantity = Number(state.cart[item.code] || 0);
    if (!quantity) continue;
    const country = localizedCountry(item);
    let group = groups.find(entry => entry.country === country);
    if (!group) { group = { country, cards:[] }; groups.push(group); }
    group.cards.push({ code:item.code, quantity });
  }
  const selection = groups.map(group => `<div class="confirm-country"><strong>${safe(group.country)}</strong>${group.cards.map(card => `<span>${card.quantity}x – ${safe(card.code)}</span>`).join("")}</div>`).join("");
  openModal(`<p class="eyebrow mint">${tr("confirmRequest")}</p><h2>${tr("sendRequestFor",{count:totals.quantity})}</h2><p>${tr("checkSelection",{amount:`<strong>${money(totals.total)}</strong>`})}</p><div class="confirm-selection">${selection}</div><label class="consent-box"><input id="emailConsent" type="checkbox"><span>${tr("emailConsent")}</span></label><div class="modal-actions"><button class="button secondary" data-close>${tr("goBack")}</button><button id="confirmOrder" class="button primary" disabled>${tr("confirmEmail")}</button></div>`);
  $("emailConsent").onchange = () => $("confirmOrder").disabled = !$("emailConsent").checked;
  $("confirmOrder").onclick = async () => {
    setLoading(true);
    try {
      const order = await api("/api/orders", { method: "POST", body: { notifySeller: true } });
      state.cart = {}; state.orders.unshift(order); state.inventory = await api("/api/inventory");
      openModal(`<p class="eyebrow mint">${tr("requestConfirmed")}</p><h2>${tr("cardsReserved")}</h2><p>${order.emailSent ? tr("emailSuccess") : tr("emailNotSent")}</p><div id="orderMessage" class="message-box">${safe(order.message)}</div><button id="copyMessage" class="button primary wide">${tr("copyBackup")} <span>⧉</span></button>`);
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
  $("inventoryBody").innerHTML = state.inventory.filter(x => !query || x.code.toLowerCase().includes(query) || x.country.toLowerCase().includes(query)).map(card => `<tr><td><strong>${safe(card.code)}</strong></td><td>${safe(card.country)}</td><td><div class="price-edit"><span>€</span><input data-price="${safe(card.code)}" type="number" min="0.10" max="9.99" step="0.01" value="${Number(card.price).toFixed(2)}"></div></td><td><div class="stock-edit"><button data-stock="${safe(card.code)}" data-delta="-1">−</button><input data-input="${safe(card.code)}" type="number" min="0" value="${card.quantity}"><button data-stock="${safe(card.code)}" data-delta="1">+</button></div></td></tr>`).join("");
  $("inventoryBody").querySelectorAll("button[data-stock]").forEach(btn => btn.onclick = () => setStock(btn.dataset.stock, Number(btn.dataset.delta), true));
  $("inventoryBody").querySelectorAll("input[data-input]").forEach(input => input.onchange = () => setStock(input.dataset.input, Number(input.value), false));
  $("inventoryBody").querySelectorAll("input[data-price]").forEach(input => input.onchange = () => setPrice(input.dataset.price, Number(input.value)));
}

async function setStock(code, value, relative) {
  const card = state.inventory.find(x => x.code === code); const quantity = Math.max(0, relative ? card.quantity + value : value);
  try { const updated = await api(`/api/admin/inventory/${code}`, { method:"PATCH", body:{ quantity, price:card.price } }); Object.assign(card, updated); renderStats(); renderInventory(); }
  catch (error) { toast(error.message); }
}

async function setPrice(code, value) {
  const card = state.inventory.find(x => x.code === code);
  const price = Math.round(Math.max(0.10, Math.min(9.99, Number(value) || 0.30)) * 100) / 100;
  try { const updated = await api(`/api/admin/inventory/${code}`, { method:"PATCH", body:{ quantity:card.quantity, price } }); Object.assign(card, updated); renderInventory(); toast(`${code} price updated.`); }
  catch (error) { toast(error.message); renderInventory(); }
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

async function importExcel(file) {
  if (!file) return;
  const form = new FormData();
  form.append("inventory", file);
  setLoading(true);
  try {
    const response = await fetch("/api/admin/inventory/import", { method:"POST", body:form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Excel import failed.");
    state.inventory = await api("/api/inventory");
    renderAdmin();
    toast(`${result.updated} inventory rows updated from Excel.`);
  } catch (error) { toast(error.message); }
  finally { $("excelUpload").value = ""; setLoading(false); }
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
$("languageSelect").addEventListener("change", event => applyLanguage(event.target.value));
$("username").addEventListener("input", () => $("passwordGroup").classList.toggle("hidden", $("username").value.trim().toLowerCase() !== String(state.config.adminUsername).toLowerCase()));
document.querySelectorAll(".logout").forEach(button => button.onclick = logout);
$("catalogSearch").oninput = renderCatalog; $("clearCart").onclick = clearCart; $("orderBtn").onclick = createOrder;
$("inventorySearch").oninput = renderInventory; $("countrySelect").onchange = renderBulkGrid; $("bulkAdd").onclick = bulkAdd; $("orderSearch").oninput = renderOrders;
$("excelUpload").onchange = event => importExcel(event.target.files[0]);
document.querySelectorAll(".tabs button").forEach(button => button.onclick = () => switchTab(button.dataset.tab));
$("copyPending").onclick = () => { const messages = state.orders.filter(x=>x.status==="pending").map(x=>x.message); messages.length ? copyText(messages.join("\n\n")) : toast("No pending orders."); };
$("resetDatabase").onclick = async () => { if (!confirm("This permanently erases every cart and order and restores the sample inventory. Continue?")) return; setLoading(true); try{await api("/api/admin/reset",{method:"POST"});state.inventory=await api("/api/inventory");state.orders=[];renderAdmin();toast("Database reset.")}catch(e){toast(e.message)}finally{setLoading(false)}};
$("modalClose").onclick = closeModal; $("modal").onclick = event => { if (event.target === $("modal")) closeModal(); };
window.addEventListener("focus", refreshCustomerOrders);
setInterval(refreshCustomerOrders, 30000);

(async function init() {
  setLoading(true);
  try {
    state.config = await api("/api/config");
    applyLanguage(localStorage.getItem("cardVaultLanguage") || navigator.language.slice(0,2));
    document.title = state.config.shopName; $("loginTitle").textContent = state.config.shopName; document.querySelectorAll(".shop-name").forEach(x => x.textContent = state.config.shopName);
    state.user = (await api("/api/auth/me")).user;
    if (state.user) await enterApplication(); else showView("loginView");
  } catch (error) { toast("The application could not start. Check the database connection."); }
  finally { setLoading(false); }
})();
