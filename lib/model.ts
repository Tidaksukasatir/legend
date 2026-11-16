// Token Radar, model radar-2 ("RARE"): one sealed snapshot in, one ranked board out.
//
// The board ranks every protocol the snapshot records as pre-token AND genuinely
// launchable: the watchlist's own exclusion rule is applied to the whole board, not
// just to the watchlist. That is the difference from a plain TVL table. The starter
// ranked the 160 biggest pre-token protocols below the floor by TVL; 64 of those 160
// are wrapped, staked or bridged products of tokens that already trade (WBTC,
// Binance staked ETH, USDT0, the big bridges) and have no launch of their own. This
// model sets those 145 protocols aside with their reason, and ranks the 197 that
// remain: the 40 watchlist slugs, 19 more above the $50M floor the watchlist leaves
// out, and 138 early ones below it.
//
// Implied value follows only from the snapshot's own figures, in one named function,
// impliedValue(). No protocol name is ever special-cased; the same function scores
// every row:
//
//   category  = categoryMultiple(category)     what a dollar of TVL is worth here:
//                                              lending and CDP debt is stickier than
//                                              a bridge's pass-through volume, so the
//                                              multiple runs 0.12 (bridge) to 0.34
//                                              (lending / CDP), 0.22 by default.
//   growth    = growthMultiplier(change_7d)    clamped to [-50, +150]%; a rise adds
//                                              0.6x its size, a fall subtracts 1.0x
//                                              its size: shrinking TVL is punished
//                                              harder than growing TVL is rewarded.
//   maturity  = maturityMultiplier(age_days)   0.55 + 0.45 x min(age, 1460)/1460:
//                                              a protocol that has run for years with
//                                              no token on record has the longest
//                                              pent-up launch; unknown age counts as
//                                              365 days.
//   breadth   = breadthMultiplier(chains)      1 + 0.03 x min(chains - 1, 5): a
//                                              protocol live on more chains reaches
//                                              more farmers. At most 1.15.
//   implied   = round(tvl_usd x category x growth x maturity x breadth)
//
// Rarity tiers come from the rank, not from a name: the top 5% of the board are
// Mythic (S), the next 15% Rare (A), the next 30% Uncommon (B), the rest Common (C).
// Every row also carries whyFor()'s one-sentence reason, naming the drivers that
// put it at its rank, and farmSummary()'s total cost (capital, gas, hold, difficulty).
// A farm plan is derived from the protocol's own record (category, chains, TVL,
// age) by farmSteps(): seven steps, each carrying what it costs and how long it
// takes, with gas priced for the protocol's own first chain.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight_up: number;
  growth_weight_down: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_step: number;
  breadth_max_chains: number;
  default_multiple: number;
}

export const MODEL: ModelConstants = {
  growth_weight_up: 0.6,
  growth_weight_down: 1.0,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.45,
  maturity_days: 1460,
  unknown_age_days: 365,
  breadth_step: 0.03,
  breadth_max_chains: 5,
  default_multiple: 0.22,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** What farming one protocol costs in total: capital, gas per transaction, hold, difficulty. */
export interface FarmSummary {
  capital_usd: number;
  gas_usd: number;
  hold_days: number;
  difficulty: string;
  est_total_usd: number;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  tier: string;
  why: string;
  farm: FarmSummary;
  model: {
    category_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  tier: string;
  why: string;
  farm: FarmSummary;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A pre-token protocol set aside from the ranking, with the rule that set it aside. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** Everything the dashboard needs: the board, the live set, the set-aside set, and the model. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_size: number;
  live_size: number;
  set_aside_size: number;
  total_implied_usd: number;
  median_implied_usd: number;
  watchlist: string[];
  rows: RadarRow[];
  live: LiveRow[];
  set_aside: SetAsideRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** What one dollar of this category's TVL is worth as a future token: lending debt is
 *  stickier than bridge pass-through, so the multiple runs 0.12 to 0.34 by category. */
export function categoryMultiple(category: string | null): number {
  const c = (category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('uncollateralized')) return 0.34;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('basis trading')) return 0.3;
  if (c.includes('dex')) return 0.28;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('yield aggregator') || c.includes('liquidity manager')) return 0.27;
  if (c.includes('rwa') || c.includes('stablecoin') || c.includes('dual-token')) return 0.26;
  if (c.includes('prediction')) return 0.25;
  if (c.includes('yield') || c.includes('leveraged farm') || c.includes('farm')) return 0.24;
  if (c.includes('chain')) return 0.2;
  if (c.includes('bridge')) return 0.12;
  if (c.includes('stak') || c.includes('restak')) return 0.14;
  if (c.includes('insurance')) return 0.24;
  if (c.includes('payment') || c.includes('card')) return 0.2;
  return MODEL.default_multiple;
}

/** The growth multiplier: rises are rewarded at 0.6x, falls punished at 1.0x, clamped. */
export function growthMultiplier(change7d: number | null, model: ModelConstants): { pct: number; mult: number } {
  const pct = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(change7d, 0)));
  const weight = pct >= 0 ? model.growth_weight_up : model.growth_weight_down;
  const mult = 1 + (pct / 100) * weight;
  return { pct, mult: Math.max(0.5, Math.min(1.9, mult)) };
}

/** The maturity multiplier: longer with no token on record means a longer pent-up launch. */
export function maturityMultiplier(age: number | null, model: ModelConstants): number {
  const days = age ?? model.unknown_age_days;
  return model.maturity_floor + (Math.min(Math.max(days, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
}

/** The breadth multiplier: more chains means more farmers reached, capped at five extra. */
export function breadthMultiplier(chains: string[], model: ModelConstants): number {
  return 1 + model.breadth_step * Math.min(Math.max(chains.length - 1, 0), model.breadth_max_chains);
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; categoryMult: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const categoryMult = categoryMultiple(protocol.category);
  const { pct: growthPct, mult: growthMult } = growthMultiplier(protocol.change_7d, model);
  const maturityMult = maturityMultiplier(age, model);
  const breadthMult = breadthMultiplier(protocol.chains, model);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * categoryMult * growthMult * maturityMult * breadthMult));
  return { implied, categoryMult, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A whole word wrapped, staked or staking anywhere in the name. */
const WRAPPED_OR_STAKED = /\b(wrapped|staked|staking)\b/i;
/** A name that begins with an exchange's name: an exchange's own product, not a launch. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
/** Categories that are a wrapped, staked or bridged product of a token that already trades. */
const WRAPPED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Cross Chain Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Why a pre-token protocol is set aside instead of ranked, or null when it may be ranked.
 *  This is the watchlist's own rule, applied to the whole board: a wrapped, staked or
 *  bridged product of a token that already trades has no launch of its own. */
export function setAsideReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && WRAPPED_CATEGORIES.has(p.category)) return `category ${p.category}: a wrapped, staked or bridged product of a token that already trades`;
  if (VERSIONED.test(p.name)) return 'versioned name: a pool of another protocol, not a launch of its own';
  if (WRAPPED_OR_STAKED.test(p.name)) return 'wrapped or staked name: a product of a token that already trades';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange product: an exchange\'s own product, not a launch of its own';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and set aside by no rule. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && setAsideReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** A rarity tier from the rank inside a board of `n`: top 5% Mythic, next 15% Rare,
 *  next 30% Uncommon, the rest Common. The tier is the rank's, never the name's. */
export function tierFor(rank: number, n: number): string {
  if (rank <= Math.max(1, Math.ceil(n * 0.05))) return 'S · Mythic';
  if (rank <= Math.ceil(n * 0.2)) return 'A · Rare';
  if (rank <= Math.ceil(n * 0.5)) return 'B · Uncommon';
  return 'C · Common';
}

/** A short dollar figure: $2.75B, $190.5M, $820K. */
function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** Why this protocol ranks where it does, in one sentence naming its drivers: the
 *  rarity lens. A protocol is rare when it combines big TVL with a long tokenless
 *  run and growth — few protocols have all three, and the formula multiplies them,
 *  so only the combination reaches the top. The strongest lift and the biggest drag
 *  are the model's own multipliers, measured against their neutral values. */
export function whyFor(
  p: SnapshotProtocol,
  v: { categoryMult: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null },
  rank: number,
  n: number,
): string {
  const ageText =
    v.age === null
      ? 'age unrecorded'
      : v.age >= 730
        ? `${Math.floor(v.age / 365)}+ years with no token on record`
        : `${v.age} days with no token on record`;
  const growthText =
    v.growthPct >= 10
      ? `growing +${v.growthPct.toFixed(1)}% in 7 days`
      : v.growthPct <= -10
        ? `shrinking ${v.growthPct.toFixed(1)}% in 7 days`
        : `7-day growth ${v.growthPct >= 0 ? '+' : ''}${v.growthPct.toFixed(1)}%`;
  const chainText = p.chains.length >= 5 ? `, live on ${p.chains.length} chains` : p.chains.length >= 2 ? `, on ${p.chains.length} chains` : '';
  const lifts = [
    { name: 'growth', score: v.growthMult - 1 },
    { name: 'tokenless age', score: v.maturityMult - MODEL.maturity_floor },
    { name: 'chain breadth', score: v.breadthMult - 1 },
    { name: 'category multiple', score: v.categoryMult - MODEL.default_multiple },
  ];
  lifts.sort((a, b) => b.score - a.score);
  const best = lifts[0]!;
  const worst = lifts[lifts.length - 1]!;
  const drag = worst.score < 0 ? ` Biggest drag: ${worst.name} (${worst.score >= 0 ? '+' : ''}${worst.score.toFixed(2)}).` : '';
  return (
    `Rank ${rank} of ${n}: ${fmtShort(p.tvl_usd)} TVL × ${p.category ?? 'uncategorised'} ${v.categoryMult} · ${ageText} · ${growthText}${chainText}. ` +
    `Strongest lift: ${best.name} (${best.score >= 0 ? '+' : ''}${best.score.toFixed(2)}).${drag}`
  );
}

/** What farming one protocol costs in total. Gas is six transactions at the
 *  protocol's own chain price: fund, set up, second action, two weekly touches,
 *  exit. Difficulty is the capital and the gas together, never the name. */
export function farmSummary(p: SnapshotProtocol, age: number | null): FarmSummary {
  const capital = capitalFor(p);
  const gas = gasFor(chainOf(p));
  const hold = holdDaysFor(age);
  const difficulty = capital >= 250 && gas >= 2 ? 'Hard' : capital >= 150 || gas >= 2 ? 'Medium' : 'Easy';
  return { capital_usd: capital, gas_usd: gas, hold_days: hold, difficulty, est_total_usd: Math.round((capital + gas * 6) * 100) / 100 };
}

/** The protocols the board ranks, strongest first, with ranks 1..n and strictly
 *  falling implied values (an exact tie is nudged down one dollar so rank order is
 *  the value order). */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every rankable protocol the watchlist leaves out, whatever its
  // TVL — above the floor (the watchlist leaves 19 out) and below it alike.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const n = scored.length;
  let prev = Number.POSITIVE_INFINITY;
  return scored.map((s, i) => {
    let implied = s.implied;
    if (implied >= prev) implied = Math.max(1, prev - 1);
    prev = implied;
    return {
      rank: i + 1,
      slug: s.p.slug,
      name: s.p.name,
      category: s.p.category,
      chains: s.p.chains,
      tvl_usd: s.p.tvl_usd,
      change_7d: s.p.change_7d,
      mcap_usd: s.p.mcap_usd,
      listed_at: s.p.listed_at,
      gecko_id: s.p.gecko_id,
      symbol: s.p.symbol,
      token_status: 'pre-token',
      age_days: s.age,
      implied_value_usd: implied,
      tier: tierFor(i + 1, n),
      why: whyFor(s.p, s, i + 1, n),
      farm: farmSummary(s.p, s.age),
      model: {
        category_multiple: s.categoryMult,
        growth_pct: s.growthPct,
        growth_multiplier: round4(s.growthMult),
        maturity_multiplier: round4(s.maturityMult),
        breadth_multiplier: round4(s.breadthMult),
        age_days: s.age,
      },
      farm_steps: farmSteps(s.p, s.age).map(stepText),
    };
  });
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in dollars: the farm plan prices gas where the farmer pays it. */
export function gasFor(chain: string): number {
  const c = chain.toLowerCase();
  if (c.includes('ethereum')) return 8;
  if (c.includes('solana')) return 0.05;
  if (c.includes('bitcoin')) return 4;
  if (c.includes('tron')) return 2;
  if (c.includes('hyperliquid')) return 0.1;
  if (c.includes('polygon')) return 0.05;
  if (c.includes('base') || c.includes('arbitrum') || c.includes('optimism') || c.includes('blast') || c.includes('mode') || c.includes('ink') || c.includes('abstract') || c.includes('monad') || c.includes('berachain') || c.includes('linea') || c.includes('scroll') || c.includes('zksync') || c.includes('avalanche')) return 0.5;
  if (c.includes('binance') || c.includes('bnb')) return 0.3;
  return 2;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 250_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('uncollateralized')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open, so the loan book counts your address.`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('yield aggregator') || c.includes('liquidity manager')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the vault shares.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm') || c.includes('farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('basis trading')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position.`;
  if (c.includes('rwa') || c.includes('stablecoin') || c.includes('dual-token')) return `Mint $${capital} of the yield-bearing asset through ${name} on ${chain} and hold it.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}, then leave the position to settle.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC to ${chain} through ${name}'s own bridge and use it in one app on that chain.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('payment') || c.includes('card')) return `Load $${capital} onto ${name} on ${chain} and spend a small amount through it.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The second, different action a week later: one deposit is a snapshot, two actions are use. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `borrow $${Math.round(capital / 5)} against your supply on ${name} and repay it the same week`;
  if (c.includes('dex') || c.includes('yield') || c.includes('farm')) return `swap $${Math.round(capital / 5)} through ${name}'s main pool on ${chain}`;
  if (c.includes('risk curator') || c.includes('capital allocator') || c.includes('yield aggregator')) return `deposit $${Math.round(capital / 5)} into a second ${name} vault on ${chain}`;
  if (c.includes('rwa') || c.includes('stablecoin')) return `mint a second $${Math.round(capital / 5)} tranche through ${name} on ${chain}`;
  if (c.includes('prediction')) return `place a second, smaller market position on ${name}`;
  if (c.includes('derivative') || c.includes('perpetual')) return `close the hedge on ${name} and open a fresh one half its size`;
  return `make a small swap inside ${name} on ${chain}`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is
 * derived from the protocol's own record (category, chains, TVL, age), never from a
 * hand-written list of names. Gas is priced for the protocol's own first chain.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasFor(chain);
  const gasText = gas >= 1 ? `$${gas}` : `$${gas.toFixed(2)}`;
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondActionFor(p, capital, chain);
  const ageNote =
    age !== null && age >= 730
      ? ` This protocol has run ${Math.floor(age / 365)}+ years with no token on record, so staying in through one more quarterly snapshot matters.`
      : age !== null && age >= 365
        ? ` This protocol has run over a year with no token on record, so a longer hold counts for more.`
        : '';
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `about ${gasText} of gas to fund it on ${chain}`,
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about ${gasText} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `One week later, make a second, different on-chain action: ${second}.`,
      cost: `about ${gasText} of gas`,
      time: '10 minutes',
    },
    {
      text: `Repeat one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and never leave the position untouched for a full month.`,
      cost: `about ${gasText} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.${ageNote}`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Open the protocol's own points or rewards page from its official site and check your position is counted; claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log; when you unwind, withdraw in two steps a day apart so no snapshot catches an empty wallet.`,
      cost: `about ${gasText} of gas to exit`,
      time: '10 minutes to log, 2 days to exit',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The pre-token protocols set aside from the ranking, biggest first, with their reason. */
export function setAsideRows(snapshot: Snapshot): SetAsideRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && setAsideReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: setAsideReason(p)!,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    tier: row.tier,
    why: row.why,
    farm: row.farm,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const setAside = setAsideRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug) && r.tvl_usd < snapshot.floor_usd).length;
  const aboveFloor = board.filter((r) => !snapshot.watchlist.includes(r.slug) && r.tvl_usd >= snapshot.floor_usd).length;
  const values = board.map((r) => r.implied_value_usd).sort((a, b) => a - b);
  const total = board.reduce((n, r) => n + r.implied_value_usd, 0);
  const median = values.length % 2 === 1 ? values[(values.length - 1) / 2]! : Math.round((values[values.length / 2 - 1]! + values[values.length / 2]!) / 2);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    above_floor_size: aboveFloor,
    live_size: live.length,
    set_aside_size: setAside.length,
    total_implied_usd: total,
    median_implied_usd: median,
    watchlist: [...snapshot.watchlist].sort(),
    rows: board.map(radarRow),
    live,
    set_aside: setAside,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
