# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> ru shows Rule of Nations untranslated in the title, header and help
- Location: e2e/fluidCommand091.spec.ts:63:33

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-guide="rail-help"]')
    - locator resolved to <button class="rail-button" aria-pressed="false" data-guide="rail-help" title="ПОМОЩЬ · Closed — click to open">…</button>
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
      - strong: Турция
      - generic: drag globe · wheel zoom · click Суверенная территория
    - group "Interactive world map" [ref=e5]:
      - generic [ref=e8]:
        - generic "Танзания" [ref=e9] [cursor=pointer]
        - generic "Западная Сахара" [ref=e10] [cursor=pointer]
        - generic "Канада" [ref=e11] [cursor=pointer]
        - generic "Соединенные Штаты" [ref=e12] [cursor=pointer]
        - generic "Казахстан" [ref=e13] [cursor=pointer]
        - generic "Узбекистан" [ref=e14] [cursor=pointer]
        - generic "Индонезия" [ref=e15] [cursor=pointer]
        - generic "Конго - Киншаса" [ref=e16] [cursor=pointer]
        - generic "Сомали" [ref=e17] [cursor=pointer]
        - generic "Кения" [ref=e18] [cursor=pointer]
        - generic "Судан" [ref=e19] [cursor=pointer]
        - generic "Чад" [ref=e20] [cursor=pointer]
        - generic "Гаити" [ref=e21] [cursor=pointer]
        - generic "Доминиканская Республика" [ref=e22] [cursor=pointer]
        - generic "Россия" [ref=e23] [cursor=pointer]
        - generic "Норвегия" [ref=e24] [cursor=pointer]
        - generic "Гренландия" [ref=e25] [cursor=pointer]
        - generic "Французские Южные территории" [ref=e26] [cursor=pointer]
        - generic "Южно-Африканская Республика" [ref=e27] [cursor=pointer]
        - generic "Лесото" [ref=e28] [cursor=pointer]
        - generic "Бразилия" [ref=e29] [cursor=pointer]
        - generic "Венесуэла" [ref=e30] [cursor=pointer]
        - generic "Гайана" [ref=e31] [cursor=pointer]
        - generic "Суринам" [ref=e32] [cursor=pointer]
        - generic "Франция" [ref=e33] [cursor=pointer]
        - generic "Пуэрто-Рико" [ref=e34] [cursor=pointer]
        - generic "Зимбабве" [ref=e35] [cursor=pointer]
        - generic "Ботсвана" [ref=e36] [cursor=pointer]
        - generic "Намибия" [ref=e37] [cursor=pointer]
        - generic "Сенегал" [ref=e38] [cursor=pointer]
        - generic "Мали" [ref=e39] [cursor=pointer]
        - generic "Мавритания" [ref=e40] [cursor=pointer]
        - generic "Бенин" [ref=e41] [cursor=pointer]
        - generic "Нигер" [ref=e42] [cursor=pointer]
        - generic "Нигерия" [ref=e43] [cursor=pointer]
        - generic "Камерун" [ref=e44] [cursor=pointer]
        - generic "Того" [ref=e45] [cursor=pointer]
        - generic "Гана" [ref=e46] [cursor=pointer]
        - generic "Кот-д’Ивуар" [ref=e47] [cursor=pointer]
        - generic "Гвинея" [ref=e48] [cursor=pointer]
        - generic "Гвинея-Бисау" [ref=e49] [cursor=pointer]
        - generic "Либерия" [ref=e50] [cursor=pointer]
        - generic "Сьерра-Леоне" [ref=e51] [cursor=pointer]
        - generic "Буркина-Фасо" [ref=e52] [cursor=pointer]
        - generic "Центрально-Африканская Республика" [ref=e53] [cursor=pointer]
        - generic "Конго - Браззавиль" [ref=e54] [cursor=pointer]
        - generic "Габон" [ref=e55] [cursor=pointer]
        - generic "Экваториальная Гвинея" [ref=e56] [cursor=pointer]
        - generic "Замбия" [ref=e57] [cursor=pointer]
        - generic "Малави" [ref=e58] [cursor=pointer]
        - generic "Мозамбик" [ref=e59] [cursor=pointer]
        - generic "Эсватини" [ref=e60] [cursor=pointer]
        - generic "Ангола" [ref=e61] [cursor=pointer]
        - generic "Бурунди" [ref=e62] [cursor=pointer]
        - generic "Израиль" [ref=e63] [cursor=pointer]
        - generic "Ливан" [ref=e64] [cursor=pointer]
        - generic "Мадагаскар" [ref=e65] [cursor=pointer]
        - generic "Палестина" [ref=e66] [cursor=pointer]
        - generic "Гамбия" [ref=e67] [cursor=pointer]
        - generic "Тунис" [ref=e68] [cursor=pointer]
        - generic "Алжир" [ref=e69] [cursor=pointer]
        - generic "Иордания" [ref=e70] [cursor=pointer]
        - generic "ОАЭ" [ref=e71] [cursor=pointer]
        - generic "Катар" [ref=e72] [cursor=pointer]
        - generic "Кувейт" [ref=e73] [cursor=pointer]
        - generic "Ирак" [ref=e74] [cursor=pointer]
        - generic "Оман" [ref=e75] [cursor=pointer]
        - generic "Камбоджа" [ref=e76] [cursor=pointer]
        - generic "Таиланд" [ref=e77] [cursor=pointer]
        - generic "Лаос" [ref=e78] [cursor=pointer]
        - generic "Мьянма (Бирма)" [ref=e79] [cursor=pointer]
        - generic "Вьетнам" [ref=e80] [cursor=pointer]
        - generic "КНДР" [ref=e81] [cursor=pointer]
        - generic "Республика Корея" [ref=e82] [cursor=pointer]
        - generic "Монголия" [ref=e83] [cursor=pointer]
        - generic "Индия" [ref=e84] [cursor=pointer]
        - generic "Бангладеш" [ref=e85] [cursor=pointer]
        - generic "Бутан" [ref=e86] [cursor=pointer]
        - generic "Непал" [ref=e87] [cursor=pointer]
        - generic "Пакистан" [ref=e88] [cursor=pointer]
        - generic "Афганистан" [ref=e89] [cursor=pointer]
        - generic "Таджикистан" [ref=e90] [cursor=pointer]
        - generic "Киргизия" [ref=e91] [cursor=pointer]
        - generic "Туркменистан" [ref=e92] [cursor=pointer]
        - generic "Иран" [ref=e93] [cursor=pointer]
        - generic "Сирия" [ref=e94] [cursor=pointer]
        - generic "Армения" [ref=e95] [cursor=pointer]
        - generic "Швеция" [ref=e96] [cursor=pointer]
        - generic "Беларусь" [ref=e97] [cursor=pointer]
        - generic "Украина" [ref=e98] [cursor=pointer]
        - generic "Польша" [ref=e99] [cursor=pointer]
        - generic "Австрия" [ref=e100] [cursor=pointer]
        - generic "Венгрия" [ref=e101] [cursor=pointer]
        - generic "Молдова" [ref=e102] [cursor=pointer]
        - generic "Румыния" [ref=e103] [cursor=pointer]
        - generic "Литва" [ref=e104] [cursor=pointer]
        - generic "Латвия" [ref=e105] [cursor=pointer]
        - generic "Эстония" [ref=e106] [cursor=pointer]
        - generic "Германия" [ref=e107] [cursor=pointer]
        - generic "Болгария" [ref=e108] [cursor=pointer]
        - generic "Греция" [ref=e109] [cursor=pointer]
        - generic "Турция" [ref=e110] [cursor=pointer]
        - generic "Албания" [ref=e111] [cursor=pointer]
        - generic "Хорватия" [ref=e112] [cursor=pointer]
        - generic "Швейцария" [ref=e113] [cursor=pointer]
        - generic "Люксембург" [ref=e114] [cursor=pointer]
        - generic "Бельгия" [ref=e115] [cursor=pointer]
        - generic "Нидерланды" [ref=e116] [cursor=pointer]
        - generic "Португалия" [ref=e117] [cursor=pointer]
        - generic "Испания" [ref=e118] [cursor=pointer]
        - generic "Ирландия" [ref=e119] [cursor=pointer]
        - generic "Шри-Ланка" [ref=e120] [cursor=pointer]
        - generic "Китай" [ref=e121] [cursor=pointer]
        - generic "Тайвань" [ref=e122] [cursor=pointer]
        - generic "Италия" [ref=e123] [cursor=pointer]
        - generic "Дания" [ref=e124] [cursor=pointer]
        - generic "Великобритания" [ref=e125] [cursor=pointer]
        - generic "Исландия" [ref=e126] [cursor=pointer]
        - generic "Азербайджан" [ref=e127] [cursor=pointer]
        - generic "Грузия" [ref=e128] [cursor=pointer]
        - generic "Филиппины" [ref=e129] [cursor=pointer]
        - generic "Малайзия" [ref=e130] [cursor=pointer]
        - generic "Бруней" [ref=e131] [cursor=pointer]
        - generic "Словения" [ref=e132] [cursor=pointer]
        - generic "Финляндия" [ref=e133] [cursor=pointer]
        - generic "Словакия" [ref=e134] [cursor=pointer]
        - generic "Чехия" [ref=e135] [cursor=pointer]
        - generic "Эритрея" [ref=e136] [cursor=pointer]
        - generic "Япония" [ref=e137] [cursor=pointer]
        - generic "Йемен" [ref=e138] [cursor=pointer]
        - generic "Саудовская Аравия" [ref=e139] [cursor=pointer]
        - generic "Кипр" [ref=e140] [cursor=pointer]
        - generic "Кипр" [ref=e141] [cursor=pointer]
        - generic "Марокко" [ref=e142] [cursor=pointer]
        - generic "Египет" [ref=e143] [cursor=pointer]
        - generic "Ливия" [ref=e144] [cursor=pointer]
        - generic "Эфиопия" [ref=e145] [cursor=pointer]
        - generic "Джибути" [ref=e146] [cursor=pointer]
        - generic "Сомали" [ref=e147] [cursor=pointer]
        - generic "Уганда" [ref=e148] [cursor=pointer]
        - generic "Руанда" [ref=e149] [cursor=pointer]
        - generic "Босния и Герцеговина" [ref=e150] [cursor=pointer]
        - generic "Северная Македония" [ref=e151] [cursor=pointer]
        - generic "Сербия" [ref=e152] [cursor=pointer]
        - generic "Черногория" [ref=e153] [cursor=pointer]
        - generic "Косово" [ref=e154] [cursor=pointer]
        - generic "Тринидад и Тобаго" [ref=e155] [cursor=pointer]
        - generic "Южный Судан" [ref=e156] [cursor=pointer]
      - generic:
        - generic:
          - generic: ТУРЦИЯ
        - generic:
          - generic: РОССИЯ
        - generic:
          - generic: КИТАЙ
        - generic:
          - generic: ИНДИЯ
        - generic:
          - generic: АЛЖИР
        - generic:
          - generic: КОНГО - КИНШАСА
        - generic:
          - generic: КАЗАХСТАН
        - generic:
          - generic: САУДОВСКАЯ АРАВИЯ
        - generic:
          - generic: СУДАН
        - generic:
          - generic: ЛИВИЯ
        - generic:
          - generic: ИРАН
        - generic:
          - generic: ЧАД
        - generic:
          - generic: КАНАДА
        - generic:
          - generic: ЭФИОПИЯ
        - generic:
          - generic: МАЛИ
        - generic:
          - generic: АНГОЛА
        - generic:
          - generic: БРАЗИЛИЯ
        - generic:
          - generic: НИГЕРИЯ
        - generic:
          - generic: ЮЖНО-АФРИКАНСКАЯ РЕСПУБЛИКА
        - generic:
          - generic: АРКТИЧЕСКИЙ ОСЕАН
        - generic:
          - generic: ИНДИЙСКИЙ ОКЕАН
        - generic:
          - generic: СЕВЕРОАТЛАНТИЧЕСКИЙ ОКЕАН
        - generic:
          - generic: ЮЖНЫЙ АТЛАНТИЧЕСКИЙ ОКЕАН
    - generic "Map camera controls" [ref=e157]:
      - button "Zoom out" [ref=e158] [cursor=pointer]: −
      - status "Map zoom level" [ref=e159]: 100%
      - button "Zoom in" [ref=e160] [cursor=pointer]: +
      - button "Возвращение в свою страну" [ref=e161] [cursor=pointer]:
        - img [ref=e162]
      - button "ВОЗВРАЩЕНИЕ" [ref=e166] [cursor=pointer]
  - generic:
    - generic [ref=e167]:
      - generic [ref=e168]:
        - button "Руководитель ⋯" [ref=e169] [cursor=pointer]:
          - img "Руководитель" [ref=e170]
          - generic [ref=e171]: ⋯
        - generic [ref=e172]:
          - generic [ref=e173]: Rule of Nations
          - generic [ref=e174]:
            - strong [ref=e175]: Browser playtest
            - generic [ref=e176]: ДЕНЬ 1
      - generic "Национальные командные показатели" [ref=e177]:
        - generic [ref=e178]:
          - img [ref=e181]
          - generic [ref=e182]:
            - generic [ref=e183]: КАЗНА
            - strong [ref=e184]: $143.0B
        - generic [ref=e185]:
          - img [ref=e188]
          - generic [ref=e189]:
            - generic [ref=e190]: ДНЕВНОЙ БЮДЖЕТ
            - strong [ref=e191]: +$0.167B
        - generic [ref=e192]:
          - img [ref=e195]
          - generic [ref=e196]:
            - generic [ref=e197]: ПОДДЕРЖКА
            - strong [ref=e198]: 56%
        - generic [ref=e199]:
          - img [ref=e202]
          - generic [ref=e203]:
            - generic [ref=e204]: СТАБИЛЬНОСТЬ
            - strong [ref=e205]: 67%
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic "Управление скоростью игры" [ref=e208]:
          - button "Ⅱ ПАУЗА" [pressed] [ref=e209] [cursor=pointer]:
            - strong [ref=e210]: Ⅱ
            - generic [ref=e211]: ПАУЗА
          - button "1× 15s/ДЕНЬ" [ref=e212] [cursor=pointer]:
            - strong [ref=e213]: 1×
            - generic [ref=e214]: 15s/ДЕНЬ
          - button "2× 7s/ДЕНЬ" [ref=e215] [cursor=pointer]:
            - strong [ref=e216]: 2×
            - generic [ref=e217]: 7s/ДЕНЬ
          - button "3× 3s/ДЕНЬ" [ref=e218] [cursor=pointer]:
            - strong [ref=e219]: 3×
            - generic [ref=e220]: 3s/ДЕНЬ
          - button "5× 1s/ДЕНЬ" [ref=e221] [cursor=pointer]:
            - strong [ref=e222]: 5×
            - generic [ref=e223]: 1s/ДЕНЬ
        - generic [ref=e224]:
          - generic [ref=e225]: ДАТА КАМПАНИИ
          - strong [ref=e226]: 2026-01-01
      - button "Открой свою страну" [pressed] [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: 🇹🇷
        - generic [ref=e229]:
          - strong [ref=e230]: Турция
          - generic [ref=e231]: демократия
          - emphasis [ref=e232]: Открой свою страну
  - complementary [ref=e233]:
    - generic [ref=e234]:
      - generic [ref=e235]: ГОСУДАРСТВО / КОМАНДОВАНИЕ
      - button "Близкая страновая группа" [active] [ref=e236] [cursor=pointer]: ×
    - combobox "Выберите страну" [ref=e237]:
      - option "Афганистан (AF)"
      - option "Албания (AL)"
      - option "Алжир (DZ)"
      - option "Андорра (AD)"
      - option "Ангола (AO)"
      - option "Антигуа и Барбуда (AG)"
      - option "Аргентина (AR)"
      - option "Армения (AM)"
      - option "Австралия (AU)"
      - option "Австрия (AT)"
      - option "Азербайджан (AZ)"
      - option "Багамы (BS)"
      - option "Бахрейн (BH)"
      - option "Бангладеш (BD)"
      - option "Барбадос (BB)"
      - option "Беларусь (BY)"
      - option "Бельгия (BE)"
      - option "Белиз (BZ)"
      - option "Бенин (BJ)"
      - option "Бутан (BT)"
      - option "Боливия (BO)"
      - option "Босния и Герцеговина (BA)"
      - option "Ботсвана (BW)"
      - option "Бразилия (BR)"
      - option "Бруней (BN)"
      - option "Болгария (BG)"
      - option "Буркина-Фасо (BF)"
      - option "Бурунди (BI)"
      - option "Кабо-Верде (CV)"
      - option "Камбоджа (KH)"
      - option "Камерун (CM)"
      - option "Канада (CA)"
      - option "Центрально-Африканская Республика (CF)"
      - option "Чад (TD)"
      - option "Чили (CL)"
      - option "Китай (CN)"
      - option "Колумбия (CO)"
      - option "Коморы (КМ)"
      - option "Конго - Браззавиль (CG)"
      - option "Коста-Рика (CR)"
      - option "Кот-д’Ивуар (CI)"
      - option "Хорватия (HR)"
      - option "Куба (CU)"
      - option "Чехия (CZ)"
      - option "Конго - Киншаса (CD)"
      - option "Дания (DK)"
      - option "Джибути (DJ)"
      - option "Доминика (DM)"
      - option "Доминиканская Республика (DO)"
      - option "Эквадор (EC)"
      - option "Египет (EG)"
      - option "Сальвадор (SV)"
      - option "Экваториальная Гвинея (GQ)"
      - option "Эритрея (ER)"
      - option "Эстония (EE)"
      - option "Эсватини (SZ)"
      - option "Эфиопия (ET)"
      - option "Фолклендские (Мальвинские) о-ва (FK)"
      - option "Фиджи (FJ)"
      - option "Финляндия (FI)"
      - option "Французские Южные территории (TF)"
      - option "Франция (FR)"
      - option "Габон (GA)"
      - option "Гамбия (GM)"
      - option "Грузия (GE)"
      - option "Германия (DE)"
      - option "Гана (GH)"
      - option "Греция (GR)"
      - option "Гренландия (GL)"
      - option "Гренада (GD)"
      - option "Гватемала (GT)"
      - option "Гвинея (GN)"
      - option "Гвинея-Бисау (GW)"
      - option "Гайана (GY)"
      - option "Гаити (HT)"
      - option "Ватикан (VA)"
      - option "Гондурас (HN)"
      - option "Венгрия (HU)"
      - option "Исландия (IS)"
      - option "Индия (IN)"
      - option "Индонезия (ID)"
      - option "Иран (IR)"
      - option "Ирак (IQ)"
      - option "Ирландия (IE)"
      - option "Израиль (IL)"
      - option "Италия (IT)"
      - option "Ямайка (JM)"
      - option "Япония (JP)"
      - option "Иордания (JO)"
      - option "Казахстан (KZ)"
      - option "Кения (KE)"
      - option "Кирибати (KI)"
      - option "Косово (XK)"
      - option "Кувейт (KW)"
      - option "Киргизия (KG)"
      - option "Лаос (LA)"
      - option "Латвия (LV)"
      - option "Ливан (LB)"
      - option "Лесото (LS)"
      - option "Либерия (LR)"
      - option "Ливия (LY)"
      - option "Лихтенштейн (LI)"
      - option "Литва (LT)"
      - option "Люксембург (LU)"
      - option "Мадагаскар (MG)"
      - option "Малави (MW)"
      - option "Малайзия (MY)"
      - option "Мальдивы (MV)"
      - option "Мали (ML)"
      - option "Мальта (MT)"
      - option "Маршалловы о-ва (MH)"
      - option "Мавритания (MR)"
      - option "Маврикий (MU)"
      - option "Мексика (MX)"
      - option "Федеративные Штаты Микронезии (FM)"
      - option "Молдова (MD)"
      - option "Монако (MC)"
      - option "Монголия (MN)"
      - option "Черногория (ME)"
      - option "Марокко (MA)"
      - option "Мозамбик (MZ)"
      - option "Мьянма (Бирма) (MM)"
      - option "Кипр (CY)"
      - option "Намибия (NA)"
      - option "Науру (NR)"
      - option "Непал (NP)"
      - option "Нидерланды (NL)"
      - option "Новая Каледония (NC)"
      - option "Новая Зеландия (NZ)"
      - option "Никарагуа (NI)"
      - option "Нигер (NE)"
      - option "Нигерия (NG)"
      - option "КНДР (KP)"
      - option "Северная Македония (MK)"
      - option "Норвегия (НЕТ)"
      - option "Оман (OM)"
      - option "Пакистан (PK)"
      - option "Палау (PW)"
      - option "Палестина (PS)"
      - option "Панама (PA)"
      - option "Папуа — Новая Гвинея (PG)"
      - option "Парагвай (PY)"
      - option "Перу (PE)"
      - option "Филиппины (PH)"
      - option "Польша (PL)"
      - option "Португалия (PT)"
      - option "Пуэрто-Рико (PR)"
      - option "Катар (QA)"
      - option "Румыния (RO)"
      - option "Россия (RU)"
      - option "Руанда (RW)"
      - option "Южный Судан (SS)"
      - option "Сент-Китс и Невис (KN)"
      - option "Сент-Люсия (LC)"
      - option "Сент-Винсент и Гренадины (VC)"
      - option "Самоа (WS)"
      - option "Сан-Марино (SM)"
      - option "Сан-Томе и Принсипи (ST)"
      - option "Саудовская Аравия (SA)"
      - option "Сенегал (SN)"
      - option "Сербия (RS)"
      - option "Сейшельские о-ва (SC)"
      - option "Сьерра-Леоне (SL)"
      - option "Сингапур (SG)"
      - option "Словакия (SK)"
      - option "Словения (SI)"
      - option "Соломоновы о-ва (SB)"
      - option "Сомали (SO)"
      - option "Южно-Африканская Республика (ZA)"
      - option "Республика Корея (KR)"
      - option "Испания (ES)"
      - option "Шри-Ланка (LK)"
      - option "Судан (SD)"
      - option "Суринам (SR)"
      - option "Швеция (SE)"
      - option "Швейцария (CH)"
      - option "Сирия (SY)"
      - option "Тайвань (TW)"
      - option "Таджикистан (TJ)"
      - option "Танзания (TZ)"
      - option "Таиланд (TH)"
      - option "Восточный Тимор (TL)"
      - option "Того (TG)"
      - option "Тонга (TO)"
      - option "Тринидад и Тобаго (TT)"
      - option "Тунис (TN)"
      - option "Турция (TR)" [selected]
      - option "Туркменистан (TM)"
      - option "Тувалу (TV)"
      - option "Уганда (UG)"
      - option "Украина (UA)"
      - option "ОАЭ (AE)"
      - option "Великобритания (GB)"
      - option "Соединенные Штаты (US)"
      - option "Уругвай (UY)"
      - option "Узбекистан (UZ)"
      - option "Вануату (VU)"
      - option "Венесуэла (VE)"
      - option "Вьетнам (VN)"
      - option "Западная Сахара (EH)"
      - option "Йемен (YE)"
      - option "Замбия (ZM)"
      - option "Зимбабве (ZW)"
    - generic [ref=e239]:
      - generic [ref=e240]: 🇹🇷
      - generic [ref=e241]:
        - heading "Турция" [level=1] [ref=e242]
        - paragraph [ref=e243]: Игровая нация · демократия · Азия
    - generic [ref=e244]:
      - generic [ref=e245]:
        - generic [ref=e246]: ☪
        - generic [ref=e247]:
          - generic [ref=e248]: РЕЛИГИЯ
          - strong [ref=e249]: ислам
      - generic [ref=e250]:
        - img "bloc" [ref=e251]:
          - img [ref=e252]
        - generic [ref=e253]:
          - generic [ref=e254]: ИДЕОЛОГИЯ
          - strong [ref=e255]: плюрализм
      - generic [ref=e256]:
        - img [ref=e258]
        - generic [ref=e259]:
          - generic [ref=e260]: Военный рейтинг
          - strong [ref=e261]: "GFP #9"
    - generic [ref=e262]:
      - button "ОБЗОР" [pressed] [ref=e263] [cursor=pointer]:
        - img [ref=e265]
        - generic [ref=e266]: ОБЗОР
      - button "Мощь" [ref=e267] [cursor=pointer]:
        - img [ref=e268]
        - generic [ref=e272]: Мощь
      - button "Управление снабжением" [ref=e273] [cursor=pointer]:
        - img [ref=e275]
        - generic [ref=e276]: Управление снабжением
    - generic [ref=e277]:
      - button "Управление" [ref=e278] [cursor=pointer]:
        - img [ref=e280]
        - generic [ref=e281]: Управление
      - button "ЭКОНОМИКА" [ref=e282] [cursor=pointer]:
        - img [ref=e284]
        - generic [ref=e285]: ЭКОНОМИКА
      - button "Политика" [ref=e286] [cursor=pointer]:
        - img [ref=e288]
        - generic [ref=e289]: Политика
      - button "trade Торговля" [ref=e290] [cursor=pointer]:
        - img "trade" [ref=e291]:
          - img [ref=e292]
        - generic [ref=e293]: Торговля
      - button "Производство" [ref=e294] [cursor=pointer]:
        - img [ref=e296]
        - generic [ref=e297]: Производство
      - button "ДИПЛОМАТИЯ" [ref=e298] [cursor=pointer]:
        - img [ref=e300]
        - generic [ref=e301]: ДИПЛОМАТИЯ
      - button "ВОЕННАЯ" [ref=e302] [cursor=pointer]:
        - img [ref=e304]
        - generic [ref=e305]: ВОЕННАЯ
      - button "Разведка" [ref=e306] [cursor=pointer]:
        - img [ref=e308]
        - generic [ref=e309]: Разведка
      - button "КАБИНЕТ" [ref=e310] [cursor=pointer]:
        - img [ref=e312]
        - generic [ref=e313]: КАБИНЕТ
    - generic [ref=e314]:
      - button "ТЕХНОЛОГИИ" [ref=e315] [cursor=pointer]:
        - img [ref=e317]
        - generic [ref=e318]: ТЕХНОЛОГИИ
      - button "МИР" [ref=e319] [cursor=pointer]:
        - img [ref=e321]
        - generic [ref=e322]: МИР
      - button "Готовность к войне" [ref=e323] [cursor=pointer]:
        - img [ref=e325]
        - generic [ref=e326]: Готовность к войне
    - generic [ref=e327]:
      - generic [ref=e328]:
        - generic [ref=e329]: ВВП
        - strong [ref=e330]: $1300.0B
      - generic [ref=e331]:
        - generic [ref=e332]: СОСТОЯНИЕ ЭКОНОМИКИ
        - strong [ref=e333]: 100%
      - generic [ref=e334]:
        - generic [ref=e335]: НАСЕЛЕНИЕ
        - strong [ref=e336]: 86.0M
      - generic [ref=e337]:
        - generic [ref=e338]: ВОЕННЫЙ ПОТЕНЦИАЛ
        - strong [ref=e339]: 81.5/100
      - generic [ref=e340]:
        - generic [ref=e341]: Производство продукции промышленности
        - strong [ref=e342]: "52.68"
      - generic [ref=e343]:
        - generic [ref=e344]: РЕСУРСНАЯ НАГРУЗКА
        - strong [ref=e345]: 71.2%
    - generic [ref=e346]:
      - generic [ref=e347]:
        - img "ТОПЛИВО" [ref=e348]:
          - img
        - generic [ref=e349]: ТОПЛИВО
        - strong [ref=e350]: "25.6"
      - generic [ref=e351]:
        - img "Сталь" [ref=e352]:
          - img
        - generic [ref=e353]: СТАЛЬ
        - strong [ref=e354]: "50.0"
      - generic [ref=e355]:
        - img "Электричество" [ref=e356]:
          - img
        - generic [ref=e357]: ЭНЕРГИЯ
        - strong [ref=e358]: "43.2"
      - generic [ref=e359]:
        - img [ref=e360]
        - generic [ref=e363]: R&D
        - strong [ref=e364]: "29.9"
    - generic [ref=e365]:
      - generic [ref=e366]:
        - generic [ref=e367]: Дневной бюджет
        - strong [ref=e368]: +0.183B
      - generic [ref=e369]:
        - generic [ref=e370]: Динамика ВВП
        - strong [ref=e371]: +0.0109%
      - generic [ref=e372]:
        - generic [ref=e373]: Еда/день
        - strong [ref=e374]: "+4.11"
      - generic [ref=e375]:
        - generic [ref=e376]: Масло/день
        - strong [ref=e377]: "-0.33"
      - generic [ref=e378]:
        - generic [ref=e379]: Железо / День
        - strong [ref=e380]: "+0.21"
      - generic [ref=e381]:
        - generic [ref=e382]: Инфляция
        - strong [ref=e383]: 5.50%
      - generic [ref=e384]:
        - generic [ref=e385]: СТАБИЛЬНОСТЬ
        - strong [ref=e386]: 67.2%
      - generic [ref=e387]:
        - generic [ref=e388]: Сплочённость
        - strong [ref=e389]: 71.2%
  - navigation "Мировые командные инструменты" [ref=e390]:
    - button "РЫНОК РЫНОК" [ref=e391] [cursor=pointer]:
      - img "РЫНОК" [ref=e393]:
        - img
      - generic [ref=e394]: РЫНОК
    - button "МИР МИР" [ref=e395] [cursor=pointer]:
      - img "МИР" [ref=e397]:
        - img
      - generic [ref=e398]: МИР
    - button "ТРЕВОГИ 1 СНАБЖЕНИЕ" [ref=e399] [cursor=pointer]:
      - img "ТРЕВОГИ" [ref=e401]:
        - img
      - generic [ref=e402]: "1"
      - generic [ref=e403]: СНАБЖЕНИЕ
  - navigation "Информационные инструменты" [ref=e404]:
    - button "objectives 0/6 ЦЕЛИ" [ref=e405] [cursor=pointer]:
      - img "objectives" [ref=e407]:
        - img
      - generic [ref=e408]: 0/6
      - generic [ref=e409]: ЦЕЛИ
    - button "ДИПЛОМАТИЯ ДИПЛОМАТИЯ" [ref=e410] [cursor=pointer]:
      - img "ДИПЛОМАТИЯ" [ref=e412]:
        - img
      - generic [ref=e413]: ДИПЛОМАТИЯ
    - button "ТРЕВОГИ 1 ТРЕВОГИ" [ref=e414] [cursor=pointer]:
      - img "ТРЕВОГИ" [ref=e416]:
        - img
      - generic [ref=e417]: "1"
      - generic [ref=e418]: ТРЕВОГИ
    - button "Разведка 2 НОВОСТИ" [ref=e419] [cursor=pointer]:
      - img "Разведка" [ref=e421]:
        - img
      - generic [ref=e422]: "2"
      - generic [ref=e423]: НОВОСТИ
  - navigation "Карта и вспомогательные инструменты" [ref=e424]:
    - button "КАРТА КАРТА" [ref=e425] [cursor=pointer]:
      - img "КАРТА" [ref=e427]:
        - img
      - generic [ref=e428]: КАРТА
    - button "ПОМОЩЬ ПОМОЩЬ" [ref=e429] [cursor=pointer]:
      - img "ПОМОЩЬ" [ref=e431]:
        - img
      - generic [ref=e432]: ПОМОЩЬ
  - generic [ref=e433]:
    - generic [ref=e434]: НОВОСТИ // Rule of Nations готов.
    - generic [ref=e435]:
      - generic [ref=e436]: ВСЕМИРНЫЙ КОМАНДНЫЙ КАНАЛ
      - generic [ref=e437]: Игрок · ПОЛИТИКА · ПОЛИТИКА · ГЛОБЕ
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