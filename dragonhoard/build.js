// Regenerate index.html with dragon_hoard_loot.txt inlined. Run after any
// re-dump from the server. Single-file output so file:// just works.
const fs = require('fs');
const tpl = fs.readFileSync(__dirname + '/template.html', 'utf8');
const data = fs.readFileSync(__dirname + '/dragon_hoard_loot.txt', 'utf8');
// Escape characters that would close the <script> tag.
const safe = data.replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(__dirname + '/index.html', tpl.replace('__LOOT_DATA__', safe));
console.log('wrote index.html');
