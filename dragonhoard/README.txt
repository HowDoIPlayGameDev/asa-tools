Dragon Hoard Loot Calculator
============================

USAGE
-----
Double-click index.html. That's it.

(No internet, no server, no install. Loot data is baked in.)


WHAT IT DOES
------------
Shows the drop rates of every item in ARK's Dragon Hoard supply crate.
Filter by category, search by item name, choose your benchmark:

  * Chance per crate            How often a crate contains this item
  * Share of its category       Within (e.g.) Saddles, this item's share
  * Expected count per 100      Includes stack sizes (ammo gives 8-12 etc.)
  * Crates needed for >=1       How many to open for a ~90% confidence hit

Toggle between Item / Blueprint / Either for the three quality categories
(Weapons, Armor, Saddles), which have a 15% blueprint chance.


WHAT IT DOESN'T DO
------------------
Doesn't tell you what quality (Primitive ... Ascendant) the item rolls.
That depends on Drakeling XP, level, and biome bonus, which live in
blueprint code rather than data. Only empirical testing reveals that.


FILES
-----
index.html              The page. Open this.
dragon_hoard_loot.txt   Source data, engine ExportText dump from the server.
template.html           Page source (uses __LOOT_DATA__ placeholder).
build.js                Regenerates index.html from template + txt.

To refresh after a new server dump:
  node build.js
