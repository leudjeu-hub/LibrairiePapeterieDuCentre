(function () {
'use strict';
const C = window.CONFIG;
const I = window.I18N;
const CAT_IDS = C.categories.map((c) => c.id);
const FAMILIES = C.familles;
const PRODUCTS = (Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [])
.map((p) => (Array.isArray(p) ? { id: p[0], cat: CAT_IDS[p[1]] || 'autres', famille: FAMILIES[p[2]] || null, name: { fr: p[3], en: p[4] || p[3] }, price: p[5], kw: '' } : p));
const ZONES = Array.isArray(window.DELIVERY && window.DELIVERY.zones) ? window.DELIVERY.zones : [];
const OTHER = '__autre';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
function escapeHtml(value) {
return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
class SafeHtml { constructor(s) { this.s = s; } toString() { return this.s; } }
function renderValue(v) {
if (v === null || v === undefined || v === false) return '';
if (v instanceof SafeHtml) return v.s;
if (Array.isArray(v)) return v.map(renderValue).join('');
return escapeHtml(v);
}
function html(strings, ...values) {
return new SafeHtml(strings.reduce((out, s, i) => out + renderValue(values[i - 1]) + s));
}
function setHtml(el, safe) {
if (!(safe instanceof SafeHtml)) throw new TypeError('setHtml attend du html`…`');
el.innerHTML = safe.s;
}
const store = {
get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ } }
};
function pickLang() {
const q = new URLSearchParams(location.search).get('lang');
if (q === 'fr' || q === 'en') { store.set(C.storage.lang, q); return q; }
const saved = store.get(C.storage.lang, 'fr');
return saved === 'en' ? 'en' : 'fr';
}
let lang = pickLang();
function t(key, vars) {
let s = (I[lang] && I[lang][key]) || I.fr[key] || key;
if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
return s;
}
const label = (obj) => obj[lang] || obj.fr;
function applyI18n() {
document.documentElement.lang = lang;
document.title = t('meta.title');
$$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
$$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
$$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
const btn = $('#lang-toggle');
const other = lang === 'fr' ? 'en' : 'fr';
btn.textContent = other.toUpperCase();
btn.lang = other;
}
function setLang(next) {
lang = next;
store.set(C.storage.lang, lang);
const url = new URL(location.href);
url.searchParams.set('lang', lang);
history.replaceState(null, '', url);
applyI18n();
renderAll();
setMenu(menuOpen);
}
const group = (n, sp) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sp);
const money = (n) => group(n, '\u00a0') + '\u00a0' + C.currency;
const moneyText = (n) => group(n, ' ') + ' ' + C.currency;
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pname = (p) => p.name[lang] || p.name.fr;
const catOf = (id) => C.categories.find((c) => c.id === id) || { icon: 'paper', fr: id, en: id };
const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
const plural = (n, one, many) => (n === 1 ? t(one) : t(many, { n }));
let cart = sanitizeCart(store.get(C.storage.cart, {}));
function sanitizeCart(raw) {
const out = {};
if (raw && typeof raw === 'object') {
Object.keys(raw).forEach((id) => {
const q = Math.floor(Number(raw[id]));
if (byId.has(id) && q > 0) out[id] = Math.min(q, 99);
});
}
return out;
}
function setQty(id, q) {
if (q > 0) cart[id] = Math.min(q, 99); else delete cart[id];
store.set(C.storage.cart, cart);
}
let customCart = (function sanitizeCustom(raw) {
if (!Array.isArray(raw)) return [];
return raw
.map((it) => ({ name: String(it && it.name || '').trim().slice(0, 80), qty: Math.min(Math.max(Math.floor(Number(it && it.qty)) || 1, 1), 99) }))
.filter((it) => it.name.length >= 2);
})(store.get(C.storage.custom, []));
const saveCustom = () => store.set(C.storage.custom, customCart);
const customQty = () => customCart.reduce((n, c) => n + c.qty, 0);
function totals() {
let sub = 0, quote = 0, items = 0;
Object.keys(cart).forEach((id) => {
const p = byId.get(id), q = cart[id];
items += q;
if (p.price === null) quote += q; else sub += p.price * q;
});
quote += customQty();
items += customQty();
return { sub, quote, items };
}
const zoneOf = (quartier) => ZONES.find((z) => z.quartiers.includes(quartier));
function delivery(sub) {
const v = $('#o-area').value;
if (!v) return { state: 'none' };
if (v === OTHER) return { state: 'confirm' };
const zone = zoneOf(v);
if (!zone) return { state: 'none' };
const free = zone.freeFrom === undefined ? C.freeFrom : zone.freeFrom;
if (free && sub >= free) return { state: 'free', zone, fee: 0 };
return { state: 'fee', zone, fee: zone.fee };
}
function minFor() {
const z = zoneOf($('#o-area').value);
return Math.max(C.minOrder || 0, (z && z.min) || 0);
}
const blocked = (tt) => tt.items === 0 || (tt.quote === 0 && tt.sub < minFor());
let activeCat = 'all';
let firstRender = true;
let expanded = false;
const PER_GROUP = 15;
const searchIndex = new Map(PRODUCTS.map((p) => [p.id, norm([p.name.fr, p.name.en, p.kw, catOf(p.cat).fr, catOf(p.cat).en, p.id].join(' '))]));
function priceHtml(p) {
return p.price === null
? html`<p class="price is-quote">${t('price.quote')}</p>`
: html`<p class="price">${money(p.price)}</p>`;
}
function actionHtml(p) {
const q = cart[p.id] || 0;
if (!q) return html`<button type="button" class="btn-add" data-add="${p.id}" aria-label="${t('cart.addLabel', { name: pname(p) })}"><span class="plus" aria-hidden="true">+</span><span class="btn-add-txt">${t('cart.add')}</span></button>`;
return stepperHtml(p, q);
}
function stepperHtml(p, q) {
return html`<div class="stepper" role="group" aria-label="${t('cart.qty', { name: pname(p) })}">
<button type="button" data-dec="${p.id}" aria-label="${t('cart.dec', { name: pname(p) })}">−</button>
<output aria-live="polite">${q}</output>
<button type="button" data-inc="${p.id}" aria-label="${t('cart.inc', { name: pname(p) })}">+</button>
</div>`;
}
function cardHtml(p) {
const c = catOf(p.cat);
return html`<li class="card" data-id="${p.id}" data-cat="${p.cat}">
<div class="card-visual" aria-hidden="true"><svg class="card-ico"><use href="#i-${c.icon}"></use></svg><span class="card-ref">${p.id}</span></div>
<div class="card-body"><p class="card-cat">${label(c)}</p><h3 class="card-name">${pname(p)}</h3>${priceHtml(p)}</div>
<div class="card-action">${actionHtml(p)}</div>
</li>`;
}
function renderChips() {
const counts = {};
PRODUCTS.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
const chip = (id, text, n) => html`<button type="button" class="chip" data-cat="${id}" aria-pressed="${String(activeCat === id)}">${text}<span class="chip-n" aria-hidden="true">${n}</span></button>`;
setHtml($('#chips'), html`${chip('all', t('cat.all'), PRODUCTS.length)}${C.categories.filter((c) => counts[c.id]).map((c) => chip(c.id, label(c), counts[c.id]))}`);
}
let famFilter = null;
function renderCatalogue() {
const words = norm($('#search').value.trim()).split(/\s+/).filter(Boolean);
const list = PRODUCTS.filter((p) => (!famFilter || p.famille === famFilter) && (activeCat === 'all' || p.cat === activeCat) && words.every((w) => searchIndex.get(p.id).includes(w)));
const grid = $('#grid');
const grouped = !expanded && activeCat === 'all' && words.length === 0;
if (!grouped) {
setHtml(grid, html`${list.map(cardHtml)}`);
} else {
const parts = [];
let shown = 0;
C.familles.forEach((f, fi) => {
const items = list.filter((p) => p.famille === f);
if (!items.length) return;
const slice = items.slice(0, PER_GROUP);
shown += slice.length;
parts.push(html`<li class="group-head" role="presentation"><img class="group-img" src="${f.img}" alt="" width="48" height="48" loading="lazy"><div class="group-txt"><h3>${fi + 1}. ${label(f)}</h3><span class="group-credit">${t('fam.credit')}</span></div><span class="chip-n">${plural(items.length, 'cat.countOne', 'cat.count')}</span></li>`);
slice.forEach((p) => parts.push(cardHtml(p)));
});
if (shown < list.length) parts.push(html`<li class="more-row"><button type="button" class="btn btn-line" id="more-btn">${t('cat.more', { n: list.length - shown })}</button></li>`);
setHtml(grid, html`${parts}`);
}
if (firstRender && !reduceMotion) {
grid.classList.add('is-entering');
$$('.card', grid).forEach((el, i) => { el.style.animationDelay = Math.min(i, 12) * 45 + 'ms'; });
setTimeout(() => grid.classList.remove('is-entering'), 1400);
}
firstRender = false;
$('#empty').hidden = list.length > 0;
$('#result-count').textContent = plural(list.length, 'cat.countOne', 'cat.count');
const tag = $('#fam-clear');
tag.hidden = !famFilter;
if (famFilter) $('#fam-label').textContent = label(famFilter);
}
function renderFamilles() {
setHtml($('#fam-tiles'), html`${C.familles.map((f, i) => html`<a class="tile" href="#catalogue" data-fam="${i}"><span class="tile-media"><img src="${f.img}" alt="" width="240" height="180" loading="lazy"><span class="tile-n" aria-hidden="true">${i + 1}</span></span><span class="tile-name">${label(f)}</span><span class="tile-credit">${t('fam.credit')}</span></a>`)}`);
}
function updateCard(id) {
const card = $(`.card[data-id="${id}"]`);
if (card) setHtml($('.card-action', card), actionHtml(byId.get(id)));
}
function renderCartList() {
const ids = Object.keys(cart);
$('#cart-empty').hidden = ids.length + customCart.length > 0;
setHtml($('#cart-list'), html`${ids.map((id) => {
const p = byId.get(id), q = cart[id];
return html`<li class="line-item" data-id="${id}">
<div class="li-main"><p class="li-name">${pname(p)}</p><p class="li-price">${p.price === null ? t('price.quote') : money(p.price * q)}</p></div>
${stepperHtml(p, q)}
</li>`;
})}${customCart.map((c, i) => {
const pseudo = { id: 'custom:' + i, name: { fr: c.name, en: c.name }, price: null };
return html`<li class="line-item is-custom" data-id="custom:${i}">
<div class="li-main"><p class="li-name">${c.name}</p><p class="li-price">${t('price.quote')}</p></div>
${stepperHtml(pseudo, c.qty)}
</li>`;
})}`);
}
function updateTotals() {
const tt = totals();
const d = delivery(tt.sub);
const count = plural(tt.items, 'cart.itemsOne', 'cart.items');
$('#cart-count').textContent = tt.items;
$('#cart-count').classList.toggle('has-items', tt.items > 0);
$('#cart-open').setAttribute('aria-label', t('cart.openCount', { n: count }));
const bar = $('#cartbar');
bar.hidden = tt.items === 0;
document.body.classList.toggle('has-cartbar', tt.items > 0);
$('#cartbar-count').textContent = count;
$('#cartbar-total').textContent = money(tt.sub);
dialog.classList.toggle('is-empty', tt.items === 0);
const areaFee = $('#o-area-fee');
if (d.state === 'fee') areaFee.textContent = t('area.fee', { zone: t('zone', { n: d.zone.id }), fee: money(d.fee) });
else if (d.state === 'free') areaFee.textContent = t('area.free', { zone: t('zone', { n: d.zone.id }), free: money(d.zone.freeFrom || C.freeFrom) });
else if (d.state === 'confirm') areaFee.textContent = t('area.other');
else areaFee.textContent = '';
const fees = ZONES.map((z) => z.fee);
const rangeNote = $('#range-note');
const showRange = d.state === 'none' && tt.items > 0 && fees.length > 0;
rangeNote.hidden = !showRange;
if (showRange) rangeNote.textContent = t('sum.range', { min: group(Math.min(...fees), '\u00a0'), max: group(Math.max(...fees), '\u00a0') });
$('#sum-sub').textContent = money(tt.sub);
const delText = { none: t('sum.choose'), confirm: t('sum.confirm'), free: t('sum.free'), fee: money(d.fee || 0) }[d.state];
$('#sum-del').textContent = delText;
$('#sum-del').classList.toggle('is-free', d.state === 'free');
$('#sum-total').textContent = money(tt.sub + (d.fee || 0));
$('#foot-total').textContent = money(tt.sub + (d.fee || 0));
$('#sum-quote').hidden = tt.quote === 0;
$('#sum-quote').textContent = t('sum.quote', { n: tt.quote });
const minAlert = $('#min-alert');
const minNow = minFor();
const short = tt.items > 0 && tt.quote === 0 && tt.sub < minNow;
minAlert.hidden = !short;
minAlert.textContent = short ? t('min.missing', { min: money(minNow), left: money(minNow - tt.sub) }) : '';
const send = $('#wa-send');
const off = blocked(tt);
send.classList.toggle('is-disabled', off);
send.setAttribute('aria-disabled', String(off));
send.href = waLink(orderText());
$('#dl-btn').disabled = tt.items === 0;
$('#copy-btn').disabled = tt.items === 0;
}
function renderFormOptions() {
const area = $('#o-area'), slot = $('#o-slot');
const saved = store.get(C.storage.form, {});
const keepArea = area.value || saved.area || '';
const keepSlot = slot.value || saved.slot || C.slots[0].id;
const keepPay = ($('input[name="pay"]:checked') || {}).value || saved.pay || C.payments[0].id;
setHtml(area, html`<option value="">${t('order.areaPh')}</option>${ZONES.map((z) => html`<optgroup label="${t('zone', { n: z.id }) + ' · ' + money(z.fee)}">${z.quartiers.map((q) => html`<option value="${q}">${q}</option>`)}</optgroup>`)}<option value="${OTHER}">${t('order.otherOpt')}</option>`);
area.value = keepArea;
if (area.value !== keepArea) area.value = '';
setHtml(slot, html`${C.slots.map((s) => html`<option value="${s.id}">${label(s)}</option>`)}`);
slot.value = keepSlot;
if (!slot.value) slot.value = C.slots[0].id;
setHtml($('#o-pay'), html`${C.payments.map((p) => html`<label class="pay-opt"><input type="radio" name="pay" value="${p.id}"${p.id === keepPay ? html` checked` : ''}><span>${label(p)}</span></label>`)}`);
if (!$('input[name="pay"]:checked')) $('input[name="pay"]').checked = true;
$('#o-other-wrap').hidden = area.value !== OTHER;
}
function restoreForm() {
const saved = store.get(C.storage.form, {});
['name', 'phone', 'other', 'landmark'].forEach((k) => { if (saved[k]) $('#o-' + k).value = saved[k]; });
if (saved.name) $('#q-name').value = saved.name;
if (saved.phone) $('#q-phone').value = saved.phone;
}
function saveForm() {
store.set(C.storage.form, {
name: $('#o-name').value, phone: $('#o-phone').value, area: $('#o-area').value, other: $('#o-other').value,
landmark: $('#o-landmark').value, slot: $('#o-slot').value, pay: ($('input[name="pay"]:checked') || {}).value
});
}
const phoneOk = (v) => /^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 8 && v.replace(/\D/g, '').length <= 15;
function showError(input, key) {
const err = $('#' + input.id + '-err');
input.setAttribute('aria-invalid', key ? 'true' : 'false');
err.hidden = !key;
err.textContent = key ? t(key) : '';
}
function check(rules) {
let first = null;
rules.forEach(([input, bad, key]) => {
showError(input, bad ? key : null);
if (bad && !first) first = input;
});
return first;
}
function validateOrder() {
const area = $('#o-area');
return check([
[$('#o-name'), $('#o-name').value.trim().length < 2, 'err.name'],
[$('#o-phone'), !phoneOk($('#o-phone').value.trim()), 'err.phone'],
[area, !area.value, 'err.area'],
[$('#o-other'), area.value === OTHER && !$('#o-other').value.trim(), 'err.other']
]);
}
function validateQuote() {
return check([
[$('#q-name'), $('#q-name').value.trim().length < 2, 'err.name'],
[$('#q-phone'), !phoneOk($('#q-phone').value.trim()), 'err.phone']
]);
}
function addCustom() {
const input = $('#o-custom');
const name = input.value.trim().slice(0, 80);
if (name.length < 2) { showError(input, 'custom.err'); input.focus(); return; }
customCart.push({ name, qty: 1 });
saveCustom();
input.value = '';
showError(input, null);
renderCartList();
updateTotals();
bump();
toast(t('cart.added', { name }));
const row = $$('#cart-list .line-item').find((el) => ($('.li-name', el) || {}).textContent === name);
const target = row ? $('[data-inc]', row) : $('#cart-browse');
if (target) target.focus();
}
const waLink = (text) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;
function orderText() {
const tt = totals();
const d = delivery(tt.sub);
const area = $('#o-area').value;
const L = [t('msg.hello', { shop: C.shopName }), ''];
Object.keys(cart).forEach((id) => {
const p = byId.get(id), q = cart[id];
L.push(`• ${q} × ${pname(p)} — ${p.price === null ? t('msg.quote') : moneyText(p.price * q)}`);
});
customCart.forEach((c) => L.push(`• ${c.qty} × ${c.name} — ${t('msg.quote')}`));
L.push('', `${t('msg.subtotal')} : ${moneyText(tt.sub)}`);
if (d.state === 'fee') L.push(`${t('msg.delivery')} (${t('zone', { n: d.zone.id })}) : ${moneyText(d.fee)}`);
else if (d.state === 'free') L.push(`${t('msg.delivery')} (${t('zone', { n: d.zone.id })}) : ${t('sum.free')}`);
else if (d.state === 'confirm') L.push(`${t('msg.delivery')} : ${t('sum.confirm')}`);
L.push(`*${t('msg.total')} : ${moneyText(tt.sub + (d.fee || 0))}*${tt.quote ? ' ' + t('msg.plusQuote') : ''}`, '');
const pay = C.payments.find((p) => p.id === ($('input[name="pay"]:checked') || {}).value);
const slot = C.slots.find((s) => s.id === $('#o-slot').value);
L.push(`${t('msg.name')} : ${$('#o-name').value.trim()}`);
L.push(`${t('msg.phone')} : ${$('#o-phone').value.trim()}`);
L.push(`${t('msg.area')} : ${area === OTHER ? $('#o-other').value.trim() + ' (' + t('order.otherOpt') + ')' : area}`);
if ($('#o-landmark').value.trim()) L.push(`${t('msg.landmark')} : ${$('#o-landmark').value.trim()}`);
if (slot) L.push(`${t('msg.slot')} : ${label(slot)}`);
if (pay) L.push(`${t('msg.payment')} : ${label(pay)}`);
L.push('', t('msg.thanks'));
return L.join('\n');
}
function quoteText() {
const L = [t('qmsg.hello', { shop: C.shopName }), ''];
L.push(`${t('msg.name')} : ${$('#q-name').value.trim()}`);
L.push(`${t('msg.phone')} : ${$('#q-phone').value.trim()}`);
if ($('#q-school').value.trim()) L.push(`${t('msg.school')} : ${$('#q-school').value.trim()}`);
if ($('#q-class').value.trim()) L.push(`${t('msg.class')} : ${$('#q-class').value.trim()}`);
if ($('#q-list').value.trim()) L.push('', `${t('msg.list')} :`, $('#q-list').value.trim());
return L.join('\n');
}
let toastTimer = 0;
function toast(msg) {
const el = $('#toast');
el.textContent = msg;
el.classList.add('is-on');
clearTimeout(toastTimer);
toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}
function onQty(e) {
const btn = e.target.closest('[data-add],[data-inc],[data-dec]');
if (!btn) return;
const id = btn.dataset.add || btn.dataset.inc || btn.dataset.dec;
const inDialog = !!btn.closest('#cart-dialog');
const kind = btn.dataset.add ? 'add' : btn.dataset.inc ? 'inc' : 'dec';
if (id.startsWith('custom:')) {
const i = Number(id.slice(7));
const item = customCart[i];
if (!item) return;
const q = kind === 'dec' ? item.qty - 1 : item.qty + 1;
if (q > 0) item.qty = Math.min(q, 99); else customCart.splice(i, 1);
saveCustom();
renderCartList();
updateTotals();
const row = $$('#cart-list .line-item').find((el) => ($('.li-name', el) || {}).textContent === item.name);
const target = row ? $(`[data-${kind === 'dec' ? 'dec' : 'inc'}]`, row) : $('#cart-browse');
if (target) target.focus();
return;
}
const was = cart[id] || 0;
setQty(id, kind === 'dec' ? was - 1 : was + 1);
updateCard(id);
renderCartList();
updateTotals();
if (kind === 'add') { toast(t('cart.added', { name: pname(byId.get(id)) })); bump(); }
const scope = inDialog ? $('#cart-dialog') : $(`.card[data-id="${id}"]`);
const target = cart[id]
? $(`[data-${kind === 'dec' ? 'dec' : 'inc'}="${id}"]`, scope)
: (inDialog ? $('#cart-close') : $(`[data-add="${id}"]`, scope));
if (target) target.focus();
}
function bump() {
const b = $('#cart-count');
b.classList.remove('bump');
void b.offsetWidth;
b.classList.add('bump');
}
const dialog = $('#cart-dialog');
function openCart() {
renderCartList();
updateTotals();
$('#after-send').hidden = true;
setMenu(false);
dialog.showModal();
document.documentElement.classList.add('is-locked');
}
dialog.addEventListener('close', () => document.documentElement.classList.remove('is-locked'));
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
let menuOpen = false;
function setMenu(open) {
menuOpen = open;
const btn = $('#menu-btn');
btn.setAttribute('aria-expanded', String(open));
btn.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.open'));
$('#site-nav').classList.toggle('is-open', open);
$('#nav-backdrop').hidden = !open;
document.body.classList.toggle('menu-open', open);
}
function download() {
const blob = new Blob([orderText()], { type: 'text/plain;charset=utf-8' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'commande-papeterie-du-centre.txt';
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(a.href), 1000);
toast(t('toast.downloaded'));
}
async function copy() {
const text = orderText();
try {
await navigator.clipboard.writeText(text);
toast(t('toast.copied'));
} catch (e) {
const ta = document.createElement('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.className = 'sr-only';
dialog.appendChild(ta);
ta.select();
const ok = document.execCommand && document.execCommand('copy');
ta.remove();
toast(t(ok ? 'toast.copied' : 'toast.copyFail'));
}
}
function renderDeliverySection() {
$('#rule-min').textContent = money(C.minOrder);
const freeZones = ZONES.filter((z) => z.freeFrom);
const freeAmount = C.freeFrom || (freeZones[0] && freeZones[0].freeFrom);
$('#rule-free-line').hidden = !freeAmount;
if (freeAmount) $('#rule-free').textContent = money(freeAmount) + (C.freeFrom ? '' : ' (' + t('zones', { list: freeZones.map((z) => z.id).join(', ') }) + ')');
setHtml($('#fees-body'), html`${ZONES.map((z) => html`<tr><th scope="row">${t('zone', { n: z.id })}${z.name ? html` — ${label(z.name)}` : ''}${z.delay ? html`<br><small>${label(z.delay)}</small>` : ''}</th><td>${z.quartiers.join(' · ')}</td><td class="num">${money(z.fee)}${z.min && z.min > (C.minOrder || 0) ? html`<br><small>${t('del.minZone', { min: money(z.min) })}</small>` : ''}</td></tr>`)}`);
}
function renderAll() {
renderFamilles();
renderChips();
renderCatalogue();
renderDeliverySection();
renderFormOptions();
renderCartList();
updateTotals();
$('#quote-send').href = waLink(quoteText());
}
function initReveal() {
const items = $$('[data-reveal]');
if (reduceMotion || !('IntersectionObserver' in window)) return;
document.documentElement.classList.add('reveal-on');
const io = new IntersectionObserver((entries) => {
entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
}, { threshold: 0.01, rootMargin: '0px 0px -5% 0px' });
items.forEach((el) => io.observe(el));
setTimeout(() => items.forEach((el) => el.classList.add('is-in')), 3000);
}
function initScene() {
const stack = $('#stack'), hero = $('#hero');
if (reduceMotion || !stack) return;
let tx = 0, ty = 0, x = 0, y = 0, sy = 0, raf = 0;
const loop = () => {
x += (tx - x) * 0.08; y += (ty - y) * 0.08;
stack.style.transform = `translate3d(0, ${(-sy * 0.12).toFixed(1)}px, 0) rotateX(${(52 - y * 10).toFixed(2)}deg) rotateZ(${(-28 + x * 12).toFixed(2)}deg)`;
raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(loop) : 0;
};
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
hero.addEventListener('pointermove', (e) => {
const r = hero.getBoundingClientRect();
tx = (e.clientX - r.left) / r.width - 0.5;
ty = (e.clientY - r.top) / r.height - 0.5;
kick();
});
hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
window.addEventListener('scroll', () => { sy = Math.min(window.scrollY, 800); kick(); }, { passive: true });
}
function init() {
$('#demo-strip').hidden = !C.demo;
$('#year').textContent = new Date().getFullYear();
const phone = $('#shop-phone');
phone.href = C.phone.href;
phone.textContent = C.phone.display;
$('#shop-wa').href = `https://wa.me/${C.whatsapp}`;
$('#shop-maps').href = C.mapsUrl;
$('#fab-map').href = C.mapsUrl;
restoreForm();
applyI18n();
renderAll();
$('#lang-toggle').addEventListener('click', () => setLang(lang === 'fr' ? 'en' : 'fr'));
$('#search').addEventListener('input', renderCatalogue);
$('#chips').addEventListener('click', (e) => {
const chip = e.target.closest('.chip');
if (!chip) return;
activeCat = chip.dataset.cat;
famFilter = null;
$$('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
renderCatalogue();
});
$('#fam-tiles').addEventListener('click', (e) => {
const tile = e.target.closest('.tile');
if (!tile) return;
famFilter = C.familles[Number(tile.dataset.fam)];
expanded = false;
renderCatalogue();
$('#fam-clear').focus();
});
$('#fam-clear').addEventListener('click', () => {
famFilter = null;
renderCatalogue();
$('#search').focus();
});
const chips = $('#chips');
const chipsFade = () => chips.classList.toggle('at-end', chips.scrollLeft + chips.clientWidth >= chips.scrollWidth - 4);
chips.addEventListener('scroll', chipsFade, { passive: true });
window.addEventListener('resize', chipsFade);
chipsFade();
$('#grid').addEventListener('click', (e) => {
if (e.target.closest('#more-btn')) {
expanded = true;
renderCatalogue();
const first = $('.card', grid);
(first ? ($('[data-add], [data-inc], [data-dec]', first) || first) : $('#search')).focus();
return;
}
onQty(e);
});
$('#cart-list').addEventListener('click', onQty);
$('#cart-open').addEventListener('click', openCart);
$('#cartbar-btn').addEventListener('click', openCart);
$('#cart-close').addEventListener('click', () => dialog.close());
$('#cart-browse').addEventListener('click', () => dialog.close());
$('#cart-clear').addEventListener('click', () => {
cart = {};
store.set(C.storage.cart, cart);
renderCatalogue();
renderCartList();
updateTotals();
toast(t('toast.cleared'));
$('#cart-browse').focus();
});
$('#menu-btn').addEventListener('click', () => setMenu(!menuOpen));
$('#nav-backdrop').addEventListener('click', () => setMenu(false));
$('#site-nav').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); $('#menu-btn').focus(); } });
window.matchMedia('(min-width: 900px)').addEventListener('change', () => setMenu(false));
const form = $('#order-form');
form.addEventListener('input', () => { saveForm(); updateTotals(); });
form.addEventListener('change', (e) => {
if (e.target.id === 'o-area') {
$('#o-other-wrap').hidden = e.target.value !== OTHER;
if (e.target.value) showError(e.target, null);
}
saveForm();
updateTotals();
});
form.addEventListener('submit', (e) => e.preventDefault());
$('#wa-send').addEventListener('click', (e) => {
const tt = totals();
if (tt.items === 0) { e.preventDefault(); toast(t('err.cart')); return; }
if (blocked(tt)) { e.preventDefault(); $('#min-alert').focus(); return; }
const bad = validateOrder();
if (bad) { e.preventDefault(); bad.focus(); toast(t('err.fix')); return; }
e.currentTarget.href = waLink(orderText());
$('#after-send').hidden = false;
setTimeout(() => $('#after-send-text').focus(), 60);
});
$('#dl-btn').addEventListener('click', download);
$('#copy-btn').addEventListener('click', copy);
$('#clear-yes').addEventListener('click', () => {
cart = {};
store.set(C.storage.cart, cart);
$('#after-send').hidden = true;
renderCatalogue();
renderCartList();
updateTotals();
toast(t('toast.cleared'));
$('#cart-close').focus();
});
$('#clear-no').addEventListener('click', () => { $('#after-send').hidden = true; $('#wa-send').focus(); });
$('#custom-add-btn').addEventListener('click', addCustom);
$('#o-custom').addEventListener('input', () => showError($('#o-custom'), null));
$('#o-custom').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } });
const qform = $('#quote-form');
qform.addEventListener('input', () => { $('#quote-send').href = waLink(quoteText()); });
qform.addEventListener('submit', (e) => e.preventDefault());
$('#quote-send').addEventListener('click', (e) => {
const bad = validateQuote();
if (bad) { e.preventDefault(); bad.focus(); toast(t('err.fix')); return; }
e.currentTarget.href = waLink(quoteText());
});
$('#min-alert').tabIndex = -1;
initReveal();
initScene();
initInstall();
document.documentElement.classList.add('is-ready');
}
function initInstall() {
const strip = $('#install-strip');
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
if (standalone() || store.get(C.storage.install, false)) return;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const setInstall = (on) => { strip.hidden = !on; document.documentElement.classList.toggle('has-install', on); };
if (isIOS) {
$('#install-desc').dataset.i18n = 'install.ios';
$('#install-desc').textContent = t('install.ios');
setInstall(true);
}
window.addEventListener('beforeinstallprompt', (e) => {
e.preventDefault();
if (isIOS) return;
deferredInstall = e;
$('#install-desc').dataset.i18n = 'install.desc';
$('#install-btn').hidden = false;
setInstall(true);
});
$('#install-btn').addEventListener('click', async () => {
if (!deferredInstall) return;
deferredInstall.prompt();
await deferredInstall.userChoice;
deferredInstall = null;
setInstall(false);
});
$('#install-close').addEventListener('click', () => {
store.set(C.storage.install, true);
setInstall(false);
});
window.addEventListener('appinstalled', () => setInstall(false));
}
let deferredInstall = null;
init();
})();
