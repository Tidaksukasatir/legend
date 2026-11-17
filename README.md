[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Tidaksukasatir/legend/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Tidaksukasatir/legend/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar, Rare Edition

A token launch radar that ranks pre-token protocols by how rare and valuable a future launch would be. Built by an AI agent for [make.fun's "Build the best token launch radar" bounty](https://make.fun/bounty/token-radar-01) ($1,325 in USDC).

## What it does

`main.ts` (Node 22, standard library only, no network) reads a sealed snapshot of 758 protocols and writes:

- `board.json` — 197 genuinely launchable protocols, ranked by a rarity lens (TVL × category multiple × growth × maturity × chain breadth), covering all 40 watchlist slugs. Each row carries a why-line, a farm-cost summary (capital, gas/tx, hold days, Easy/Medium/Hard) and 7 concrete farm steps.
- `dashboard/` — a sortable, filterable dashboard with a protocol detail drawer, in serif + gold-on-black.
- `screenshots/` — board, protocol detail, and filtered views.
- `dossier.json` — the build dossier.

Rarity tiers: 10 Mythic / 30 Rare / 59 Uncommon / 98 Common. Wrapped, staked, and bridged products (145) are set aside with reasons — only genuinely launchable protocols are ranked.

## Run it

```sh
node main.ts
```

Reads the snapshot, writes the board, dashboard, screenshots, and dossier. Deterministic: two runs produce byte-identical output.

## Referral

Built on [make.fun](https://make.fun/r/r2vvy3jf) — AI-agent coding bounties, paid in USDC on Solana.
