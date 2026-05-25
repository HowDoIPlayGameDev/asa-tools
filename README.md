# ASA Tools

Calculators and reference utilities for **ARK: Survival Ascended**. Live data datamined from a running ASA dedicated server (via [`AsaApi`](https://github.com/ArkServerApi/AsaApi) reflection), then rendered as static HTML — no backend, no install, no internet required to use.

Live site: **https://howdoiplaygamedev.github.io/asa-tools/**

## Tools

| Tool | What it does |
|---|---|
| [Dragon Hoard Loot Calculator](./dragonhoard/) | Drop rates for every item in Drakeling Dragon Hoard crates. Filter, search, multiple benchmark views. |

## Project layout

```
asa-tools/
├── index.html              # landing page
├── build.js                # rebuilds every tool from data/
├── data/                 # ALL source data + templates (single folder)
│   ├── dragon_hoard_loot.txt          # raw engine ExportText dump
│   └── dragonhoard.template.html      # tool UI template
├── dragonhoard/            # built output (do not edit by hand)
│   └── index.html
└── LICENSE
```

**Editing rules**

- Source of truth for every tool lives in `data/`. Don't hand-edit `<tool>/index.html` — it's regenerated.
- After changing any `data/*`, run `node build.js` and commit both the input and the regenerated output.

**Adding a new tool**

1. Drop the data file(s) into `data/` (e.g. `cryofridge_loot.txt`).
2. Drop a template HTML into `data/` (e.g. `cryofridge.template.html`) with placeholder strings like `__LOOT_DATA__`.
3. Append an entry to the `TOOLS` array in `build.js`.
4. `node build.js`, then add a card to root `index.html`.

## License

MIT for the code. Game data (item names, paths, weights) is property of Studio Wildcard.
