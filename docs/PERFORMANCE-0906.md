# 0.90.0-playtest.6 performance measurements

Measured by **Codex**, 2026-10-11, on `dev/clear-command-090`. Baseline: GitHub `2adaceba` / playtest.5; candidate: playtest.6. These are local measurements, with the production browser suite run separately for correctness.

## Reproduce

```bash
npm ci
npm run measure:engine
npx playwright install chromium
PERFORMANCE_LABEL=current npm run measure:browser
```

Machine-specific JSON goes to ignored `performance/results/engine.json` and `performance/results/browser-current.json`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for an existing Chromium. The browser command builds and serves production on port 5182; run it separately from builds and other Playwright runs. Measurements are opt-in and do not enlarge the regular CI suite.

## Method and limits

- Engine: v24.19.0, AMD EPYC 9V74 80-Core Processor. Browser: Chromium 153.0.8010.0, 1440×900, headless, software graphics, localhost. No network or CPU throttling; browser process/OS caches can be warm. Actual StackBlitz and mobile-device performance are separate follow-ups.
- Three real seeded campaigns: day 1, day 366 and day 1096. Headless progression acknowledges event/victory/advisor blockers; events choose their first option, and no discretionary player policies or actions are performed. All three snapshots pass save validation. This is an unattended workload, not an exhaustive war or large user-created ledger stress test.
- Engine ticks include the entire progression; snapshot/validation use ten samples after two warm-ups. Connection comparison uses thirty samples after two warm-ups, includes index construction, and verifies identical results for all 203 countries.
- Browser campaigns use separate contexts/IndexedDB stores. Entry: five cache-disabled navigations; resume: three clicks to loaded geometry and two animation frames; menus: five samples after one warm-up; camera: twelve alternating arrow-key moves. Clicks are dispatched directly in the page to exclude Playwright actionability waits.
- Browser times end after two animation frames; they include frame scheduling and are not isolated React render times. p95 with five samples is the maximum observed sample. Heap/DOM snapshots are diagnostics rather than evidence of a memory leak. No strict millisecond gate is added to shared CI.

## Engine and saved-state costs

| Campaign day | JSON bytes | Tick median / p95 ms | Snapshot median / p95 ms | Validation median / p95 ms |
|---|---:|---:|---:|---:|
| 1 | 864,272 | — | 7.04 / 8.51 | 4.15 / 5.56 |
| 366 | 1,591,764 | 10.34 / 51.24 | 12.38 / 16.44 | 6.18 / 10.83 |
| 1096 | 1,709,311 | 9.84 / 47.18 | 13.09 / 17.82 | 5.82 / 7.51 |

Snapshot isolation and validation remain intact. The 3-year snapshot median is approximately 13 ms on this machine; this does not establish its cost on a lower-powered device.

## Relations map lookup

| Day | Trade records / embassies | Previous scan median ms | Index build + lookup median ms |
|---|---:|---:|---:|
| 1 | 0 / 0 | 0.0117 | 0.0056 |
| 366 | 92 / 51 | 0.5401 | 0.0174 |
| 1096 | 122 / 117 | 0.8928 | 0.0160 |

Per-polygon ledger scans change from O(P × (T + C + E)) to O(T + C + E + P). The map memoizes the index until the relevant ledgers, player or mode change. The 3-year lookup comparison is about 56× faster, saving approximately 0.88 ms for this operation; it is not a claim of 56× faster map frames or gameplay. Trade overrides embassy, which overrides treaty colors; inactive records and country IDs retain their previous semantics.

## Production browser comparison

Cache-disabled entry median / p95: **202.00 / 366.50 ms before**, **232.00 / 349.60 ms after**. No startup gain is established. The candidate main JS bundle is 2,303.56 kB (gzip 762.55 kB); language catalogue loading remains an independent follow-up.

Each cell is median / p95 in milliseconds.

| Day | Resume before → after | Market before → after | World before → after | Supply before → after | Camera before → after |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 102.10 / 141.80 → 115.80 / 126.00 | 31.00 / 31.60 → 31.10 / 31.80 | 31.10 / 31.30 → 31.30 / 31.40 | 83.20 / 770.30 → 290.40 / 457.40 | 51.60 / 82.10 → 47.90 / 86.60 |
| 366 | 156.40 / 156.50 → 144.20 / 149.40 | 30.30 / 33.00 → 30.60 / 31.30 | 30.20 / 31.20 → 31.50 / 33.60 | 96.00 / 565.00 → 46.00 / 121.70 | 46.60 / 102.00 → 45.00 / 106.80 |
| 1096 | 133.50 / 185.00 → 150.00 / 176.00 | 31.20 / 32.50 → 31.10 / 33.60 | 29.50 / 31.10 → 31.10 / 31.50 | 85.40 / 203.60 → 137.00 / 604.30 | 32.10 / 119.50 → 31.40 / 100.80 |

Supply timings vary considerably and do not establish a consistent latency improvement. The source-level reduction is specific: collapsed supplier disclosures no longer create up to 30 unused rows each. Opening them still renders the same ranked routes and actions; closing removes those rows. The browser regression checks collapsed content, mouse expansion/collapse and keyboard reopening with identical data. Repeated device-level timings and a CPU trace are the next step before attributing the remaining spikes.

## Continuing work

Measure StackBlitz/mobile entry and low-powered hardware; profile Supply spikes with larger samples; measure geographic raster camera movement and flight/war-heavy campaigns separately; inventory translation overrides before language splitting. Rendering-library migration and full performance-audit completion are not established by this patch. V3 remains conditional on complete playability.
