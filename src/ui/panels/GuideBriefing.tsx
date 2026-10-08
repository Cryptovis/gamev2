import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { LocaleText } from "../../i18n/localeText";
import { ReviewDialog } from "./ReviewDialog";
import { money } from "../formatMoney";
import { calculateSupplyNetwork } from "../../engine/systems/supplyNetwork";
import { membershipRequirements } from "../../engine/systems/worldInstitutions";
import { living, exchangePrice } from "../../engine/systems/livingEconomy";
const lessons = [
  ["Welcome", ""],
  [
    "Read your economic briefing",
    "Compare revenue and public spending before changing taxes. Living standards influence births and migration. Tax changes need a separate review.",
  ],
  [
    "Read the map briefing",
    "Choose Geographic to see satellite terrain. Diplomacy displays trust; Connections displays active trade, embassies and pacts. Selecting a nation opens its command panel.",
  ],
  ["Build industry", ""],
  [
    "Read a technology unlock",
    "A research node lists its cost, effect and prerequisites. Unlock its parents first. Education supports research; military branches enable production and trained crews.",
  ],
  [
    "Read a market offer",
    "Compare country asking prices and diplomatic restrictions. Publishing your own listing reserves the goods; no money is earned until an actual purchase.",
  ],
  [
    "Read your supply briefing",
    "Reserve days estimate urgency. Low Relations opens the selected supplier’s diplomacy. Food shortages harm public confidence and population; fuel shortages threaten the front.",
  ],
  [
    "Read a diplomatic proposal",
    "Outgoing proposals take three days and may be rejected. Incoming embassy or trade proposals share setup costs equally. Goods still require separate paid shipments.",
  ],
  [
    "Read your military briefing",
    "Equipment must be produced or imported, then deployed. Pilots require training and wages. Recruitment transfers civilians into service. Inspect fuel before launching an operation.",
  ],
  [
    "Read institution requirements",
    "Membership requires achievements and influence, followed by a vote. Meeting requirements allows an application, not automatic entry. Members can vote on proposals; voluntary outreach has uncertain outcomes.",
  ],
];
export function GuideBriefing() {
  const s = useGameStore(),
    t = s.world.tutorial,
    [open, setOpen] = useState(false);
  if (!t.active || t.step === 0 || t.step === 3) return null;
  const p = s.countries[s.playerCountryId],
    supply = calculateSupplyNetwork(p),
    checks = membershipRequirements(s, "un"),
    metrics =
      t.step === 1
        ? [
            ["Treasury", money(p.economy.treasury)],
            ["Tax rate", `${p.economy.taxRate}%`],
            [
              "Annual population trend",
              `${p.demographics.growthRate.toFixed(2)}%`,
            ],
          ]
        : t.step === 2
          ? [
              ["Presentation", s.mapPresentation],
              ["Overlay", s.mapMode],
              ["Country profiles", String(Object.keys(s.countries).length)],
            ]
          : t.step === 4
            ? [
                ["Research points", p.technology.researchPoints.toFixed(2)],
                ["Unlocked technologies", String(p.technology.unlocked.length)],
                [
                  "Example prerequisite",
                  "Advanced assembly requires earlier military and industrial research.",
                ],
              ]
            : t.step === 5
              ? [
                  ["Gold reference", money(exchangePrice(s, "gold"))],
                  [
                    "Open sale listings",
                    String(
                      living(s).listings.filter((x) => x.status === "open")
                        .length,
                    ),
                  ],
                  ["Treasury", money(p.economy.treasury)],
                ]
              : t.step === 6
                ? [
                    ["Food reserve days", supply.foodDays.toFixed(1)],
                    ["Fuel operational days", supply.fuelDays.toFixed(1)],
                    ["Supply bottleneck", supply.bottleneck],
                  ]
                : t.step === 7
                  ? [
                      [
                        "Pending letters",
                        String(
                          living(s).letters.filter(
                            (x) => x.status === "pending",
                          ).length,
                        ),
                      ],
                      ["Embassy shared fee", money(1.5)],
                      ["Trade pact shared fee", money(2.5)],
                    ]
                  : t.step === 8
                    ? [
                        ["Personnel", p.military.personnel.toLocaleString()],
                        [
                          "Aircraft",
                          String(p.military.fighters + p.military.bombers),
                        ],
                        ["Fuel operational days", supply.fuelDays.toFixed(1)],
                      ]
                    : checks.map((x) => [
                        x.label,
                        x.met ? "COMPLETE" : "Required",
                      ]);
  return (
    <section className="guide-briefing">
      <button data-guide="tutorial-detail" onClick={() => setOpen(true)}>
        <LocaleText value="Inspect this lesson" />
      </button>
      <span>
        <LocaleText value="Open the briefing, read the live figures, then close it to continue." />
      </span>
      {open && (
        <ReviewDialog
          title={lessons[t.step][0]}
          summary={lessons[t.step][1]}
          metrics={metrics}
          onCancel={() => setOpen(false)}
        />
      )}
    </section>
  );
}
