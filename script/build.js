// Build every page in TOOLS:
//   * read template from src/
//   * inject shared partials from src/ (header/footer)
//   * inject per-tool JSON data from data/
//   * write <name>.html at repo root
//
// Client JS / CSS lives in src/ and is referenced from the HTML as
// `<script src="src/foo.js">` — served directly, no copy.
//
// Run AFTER `node script/parse-supplycrate.js` if any .txt sources changed.
//
// Usage:  node script/build.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');     // page sources (templates, partials, client JS)
const DATA = path.join(ROOT, 'data');    // pure data (.txt, .json)

// Partials applied to every template (placeholder -> file under src/).
const PARTIALS = {
  '__HEADER__': '_header.html',
  '__FOOTER__': '_footer.html',
};

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}
function itemCount(lootJson) {
  return lootJson.sets.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.items.length, 0), 0);
}

// Build-time computed values, derived from data/. Use for facts shown in
// templates that should never be hand-edited / kept in sync manually.
const COMPUTED = {
  '__DRAGONHOARD_ITEMS__': () => String(itemCount(readJson('dragon_hoard_loot.json'))),
};

const TOOLS = [
  {
    name: 'index',                                     // -> index.html
    template: 'index.template.html',
  },
  {
    name: 'dragonhoard',                               // -> dragonhoard.html
    template: 'dragonhoard.template.html',
    placeholders: { '__LOOT_JSON__': 'dragon_hoard_loot.json' },
  },
];

function escapeForScript(s) {
  return s.replace(/<\/script/gi, '<\\/script');
}

let total = 0;
for (const tool of TOOLS) {
  let html = fs.readFileSync(path.join(SRC, tool.template), 'utf8');

  // Inject shared partials (raw HTML, not script-escaped).
  for (const [placeholder, file] of Object.entries(PARTIALS)) {
    const part = fs.readFileSync(path.join(SRC, file), 'utf8');
    html = html.split(placeholder).join(part);
  }

  // Inject build-time computed values (e.g. counts derived from data/).
  for (const [placeholder, compute] of Object.entries(COMPUTED)) {
    if (html.includes(placeholder)) html = html.split(placeholder).join(compute());
  }

  // Inject per-tool data from data/ (script-escaped — inlined inside <script> blocks).
  for (const [placeholder, dataFile] of Object.entries(tool.placeholders || {})) {
    const data = fs.readFileSync(path.join(DATA, dataFile), 'utf8');
    html = html.replace(placeholder, escapeForScript(data));
  }

  const outHtml = path.join(ROOT, `${tool.name}.html`);
  fs.writeFileSync(outHtml, html);
  console.log(`built ${tool.name}.html (${html.length} bytes)`);
  total++;
}
console.log(`done: ${total} page(s)`);
