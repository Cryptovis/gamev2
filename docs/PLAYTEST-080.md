# The Real President · Sovereign Horizons 0.80.0-playtest.1

Base: `dev/real-president-079`. Preview: `dev/sovereign-horizons-080`.

## Victory

A player victory from the actual combat engine pauses time and opens a parchment-style victory notice. A defending player also celebrates when the enemy offensive ends in defeat. Withdrawals and enemy victories do not trigger celebration. Four short sourced quotations rotate using the simulation RNG; the selected quote is retained in saves and the same war cannot reward/display twice. The parchment credits the author, links its source, and offers Continue governing / Manage territories.

Quoted sources and context:

- Mustafa Kemal Atatürk: ATAM, Millî Savunma ve Askerlik Sanatı. https://atam.gov.tr/milli-savunma-ve-askerlik-sanati/
- George Washington: Library of Congress, Battle Joined; letter to Philip Schuyler, 20 August 1775. https://www.loc.gov/exhibits/creating-the-united-states/battle-joined.html
- Pep Guardiola: Manchester City's published Newcastle reaction, December 2019. His short perseverance quotation was about football performance. https://www.mancity.com/news/first-team/first-team-news/2019/december/pep-guardiola-man-city-newcastle-reaction-part-two

Original text is retained and translations are identified as translations. Credits are attribution, not a claim that any author endorses the game.

## Assimilation / territory integration

Open Territories & Political Affairs, select a controlled territory, then Assimilate / Integrate territory. The popup shows nine live requirements:

| Requirement | Threshold |
| --- | ---: |
| Player controls the territory | Required |
| Active war / transition election | Neither active |
| Computed public wellbeing | 90% |
| Public approval | 90% |
| Stability | 75% |
| Shared religious share | 60% |
| Civic ideology alignment | 80%, or matching ideology |
| Language education coverage | 75% |
| Unrest | At most 15% |

Language and civic education each add 15 percentage points for $250M with a seven-day shared preparation cooldown. Public services add two points of durable welfare support (cap 12), raise approval/stability, ease local taxes to at most 18%, and reduce unrest. These policies do not replace food supply or remove inflation. Existing voluntary religious outreach is gradual, uncertain, and paid through a review; there is no guaranteed conversion shortcut.

When all conditions are met, integration costs the greater of $500M or $50M per million residents. Review and pay once to begin 90 game days. Loss of control or computed wellbeing below 80% fails immediately; the upfront investment is not refunded. The starting criteria are evaluated before beginning; the ongoing failure threshold is wellbeing/control. Failure can be retried after meeting conditions and paying a new investment.

Completion combines population/workforce, GDP/treasury/debt, natural resource production and reserves, processed resources, armed forces, factories/refineries/mines/power, industrial stocks/deposits/facilities/construction, equipment reserves/production lines, infrastructure, research unlocks/points, campuses/pilots/training and vault gold. Live commodity contracts, credit offers/loans, bloc leadership/membership, counterpart embassies and controlled dependencies move to the new owner. Debts are inherited; a creditor/debtor becoming the same owner cancels its internal loan liability.

The old country stops appearing as a sovereign in menus and map labels; its land resolves to the new owner for color/selection. An inert internal record is retained for historical war/save references. It has zero transferred assets and is excluded from ordinary simulation/AI/sovereign lists, preventing duplicated population/production. This is a fictional strategy rule, not a real-world citizenship or demographic model.

## Sovereign credit and monetary fund

Open Market → Sovereign Credit & Monetary Fund. It supports 90, 180 and 365-day loans, annual rates from 0–30%, country-specific risk references, borrowing requests and lending offers. Five opening lender countries advertise differing rates. AI governments rotate new listings and match financially suitable offers every 14 game days.

Posting a lending offer reserves its principal immediately. Posting a borrowing request receives no cash until funded. The review makes clear that publishing authorizes another government to match the exact posted terms. Cancelling an unmatched lend offer returns escrow; expiry returns it once. Matched loans cannot simply be cancelled. War, sanctions, occupied/retired counterparties, liquidity and debt-capacity checks prevent invalid funding. Principal is entered in millions of dollars; $1M at 3% APR for 365 days owes $1.03M. Ninety days owes principal × (1 + 0.03 × 90 / 365).

At maturity, settlement takes available cash first, then central-bank gold, industrial gold/silver, raw resources, and other saleable reserve goods. Conservative liquidation price uses the lower of 65% of the reference or the lowest valid asking price, with a 10% reference floor. This haircut and floor are authored game rules, not live market quotes. Real inventory transfers to the creditor; collateral repayment does not print cash. Already escrowed commodity stock is unavailable for simultaneous seizure.

Any unpaid balance remains an arrears ledger. HUD and the credit screen show the resulting negative fiscal balance separately from spendable cash. A minimum 45% tax policy is enforced while overdue loans remain, lowering wellbeing through the existing tax model. Later daily cash and available collateral repay arrears, and the pre-default tax policy returns only when all arrears clear. Interest is booked once at maturity; no hidden daily compounding or duplicated collection. Legacy macro debt and these named contracts remain separate layers of the simulation.

## Interface / geographic performance

Opening/profile setup uses the existing cinematic cover with a compact charcoal-and-gold theme, readable controls, less padding and no national red accent on setup text. Negative/critical resource states use a dark warning chip and pale text instead of dark red on blue. Main-menu accent text uses a consistent pale gold; nationality colors are retained as separate identity metadata rather than making text dark.

Satellite reprojection and WebP encoding move into a module Worker with OffscreenCanvas. Low-resolution 720×420 initial / 480×280 moving previews are followed by 1200×700 refinement after the camera settles. Incoming camera changes cancel obsolete worker jobs between row batches; only the latest request is queued. Blob URLs replace data-URL encoding and are revoked. A reduced-resolution canvas fallback supports environments without Worker/OffscreenCanvas. Main-thread country anchors/areas are cached; globe label area uses a spherical estimate and already-translated shape nodes no longer receive a redundant translation traversal.

This removes the large satellite projection loop from the UI thread. It does not guarantee a universal frame rate: SVG boundaries, image decoding, device/GPU and the existing UI bundle still cost time. Local headless verification showed lower camera-related long tasks after caching, but is not a physical-device benchmark. The existing main bundle remains above Vite's 500 kB advisory. Credit/Governance screens and the worker are separately built chunks.

## Verification

**208 tests across 37 files passed.** `npm run check` covers the existing regression suite plus new loan escrow/payment/collateral/default/tax restoration, integration conditions/cooldowns/failure/consolidation/compatibility, victory de-duplication and chunked raster tests.

Browser walkthrough covers black/gold setup, credit navigation and binding reviews, a $1M/90-day request, nine integration conditions, an actual 90-day completion, old country removal/owner selection, an actual battle victory parchment, worker preview/refined geographic frames, Turkish credit titles and narrow viewport without page errors.

Schema 14 saves remain supported. New world expansion data is optional for older saves and retained in snapshots. New Turkish UI translations are supplied; other language catalogs keep English fallback for new text not yet translated.

## Run

Stop the existing dev server with Ctrl+C:

```bash
git fetch origin
git checkout dev/sovereign-horizons-080
git pull --ff-only origin dev/sovereign-horizons-080
npm ci
npm run dev
```

Preserve any local source edits if Git reports they would be overwritten. Browser saves do not need to be erased.
