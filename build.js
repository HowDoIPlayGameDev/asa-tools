// Build all tool pages: read template + data from ./data/, write
// ./tool/index.html. Add a new tool by appending an entry to TOOLS below
// and dropping its template + data into ./data/.
//
// Usage:  node build.js

const fs = require('fs');
const path = require('path');

const TOOLS = [
  {
    name: 'dragonhoard',
    template: 'data/dragonhoard.template.html',
    data: { '__LOOT_DATA__': 'data/dragon_hoard_loot.txt' },
  },
];

function escapeForScript(s) {
  // Prevent the inlined data from closing its <script type="text/plain"> wrapper.
  return s.replace(/<\/script/gi, '<\\/script');
}

let total = 0;
for (const tool of TOOLS) {
  const tplPath = path.join(__dirname, tool.template);
  let html = fs.readFileSync(tplPath, 'utf8');
  for (const [placeholder, dataPath] of Object.entries(tool.data)) {
    const data = fs.readFileSync(path.join(__dirname, dataPath), 'utf8');
    html = html.replace(placeholder, escapeForScript(data));
  }
  const outDir = path.join(__dirname, tool.name);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index.html');
  fs.writeFileSync(outPath, html);
  console.log(`built ${tool.name}/index.html (${html.length} bytes)`);
  total++;
}
console.log(`done: ${total} tool(s)`);
