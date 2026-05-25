// Convert raw engine-ExportText dumps in data/*.txt into clean JSON
// (data/*.json) that the website templates consume directly. Run after
// any new server dump lands in data/.
//
// Usage:  node script/parse.js
//
// Input shape: a `dump_loot` ArkApi log block, like
//   ## /Game/.../SomeSupplyCrate_C
//     MinItemSets: 3
//     ItemSets: ((SetName="...",ItemEntries=((Items=("..."),ItemsWeights=(...),...))))
//
// Output JSON shape (one file per .txt):
//   {
//     "class": "/Game/.../SomeSupplyCrate_C",
//     "minItemSets": 3, "maxItemSets": 3,
//     "minQualityMultiplier": 1, "maxQualityMultiplier": 1,
//     "aboveOneExtraQualityMultiplier": 1.2,
//     "sets": [
//       { "name": "Items With Quality",
//         "minNumItems": 1, "maxNumItems": 1, "withoutReplacement": false,
//         "entries": [
//           { "name": "Weapons",
//             "minQuantity": 1, "maxQuantity": 1,
//             "blueprintChance": 0.15, "forceBlueprint": false,
//             "items": [ { "path": "...", "weight": 1.0 }, ... ] }
//         ] }
//     ]
//   }

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');

// ---------- ExportText parser ----------
function splitTopLevel(body) {
  const out = []; let depth = 0, inStr = false, last = 0;
  for (let i = 0; i < body.length; ++i) {
    const c = body[i];
    if (c === '"') inStr = !inStr;
    else if (!inStr && c === '(') depth++;
    else if (!inStr && c === ')') depth--;
    else if (!inStr && c === ',' && depth === 0) { out.push(body.slice(last, i)); last = i + 1; }
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}
function parseValue(v) {
  v = v.trim();
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v === 'True') return true;
  if (v === 'False') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  if (v.startsWith('(') && v.endsWith(')')) {
    const items = splitTopLevel(v.slice(1, -1));
    if (!items.length) return [];
    let hasEq = false, depth = 0, inStr = false;
    for (let i = 0; i < items[0].length; ++i) {
      const c = items[0][i];
      if (c === '"') inStr = !inStr;
      else if (!inStr && c === '(') depth++;
      else if (!inStr && c === ')') depth--;
      else if (!inStr && c === '=' && depth === 0) { hasEq = true; break; }
    }
    if (hasEq) return parseStruct(v);
    return items.map(parseValue);
  }
  return v;  // raw token (class ref, etc.)
}
function parseStruct(block) {
  if (!block.startsWith('(') || !block.endsWith(')')) return {};
  const fields = splitTopLevel(block.slice(1, -1));
  const obj = {};
  for (const f of fields) {
    const eq = f.indexOf('=');
    if (eq < 0) continue;
    obj[f.slice(0, eq).trim()] = parseValue(f.slice(eq + 1));
  }
  return obj;
}
function findClose(str, open) {
  let depth = 0, inStr = false;
  for (let i = open; i < str.length; ++i) {
    const c = str[i];
    if (c === '"') inStr = !inStr;
    else if (!inStr && c === '(') depth++;
    else if (!inStr && c === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

// ---------- Extract a header value like "  MinItemSets: 3" ----------
function pickFloat(raw, label, dflt) {
  const re = new RegExp(`\\b${label}\\s*:\\s*([0-9.+\\-]+)`);
  const m = raw.match(re);
  return m ? parseFloat(m[1]) : dflt;
}
function pickClass(raw) {
  // The first "## <path>" line names the crate class.
  const m = raw.match(/^##\s+(\S+)/m);
  return m ? m[1] : null;
}
function extractArray(raw, label) {
  // Find `label: ((...))` and return the outer `((...))` slice.
  const re = new RegExp(`\\b${label}\\s*[:=]\\s*\\(\\(`);
  const m = raw.match(re);
  if (!m) return null;
  const open = m.index + m[0].length - 2;
  const close = findClose(raw, open);
  return raw.slice(open + 1, close);
}

// ---------- Normalize a single supply crate dump ----------
function normalize(rawText) {
  const out = {
    class: pickClass(rawText),
    minItemSets: pickFloat(rawText, 'MinItemSets', 1),
    maxItemSets: pickFloat(rawText, 'MaxItemSets', 1),
    numItemSetsPower: pickFloat(rawText, 'NumItemSetsPower', 1),
    minQualityMultiplier: pickFloat(rawText, 'MinQualityMultiplier', 1),
    maxQualityMultiplier: pickFloat(rawText, 'MaxQualityMultiplier', 1),
    aboveOneExtraQualityMultiplier: pickFloat(rawText, 'AboveOneExtraQualityMultiplier', 1),
    requiredLevelToAccess: pickFloat(rawText, 'RequiredLevelToAccess', 0),
    maxLevelToAccess: pickFloat(rawText, 'MaxLevelToAccess', 0),
    sets: [],
  };
  const setsBlob = extractArray(rawText, 'ItemSets');
  if (!setsBlob) return out;
  const setBlocks = splitTopLevel(setsBlob).map(parseStruct);
  for (const s of setBlocks) {
    const set = {
      name: s.SetName ?? null,
      weight: s.SetWeight ?? 1,
      minNumItems: s.MinNumItems ?? 1,
      maxNumItems: s.MaxNumItems ?? 1,
      numItemsPower: s.NumItemsPower ?? 1,
      withoutReplacement: s.bItemsRandomWithoutReplacement ?? false,
      qualityMultiplier: s.QualityMultiplier ?? 1,
      entries: [],
    };
    for (const e of (s.ItemEntries || [])) {
      const items = e.Items || [];
      const wRaw = e.ItemsWeights || [];
      const entry = {
        name: e.ItemEntryName ?? null,
        weight: e.EntryWeight ?? 1,
        minQuantity: e.MinQuantity ?? 1,
        maxQuantity: e.MaxQuantity ?? (e.MinQuantity ?? 1),
        quantityPower: e.QuantityPower ?? 1,
        minQuality: e.MinQuality ?? 0,
        maxQuality: e.MaxQuality ?? 0,
        qualityPower: e.QualityPower ?? 1,
        blueprintChance: e.ChanceToBeBlueprintOverride ?? 0,
        forceBlueprint: e.bForceBlueprint ?? false,
        ignoreQuantityMultipliers: e.bIgnoreQuantityMultipliers ?? false,
        items: items.map((p, i) => ({
          path: p,
          weight: typeof wRaw[i] === 'number' ? wRaw[i] : 1,
        })),
      };
      set.entries.push(entry);
    }
    out.sets.push(set);
  }
  return out;
}

// ---------- Walk data/ and process every .txt ----------
const files = fs.readdirSync(DATA).filter(f => f.endsWith('.txt'));
if (!files.length) { console.log('no .txt files in data/'); process.exit(0); }
for (const f of files) {
  const txt = fs.readFileSync(path.join(DATA, f), 'utf8');
  const json = normalize(txt);
  const outName = f.replace(/\.txt$/, '.json');
  fs.writeFileSync(path.join(DATA, outName), JSON.stringify(json, null, 2));
  console.log(`parsed ${f} -> ${outName} (${json.sets.length} sets, ${json.sets.reduce((a,s)=>a+s.entries.length,0)} entries, ${json.sets.reduce((a,s)=>a+s.entries.reduce((b,e)=>b+e.items.length,0),0)} items)`);
}
