# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> es shows Rule of Nations untranslated in the title, header and help
- Location: e2e/fluidCommand091.spec.ts:63:33

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-guide="rail-help"]')
    - locator resolved to <button class="rail-button" aria-pressed="false" data-guide="rail-help" title="AYUDA · Closed — click to open">…</button>
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
    108 × waiting for element to be visible, enabled and stable
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
      - generic: globo de arrastre · zoom de rueda · haga clic en territorio soberano
    - group "Interactive world map" [ref=e5]:
      - generic [ref=e8]:
        - generic "Tanzania" [ref=e9] [cursor=pointer]
        - generic "Sáhara Occidental" [ref=e10] [cursor=pointer]
        - generic "Canadá" [ref=e11] [cursor=pointer]
        - generic "Estados Unidos" [ref=e12] [cursor=pointer]
        - generic "Kazajistán" [ref=e13] [cursor=pointer]
        - generic "Uzbekistán" [ref=e14] [cursor=pointer]
        - generic "Indonesia" [ref=e15] [cursor=pointer]
        - generic "República Democrática del Congo" [ref=e16] [cursor=pointer]
        - generic "Somalia" [ref=e17] [cursor=pointer]
        - generic "Kenia" [ref=e18] [cursor=pointer]
        - generic "Sudán" [ref=e19] [cursor=pointer]
        - generic "Chad" [ref=e20] [cursor=pointer]
        - generic "Haití" [ref=e21] [cursor=pointer]
        - generic "República Dominicana" [ref=e22] [cursor=pointer]
        - generic "Rusia" [ref=e23] [cursor=pointer]
        - generic "Noruega" [ref=e24] [cursor=pointer]
        - generic "Groenlandia" [ref=e25] [cursor=pointer]
        - generic "Territorios Australes Franceses" [ref=e26] [cursor=pointer]
        - generic "Sudáfrica" [ref=e27] [cursor=pointer]
        - generic "Lesoto" [ref=e28] [cursor=pointer]
        - generic "Brasil" [ref=e29] [cursor=pointer]
        - generic "Venezuela" [ref=e30] [cursor=pointer]
        - generic "Guyana" [ref=e31] [cursor=pointer]
        - generic "Surinam" [ref=e32] [cursor=pointer]
        - generic "Francia" [ref=e33] [cursor=pointer]
        - generic "Puerto Rico" [ref=e34] [cursor=pointer]
        - generic "Zimbabue" [ref=e35] [cursor=pointer]
        - generic "Botsuana" [ref=e36] [cursor=pointer]
        - generic "Namibia" [ref=e37] [cursor=pointer]
        - generic "Senegal" [ref=e38] [cursor=pointer]
        - generic "Mali" [ref=e39] [cursor=pointer]
        - generic "Mauritania" [ref=e40] [cursor=pointer]
        - generic "Benín" [ref=e41] [cursor=pointer]
        - generic "Níger" [ref=e42] [cursor=pointer]
        - generic "Nigeria" [ref=e43] [cursor=pointer]
        - generic "Camerún" [ref=e44] [cursor=pointer]
        - generic "Togo" [ref=e45] [cursor=pointer]
        - generic "Ghana" [ref=e46] [cursor=pointer]
        - generic "Côte d’Ivoire" [ref=e47] [cursor=pointer]
        - generic "Guinea" [ref=e48] [cursor=pointer]
        - generic "Guinea-Bisáu" [ref=e49] [cursor=pointer]
        - generic "Liberia" [ref=e50] [cursor=pointer]
        - generic "Sierra Leona" [ref=e51] [cursor=pointer]
        - generic "Burkina Faso" [ref=e52] [cursor=pointer]
        - generic "República Centroafricana" [ref=e53] [cursor=pointer]
        - generic "Congo" [ref=e54] [cursor=pointer]
        - generic "Gabón" [ref=e55] [cursor=pointer]
        - generic "Guinea Ecuatorial" [ref=e56] [cursor=pointer]
        - generic "Zambia" [ref=e57] [cursor=pointer]
        - generic "Malaui" [ref=e58] [cursor=pointer]
        - generic "Mozambique" [ref=e59] [cursor=pointer]
        - generic "Esuatini" [ref=e60] [cursor=pointer]
        - generic "Angola" [ref=e61] [cursor=pointer]
        - generic "Burundi" [ref=e62] [cursor=pointer]
        - generic "Israel" [ref=e63] [cursor=pointer]
        - generic "Líbano" [ref=e64] [cursor=pointer]
        - generic "Madagascar" [ref=e65] [cursor=pointer]
        - generic "Palestina" [ref=e66] [cursor=pointer]
        - generic "Gambia" [ref=e67] [cursor=pointer]
        - generic "Túnez" [ref=e68] [cursor=pointer]
        - generic "Argelia" [ref=e69] [cursor=pointer]
        - generic "Jordania" [ref=e70] [cursor=pointer]
        - generic "Emiratos Árabes Unidos" [ref=e71] [cursor=pointer]
        - generic "Catar" [ref=e72] [cursor=pointer]
        - generic "Kuwait" [ref=e73] [cursor=pointer]
        - generic "Irak" [ref=e74] [cursor=pointer]
        - generic "Omán" [ref=e75] [cursor=pointer]
        - generic "Camboya" [ref=e76] [cursor=pointer]
        - generic "Tailandia" [ref=e77] [cursor=pointer]
        - generic "Laos" [ref=e78] [cursor=pointer]
        - generic "Myanmar (Birmania)" [ref=e79] [cursor=pointer]
        - generic "Vietnam" [ref=e80] [cursor=pointer]
        - generic "Corea del Norte" [ref=e81] [cursor=pointer]
        - generic "Corea del Sur" [ref=e82] [cursor=pointer]
        - generic "Mongolia" [ref=e83] [cursor=pointer]
        - generic "India" [ref=e84] [cursor=pointer]
        - generic "Bangladés" [ref=e85] [cursor=pointer]
        - generic "Bután" [ref=e86] [cursor=pointer]
        - generic "Nepal" [ref=e87] [cursor=pointer]
        - generic "Pakistán" [ref=e88] [cursor=pointer]
        - generic "Afganistán" [ref=e89] [cursor=pointer]
        - generic "Tayikistán" [ref=e90] [cursor=pointer]
        - generic "Kirguistán" [ref=e91] [cursor=pointer]
        - generic "Turkmenistán" [ref=e92] [cursor=pointer]
        - generic "Irán" [ref=e93] [cursor=pointer]
        - generic "Siria" [ref=e94] [cursor=pointer]
        - generic "Armenia" [ref=e95] [cursor=pointer]
        - generic "Suecia" [ref=e96] [cursor=pointer]
        - generic "Bielorrusia" [ref=e97] [cursor=pointer]
        - generic "Ucrania" [ref=e98] [cursor=pointer]
        - generic "Polonia" [ref=e99] [cursor=pointer]
        - generic "Austria" [ref=e100] [cursor=pointer]
        - generic "Hungría" [ref=e101] [cursor=pointer]
        - generic "Moldavia" [ref=e102] [cursor=pointer]
        - generic "Rumanía" [ref=e103] [cursor=pointer]
        - generic "Lituania" [ref=e104] [cursor=pointer]
        - generic "Letonia" [ref=e105] [cursor=pointer]
        - generic "Estonia" [ref=e106] [cursor=pointer]
        - generic "Alemania" [ref=e107] [cursor=pointer]
        - generic "Bulgaria" [ref=e108] [cursor=pointer]
        - generic "Grecia" [ref=e109] [cursor=pointer]
        - generic "Türkiye" [ref=e110] [cursor=pointer]
        - generic "Albania" [ref=e111] [cursor=pointer]
        - generic "Croacia" [ref=e112] [cursor=pointer]
        - generic "Suiza" [ref=e113] [cursor=pointer]
        - generic "Luxemburgo" [ref=e114] [cursor=pointer]
        - generic "Bélgica" [ref=e115] [cursor=pointer]
        - generic "Países Bajos" [ref=e116] [cursor=pointer]
        - generic "Portugal" [ref=e117] [cursor=pointer]
        - generic "España" [ref=e118] [cursor=pointer]
        - generic "Irlanda" [ref=e119] [cursor=pointer]
        - generic "Sri Lanka" [ref=e120] [cursor=pointer]
        - generic "China" [ref=e121] [cursor=pointer]
        - generic "Taiwán" [ref=e122] [cursor=pointer]
        - generic "Italia" [ref=e123] [cursor=pointer]
        - generic "Dinamarca" [ref=e124] [cursor=pointer]
        - generic "Reino Unido" [ref=e125] [cursor=pointer]
        - generic "Islandia" [ref=e126] [cursor=pointer]
        - generic "Azerbaiyán" [ref=e127] [cursor=pointer]
        - generic "Georgia" [ref=e128] [cursor=pointer]
        - generic "Filipinas" [ref=e129] [cursor=pointer]
        - generic "Malasia" [ref=e130] [cursor=pointer]
        - generic "Brunéi" [ref=e131] [cursor=pointer]
        - generic "Eslovenia" [ref=e132] [cursor=pointer]
        - generic "Finlandia" [ref=e133] [cursor=pointer]
        - generic "Eslovaquia" [ref=e134] [cursor=pointer]
        - generic "Chequia" [ref=e135] [cursor=pointer]
        - generic "Eritrea" [ref=e136] [cursor=pointer]
        - generic "Japón" [ref=e137] [cursor=pointer]
        - generic "Yemen" [ref=e138] [cursor=pointer]
        - generic "Arabia Saudí" [ref=e139] [cursor=pointer]
        - generic "Chipre" [ref=e140] [cursor=pointer]
        - generic "Chipre" [ref=e141] [cursor=pointer]
        - generic "Marruecos" [ref=e142] [cursor=pointer]
        - generic "Egipto" [ref=e143] [cursor=pointer]
        - generic "Libia" [ref=e144] [cursor=pointer]
        - generic "Etiopía" [ref=e145] [cursor=pointer]
        - generic "Yibuti" [ref=e146] [cursor=pointer]
        - generic "Somalia" [ref=e147] [cursor=pointer]
        - generic "Uganda" [ref=e148] [cursor=pointer]
        - generic "Ruanda" [ref=e149] [cursor=pointer]
        - generic "Bosnia y Herzegovina" [ref=e150] [cursor=pointer]
        - generic "Macedonia del Norte" [ref=e151] [cursor=pointer]
        - generic "Serbia" [ref=e152] [cursor=pointer]
        - generic "Montenegro" [ref=e153] [cursor=pointer]
        - generic "Kosovo" [ref=e154] [cursor=pointer]
        - generic "Trinidad y Tobago" [ref=e155] [cursor=pointer]
        - generic "Sudán del Sur" [ref=e156] [cursor=pointer]
      - generic:
        - generic:
          - generic: TÜRKIYE
        - generic:
          - generic: RUSIA
        - generic:
          - generic: CHINA
        - generic:
          - generic: INDIA
        - generic:
          - generic: ARGELIA
        - generic:
          - generic: REPÚBLICA DEMOCRÁTICA DEL CONGO
        - generic:
          - generic: KAZAJISTÁN
        - generic:
          - generic: ARABIA SAUDÍ
        - generic:
          - generic: SUDÁN
        - generic:
          - generic: LIBIA
        - generic:
          - generic: IRÁN
        - generic:
          - generic: CHAD
        - generic:
          - generic: CANADÁ
        - generic:
          - generic: ETIOPÍA
        - generic:
          - generic: MALI
        - generic:
          - generic: ANGOLA
        - generic:
          - generic: BRASIL
        - generic:
          - generic: NIGERIA
        - generic:
          - generic: SUDÁFRICA
        - generic:
          - generic: OCÉANO ÁRTICO
        - generic:
          - generic: OCÉANO ÍNDICO
        - generic:
          - generic: OCÉANO ATLÁNTICO NORTE
        - generic:
          - generic: OCÉANO ATLÁNTICO SUR
    - generic "Map camera controls" [ref=e157]:
      - button "Zoom out" [ref=e158] [cursor=pointer]: −
      - status "Map zoom level" [ref=e159]: 100%
      - button "Zoom in" [ref=e160] [cursor=pointer]: +
      - button "Regresa a tu nación" [ref=e161] [cursor=pointer]:
        - img [ref=e162]
      - button "RESETEO" [ref=e166] [cursor=pointer]
  - generic:
    - generic [ref=e167]:
      - generic [ref=e168]:
        - button "Ejecutivo ⋯" [ref=e169] [cursor=pointer]:
          - img "Ejecutivo" [ref=e170]
          - generic [ref=e171]: ⋯
        - generic [ref=e172]:
          - generic [ref=e173]: Rule of Nations
          - generic [ref=e174]:
            - strong [ref=e175]: Browser playtest
            - generic [ref=e176]: DÍA 1
      - generic "Indicadores nacionales de mando" [ref=e177]:
        - generic [ref=e178]:
          - img [ref=e181]
          - generic [ref=e182]:
            - generic [ref=e183]: TESORO
            - strong [ref=e184]: $143.0B
        - generic [ref=e185]:
          - img [ref=e188]
          - generic [ref=e189]:
            - generic [ref=e190]: PRESUPUESTO DIARIO
            - strong [ref=e191]: +$0.167B
        - generic [ref=e192]:
          - img [ref=e195]
          - generic [ref=e196]:
            - generic [ref=e197]: APOYO
            - strong [ref=e198]: 56%
        - generic [ref=e199]:
          - img [ref=e202]
          - generic [ref=e203]:
            - generic [ref=e204]: ESTABILIDAD
            - strong [ref=e205]: 67%
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic "Controles de velocidad del juego" [ref=e208]:
          - button "Ⅱ PAUSA" [pressed] [ref=e209] [cursor=pointer]:
            - strong [ref=e210]: Ⅱ
            - generic [ref=e211]: PAUSA
          - button "1× 15s/DÍA" [ref=e212] [cursor=pointer]:
            - strong [ref=e213]: 1×
            - generic [ref=e214]: 15s/DÍA
          - button "2× 7s/DÍA" [ref=e215] [cursor=pointer]:
            - strong [ref=e216]: 2×
            - generic [ref=e217]: 7s/DÍA
          - button "3× 3s/DÍA" [ref=e218] [cursor=pointer]:
            - strong [ref=e219]: 3×
            - generic [ref=e220]: 3s/DÍA
          - button "5× 1s/DÍA" [ref=e221] [cursor=pointer]:
            - strong [ref=e222]: 5×
            - generic [ref=e223]: 1s/DÍA
        - generic [ref=e224]:
          - generic [ref=e225]: FECHA DE CAMPAÑA
          - strong [ref=e226]: 2026-01-01
      - button "Abre tu nación." [pressed] [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: 🇹🇷
        - generic [ref=e229]:
          - strong [ref=e230]: Türkiye
          - generic [ref=e231]: democracia
          - emphasis [ref=e232]: Abre tu nación.
  - complementary [ref=e233]:
    - generic [ref=e234]:
      - generic [ref=e235]: ESTADO / MANDO NACIONAL
      - button "Grupo de países de corta duración" [active] [ref=e236] [cursor=pointer]: ×
    - combobox "Seleccionar país" [ref=e237]:
      - option "Afganistán (AF)"
      - option "Albania (AL)"
      - option "Argelia (DZ)"
      - option "Andorra (AD)"
      - option "Angola (AO)"
      - option "Antigua y Barbuda (AG)"
      - option "Argentina (AR)"
      - option "Armenia (AM)"
      - option "Australia (AU)"
      - option "Austria (AT)"
      - option "Azerbaiyán (AZ)"
      - option "Bahamas (BS)"
      - option "Baréin (BH)"
      - option "Bangladés (BD)"
      - option "Barbados (BB)"
      - option "Bielorrusia (BY)"
      - option "Bélgica (BE)"
      - option "Belice (BZ)"
      - option "Benín (BJ)"
      - option "Bután (BT)"
      - option "Bolivia (BO)"
      - option "Bosnia y Herzegovina (BA)"
      - option "Botsuana (BW)"
      - option "Brasil (BR)"
      - option "Brunéi (BN)"
      - option "Bulgaria (BG)"
      - option "Burkina Faso (BF)"
      - option "Burundi (BI)"
      - option "Cabo Verde (CV)"
      - option "Camboya (KH)"
      - option "Camerún (CM)"
      - option "Canadá (CA)"
      - option "República Centroafricana (CF)"
      - option "Chad (TD)"
      - option "Chile (CL)"
      - option "China (CN)"
      - option "Colombia (CO)"
      - option "Comoras (KM)"
      - option "Congo (CG)"
      - option "Costa Rica (CR)"
      - option "Côte d’Ivoire (CI)"
      - option "Croacia (HR)"
      - option "Cuba (CU)"
      - option "Chequia (CZ)"
      - option "República Democrática del Congo (CD)"
      - option "Dinamarca (DK)"
      - option "Yibuti (DJ)"
      - option "Dominica (DM)"
      - option "República Dominicana (DO)"
      - option "Ecuador (EC)"
      - option "Egipto (EG)"
      - option "El Salvador (SV)"
      - option "Guinea Ecuatorial (GQ)"
      - option "Eritrea (ER)"
      - option "Estonia (EE)"
      - option "Esuatini (SZ)"
      - option "Etiopía (ET)"
      - option "Islas Malvinas (Islas Falkland) (FK)"
      - option "Fiyi (FJ)"
      - option "Finlandia (FI)"
      - option "Territorios Australes Franceses (TF)"
      - option "Francia (FR)"
      - option "Gabón (GA)"
      - option "Gambia (GM)"
      - option "Georgia (GE)"
      - option "Alemania (DE)"
      - option "Ghana (GH)"
      - option "Grecia (GR)"
      - option "Groenlandia (GL)"
      - option "Granada (GD)"
      - option "Guatemala (GT)"
      - option "Guinea (GN)"
      - option "Guinea-Bisáu (GW)"
      - option "Guyana (GY)"
      - option "Haití (HT)"
      - option "Ciudad del Vaticano (VA)"
      - option "Honduras (HN)"
      - option "Hungría (HU)"
      - option "Islandia (IS)"
      - option "India (IN)"
      - option "Indonesia (ID)"
      - option "Irán (IR)"
      - option "Irak (IQ)"
      - option "Irlanda (IE)"
      - option "Israel (IL)"
      - option "Italia (IT)"
      - option "Jamaica (JM)"
      - option "Japón (JP)"
      - option "Jordania (JO)"
      - option "Kazajistán (KZ)"
      - option "Kenia (KE)"
      - option "Kiribati (KI)"
      - option "Kosovo (XK)"
      - option "Kuwait (KW)"
      - option "Kirguistán (KG)"
      - option "Laos (LA)"
      - option "Letonia (LV)"
      - option "Líbano (LB)"
      - option "Lesoto (LS)"
      - option "Liberia (LR)"
      - option "Libia (LY)"
      - option "Liechtenstein (LI)"
      - option "Lituania (LT)"
      - option "Luxemburgo (LU)"
      - option "Madagascar (MG)"
      - option "Malaui (MW)"
      - option "Malasia (MY)"
      - option "Maldivas (MV)"
      - option "Mali (ML)"
      - option "Malta (MT)"
      - option "Islas Marshall (MH)"
      - option "Mauritania (MR)"
      - option "Mauricio (MU)"
      - option "México (MX)"
      - option "Micronesia (FM)"
      - option "Moldavia (MD)"
      - option "Mónaco (MC)"
      - option "Mongolia (MN)"
      - option "Montenegro (ME)"
      - option "Marruecos (MA)"
      - option "Mozambique (MZ)"
      - option "Myanmar (Birmania) (MM)"
      - option "Chipre (CY)"
      - option "Namibia (NA)"
      - option "Nauru (NR)"
      - option "Nepal (NP)"
      - option "Países Bajos (NL)"
      - option "Nueva Caledonia (NC)"
      - option "Nueva Zelanda (NZ)"
      - option "Nicaragua (NI)"
      - option "Níger (NE)"
      - option "Nigeria (NG)"
      - option "Corea del Norte (KP)"
      - option "Macedonia del Norte (MK)"
      - option "Noruega (NO)"
      - option "Omán (OM)"
      - option "Pakistán (PK)"
      - option "Palaos (PW)"
      - option "Palestina (PS)"
      - option "Panamá (PA)"
      - option "Papúa Nueva Guinea (PG)"
      - option "Paraguay (PY)"
      - option "Perú (PE)"
      - option "Filipinas (PH)"
      - option "Polonia (PL)"
      - option "Portugal (PT)"
      - option "Puerto Rico (PR)"
      - option "Catar (QA)"
      - option "Rumanía (RO)"
      - option "Rusia (RU)"
      - option "Ruanda (RW)"
      - option "Sudán del Sur (SS)"
      - option "San Cristóbal y Nieves (KN)"
      - option "Santa Lucía (LC)"
      - option "San Vicente y las Granadinas (VC)"
      - option "Samoa (WS)"
      - option "San Marino (SM)"
      - option "Santo Tomé y Príncipe (ST)"
      - option "Arabia Saudí (SA)"
      - option "Senegal (SN)"
      - option "Serbia (RS)"
      - option "Seychelles (SC)"
      - option "Sierra Leona (SL)"
      - option "Singapur (SG)"
      - option "Eslovaquia (SK)"
      - option "Eslovenia (SI)"
      - option "Islas Salomón (SB)"
      - option "Somalia (SO)"
      - option "Sudáfrica (ZA)"
      - option "Corea del Sur (KR)"
      - option "España (ES)"
      - option "Sri Lanka (LK)"
      - option "Sudán (SD)"
      - option "Surinam (SR)"
      - option "Suecia (SE)"
      - option "Suiza (CH)"
      - option "Siria (SY)"
      - option "Taiwán (TW)"
      - option "Tayikistán (TJ)"
      - option "Tanzania (TZ)"
      - option "Tailandia (TH)"
      - option "Timor-Leste (TL)"
      - option "Togo (TG)"
      - option "Tonga (TO)"
      - option "Trinidad y Tobago (TT)"
      - option "Túnez (TN)"
      - option "Türkiye (TR)" [selected]
      - option "Turkmenistán (TM)"
      - option "Tuvalu (TV)"
      - option "Uganda (UG)"
      - option "Ucrania (UA)"
      - option "Emiratos Árabes Unidos (AE)"
      - option "Reino Unido (GB)"
      - option "Estados Unidos (US)"
      - option "Uruguay (UY)"
      - option "Uzbekistán (UZ)"
      - option "Vanuatu (VU)"
      - option "Venezuela (VE)"
      - option "Vietnam (VN)"
      - option "Sáhara Occidental (EH)"
      - option "Yemen (YE)"
      - option "Zambia (ZM)"
      - option "Zimbabue (ZW)"
    - generic [ref=e239]:
      - generic [ref=e240]: 🇹🇷
      - generic [ref=e241]:
        - heading "Türkiye" [level=1] [ref=e242]
        - paragraph [ref=e243]: Jugador nación · democracia · asia
    - generic [ref=e244]:
      - generic [ref=e245]:
        - generic [ref=e246]: ☪
        - generic [ref=e247]:
          - generic [ref=e248]: RELIGIÓN
          - strong [ref=e249]: islam
      - generic [ref=e250]:
        - img "bloc" [ref=e251]:
          - img [ref=e252]
        - generic [ref=e253]:
          - generic [ref=e254]: IDEOLOGÍA
          - strong [ref=e255]: pluralista
      - generic [ref=e256]:
        - img [ref=e258]
        - generic [ref=e259]:
          - generic [ref=e260]: Rango militar
          - strong [ref=e261]: "GFP #9"
    - generic [ref=e262]:
      - button "RESUMEN" [pressed] [ref=e263] [cursor=pointer]:
        - img [ref=e265]
        - generic [ref=e266]: RESUMEN
      - button "Poder" [ref=e267] [cursor=pointer]:
        - img [ref=e268]
        - generic [ref=e272]: Poder
      - button "Mando de suministros" [ref=e273] [cursor=pointer]:
        - img [ref=e275]
        - generic [ref=e276]: Mando de suministros
    - generic [ref=e277]:
      - button "Asuntos" [ref=e278] [cursor=pointer]:
        - img [ref=e280]
        - generic [ref=e281]: Asuntos
      - button "ECONOMÍA" [ref=e282] [cursor=pointer]:
        - img [ref=e284]
        - generic [ref=e285]: ECONOMÍA
      - button "Políticas" [ref=e286] [cursor=pointer]:
        - img [ref=e288]
        - generic [ref=e289]: Políticas
      - button "trade Comercio" [ref=e290] [cursor=pointer]:
        - img "trade" [ref=e291]:
          - img [ref=e292]
        - generic [ref=e293]: Comercio
      - button "Producción" [ref=e294] [cursor=pointer]:
        - img [ref=e296]
        - generic [ref=e297]: Producción
      - button "DIPLOMACIA" [ref=e298] [cursor=pointer]:
        - img [ref=e300]
        - generic [ref=e301]: DIPLOMACIA
      - button "MILITAR" [ref=e302] [cursor=pointer]:
        - img [ref=e304]
        - generic [ref=e305]: MILITAR
      - button "Inteligencia" [ref=e306] [cursor=pointer]:
        - img [ref=e308]
        - generic [ref=e309]: Inteligencia
      - button "GABINETE" [ref=e310] [cursor=pointer]:
        - img [ref=e312]
        - generic [ref=e313]: GABINETE
    - generic [ref=e314]:
      - button "TECNOLOGÍA" [ref=e315] [cursor=pointer]:
        - img [ref=e317]
        - generic [ref=e318]: TECNOLOGÍA
      - button "MUNDO" [ref=e319] [cursor=pointer]:
        - img [ref=e321]
        - generic [ref=e322]: MUNDO
      - button "Preparación de guerra" [ref=e323] [cursor=pointer]:
        - img [ref=e325]
        - generic [ref=e326]: Preparación de guerra
    - generic [ref=e327]:
      - generic [ref=e328]:
        - generic [ref=e329]: PIB
        - strong [ref=e330]: $1300.0B
      - generic [ref=e331]:
        - generic [ref=e332]: SALUD ECONÓMICA
        - strong [ref=e333]: 100%
      - generic [ref=e334]:
        - generic [ref=e335]: POBLACIÓN
        - strong [ref=e336]: 86.0M
      - generic [ref=e337]:
        - generic [ref=e338]: CAPACIDAD MILITAR
        - strong [ref=e339]: 81.5/100
      - generic [ref=e340]:
        - generic [ref=e341]: Producción industrial
        - strong [ref=e342]: "52.68"
      - generic [ref=e343]:
        - generic [ref=e344]: PRESIÓN DE RECURSOS
        - strong [ref=e345]: 71.2%
    - generic [ref=e346]:
      - generic [ref=e347]:
        - img "COMBUSTIBLE" [ref=e348]:
          - img
        - generic [ref=e349]: COMBUSTIBLE
        - strong [ref=e350]: "25.6"
      - generic [ref=e351]:
        - img "Acero" [ref=e352]:
          - img
        - generic [ref=e353]: ACERO
        - strong [ref=e354]: "50.0"
      - generic [ref=e355]:
        - img "Electricidad" [ref=e356]:
          - img
        - generic [ref=e357]: ENERGÍA
        - strong [ref=e358]: "43.2"
      - generic [ref=e359]:
        - img [ref=e360]
        - generic [ref=e363]: R&D
        - strong [ref=e364]: "29.9"
    - generic [ref=e365]:
      - generic [ref=e366]:
        - generic [ref=e367]: Presupuesto diario
        - strong [ref=e368]: +0.183B
      - generic [ref=e369]:
        - generic [ref=e370]: tendencia del PIB
        - strong [ref=e371]: +0.0109%
      - generic [ref=e372]:
        - generic [ref=e373]: Comida / día
        - strong [ref=e374]: "+4.11"
      - generic [ref=e375]:
        - generic [ref=e376]: Aceite / día
        - strong [ref=e377]: "-0.33"
      - generic [ref=e378]:
        - generic [ref=e379]: Hierro / día
        - strong [ref=e380]: "+0.21"
      - generic [ref=e381]:
        - generic [ref=e382]: Inflación
        - strong [ref=e383]: 5.50%
      - generic [ref=e384]:
        - generic [ref=e385]: ESTABILIDAD
        - strong [ref=e386]: 67.2%
      - generic [ref=e387]:
        - generic [ref=e388]: Cohesión
        - strong [ref=e389]: 71.2%
  - navigation "Herramientas de comandos mundiales" [ref=e390]:
    - button "MERCADO MERCADO" [ref=e391] [cursor=pointer]:
      - img "MERCADO" [ref=e393]:
        - img
      - generic [ref=e394]: MERCADO
    - button "MUNDO MUNDO" [ref=e395] [cursor=pointer]:
      - img "MUNDO" [ref=e397]:
        - img
      - generic [ref=e398]: MUNDO
    - button "ALERTAS 1 SUMINISTRO" [ref=e399] [cursor=pointer]:
      - img "ALERTAS" [ref=e401]:
        - img
      - generic [ref=e402]: "1"
      - generic [ref=e403]: SUMINISTRO
  - navigation "Herramientas de información" [ref=e404]:
    - button "objectives 0/6 OBJETIVOS" [ref=e405] [cursor=pointer]:
      - img "objectives" [ref=e407]:
        - img
      - generic [ref=e408]: 0/6
      - generic [ref=e409]: OBJETIVOS
    - button "DIPLOMACIA DIPLOMACIA" [ref=e410] [cursor=pointer]:
      - img "DIPLOMACIA" [ref=e412]:
        - img
      - generic [ref=e413]: DIPLOMACIA
    - button "ALERTAS 1 ALERTAS" [ref=e414] [cursor=pointer]:
      - img "ALERTAS" [ref=e416]:
        - img
      - generic [ref=e417]: "1"
      - generic [ref=e418]: ALERTAS
    - button "Inteligencia 2 NOTICIAS" [ref=e419] [cursor=pointer]:
      - img "Inteligencia" [ref=e421]:
        - img
      - generic [ref=e422]: "2"
      - generic [ref=e423]: NOTICIAS
  - navigation "Mapa y herramientas de ayuda" [ref=e424]:
    - button "MAPA MAPA" [ref=e425] [cursor=pointer]:
      - img "MAPA" [ref=e427]:
        - img
      - generic [ref=e428]: MAPA
    - button "AYUDA AYUDA" [ref=e429] [cursor=pointer]:
      - img "AYUDA" [ref=e431]:
        - img
      - generic [ref=e432]: AYUDA
  - generic [ref=e433]:
    - generic [ref=e434]: NOTICIAS// Rule of Nations está listo.
    - generic [ref=e435]:
      - generic [ref=e436]: CANAL DE MANDO MUNDIAL
      - generic [ref=e437]: jugador · POLÍTICO · POLÍTICO · GLOBO
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