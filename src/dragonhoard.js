// Dragon Hoard drop-rate calculator. Reads pre-parsed loot JSON inlined
// into the page by script/build.js (the <script type="application/json"
// id="loot-data"> tag), computes per-item probabilities, renders into a
// Bootstrap table with live filtering / sorting / view toggles.

const LOOT = JSON.parse(document.getElementById('loot-data').textContent);

// ---------- Friendly name from internal class ----------
function prettyName(internal) {
  let n = internal
    .replace(/^PrimalItemArmor_?/, '')
    .replace(/^PrimalItemAmmo_?/, '')
    .replace(/^PrimalItemConsumable_?/, '')
    .replace(/^PrimalItemResource_?/, '')
    .replace(/^PrimalItem_?Weapon/, '')
    .replace(/^PrimalItem_?Armor_?/, '')
    .replace(/^PrimalItem_?/, '')
    .replace(/_ASA$/, '')
    .replace(/_Tek$/, ' Tek')
    .replace(/_C$/, '')
    .replace(/_/g, ' ');
  return n.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

// ---------- Compute drops ----------
const drops = [];
let totalSlots = 0;
for (const set of LOOT.sets) {
  if (!set.entries.length) continue;
  const avgN = (set.minNumItems + set.maxNumItems) / 2;
  const ewT = set.entries.reduce((a, e) => a + e.weight, 0);
  totalSlots += avgN;
  for (const e of set.entries) {
    const pEntry = Math.min(1, (e.weight / ewT) * avgN);
    const wT = e.items.reduce((a, it) => a + it.weight, 0);
    const avgQty = (e.minQuantity + e.maxQuantity) / 2;
    const bp = e.blueprintChance;
    const force = e.forceBlueprint;
    for (const it of e.items) {
      const internal = it.path.split('/').pop().split('.')[0];
      const pSlot = it.weight / wT;
      const pPick = pEntry * pSlot;
      // Effective blueprint chance: forceBlueprint overrides to 1.0, else the
      // explicit chance. Sortable as a number (bpEffective) and shown as text.
      const bpEffective = force ? 1 : bp;
      drops.push({
        item: prettyName(internal),
        internal,
        entry: e.name || '(unnamed)',
        set:   set.name || '(unnamed)',
        minQty: e.minQuantity,
        maxQty: e.maxQuantity,
        avgQty,
        bpEffective,
        bpDisplay: force ? 'Always' : (bp > 0 ? (bp * 100).toFixed(0) + '%' : '-'),
        pPick, pPickItem: force ? 0 : pPick * (1 - bp), pPickBp: force ? pPick : pPick * bp,
        pSlot, pSlotItem: force ? 0 : pSlot * (1 - bp), pSlotBp: force ? pSlot : pSlot * bp,
        ePer:     pPick * avgQty,
        ePerItem: force ? 0 : pPick * avgQty * (1 - bp),
        ePerBp:   force ? pPick * avgQty : pPick * avgQty * bp,
      });
    }
  }
}

// ---------- Stats ----------
document.getElementById('poolSize').textContent = drops.length;

// ---------- Caveat: composition + stack sizes, derived from LOOT ----------
(function () {
  const setLines = LOOT.sets.map(set => {
    const n = (set.minNumItems === set.maxNumItems)
      ? `${set.minNumItems}`
      : `${set.minNumItems}-${set.maxNumItems}`;
    const total = set.entries.length;
    const names = set.entries.map(e => e.name).join(', ');
    return `<strong>${set.name}</strong> picks ${n} of ${total} {${names}}`;
  });
  document.getElementById('composition').innerHTML = setLines.join('; ') + '.';

  const stackParts = [];
  for (const set of LOOT.sets) {
    for (const e of set.entries) {
      const q = (e.minQuantity === e.maxQuantity)
        ? `${e.minQuantity}` : `${e.minQuantity}-${e.maxQuantity}`;
      stackParts.push(`${e.name} = ${q}`);
    }
  }
  document.getElementById('stacksizes').textContent = stackParts.join('; ') + '.';
})();

// ---------- View / state ----------
const VIEWS = {
  perCrate:     { help: 'Open one crate: chance the item appears in it.' },
  perItemSlot:  { help: 'Within its category, this item\'s share of picks.' },
  ePer100:      { help: 'Avg count pulled from 100 crates, including stack sizes.' },
  cratesNeeded: { help: 'Crates to open for ~90% confidence of seeing at least one.' },
};
let sort = { k: 'val', dir: 'desc' };
let activeCat = '';

function valueFor(d, view, form) {
  const pP = form === 'item' ? d.pPickItem : form === 'bp' ? d.pPickBp : d.pPick;
  const pS = form === 'item' ? d.pSlotItem : form === 'bp' ? d.pSlotBp : d.pSlot;
  const eP = form === 'item' ? d.ePerItem  : form === 'bp' ? d.ePerBp  : d.ePer;
  switch (view) {
    case 'perCrate':     return pP;
    case 'perItemSlot':  return pS;
    case 'ePer100':      return eP * 100;
    case 'cratesNeeded': return pP > 0 ? Math.ceil(Math.log(0.1) / Math.log(1 - pP)) : Infinity;
  }
}
function fmt(val, view) {
  if (!isFinite(val)) return '';
  if (view === 'ePer100')      return val.toFixed(2);
  if (view === 'cratesNeeded') return val >= 100000 ? '100k+' : Math.round(val).toLocaleString();
  return (val * 100).toFixed(2) + '%';
}

// Category badge colors (Bootstrap variants).
const CAT_VARIANT = {
  'Weapons': 'danger', 'Armor': 'primary', 'Saddles': 'info',
  'Kibbles': 'success', 'Soups / Heals': 'warning',
  'Arrows': 'secondary', 'Bullets': 'secondary', 'Special': 'secondary',
};

const tbody = document.querySelector('#t tbody');
const ths = document.querySelectorAll('#t th[data-k]');
const empty = document.getElementById('empty');

function render() {
  const view = document.getElementById('view').value;
  const form = document.getElementById('form').value;
  const q = document.getElementById('q').value.trim().toLowerCase();
  document.getElementById('viewHelp').textContent = VIEWS[view].help;

  let rows = drops.map(d => ({ ...d, val: valueFor(d, view, form) }));
  rows = rows.filter(d => !activeCat || d.entry === activeCat);
  rows = rows.filter(d => !q
    || d.item.toLowerCase().includes(q)
    || d.entry.toLowerCase().includes(q)
    || d.internal.toLowerCase().includes(q));
  rows.sort((a, b) => {
    // Sort the blueprint column by the numeric effective chance, not the
    // displayed string (so "Always" > "15%" > "-").
    const key = sort.k === 'bpDisplay' ? 'bpEffective' : sort.k;
    let av = a[key], bv = b[key];
    if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    if (!isFinite(av)) av = sort.dir === 'asc' ? Infinity : -Infinity;
    if (!isFinite(bv)) bv = sort.dir === 'asc' ? Infinity : -Infinity;
    return sort.dir === 'asc' ? av - bv : bv - av;
  });
  ths.forEach(th => { th.classList.remove('sort-asc', 'sort-desc'); });
  const active = [...ths].find(th => th.dataset.k === sort.k);
  if (active) active.classList.add(sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');

  const maxVal = rows.reduce((m, d) => isFinite(d.val) ? Math.max(m, d.val) : m, 0);
  document.getElementById('visibleCount').textContent = rows.length;
  empty.hidden = rows.length > 0;
  tbody.innerHTML = rows.map(d => {
    const variant = CAT_VARIANT[d.entry] || 'secondary';
    const pct = maxVal > 0 && isFinite(d.val)
      ? (view === 'cratesNeeded' ? Math.max(0, 100 - (d.val / maxVal) * 100) : (d.val / maxVal) * 100)
      : 0;
    const qty = d.minQty === d.maxQty ? `${d.minQty}` : `${d.minQty}-${d.maxQty}`;
    return `
      <tr>
        <td title="${d.internal}">${d.item}</td>
        <td><span class="badge text-bg-${variant} fw-normal">${d.entry}</span></td>
        <td class="text-end font-monospace text-body-secondary">${qty}</td>
        <td class="text-end font-monospace text-body-secondary">${d.bpDisplay}</td>
        <td class="text-end font-monospace">
          <div class="d-flex align-items-center justify-content-end gap-2">
            <div class="progress flex-grow-0" style="height:4px; width:60px;">
              <div class="progress-bar bg-primary" style="width:${pct.toFixed(1)}%"></div>
            </div>
            <span>${fmt(d.val, view)}</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}

ths.forEach(th => th.addEventListener('click', () => {
  const k = th.dataset.k;
  if (sort.k === k) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
  else { sort.k = k; sort.dir = (k === 'item' || k === 'entry') ? 'asc' : 'desc'; }
  render();
}));
document.querySelectorAll('[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCat = btn.dataset.cat;
    render();
  });
});
['q', 'view', 'form'].forEach(id => document.getElementById(id).addEventListener('input', render));
render();
