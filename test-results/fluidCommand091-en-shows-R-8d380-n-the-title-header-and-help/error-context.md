# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> en shows Rule of Nations untranslated in the title, header and help
- Location: e2e/fluidCommand091.spec.ts:63:33

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-guide="rail-help"]')
    - locator resolved to <button class="rail-button" aria-pressed="false" data-guide="rail-help" title="HELP · Closed — click to open">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <aside class="command-panel">…</aside> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div>…</div> from <aside class="command-panel">…</aside> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    109 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div>…</div> from <aside class="command-panel">…</aside> subtree intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic:
      - strong: Türkiye
      - generic: drag globe · wheel zoom · click sovereign territory
    - group "Interactive world map" [ref=e5]:
      - generic [ref=e8]:
        - generic "Tanzania" [ref=e9] [cursor=pointer]
        - generic "W. Sahara" [ref=e10] [cursor=pointer]
        - generic "Canada" [ref=e11] [cursor=pointer]
        - generic "United States of America" [ref=e12] [cursor=pointer]
        - generic "Kazakhstan" [ref=e13] [cursor=pointer]
        - generic "Uzbekistan" [ref=e14] [cursor=pointer]
        - generic "Indonesia" [ref=e15] [cursor=pointer]
        - generic "Dem. Rep. Congo" [ref=e16] [cursor=pointer]
        - generic "Somaliland" [ref=e17] [cursor=pointer]
        - generic "Kenya" [ref=e18] [cursor=pointer]
        - generic "Sudan" [ref=e19] [cursor=pointer]
        - generic "Chad" [ref=e20] [cursor=pointer]
        - generic "Haiti" [ref=e21] [cursor=pointer]
        - generic "Dominican Rep." [ref=e22] [cursor=pointer]
        - generic "Russia" [ref=e23] [cursor=pointer]
        - generic "Norway" [ref=e24] [cursor=pointer]
        - generic "Greenland" [ref=e25] [cursor=pointer]
        - generic "Fr. S. Antarctic Lands" [ref=e26] [cursor=pointer]
        - generic "South Africa" [ref=e27] [cursor=pointer]
        - generic "Lesotho" [ref=e28] [cursor=pointer]
        - generic "Brazil" [ref=e29] [cursor=pointer]
        - generic "Venezuela" [ref=e30] [cursor=pointer]
        - generic "Guyana" [ref=e31] [cursor=pointer]
        - generic "Suriname" [ref=e32] [cursor=pointer]
        - generic "France" [ref=e33] [cursor=pointer]
        - generic "Puerto Rico" [ref=e34] [cursor=pointer]
        - generic "Zimbabwe" [ref=e35] [cursor=pointer]
        - generic "Botswana" [ref=e36] [cursor=pointer]
        - generic "Namibia" [ref=e37] [cursor=pointer]
        - generic "Senegal" [ref=e38] [cursor=pointer]
        - generic "Mali" [ref=e39] [cursor=pointer]
        - generic "Mauritania" [ref=e40] [cursor=pointer]
        - generic "Benin" [ref=e41] [cursor=pointer]
        - generic "Niger" [ref=e42] [cursor=pointer]
        - generic "Nigeria" [ref=e43] [cursor=pointer]
        - generic "Cameroon" [ref=e44] [cursor=pointer]
        - generic "Togo" [ref=e45] [cursor=pointer]
        - generic "Ghana" [ref=e46] [cursor=pointer]
        - generic "Côte d'Ivoire" [ref=e47] [cursor=pointer]
        - generic "Guinea" [ref=e48] [cursor=pointer]
        - generic "Guinea-Bissau" [ref=e49] [cursor=pointer]
        - generic "Liberia" [ref=e50] [cursor=pointer]
        - generic "Sierra Leone" [ref=e51] [cursor=pointer]
        - generic "Burkina Faso" [ref=e52] [cursor=pointer]
        - generic "Central African Rep." [ref=e53] [cursor=pointer]
        - generic "Congo" [ref=e54] [cursor=pointer]
        - generic "Gabon" [ref=e55] [cursor=pointer]
        - generic "Eq. Guinea" [ref=e56] [cursor=pointer]
        - generic "Zambia" [ref=e57] [cursor=pointer]
        - generic "Malawi" [ref=e58] [cursor=pointer]
        - generic "Mozambique" [ref=e59] [cursor=pointer]
        - generic "Eswatini" [ref=e60] [cursor=pointer]
        - generic "Angola" [ref=e61] [cursor=pointer]
        - generic "Burundi" [ref=e62] [cursor=pointer]
        - generic "Israel" [ref=e63] [cursor=pointer]
        - generic "Lebanon" [ref=e64] [cursor=pointer]
        - generic "Madagascar" [ref=e65] [cursor=pointer]
        - generic "Palestine" [ref=e66] [cursor=pointer]
        - generic "Gambia" [ref=e67] [cursor=pointer]
        - generic "Tunisia" [ref=e68] [cursor=pointer]
        - generic "Algeria" [ref=e69] [cursor=pointer]
        - generic "Jordan" [ref=e70] [cursor=pointer]
        - generic "United Arab Emirates" [ref=e71] [cursor=pointer]
        - generic "Qatar" [ref=e72] [cursor=pointer]
        - generic "Kuwait" [ref=e73] [cursor=pointer]
        - generic "Iraq" [ref=e74] [cursor=pointer]
        - generic "Oman" [ref=e75] [cursor=pointer]
        - generic "Cambodia" [ref=e76] [cursor=pointer]
        - generic "Thailand" [ref=e77] [cursor=pointer]
        - generic "Laos" [ref=e78] [cursor=pointer]
        - generic "Myanmar" [ref=e79] [cursor=pointer]
        - generic "Vietnam" [ref=e80] [cursor=pointer]
        - generic "North Korea" [ref=e81] [cursor=pointer]
        - generic "South Korea" [ref=e82] [cursor=pointer]
        - generic "Mongolia" [ref=e83] [cursor=pointer]
        - generic "India" [ref=e84] [cursor=pointer]
        - generic "Bangladesh" [ref=e85] [cursor=pointer]
        - generic "Bhutan" [ref=e86] [cursor=pointer]
        - generic "Nepal" [ref=e87] [cursor=pointer]
        - generic "Pakistan" [ref=e88] [cursor=pointer]
        - generic "Afghanistan" [ref=e89] [cursor=pointer]
        - generic "Tajikistan" [ref=e90] [cursor=pointer]
        - generic "Kyrgyzstan" [ref=e91] [cursor=pointer]
        - generic "Turkmenistan" [ref=e92] [cursor=pointer]
        - generic "Iran" [ref=e93] [cursor=pointer]
        - generic "Syria" [ref=e94] [cursor=pointer]
        - generic "Armenia" [ref=e95] [cursor=pointer]
        - generic "Sweden" [ref=e96] [cursor=pointer]
        - generic "Belarus" [ref=e97] [cursor=pointer]
        - generic "Ukraine" [ref=e98] [cursor=pointer]
        - generic "Poland" [ref=e99] [cursor=pointer]
        - generic "Austria" [ref=e100] [cursor=pointer]
        - generic "Hungary" [ref=e101] [cursor=pointer]
        - generic "Moldova" [ref=e102] [cursor=pointer]
        - generic "Romania" [ref=e103] [cursor=pointer]
        - generic "Lithuania" [ref=e104] [cursor=pointer]
        - generic "Latvia" [ref=e105] [cursor=pointer]
        - generic "Estonia" [ref=e106] [cursor=pointer]
        - generic "Germany" [ref=e107] [cursor=pointer]
        - generic "Bulgaria" [ref=e108] [cursor=pointer]
        - generic "Greece" [ref=e109] [cursor=pointer]
        - generic "Türkiye" [ref=e110] [cursor=pointer]
        - generic "Albania" [ref=e111] [cursor=pointer]
        - generic "Croatia" [ref=e112] [cursor=pointer]
        - generic "Switzerland" [ref=e113] [cursor=pointer]
        - generic "Luxembourg" [ref=e114] [cursor=pointer]
        - generic "Belgium" [ref=e115] [cursor=pointer]
        - generic "Netherlands" [ref=e116] [cursor=pointer]
        - generic "Portugal" [ref=e117] [cursor=pointer]
        - generic "Spain" [ref=e118] [cursor=pointer]
        - generic "Ireland" [ref=e119] [cursor=pointer]
        - generic "Sri Lanka" [ref=e120] [cursor=pointer]
        - generic "China" [ref=e121] [cursor=pointer]
        - generic "Taiwan" [ref=e122] [cursor=pointer]
        - generic "Italy" [ref=e123] [cursor=pointer]
        - generic "Denmark" [ref=e124] [cursor=pointer]
        - generic "United Kingdom" [ref=e125] [cursor=pointer]
        - generic "Iceland" [ref=e126] [cursor=pointer]
        - generic "Azerbaijan" [ref=e127] [cursor=pointer]
        - generic "Georgia" [ref=e128] [cursor=pointer]
        - generic "Philippines" [ref=e129] [cursor=pointer]
        - generic "Malaysia" [ref=e130] [cursor=pointer]
        - generic "Brunei" [ref=e131] [cursor=pointer]
        - generic "Slovenia" [ref=e132] [cursor=pointer]
        - generic "Finland" [ref=e133] [cursor=pointer]
        - generic "Slovakia" [ref=e134] [cursor=pointer]
        - generic "Czechia" [ref=e135] [cursor=pointer]
        - generic "Eritrea" [ref=e136] [cursor=pointer]
        - generic "Japan" [ref=e137] [cursor=pointer]
        - generic "Yemen" [ref=e138] [cursor=pointer]
        - generic "Saudi Arabia" [ref=e139] [cursor=pointer]
        - generic "N. Cyprus" [ref=e140] [cursor=pointer]
        - generic "N. Cyprus" [ref=e141] [cursor=pointer]
        - generic "Morocco" [ref=e142] [cursor=pointer]
        - generic "Egypt" [ref=e143] [cursor=pointer]
        - generic "Libya" [ref=e144] [cursor=pointer]
        - generic "Ethiopia" [ref=e145] [cursor=pointer]
        - generic "Djibouti" [ref=e146] [cursor=pointer]
        - generic "Somaliland" [ref=e147] [cursor=pointer]
        - generic "Uganda" [ref=e148] [cursor=pointer]
        - generic "Rwanda" [ref=e149] [cursor=pointer]
        - generic "Bosnia and Herz." [ref=e150] [cursor=pointer]
        - generic "North Macedonia" [ref=e151] [cursor=pointer]
        - generic "Serbia" [ref=e152] [cursor=pointer]
        - generic "Montenegro" [ref=e153] [cursor=pointer]
        - generic "Kosovo" [ref=e154] [cursor=pointer]
        - generic "Trinidad and Tobago" [ref=e155] [cursor=pointer]
        - generic "S. Sudan" [ref=e156] [cursor=pointer]
      - generic:
        - generic:
          - generic: TÜRKIYE
        - generic:
          - generic: RUSSIA
        - generic:
          - generic: CHINA
        - generic:
          - generic: INDIA
        - generic:
          - generic: ALGERIA
        - generic:
          - generic: DEM. REP. CONGO
        - generic:
          - generic: KAZAKHSTAN
        - generic:
          - generic: SAUDI ARABIA
        - generic:
          - generic: SUDAN
        - generic:
          - generic: LIBYA
        - generic:
          - generic: IRAN
        - generic:
          - generic: CHAD
        - generic:
          - generic: CANADA
        - generic:
          - generic: ETHIOPIA
        - generic:
          - generic: MALI
        - generic:
          - generic: ANGOLA
        - generic:
          - generic: BRAZIL
        - generic:
          - generic: NIGERIA
        - generic:
          - generic: SOUTH AFRICA
        - generic:
          - generic: ARCTIC OCEAN
        - generic:
          - generic: INDIAN OCEAN
        - generic:
          - generic: NORTH ATLANTIC OCEAN
        - generic:
          - generic: SOUTH ATLANTIC OCEAN
    - generic "Map camera controls" [ref=e157]:
      - button "Zoom out" [ref=e158] [cursor=pointer]: −
      - status "Map zoom level" [ref=e159]: 100%
      - button "Zoom in" [ref=e160] [cursor=pointer]: +
      - button "Return to your nation" [ref=e161] [cursor=pointer]:
        - img [ref=e162]
      - button "RESET" [ref=e166] [cursor=pointer]
  - generic:
    - generic [ref=e167]:
      - generic [ref=e168]:
        - button "Executive ⋯" [ref=e169] [cursor=pointer]:
          - img "Executive" [ref=e170]
          - generic [ref=e171]: ⋯
        - generic [ref=e172]:
          - generic [ref=e173]: Rule of Nations
          - generic [ref=e174]:
            - strong [ref=e175]: Browser playtest
            - generic [ref=e176]: DAY 1
      - generic "National command indicators" [ref=e177]:
        - generic [ref=e178]:
          - img [ref=e181]
          - generic [ref=e182]:
            - generic [ref=e183]: TREASURY
            - strong [ref=e184]: $143.0B
        - generic [ref=e185]:
          - img [ref=e188]
          - generic [ref=e189]:
            - generic [ref=e190]: BUDGET / DAY
            - strong [ref=e191]: +$0.167B
        - generic [ref=e192]:
          - img [ref=e195]
          - generic [ref=e196]:
            - generic [ref=e197]: APPROVAL
            - strong [ref=e198]: 56%
        - generic [ref=e199]:
          - img [ref=e202]
          - generic [ref=e203]:
            - generic [ref=e204]: STABILITY
            - strong [ref=e205]: 67%
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic "Game speed controls" [ref=e208]:
          - button "Ⅱ PAUSE" [pressed] [ref=e209] [cursor=pointer]:
            - strong [ref=e210]: Ⅱ
            - generic [ref=e211]: PAUSE
          - button "1× 15s/day" [ref=e212] [cursor=pointer]:
            - strong [ref=e213]: 1×
            - generic [ref=e214]: 15s/day
          - button "2× 7s/day" [ref=e215] [cursor=pointer]:
            - strong [ref=e216]: 2×
            - generic [ref=e217]: 7s/day
          - button "3× 3s/day" [ref=e218] [cursor=pointer]:
            - strong [ref=e219]: 3×
            - generic [ref=e220]: 3s/day
          - button "5× 1s/day" [ref=e221] [cursor=pointer]:
            - strong [ref=e222]: 5×
            - generic [ref=e223]: 1s/day
        - generic [ref=e224]:
          - generic [ref=e225]: CAMPAIGN DATE
          - strong [ref=e226]: 2026-01-01
      - button "Open your nation" [pressed] [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: 🇹🇷
        - generic [ref=e229]:
          - strong [ref=e230]: Türkiye
          - generic [ref=e231]: democracy
          - emphasis [ref=e232]: Open your nation
  - complementary [ref=e233]:
    - generic [ref=e234]:
      - generic [ref=e235]: STATE / NATIONAL COMMAND
      - button "Close country panel" [active] [ref=e236] [cursor=pointer]: ×
    - combobox "Select country" [ref=e237]:
      - option "Afghanistan (AF)"
      - option "Albania (AL)"
      - option "Algeria (DZ)"
      - option "Andorra (AD)"
      - option "Angola (AO)"
      - option "Antigua and Barbuda (AG)"
      - option "Argentina (AR)"
      - option "Armenia (AM)"
      - option "Australia (AU)"
      - option "Austria (AT)"
      - option "Azerbaijan (AZ)"
      - option "Bahamas (BS)"
      - option "Bahrain (BH)"
      - option "Bangladesh (BD)"
      - option "Barbados (BB)"
      - option "Belarus (BY)"
      - option "Belgium (BE)"
      - option "Belize (BZ)"
      - option "Benin (BJ)"
      - option "Bhutan (BT)"
      - option "Bolivia (BO)"
      - option "Bosnia and Herz. (BA)"
      - option "Botswana (BW)"
      - option "Brazil (BR)"
      - option "Brunei (BN)"
      - option "Bulgaria (BG)"
      - option "Burkina Faso (BF)"
      - option "Burundi (BI)"
      - option "Cabo Verde (CV)"
      - option "Cambodia (KH)"
      - option "Cameroon (CM)"
      - option "Canada (CA)"
      - option "Central African Rep. (CF)"
      - option "Chad (TD)"
      - option "Chile (CL)"
      - option "China (CN)"
      - option "Colombia (CO)"
      - option "Comoros (KM)"
      - option "Congo (CG)"
      - option "Costa Rica (CR)"
      - option "Côte d'Ivoire (CI)"
      - option "Croatia (HR)"
      - option "Cuba (CU)"
      - option "Czechia (CZ)"
      - option "Dem. Rep. Congo (CD)"
      - option "Denmark (DK)"
      - option "Djibouti (DJ)"
      - option "Dominica (DM)"
      - option "Dominican Rep. (DO)"
      - option "Ecuador (EC)"
      - option "Egypt (EG)"
      - option "El Salvador (SV)"
      - option "Eq. Guinea (GQ)"
      - option "Eritrea (ER)"
      - option "Estonia (EE)"
      - option "Eswatini (SZ)"
      - option "Ethiopia (ET)"
      - option "Falkland Is. (FK)"
      - option "Fiji (FJ)"
      - option "Finland (FI)"
      - option "Fr. S. Antarctic Lands (TF)"
      - option "France (FR)"
      - option "Gabon (GA)"
      - option "Gambia (GM)"
      - option "Georgia (GE)"
      - option "Germany (DE)"
      - option "Ghana (GH)"
      - option "Greece (GR)"
      - option "Greenland (GL)"
      - option "Grenada (GD)"
      - option "Guatemala (GT)"
      - option "Guinea (GN)"
      - option "Guinea-Bissau (GW)"
      - option "Guyana (GY)"
      - option "Haiti (HT)"
      - option "Holy See (Vatican City State) (VA)"
      - option "Honduras (HN)"
      - option "Hungary (HU)"
      - option "Iceland (IS)"
      - option "India (IN)"
      - option "Indonesia (ID)"
      - option "Iran (IR)"
      - option "Iraq (IQ)"
      - option "Ireland (IE)"
      - option "Israel (IL)"
      - option "Italy (IT)"
      - option "Jamaica (JM)"
      - option "Japan (JP)"
      - option "Jordan (JO)"
      - option "Kazakhstan (KZ)"
      - option "Kenya (KE)"
      - option "Kiribati (KI)"
      - option "Kosovo (XK)"
      - option "Kuwait (KW)"
      - option "Kyrgyzstan (KG)"
      - option "Laos (LA)"
      - option "Latvia (LV)"
      - option "Lebanon (LB)"
      - option "Lesotho (LS)"
      - option "Liberia (LR)"
      - option "Libya (LY)"
      - option "Liechtenstein (LI)"
      - option "Lithuania (LT)"
      - option "Luxembourg (LU)"
      - option "Madagascar (MG)"
      - option "Malawi (MW)"
      - option "Malaysia (MY)"
      - option "Maldives (MV)"
      - option "Mali (ML)"
      - option "Malta (MT)"
      - option "Marshall Islands (MH)"
      - option "Mauritania (MR)"
      - option "Mauritius (MU)"
      - option "Mexico (MX)"
      - option "Micronesia, Federated States of (FM)"
      - option "Moldova (MD)"
      - option "Monaco (MC)"
      - option "Mongolia (MN)"
      - option "Montenegro (ME)"
      - option "Morocco (MA)"
      - option "Mozambique (MZ)"
      - option "Myanmar (MM)"
      - option "N. Cyprus (CY)"
      - option "Namibia (NA)"
      - option "Nauru (NR)"
      - option "Nepal (NP)"
      - option "Netherlands (NL)"
      - option "New Caledonia (NC)"
      - option "New Zealand (NZ)"
      - option "Nicaragua (NI)"
      - option "Niger (NE)"
      - option "Nigeria (NG)"
      - option "North Korea (KP)"
      - option "North Macedonia (MK)"
      - option "Norway (NO)"
      - option "Oman (OM)"
      - option "Pakistan (PK)"
      - option "Palau (PW)"
      - option "Palestine (PS)"
      - option "Panama (PA)"
      - option "Papua New Guinea (PG)"
      - option "Paraguay (PY)"
      - option "Peru (PE)"
      - option "Philippines (PH)"
      - option "Poland (PL)"
      - option "Portugal (PT)"
      - option "Puerto Rico (PR)"
      - option "Qatar (QA)"
      - option "Romania (RO)"
      - option "Russia (RU)"
      - option "Rwanda (RW)"
      - option "S. Sudan (SS)"
      - option "Saint Kitts and Nevis (KN)"
      - option "Saint Lucia (LC)"
      - option "Saint Vincent and the Grenadines (VC)"
      - option "Samoa (WS)"
      - option "San Marino (SM)"
      - option "Sao Tome and Principe (ST)"
      - option "Saudi Arabia (SA)"
      - option "Senegal (SN)"
      - option "Serbia (RS)"
      - option "Seychelles (SC)"
      - option "Sierra Leone (SL)"
      - option "Singapore (SG)"
      - option "Slovakia (SK)"
      - option "Slovenia (SI)"
      - option "Solomon Is. (SB)"
      - option "Somaliland (SO)"
      - option "South Africa (ZA)"
      - option "South Korea (KR)"
      - option "Spain (ES)"
      - option "Sri Lanka (LK)"
      - option "Sudan (SD)"
      - option "Suriname (SR)"
      - option "Sweden (SE)"
      - option "Switzerland (CH)"
      - option "Syria (SY)"
      - option "Taiwan (TW)"
      - option "Tajikistan (TJ)"
      - option "Tanzania (TZ)"
      - option "Thailand (TH)"
      - option "Timor-Leste (TL)"
      - option "Togo (TG)"
      - option "Tonga (TO)"
      - option "Trinidad and Tobago (TT)"
      - option "Tunisia (TN)"
      - option "Türkiye (TR)" [selected]
      - option "Turkmenistan (TM)"
      - option "Tuvalu (TV)"
      - option "Uganda (UG)"
      - option "Ukraine (UA)"
      - option "United Arab Emirates (AE)"
      - option "United Kingdom (GB)"
      - option "United States of America (US)"
      - option "Uruguay (UY)"
      - option "Uzbekistan (UZ)"
      - option "Vanuatu (VU)"
      - option "Venezuela (VE)"
      - option "Vietnam (VN)"
      - option "W. Sahara (EH)"
      - option "Yemen (YE)"
      - option "Zambia (ZM)"
      - option "Zimbabwe (ZW)"
    - generic [ref=e239]:
      - generic [ref=e240]: 🇹🇷
      - generic [ref=e241]:
        - heading "Türkiye" [level=1] [ref=e242]
        - paragraph [ref=e243]: Player nation · Democracy · Asia
    - generic [ref=e244]:
      - generic [ref=e245]:
        - generic [ref=e246]: ☪
        - generic [ref=e247]:
          - generic [ref=e248]: RELIGION
          - strong [ref=e249]: Islam
      - generic [ref=e250]:
        - img "bloc" [ref=e251]:
          - img [ref=e252]
        - generic [ref=e253]:
          - generic [ref=e254]: IDEOLOGY
          - strong [ref=e255]: Pluralist
      - generic [ref=e256]:
        - img [ref=e258]
        - generic [ref=e259]:
          - generic [ref=e260]: Military rank
          - strong [ref=e261]: "GFP #9"
    - generic [ref=e262]:
      - button "Overview" [pressed] [ref=e263] [cursor=pointer]:
        - img [ref=e265]
        - generic [ref=e266]: Overview
      - button "Power" [ref=e267] [cursor=pointer]:
        - img [ref=e268]
        - generic [ref=e272]: Power
      - button "Supply command" [ref=e273] [cursor=pointer]:
        - img [ref=e275]
        - generic [ref=e276]: Supply command
    - generic [ref=e277]:
      - button "Affairs" [ref=e278] [cursor=pointer]:
        - img [ref=e280]
        - generic [ref=e281]: Affairs
      - button "Economy" [ref=e282] [cursor=pointer]:
        - img [ref=e284]
        - generic [ref=e285]: Economy
      - button "Policies" [ref=e286] [cursor=pointer]:
        - img [ref=e288]
        - generic [ref=e289]: Policies
      - button "trade Trade" [ref=e290] [cursor=pointer]:
        - img "trade" [ref=e291]:
          - img [ref=e292]
        - generic [ref=e293]: Trade
      - button "Production" [ref=e294] [cursor=pointer]:
        - img [ref=e296]
        - generic [ref=e297]: Production
      - button "Diplomacy" [ref=e298] [cursor=pointer]:
        - img [ref=e300]
        - generic [ref=e301]: Diplomacy
      - button "Military" [ref=e302] [cursor=pointer]:
        - img [ref=e304]
        - generic [ref=e305]: Military
      - button "Intelligence" [ref=e306] [cursor=pointer]:
        - img [ref=e308]
        - generic [ref=e309]: Intelligence
      - button "Cabinet" [ref=e310] [cursor=pointer]:
        - img [ref=e312]
        - generic [ref=e313]: Cabinet
    - generic [ref=e314]:
      - button "Technology" [ref=e315] [cursor=pointer]:
        - img [ref=e317]
        - generic [ref=e318]: Technology
      - button "World" [ref=e319] [cursor=pointer]:
        - img [ref=e321]
        - generic [ref=e322]: World
      - button "War readiness" [ref=e323] [cursor=pointer]:
        - img [ref=e325]
        - generic [ref=e326]: War readiness
    - generic [ref=e327]:
      - generic [ref=e328]:
        - generic [ref=e329]: GDP
        - strong [ref=e330]: $1300.0B
      - generic [ref=e331]:
        - generic [ref=e332]: Economic health
        - strong [ref=e333]: 100%
      - generic [ref=e334]:
        - generic [ref=e335]: Population
        - strong [ref=e336]: 86.0M
      - generic [ref=e337]:
        - generic [ref=e338]: Military capability
        - strong [ref=e339]: 81.5/100
      - generic [ref=e340]:
        - generic [ref=e341]: Industry output
        - strong [ref=e342]: "52.68"
      - generic [ref=e343]:
        - generic [ref=e344]: Resource pressure
        - strong [ref=e345]: 71.2%
    - generic [ref=e346]:
      - generic [ref=e347]:
        - img "fuel" [ref=e348]:
          - img
        - generic [ref=e349]: FUEL
        - strong [ref=e350]: "25.6"
      - generic [ref=e351]:
        - img "steel" [ref=e352]:
          - img
        - generic [ref=e353]: STEEL
        - strong [ref=e354]: "50.0"
      - generic [ref=e355]:
        - img "electricity" [ref=e356]:
          - img
        - generic [ref=e357]: POWER
        - strong [ref=e358]: "43.2"
      - generic [ref=e359]:
        - img [ref=e360]
        - generic [ref=e363]: R&D
        - strong [ref=e364]: "29.9"
    - generic [ref=e365]:
      - generic [ref=e366]:
        - generic [ref=e367]: Budget / day
        - strong [ref=e368]: +0.183B
      - generic [ref=e369]:
        - generic [ref=e370]: GDP trend
        - strong [ref=e371]: +0.0109%
      - generic [ref=e372]:
        - generic [ref=e373]: Food / day
        - strong [ref=e374]: "+4.11"
      - generic [ref=e375]:
        - generic [ref=e376]: Oil / day
        - strong [ref=e377]: "-0.33"
      - generic [ref=e378]:
        - generic [ref=e379]: Iron / day
        - strong [ref=e380]: "+0.21"
      - generic [ref=e381]:
        - generic [ref=e382]: Inflation
        - strong [ref=e383]: 5.50%
      - generic [ref=e384]:
        - generic [ref=e385]: Stability
        - strong [ref=e386]: 67.2%
      - generic [ref=e387]:
        - generic [ref=e388]: Cohesion
        - strong [ref=e389]: 71.2%
  - navigation "World command tools" [ref=e390]:
    - button "market MARKET" [ref=e391] [cursor=pointer]:
      - img "market" [ref=e393]:
        - img
      - generic [ref=e394]: MARKET
    - button "world WORLD" [ref=e395] [cursor=pointer]:
      - img "world" [ref=e397]:
        - img
      - generic [ref=e398]: WORLD
    - button "alerts 1 SUPPLY" [ref=e399] [cursor=pointer]:
      - img "alerts" [ref=e401]:
        - img
      - generic [ref=e402]: "1"
      - generic [ref=e403]: SUPPLY
  - navigation "Information tools" [ref=e404]:
    - button "objectives 0/6 GOALS" [ref=e405] [cursor=pointer]:
      - img "objectives" [ref=e407]:
        - img
      - generic [ref=e408]: 0/6
      - generic [ref=e409]: GOALS
    - button "diplomacy DIPLOMACY" [ref=e410] [cursor=pointer]:
      - img "diplomacy" [ref=e412]:
        - img
      - generic [ref=e413]: DIPLOMACY
    - button "alerts 1 ALERTS" [ref=e414] [cursor=pointer]:
      - img "alerts" [ref=e416]:
        - img
      - generic [ref=e417]: "1"
      - generic [ref=e418]: ALERTS
    - button "intel 2 NEWS" [ref=e419] [cursor=pointer]:
      - img "intel" [ref=e421]:
        - img
      - generic [ref=e422]: "2"
      - generic [ref=e423]: NEWS
  - navigation "Map and help tools" [ref=e424]:
    - button "map MAP" [ref=e425] [cursor=pointer]:
      - img "map" [ref=e427]:
        - img
      - generic [ref=e428]: MAP
    - button "help HELP" [ref=e429] [cursor=pointer]:
      - img "help" [ref=e431]:
        - img
      - generic [ref=e432]: HELP
  - generic [ref=e433]:
    - generic [ref=e434]: NEWS // Rule of Nations is ready.
    - generic [ref=e435]:
      - generic [ref=e436]: WORLD COMMAND CHANNEL
      - generic [ref=e437]: PLAYER · POLITICAL · POLITICAL · GLOBE
  - generic: AlpyX Game Studios
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {campaignFixture,resumeFixture} from './seedCampaign';
  3  | 
  4  | const LANGUAGES=['en','tr','es','zh','ru'] as const;
  5  | const animationOf=(page:Page,selector:string)=>page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return {name:s.animationName,ms:parseFloat(s.animationDuration)*1000};});
  6  | 
  7  | test('windows fade in within 160-220 ms and reduced motion removes every window animation',async({page})=>{
  8  |  await resumeFixture(page,campaignFixture('en'));
  9  |  await page.locator('[data-guide="rail-supply"]').click();await expect(page.locator('#resource-command-window')).toBeVisible();
  10 |  const supply=await animationOf(page,'#resource-command-window');
  11 |  expect(supply.name).toBe('ron-fade-in');expect(supply.ms).toBeGreaterThanOrEqual(160);expect(supply.ms).toBeLessThanOrEqual(220);
  12 |  await page.keyboard.press('Escape');await expect(page.locator('#resource-command-window')).toHaveCount(0);
  13 |  await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-power"]').click();
  14 |  await expect(page.locator('.command-window')).toBeVisible();
  15 |  expect((await animationOf(page,'.command-window-backdrop')).name).toBe('ron-fade-in');
  16 |  // Geometry is never animated: the dossier keeps its final box while it fades in.
  17 |  expect(await page.locator('.command-window').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  18 |  await page.emulateMedia({reducedMotion:'reduce'});
  19 |  await page.keyboard.press('Escape');await expect(page.locator('.command-panel')).toBeVisible();
  20 |  expect(await page.locator('.command-panel').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
  21 |  await page.locator('[data-guide="tab-power"]').click();await expect(page.locator('.command-window')).toBeVisible();
  22 |  expect((await animationOf(page,'.command-window')).name).toBe('none');expect((await animationOf(page,'.command-window-backdrop')).name).toBe('none');
  23 |  expect(await page.locator('.command-window').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  24 | });
  25 | 
  26 | test('returning from a child window restores the parent scroll position, row focus and frame',async({page})=>{
  27 |  await resumeFixture(page,campaignFixture('en'));
  28 |  await page.locator('[data-guide="rail-world"]').click();const world=page.locator('#pulse-window');await expect(world).toBeVisible();
  29 |  const table=page.locator('#pulse-window .ranking-table-wrap');
  30 |  await table.evaluate(el=>{el.scrollTop=180;});
  31 |  await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
  32 |  await page.waitForTimeout(150);
  33 |  const offset=await table.evaluate(el=>el.scrollTop),frame=await world.boundingBox();
  34 |  // Choose a row that is inside the scrolled view and open it from the keyboard.
  35 |  const row=await table.evaluate(el=>{const box=el.getBoundingClientRect();const buttons=[...el.querySelectorAll<HTMLButtonElement>('tbody button')];const i=buttons.findIndex(b=>{const r=b.getBoundingClientRect();return r.top>box.top+30&&r.bottom<box.bottom-10;});buttons[i].focus({preventScroll:true});return i;});
  36 |  expect(row).toBeGreaterThan(0);
  37 |  await page.keyboard.press('Enter');
  38 |  await expect(world).toBeHidden();await expect(page.locator('.command-panel')).toBeVisible();
  39 |  await page.locator('.command-panel [data-guide="close-workspace"]').click();
  40 |  await expect(world).toBeVisible();
  41 |  await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBe(offset);
  42 |  expect(await table.evaluate((el,i)=>document.activeElement===el.querySelectorAll('tbody button')[i],row)).toBe(true);
  43 |  const back=await world.boundingBox();expect(back!.x).toBe(frame!.x);expect(back!.y).toBe(frame!.y);
  44 | });
  45 | 
  46 | test('country panel returns from National power with its tab, scroll and focus',async({page})=>{
  47 |  await page.setViewportSize({width:1440,height:760});
  48 |  await resumeFixture(page,campaignFixture('en'));
  49 |  await page.locator('[data-guide="nation"]').click();const panel=page.locator('.command-panel');await expect(panel).toBeVisible();
  50 |  await page.locator('[data-guide="tab-military"]').click();await expect(page.locator('[data-guide="tab-military"]')).toHaveAttribute('aria-pressed','true');
  51 |  const scrolled=await panel.evaluate(el=>{el.scrollTop=Math.min(240,el.scrollHeight-el.clientHeight);return el.scrollTop;});
  52 |  const power=page.locator('[data-guide="tab-power"]');await power.focus({});await page.keyboard.press('Enter');
  53 |  await expect(page.locator('.command-window')).toBeVisible();await expect(panel).toBeHidden();
  54 |  // The receding panel cannot be reached while the child is open.
  55 |  expect(await panel.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&el.contains(hit);})).toBe(false);
  56 |  await page.keyboard.press('Escape');
  57 |  await expect(panel).toBeVisible();await expect(power).toBeFocused();
  58 |  await expect(page.locator('[data-guide="tab-military"]')).toHaveAttribute('aria-pressed','true');
  59 |  expect(await panel.evaluate(el=>el.scrollTop)).toBe(scrolled);
  60 |  await expect.poll(()=>panel.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  61 | });
  62 | 
  63 | for(const language of LANGUAGES)test(`${language} shows Rule of Nations untranslated in the title, header and help`,async({page})=>{
  64 |  await resumeFixture(page,campaignFixture(language));
  65 |  await expect(page).toHaveTitle('Rule of Nations');
  66 |  await expect(page.locator('.brand-block .eyebrow')).toHaveText('Rule of Nations');
> 67 |  await page.locator('[data-guide="rail-help"]').click();await expect(page.locator('#help-window .game-notes h3')).toHaveText('Rule of Nations');
     |                                                 ^ Error: locator.click: Test timeout of 60000ms exceeded.
  68 |  expect(await page.locator('body').innerText()).not.toMatch(/Real President|Gerçek Başkan|Gerçekten O'nun|AlpyX(?! Game Studios)/);
  69 | });
  70 | 
  71 | test('entry and setup screens carry the Rule of Nations mark over the cover art',async({page})=>{
  72 |  await page.goto('/');await expect(page.locator('.entry-art .brand-mark')).toContainText('Rule of Nations');
  73 |  await expect(page.locator('.entry-art .brand-mark')).toHaveAttribute('translate','no');
  74 |  await expect(page.locator('.entry-art .brand-mark-emblem')).toHaveText('RON');
  75 |  await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
  76 |  await expect(page.locator('.setup-cover .brand-mark')).toContainText('Rule of Nations');await expect(page.locator('.wizard-header small')).toContainText('Rule of Nations');
  77 |  await page.screenshot({path:'test-results/ron-setup-091.png'});
  78 | });
  79 | 
```