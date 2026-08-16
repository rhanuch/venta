// ---- config: edit these three ----------------------------------------------
// The Sheet, published to web as CSV. Falls back to the committed catalog.csv
// while the Sheet is still empty — ponytail: drop the fallback once it's populated.
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBMp9sIen6vl-hnIhpoblR27lkHKHRRDaUFIBJwiNYqaZdZySfcoHwaNhxU3h4YTEDFAEcOIHmCqRf/pub?output=csv';
const CSV_FALLBACK = './catalog.csv';
const PHONE = '+12066606080';        // used for both SMS and WhatsApp links
const AREA = { en: 'Seattle, WA', es: 'Seattle, WA' };
// ----------------------------------------------------------------------------

const T = {
  en: {
    title: 'Moving Sale',
    intro: "I'm moving countries, so everything below has to go. Prices are as listed. Message me about anything you want.",
    payment: 'Venmo or cash',
    updated: d => 'Updated ' + d,
    other: 'Español',
    otherHref: '?lang=es',
    search: 'Search',
    allCats: 'All categories',
    sort: { featured: 'Default order', lowhigh: 'Price: low to high', highlow: 'Price: high to low' },
    hidesold: 'Hide sold',
    empty: 'Nothing matches that.',
    condition: { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair' },
    status: { available: 'Available', pending: 'Pending pickup', sold: 'Sold' },
    pickup: { pickup: 'Pickup only', coordinate: 'Can coordinate', deliver: 'Can deliver' },
    size: { small: 'Small', medium: 'Medium', large: 'Large' },
    ask: 'Ask',
    free: 'Free',
    sms: 'Text',
    wa: 'WhatsApp',
    smsBody: n => `Hi! I'm interested in the "${n}" from your moving sale.`,
    footer: a => `Pickup in ${a}. Venmo or cash. Message me and we'll sort out a time.`,
    stats: (n, f) => `${n} items` + (f ? ` · ${f} free` : ''),
  },
  es: {
    title: 'Venta por mudanza',
    intro: 'Me mudo de país, así que todo esto tiene que salir. Los precios son los publicados. Escribime por lo que te interese.',
    payment: 'Venmo o efectivo',
    updated: d => 'Actualizado ' + d,
    other: 'English',
    otherHref: '?lang=en',
    search: 'Buscar',
    allCats: 'Todas las categorías',
    sort: { featured: 'Orden por defecto', lowhigh: 'Precio: menor a mayor', highlow: 'Precio: mayor a menor' },
    hidesold: 'Ocultar vendidos',
    empty: 'No hay resultados.',
    condition: { new: 'Nuevo', like_new: 'Como nuevo', good: 'Bueno', fair: 'Regular' },
    status: { available: 'Disponible', pending: 'Reservado', sold: 'Vendido' },
    pickup: { pickup: 'Retiro en domicilio', coordinate: 'A coordinar', deliver: 'Puedo llevarlo' },
    size: { small: 'Chico', medium: 'Mediano', large: 'Grande' },
    ask: 'Consultar',
    free: 'Gratis',
    sms: 'Mensaje',
    wa: 'WhatsApp',
    smsBody: n => `¡Hola! Me interesa "${n}" de tu venta por mudanza.`,
    footer: a => `Retiro en ${a}. Venmo o efectivo. Escribime y coordinamos.`,
    stats: (n, f) => `${n} artículos` + (f ? ` · ${f} gratis` : ''),
  },
};

const lang = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';
const t = T[lang];
const $ = id => document.getElementById(id);

// Minimal RFC4180 parser: handles quoted fields, embedded commas/newlines, "" escapes.
function parseCSV(text) {
  const rows = [[]];
  let field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { rows[rows.length - 1].push(field); field = ''; }
    else if (c === '\n') { rows[rows.length - 1].push(field); field = ''; rows.push([]); }
    else if (c !== '\r') field += c;
  }
  rows[rows.length - 1].push(field);
  const header = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.length > 1 && r.some(v => v.trim()))
    .map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const round = n => Math.round(n * 10) / 10;

// "160 x 48 x 78" -> "63 x 18.9 x 30.7 in / 160 x 48 x 78 cm"
function dimensions(cm) {
  const parts = cm.split(/\s*[x×]\s*/).map(p => parseFloat(p));
  if (!parts.length || parts.some(isNaN)) return cm;
  const inches = parts.map(p => round(p / 2.54)).join(' × ');
  return `${inches} in / ${parts.join(' × ')} cm`;
}

function priceNum(p) {
  const n = parseFloat(String(p).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? Infinity : n;
}

function priceText(p) {
  if (!p) return t.ask;
  if (priceNum(p) === 0) return t.free;
  return /^[$]/.test(p) ? p : '$' + p;
}

const slug = s => (s || '').toLowerCase().replace(/[^a-z]+/g, '-');

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function card(item) {
  const name = item['name_' + lang] || item.name_en;
  const notes = item['notes_' + lang] || item.notes_en;
  const status = t.status[item.status] ? item.status : 'available';

  const c = el('article', 'card' + (status === 'sold' ? ' sold' : ''));

  const photos = (item.photos || '').split(',').map(s => s.trim()).filter(Boolean);
  if (photos.length) {
    const gal = el('div', 'gallery');
    const main = el('img');
    main.src = 'images/' + photos[0];
    main.alt = name;
    main.loading = 'lazy';
    main.addEventListener('click', () => {
      $('lightboximg').src = main.src;
      $('lightbox').showModal();
    });
    gal.append(main);
    const catName = item['category_' + lang] || item.category_en;
    if (catName) gal.append(el('span', 'cat-chip cat-' + slug(item.category_en), catName));
    if (status === 'sold') gal.append(el('span', 'sold-stamp', t.status.sold));
    if (photos.length > 1) {
      const strip = el('div', 'thumbs');
      photos.forEach(p => {
        const th = el('img');
        th.src = 'images/' + p;
        th.alt = '';
        th.loading = 'lazy';
        th.addEventListener('click', () => { main.src = th.src; });
        strip.append(th);
      });
      gal.append(strip);
    }
    c.append(gal);
  }

  const body = el('div', 'body');
  body.append(el('h2', null, name));

  const badges = el('div', 'badges');
  badges.append(el('span', 'badge status-' + status, t.status[status]));
  if (t.condition[item.condition])
    badges.append(el('span', 'badge cond-' + item.condition, t.condition[item.condition]));
  if (t.pickup[item.pickup])
    badges.append(el('span', 'badge pickup-' + item.pickup, t.pickup[item.pickup]));
  body.append(badges);

  const size = item.dimensions_cm ? dimensions(item.dimensions_cm) : t.size[item.size_label];
  if (size) body.append(el('p', 'dims', size));
  if (notes) body.append(el('p', 'notes', notes));

  const foot = el('div', 'foot');
  const isFree = priceNum(item.price) === 0 && item.price !== '';
  foot.append(el('span', 'price' + (isFree ? ' free' : ''), priceText(item.price)));
  if (status !== 'sold') {
    const msg = encodeURIComponent(t.smsBody(name));
    const sms = el('a', 'btn', t.sms);
    // `?&body=` is the form both iOS and Android accept — ponytail: don't "clean" it up.
    sms.href = `sms:${PHONE}?&body=${msg}`;
    const wa = el('a', 'btn', t.wa);
    wa.href = `https://wa.me/${PHONE.replace(/\D/g, '')}?text=${msg}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    foot.append(sms, wa);
  }
  body.append(foot);

  c.append(body);
  return c;
}

let items = [];

function render() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('cat').value;
  const sort = $('sort').value;
  const hide = $('hidesold').checked;

  let list = items.filter(i => {
    if (hide && i.status === 'sold') return false;
    if (cat && (i['category_' + lang] || i.category_en) !== cat) return false;
    if (!q) return true;
    return [i['name_' + lang], i.name_en, i['notes_' + lang], i['category_' + lang]]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  if (sort === 'lowhigh') list.sort((a, b) => priceNum(a.price) - priceNum(b.price));
  if (sort === 'highlow') list.sort((a, b) => priceNum(b.price) - priceNum(a.price));

  const grid = $('grid');
  grid.replaceChildren(...list.map(card));
  $('empty').hidden = list.length > 0;
}

function boot(text) {
  items = parseCSV(text);

  document.documentElement.lang = lang;
  document.title = t.title;
  $('title').textContent = t.title;
  $('intro').textContent = t.intro;
  $('payment').textContent = t.payment;
  $('langlink').textContent = t.other;
  $('langlink').href = t.otherHref;
  $('q').placeholder = t.search;
  $('hidesoldlabel').textContent = t.hidesold;
  $('empty').textContent = t.empty;
  $('footer').textContent = t.footer(AREA[lang]);
  $('updated').textContent = t.updated(
    new Date().toLocaleDateString(lang === 'es' ? 'es' : 'en', { day: 'numeric', month: 'short' })
  );
  const live = items.filter(i => i.status !== 'sold');
  $('stats').textContent = t.stats(live.length, live.filter(i => i.price === '0').length);

  const cats = [...new Set(items.map(i => i['category_' + lang] || i.category_en).filter(Boolean))].sort();
  $('cat').replaceChildren(
    new Option(t.allCats, ''),
    ...cats.map(c => new Option(c, c))
  );
  $('sort').replaceChildren(
    ...Object.entries(t.sort).map(([v, label]) => new Option(label, v))
  );

  ['q', 'cat', 'sort', 'hidesold'].forEach(id => $(id).addEventListener('input', render));
  $('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') $('lightbox').close(); });

  render();
}

const load = url => fetch(url).then(r => {
  if (!r.ok) throw new Error(r.status);
  return r.text();
});

if (typeof document !== 'undefined') {
  load(CSV_URL)
    .then(text => (parseCSV(text).length ? text : load(CSV_FALLBACK)))
    .catch(() => load(CSV_FALLBACK))
    .then(boot)
    .catch(() => {
      $('grid').textContent = lang === 'es'
        ? 'No se pudo cargar el catálogo. Recargá la página.'
        : "Couldn't load the catalog. Try reloading.";
    });
} else {
  module.exports = { parseCSV, dimensions, priceNum, priceText };
}
