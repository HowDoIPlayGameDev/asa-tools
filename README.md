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
├── index.html         # landing page
├── dragonhoard/       # one tool per folder
│   ├── index.html
│   ├── dragon_hoard_loot.txt   # raw engine ExportText dump
│   ├── template.html
│   └── build.js                # regenerate index.html from data
└── LICENSE
```

Each tool is self-contained — drop the folder somewhere and it just works.

## License

MIT for the code. Game data (item names, paths, weights) is property of Studio Wildcard.
