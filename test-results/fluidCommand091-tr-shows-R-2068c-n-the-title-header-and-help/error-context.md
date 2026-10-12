# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> tr shows Rule of Nations untranslated in the title, header and help
- Location: e2e/fluidCommand091.spec.ts:63:33

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-guide="rail-help"]')
    - locator resolved to <button class="rail-button" aria-pressed="false" data-guide="rail-help" title="YARDIM · Closed — click to open">…</button>
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
      - generic: küreyi sürükle · tekerlekle yakınlaştır · ülkeye tıkla
    - group "Interactive world map" [ref=e5]:
      - generic [ref=e8]:
        - generic "Tanzanya" [ref=e9] [cursor=pointer]
        - generic "Batı Sahra" [ref=e10] [cursor=pointer]
        - generic "Kanada" [ref=e11] [cursor=pointer]
        - generic "Amerika Birleşik Devletleri" [ref=e12] [cursor=pointer]
        - generic "Kazakistan" [ref=e13] [cursor=pointer]
        - generic "Özbekistan" [ref=e14] [cursor=pointer]
        - generic "Endonezya" [ref=e15] [cursor=pointer]
        - generic "Kongo - Kinşasa" [ref=e16] [cursor=pointer]
        - generic "Somali" [ref=e17] [cursor=pointer]
        - generic "Kenya" [ref=e18] [cursor=pointer]
        - generic "Sudan" [ref=e19] [cursor=pointer]
        - generic "Çad" [ref=e20] [cursor=pointer]
        - generic "Haiti" [ref=e21] [cursor=pointer]
        - generic "Dominik Cumhuriyeti" [ref=e22] [cursor=pointer]
        - generic "Rusya" [ref=e23] [cursor=pointer]
        - generic "Norveç" [ref=e24] [cursor=pointer]
        - generic "Grönland" [ref=e25] [cursor=pointer]
        - generic "Fransız Güney Toprakları" [ref=e26] [cursor=pointer]
        - generic "Güney Afrika" [ref=e27] [cursor=pointer]
        - generic "Lesotho" [ref=e28] [cursor=pointer]
        - generic "Brezilya" [ref=e29] [cursor=pointer]
        - generic "Venezuela" [ref=e30] [cursor=pointer]
        - generic "Guyana" [ref=e31] [cursor=pointer]
        - generic "Surinam" [ref=e32] [cursor=pointer]
        - generic "Fransa" [ref=e33] [cursor=pointer]
        - generic "Porto Riko" [ref=e34] [cursor=pointer]
        - generic "Zimbabve" [ref=e35] [cursor=pointer]
        - generic "Botsvana" [ref=e36] [cursor=pointer]
        - generic "Namibya" [ref=e37] [cursor=pointer]
        - generic "Senegal" [ref=e38] [cursor=pointer]
        - generic "Mali" [ref=e39] [cursor=pointer]
        - generic "Moritanya" [ref=e40] [cursor=pointer]
        - generic "Benin" [ref=e41] [cursor=pointer]
        - generic "Nijer" [ref=e42] [cursor=pointer]
        - generic "Nijerya" [ref=e43] [cursor=pointer]
        - generic "Kamerun" [ref=e44] [cursor=pointer]
        - generic "Togo" [ref=e45] [cursor=pointer]
        - generic "Gana" [ref=e46] [cursor=pointer]
        - generic "Côte d’Ivoire" [ref=e47] [cursor=pointer]
        - generic "Gine" [ref=e48] [cursor=pointer]
        - generic "Gine-Bissau" [ref=e49] [cursor=pointer]
        - generic "Liberya" [ref=e50] [cursor=pointer]
        - generic "Sierra Leone" [ref=e51] [cursor=pointer]
        - generic "Burkina Faso" [ref=e52] [cursor=pointer]
        - generic "Orta Afrika Cumhuriyeti" [ref=e53] [cursor=pointer]
        - generic "Kongo - Brazavil" [ref=e54] [cursor=pointer]
        - generic "Gabon" [ref=e55] [cursor=pointer]
        - generic "Ekvator Ginesi" [ref=e56] [cursor=pointer]
        - generic "Zambiya" [ref=e57] [cursor=pointer]
        - generic "Malavi" [ref=e58] [cursor=pointer]
        - generic "Mozambik" [ref=e59] [cursor=pointer]
        - generic "Esvatini" [ref=e60] [cursor=pointer]
        - generic "Angola" [ref=e61] [cursor=pointer]
        - generic "Burundi" [ref=e62] [cursor=pointer]
        - generic "İsrail" [ref=e63] [cursor=pointer]
        - generic "Lübnan" [ref=e64] [cursor=pointer]
        - generic "Madagaskar" [ref=e65] [cursor=pointer]
        - generic "Filistin" [ref=e66] [cursor=pointer]
        - generic "Gambiya" [ref=e67] [cursor=pointer]
        - generic "Tunus" [ref=e68] [cursor=pointer]
        - generic "Cezayir" [ref=e69] [cursor=pointer]
        - generic "Ürdün" [ref=e70] [cursor=pointer]
        - generic "Birleşik Arap Emirlikleri" [ref=e71] [cursor=pointer]
        - generic "Katar" [ref=e72] [cursor=pointer]
        - generic "Kuveyt" [ref=e73] [cursor=pointer]
        - generic "Irak" [ref=e74] [cursor=pointer]
        - generic "Umman" [ref=e75] [cursor=pointer]
        - generic "Kamboçya" [ref=e76] [cursor=pointer]
        - generic "Tayland" [ref=e77] [cursor=pointer]
        - generic "Laos" [ref=e78] [cursor=pointer]
        - generic "Myanmar (Burma)" [ref=e79] [cursor=pointer]
        - generic "Vietnam" [ref=e80] [cursor=pointer]
        - generic "Kuzey Kore" [ref=e81] [cursor=pointer]
        - generic "Güney Kore" [ref=e82] [cursor=pointer]
        - generic "Moğolistan" [ref=e83] [cursor=pointer]
        - generic "Hindistan" [ref=e84] [cursor=pointer]
        - generic "Bangladeş" [ref=e85] [cursor=pointer]
        - generic "Butan" [ref=e86] [cursor=pointer]
        - generic "Nepal" [ref=e87] [cursor=pointer]
        - generic "Pakistan" [ref=e88] [cursor=pointer]
        - generic "Afganistan" [ref=e89] [cursor=pointer]
        - generic "Tacikistan" [ref=e90] [cursor=pointer]
        - generic "Kırgızistan" [ref=e91] [cursor=pointer]
        - generic "Türkmenistan" [ref=e92] [cursor=pointer]
        - generic "İran" [ref=e93] [cursor=pointer]
        - generic "Suriye" [ref=e94] [cursor=pointer]
        - generic "Ermenistan" [ref=e95] [cursor=pointer]
        - generic "İsveç" [ref=e96] [cursor=pointer]
        - generic "Belarus" [ref=e97] [cursor=pointer]
        - generic "Ukrayna" [ref=e98] [cursor=pointer]
        - generic "Polonya" [ref=e99] [cursor=pointer]
        - generic "Avusturya" [ref=e100] [cursor=pointer]
        - generic "Macaristan" [ref=e101] [cursor=pointer]
        - generic "Moldova" [ref=e102] [cursor=pointer]
        - generic "Romanya" [ref=e103] [cursor=pointer]
        - generic "Litvanya" [ref=e104] [cursor=pointer]
        - generic "Letonya" [ref=e105] [cursor=pointer]
        - generic "Estonya" [ref=e106] [cursor=pointer]
        - generic "Almanya" [ref=e107] [cursor=pointer]
        - generic "Bulgaristan" [ref=e108] [cursor=pointer]
        - generic "Yunanistan" [ref=e109] [cursor=pointer]
        - generic "Türkiye" [ref=e110] [cursor=pointer]
        - generic "Arnavutluk" [ref=e111] [cursor=pointer]
        - generic "Hırvatistan" [ref=e112] [cursor=pointer]
        - generic "İsviçre" [ref=e113] [cursor=pointer]
        - generic "Lüksemburg" [ref=e114] [cursor=pointer]
        - generic "Belçika" [ref=e115] [cursor=pointer]
        - generic "Hollanda" [ref=e116] [cursor=pointer]
        - generic "Portekiz" [ref=e117] [cursor=pointer]
        - generic "İspanya" [ref=e118] [cursor=pointer]
        - generic "İrlanda" [ref=e119] [cursor=pointer]
        - generic "Sri Lanka" [ref=e120] [cursor=pointer]
        - generic "Çin" [ref=e121] [cursor=pointer]
        - generic "Tayvan" [ref=e122] [cursor=pointer]
        - generic "İtalya" [ref=e123] [cursor=pointer]
        - generic "Danimarka" [ref=e124] [cursor=pointer]
        - generic "Birleşik Krallık" [ref=e125] [cursor=pointer]
        - generic "İzlanda" [ref=e126] [cursor=pointer]
        - generic "Azerbaycan" [ref=e127] [cursor=pointer]
        - generic "Gürcistan" [ref=e128] [cursor=pointer]
        - generic "Filipinler" [ref=e129] [cursor=pointer]
        - generic "Malezya" [ref=e130] [cursor=pointer]
        - generic "Brunei" [ref=e131] [cursor=pointer]
        - generic "Slovenya" [ref=e132] [cursor=pointer]
        - generic "Finlandiya" [ref=e133] [cursor=pointer]
        - generic "Slovakya" [ref=e134] [cursor=pointer]
        - generic "Çekya" [ref=e135] [cursor=pointer]
        - generic "Eritre" [ref=e136] [cursor=pointer]
        - generic "Japonya" [ref=e137] [cursor=pointer]
        - generic "Yemen" [ref=e138] [cursor=pointer]
        - generic "Suudi Arabistan" [ref=e139] [cursor=pointer]
        - generic "Kıbrıs" [ref=e140] [cursor=pointer]
        - generic "Kıbrıs" [ref=e141] [cursor=pointer]
        - generic "Fas" [ref=e142] [cursor=pointer]
        - generic "Mısır" [ref=e143] [cursor=pointer]
        - generic "Libya" [ref=e144] [cursor=pointer]
        - generic "Etiyopya" [ref=e145] [cursor=pointer]
        - generic "Cibuti" [ref=e146] [cursor=pointer]
        - generic "Somali" [ref=e147] [cursor=pointer]
        - generic "Uganda" [ref=e148] [cursor=pointer]
        - generic "Ruanda" [ref=e149] [cursor=pointer]
        - generic "Bosna-Hersek" [ref=e150] [cursor=pointer]
        - generic "Kuzey Makedonya" [ref=e151] [cursor=pointer]
        - generic "Sırbistan" [ref=e152] [cursor=pointer]
        - generic "Karadağ" [ref=e153] [cursor=pointer]
        - generic "Kosova" [ref=e154] [cursor=pointer]
        - generic "Trinidad ve Tobago" [ref=e155] [cursor=pointer]
        - generic "Güney Sudan" [ref=e156] [cursor=pointer]
      - generic:
        - generic:
          - generic: TÜRKİYE
        - generic:
          - generic: RUSYA
        - generic:
          - generic: ÇIN
        - generic:
          - generic: HINDISTAN
        - generic:
          - generic: CEZAYIR
        - generic:
          - generic: KONGO - KINŞASA
        - generic:
          - generic: KAZAKISTAN
        - generic:
          - generic: SUUDI ARABISTAN
        - generic:
          - generic: SUDAN
        - generic:
          - generic: LİBYA
        - generic:
          - generic: İRAN
        - generic:
          - generic: ÇAD
        - generic:
          - generic: KANADA
        - generic:
          - generic: ETIYOPYA
        - generic:
          - generic: MALİ
        - generic:
          - generic: ANGOLA
        - generic:
          - generic: BREZILYA
        - generic:
          - generic: NIJERYA
        - generic:
          - generic: GÜNEY AFRIKA
        - generic:
          - generic: ARKTİK OKYANUSU
        - generic:
          - generic: HİNT OKYANUSU
        - generic:
          - generic: KUZEY ATLANTİK OKYANUSU
        - generic:
          - generic: GÜNEY ATLANTİK OKYANUSU
    - generic "Map camera controls" [ref=e157]:
      - button "Zoom out" [ref=e158] [cursor=pointer]: −
      - status "Map zoom level" [ref=e159]: 100%
      - button "Zoom in" [ref=e160] [cursor=pointer]: +
      - button "Ülkene dön" [ref=e161] [cursor=pointer]:
        - img [ref=e162]
      - button "SIFIRLA" [ref=e166] [cursor=pointer]
  - generic:
    - generic [ref=e167]:
      - generic [ref=e168]:
        - button "Yönetici ⋯" [ref=e169] [cursor=pointer]:
          - img "Yönetici" [ref=e170]
          - generic [ref=e171]: ⋯
        - generic [ref=e172]:
          - generic [ref=e173]: Rule of Nations
          - generic [ref=e174]:
            - strong [ref=e175]: Browser playtest
            - generic [ref=e176]: GÜN 1
      - generic "Ulusal komut göstergeleri" [ref=e177]:
        - generic [ref=e178]:
          - img [ref=e181]
          - generic [ref=e182]:
            - generic [ref=e183]: HAZİNE
            - strong [ref=e184]: $143.0B
        - generic [ref=e185]:
          - img [ref=e188]
          - generic [ref=e189]:
            - generic [ref=e190]: GÜNLÜK BÜTÇE
            - strong [ref=e191]: +$0.167B
        - generic [ref=e192]:
          - img [ref=e195]
          - generic [ref=e196]:
            - generic [ref=e197]: ONAY
            - strong [ref=e198]: 56%
        - generic [ref=e199]:
          - img [ref=e202]
          - generic [ref=e203]:
            - generic [ref=e204]: İSTİKRAR
            - strong [ref=e205]: 67%
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic "Oyun hızı kontrolleri" [ref=e208]:
          - button "Ⅱ DURAKLAT" [pressed] [ref=e209] [cursor=pointer]:
            - strong [ref=e210]: Ⅱ
            - generic [ref=e211]: DURAKLAT
          - button "1× 15s/GÜN" [ref=e212] [cursor=pointer]:
            - strong [ref=e213]: 1×
            - generic [ref=e214]: 15s/GÜN
          - button "2× 7s/GÜN" [ref=e215] [cursor=pointer]:
            - strong [ref=e216]: 2×
            - generic [ref=e217]: 7s/GÜN
          - button "3× 3s/GÜN" [ref=e218] [cursor=pointer]:
            - strong [ref=e219]: 3×
            - generic [ref=e220]: 3s/GÜN
          - button "5× 1s/GÜN" [ref=e221] [cursor=pointer]:
            - strong [ref=e222]: 5×
            - generic [ref=e223]: 1s/GÜN
        - generic [ref=e224]:
          - generic [ref=e225]: OYUN TARİHİ
          - strong [ref=e226]: 2026-01-01
      - button "Ülkenin yönetimini aç" [pressed] [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: 🇹🇷
        - generic [ref=e229]:
          - strong [ref=e230]: Türkiye
          - generic [ref=e231]: demokrasi
          - emphasis [ref=e232]: Ülkenin yönetimini aç
  - complementary [ref=e233]:
    - generic [ref=e234]:
      - generic [ref=e235]: DEVLET / ULUSAL KOMUTA
      - button "Yakın ülke paneli" [active] [ref=e236] [cursor=pointer]: ×
    - combobox "Ülke Seç" [ref=e237]:
      - option "Afganistan (AF)"
      - option "Arnavutluk (AL)"
      - option "Cezayir (DZ)"
      - option "Andorra (AD)"
      - option "Angola (AO)"
      - option "Antigua ve Barbuda (AG)"
      - option "Arjantin (AR)"
      - option "Ermenistan (AM)"
      - option "Avustralya (AU)"
      - option "Avusturya (AT)"
      - option "Azerbaycan (AZ)"
      - option "Bahamalar (BS)"
      - option "Bahreyn (BH)"
      - option "Bangladeş (BD)"
      - option "Barbados (BB)"
      - option "Belarus (BY)"
      - option "Belçika (BE)"
      - option "Belize (BZ)"
      - option "Benin (BJ)"
      - option "Butan (BT)"
      - option "Bolivya (BO)"
      - option "Bosna-Hersek (BA)"
      - option "Botsvana (BW)"
      - option "Brezilya (BR)"
      - option "Brunei (BN)"
      - option "Bulgaristan (BG)"
      - option "Burkina Faso (BF)"
      - option "Burundi (BI)"
      - option "Cabo Verde (CV)"
      - option "Kamboçya (KH)"
      - option "Kamerun (CM)"
      - option "Kanada (CA)"
      - option "Orta Afrika Cumhuriyeti (CF)"
      - option "Çad (TD)"
      - option "Şili (CL)"
      - option "Çin (CN)"
      - option "Kolombiya (CO)"
      - option "Komorlar (KM)"
      - option "Kongo - Brazavil (CG)"
      - option "Kosta Rika (CR)"
      - option "Côte d’Ivoire (CI)"
      - option "Hırvatistan (HR)"
      - option "Küba (CU)"
      - option "Çekya (CZ)"
      - option "Kongo - Kinşasa (CD)"
      - option "Danimarka (DK)"
      - option "Cibuti (DJ)"
      - option "Dominika (DM)"
      - option "Dominik Cumhuriyeti (DO)"
      - option "Ekvador (EC)"
      - option "Mısır (EG)"
      - option "El Salvador (SV)"
      - option "Ekvator Ginesi (GQ)"
      - option "Eritre (ER)"
      - option "Estonya (EE)"
      - option "Esvatini (SZ)"
      - option "Etiyopya (ET)"
      - option "Falkland Adaları (Malvinas Adaları) (FK)"
      - option "Fiji (FJ)"
      - option "Finlandiya (FI)"
      - option "Fransız Güney Toprakları (TF)"
      - option "Fransa (FR)"
      - option "Gabon (GA)"
      - option "Gambiya (GM)"
      - option "Gürcistan (GE)"
      - option "Almanya (DE)"
      - option "Gana (GH)"
      - option "Yunanistan (GR)"
      - option "Grönland (GL)"
      - option "Grenada (GD)"
      - option "Guatemala (GT)"
      - option "Gine (GN)"
      - option "Gine-Bissau (GW)"
      - option "Guyana (GY)"
      - option "Haiti (HT)"
      - option "Vatikan (VA)"
      - option "Honduras (HN)"
      - option "Macaristan (HU)"
      - option "İzlanda (IS)"
      - option "Hindistan (IN)"
      - option "Endonezya (ID)"
      - option "İran (IR)"
      - option "Irak (IQ)"
      - option "İrlanda (IE)"
      - option "İsrail (IL)"
      - option "İtalya (IT)"
      - option "Jamaika (JM)"
      - option "Japonya (JP)"
      - option "Ürdün (JO)"
      - option "Kazakistan (KZ)"
      - option "Kenya (KE)"
      - option "Kiribati (KI)"
      - option "Kosova (XK)"
      - option "Kuveyt (KW)"
      - option "Kırgızistan (KG)"
      - option "Laos (LA)"
      - option "Letonya (LV)"
      - option "Lübnan (LB)"
      - option "Lesotho (LS)"
      - option "Liberya (LR)"
      - option "Libya (LY)"
      - option "Liechtenstein (LI)"
      - option "Litvanya (LT)"
      - option "Lüksemburg (LU)"
      - option "Madagaskar (MG)"
      - option "Malavi (MW)"
      - option "Malezya (MY)"
      - option "Maldivler (MV)"
      - option "Mali (ML)"
      - option "Malta (MT)"
      - option "Marshall Adaları (MH)"
      - option "Moritanya (MR)"
      - option "Mauritius (MU)"
      - option "Meksika (MX)"
      - option "Mikronezya (FM)"
      - option "Moldova (MD)"
      - option "Monako (MC)"
      - option "Moğolistan (MN)"
      - option "Karadağ (ME)"
      - option "Fas (MA)"
      - option "Mozambik (MZ)"
      - option "Myanmar (Burma) (MM)"
      - option "Kıbrıs (CY)"
      - option "Namibya (NA)"
      - option "Nauru (NR)"
      - option "Nepal (NP)"
      - option "Hollanda (NL)"
      - option "Yeni Kaledonya (NC)"
      - option "Yeni Zelanda (NZ)"
      - option "Nikaragua (NI)"
      - option "Nijer (NE)"
      - option "Nijerya (NG)"
      - option "Kuzey Kore (KP)"
      - option "Kuzey Makedonya (MK)"
      - option "Norveç (HAYIR)"
      - option "Umman (OM)"
      - option "Pakistan (PK)"
      - option "Palau (PW)"
      - option "Filistin (PS)"
      - option "Panama (PA)"
      - option "Papua Yeni Gine (PG)"
      - option "Paraguay (PY)"
      - option "Peru (PE)"
      - option "Filipinler (PH)"
      - option "Polonya (PL)"
      - option "Portekiz (PT)"
      - option "Porto Riko (PR)"
      - option "Katar (QA)"
      - option "Romanya (RO)"
      - option "Rusya (RU)"
      - option "Ruanda (RW)"
      - option "Güney Sudan (SS)"
      - option "Saint Kitts ve Nevis (KN)"
      - option "Saint Lucia (LC)"
      - option "Saint Vincent ve Grenadinler (VC)"
      - option "Samoa (WS)"
      - option "San Marino (SM)"
      - option "Sao Tome ve Principe (ST)"
      - option "Suudi Arabistan (SA)"
      - option "Senegal (SN)"
      - option "Sırbistan (RS)"
      - option "Seyşeller (SC)"
      - option "Sierra Leone (SL)"
      - option "Singapur (SG)"
      - option "Slovakya (SK)"
      - option "Slovenya (SI)"
      - option "Solomon Adaları (SB)"
      - option "Somali (SO)"
      - option "Güney Afrika (ZA)"
      - option "Güney Kore (KR)"
      - option "İspanya (ES)"
      - option "Sri Lanka (LK)"
      - option "Sudan (SD)"
      - option "Surinam (SR)"
      - option "İsveç (SE)"
      - option "İsviçre (CH)"
      - option "Suriye (SY)"
      - option "Tayvan (TW)"
      - option "Tacikistan (TJ)"
      - option "Tanzanya (TZ)"
      - option "Tayland (TH)"
      - option "Timor-Leste (TL)"
      - option "Togo (TG)"
      - option "Tonga (TO)"
      - option "Trinidad ve Tobago (TT)"
      - option "Tunus (TN)"
      - option "Türkiye (TR)" [selected]
      - option "Türkmenistan (TM)"
      - option "Tuvalu (TV)"
      - option "Uganda (UG)"
      - option "Ukrayna (UA)"
      - option "Birleşik Arap Emirlikleri (AE)"
      - option "Birleşik Krallık (GB)"
      - option "Amerika Birleşik Devletleri (US)"
      - option "Uruguay (UY)"
      - option "Özbekistan (UZ)"
      - option "Vanuatu (VU)"
      - option "Venezuela (VE)"
      - option "Vietnam (VN)"
      - option "Batı Sahra (EH)"
      - option "Yemen (YE)"
      - option "Zambiya (ZM)"
      - option "Zimbabve (ZW)"
    - generic [ref=e239]:
      - generic [ref=e240]: 🇹🇷
      - generic [ref=e241]:
        - heading "Türkiye" [level=1] [ref=e242]
        - paragraph [ref=e243]: Oyuncunun ülkesi · demokrasi · Asya
    - generic [ref=e244]:
      - generic [ref=e245]:
        - generic [ref=e246]: ☪
        - generic [ref=e247]:
          - generic [ref=e248]: DİN
          - strong [ref=e249]: İslam
      - generic [ref=e250]:
        - img "bloc" [ref=e251]:
          - img [ref=e252]
        - generic [ref=e253]:
          - generic [ref=e254]: İDEOLOJİ
          - strong [ref=e255]: çoğulcu
      - generic [ref=e256]:
        - img [ref=e258]
        - generic [ref=e259]:
          - generic [ref=e260]: Askerî sıra
          - strong [ref=e261]: "GFP #9"
    - generic [ref=e262]:
      - button "GENEL" [pressed] [ref=e263] [cursor=pointer]:
        - img [ref=e265]
        - generic [ref=e266]: GENEL
      - button "Güç" [ref=e267] [cursor=pointer]:
        - img [ref=e268]
        - generic [ref=e272]: Güç
      - button "Tedarik komutanlığı" [ref=e273] [cursor=pointer]:
        - img [ref=e275]
        - generic [ref=e276]: Tedarik komutanlığı
    - generic [ref=e277]:
      - button "Yönetim" [ref=e278] [cursor=pointer]:
        - img [ref=e280]
        - generic [ref=e281]: Yönetim
      - button "EKONOMİ" [ref=e282] [cursor=pointer]:
        - img [ref=e284]
        - generic [ref=e285]: EKONOMİ
      - button "Politikalar" [ref=e286] [cursor=pointer]:
        - img [ref=e288]
        - generic [ref=e289]: Politikalar
      - button "trade Ticaret" [ref=e290] [cursor=pointer]:
        - img "trade" [ref=e291]:
          - img [ref=e292]
        - generic [ref=e293]: Ticaret
      - button "Üretim" [ref=e294] [cursor=pointer]:
        - img [ref=e296]
        - generic [ref=e297]: Üretim
      - button "DİPLOMASİ" [ref=e298] [cursor=pointer]:
        - img [ref=e300]
        - generic [ref=e301]: DİPLOMASİ
      - button "ASKERİ" [ref=e302] [cursor=pointer]:
        - img [ref=e304]
        - generic [ref=e305]: ASKERİ
      - button "İstihbarat" [ref=e306] [cursor=pointer]:
        - img [ref=e308]
        - generic [ref=e309]: İstihbarat
      - button "KABİNE" [ref=e310] [cursor=pointer]:
        - img [ref=e312]
        - generic [ref=e313]: KABİNE
    - generic [ref=e314]:
      - button "TEKNOLOJİ" [ref=e315] [cursor=pointer]:
        - img [ref=e317]
        - generic [ref=e318]: TEKNOLOJİ
      - button "DÜNYA" [ref=e319] [cursor=pointer]:
        - img [ref=e321]
        - generic [ref=e322]: DÜNYA
      - button "Savaşa hazırlık" [ref=e323] [cursor=pointer]:
        - img [ref=e325]
        - generic [ref=e326]: Savaşa hazırlık
    - generic [ref=e327]:
      - generic [ref=e328]:
        - generic [ref=e329]: GSYİH
        - strong [ref=e330]: $1300.0B
      - generic [ref=e331]:
        - generic [ref=e332]: EKONOMİK SAĞLIK
        - strong [ref=e333]: 100%
      - generic [ref=e334]:
        - generic [ref=e335]: Nüfus
        - strong [ref=e336]: 86.0M
      - generic [ref=e337]:
        - generic [ref=e338]: ASKERÎ KAPASİTE
        - strong [ref=e339]: 81.5/100
      - generic [ref=e340]:
        - generic [ref=e341]: Sanayi üretimi
        - strong [ref=e342]: "52.68"
      - generic [ref=e343]:
        - generic [ref=e344]: KAYNAK BASKISI
        - strong [ref=e345]: 71.2%
    - generic [ref=e346]:
      - generic [ref=e347]:
        - img "YAKIT" [ref=e348]:
          - img
        - generic [ref=e349]: YAKIT
        - strong [ref=e350]: "25.6"
      - generic [ref=e351]:
        - img "ÇELİK" [ref=e352]:
          - img
        - generic [ref=e353]: ÇELİK
        - strong [ref=e354]: "50.0"
      - generic [ref=e355]:
        - img "Elektrik" [ref=e356]:
          - img
        - generic [ref=e357]: ELEKTRİK
        - strong [ref=e358]: "43.2"
      - generic [ref=e359]:
        - img [ref=e360]
        - generic [ref=e363]: R&D
        - strong [ref=e364]: "29.9"
    - generic [ref=e365]:
      - generic [ref=e366]:
        - generic [ref=e367]: Günlük bütçe
        - strong [ref=e368]: +0.183B
      - generic [ref=e369]:
        - generic [ref=e370]: GSYİH eğilimi
        - strong [ref=e371]: +0.0109%
      - generic [ref=e372]:
        - generic [ref=e373]: Günlük gıda
        - strong [ref=e374]: "+4.11"
      - generic [ref=e375]:
        - generic [ref=e376]: Günlük petrol
        - strong [ref=e377]: "-0.33"
      - generic [ref=e378]:
        - generic [ref=e379]: Günlük demir
        - strong [ref=e380]: "+0.21"
      - generic [ref=e381]:
        - generic [ref=e382]: Enflasyon
        - strong [ref=e383]: 5.50%
      - generic [ref=e384]:
        - generic [ref=e385]: İSTİKRAR
        - strong [ref=e386]: 67.2%
      - generic [ref=e387]:
        - generic [ref=e388]: Uyum
        - strong [ref=e389]: 71.2%
  - navigation "Dünya komuta araçları" [ref=e390]:
    - button "PAZAR PAZAR" [ref=e391] [cursor=pointer]:
      - img "PAZAR" [ref=e393]:
        - img
      - generic [ref=e394]: PAZAR
    - button "DÜNYA DÜNYA" [ref=e395] [cursor=pointer]:
      - img "DÜNYA" [ref=e397]:
        - img
      - generic [ref=e398]: DÜNYA
    - button "UYARILAR 1 TEDARİK" [ref=e399] [cursor=pointer]:
      - img "UYARILAR" [ref=e401]:
        - img
      - generic [ref=e402]: "1"
      - generic [ref=e403]: TEDARİK
  - navigation "Bilgi araçları" [ref=e404]:
    - button "objectives 0/6 HEDEFLER" [ref=e405] [cursor=pointer]:
      - img "objectives" [ref=e407]:
        - img
      - generic [ref=e408]: 0/6
      - generic [ref=e409]: HEDEFLER
    - button "DİPLOMASİ DİPLOMASİ" [ref=e410] [cursor=pointer]:
      - img "DİPLOMASİ" [ref=e412]:
        - img
      - generic [ref=e413]: DİPLOMASİ
    - button "UYARILAR 1 UYARILAR" [ref=e414] [cursor=pointer]:
      - img "UYARILAR" [ref=e416]:
        - img
      - generic [ref=e417]: "1"
      - generic [ref=e418]: UYARILAR
    - button "İstihbarat 2 HABERLER" [ref=e419] [cursor=pointer]:
      - img "İstihbarat" [ref=e421]:
        - img
      - generic [ref=e422]: "2"
      - generic [ref=e423]: HABERLER
  - navigation "Harita ve yardım araçları" [ref=e424]:
    - button "HARİTA HARİTA" [ref=e425] [cursor=pointer]:
      - img "HARİTA" [ref=e427]:
        - img
      - generic [ref=e428]: HARİTA
    - button "YARDIM YARDIM" [ref=e429] [cursor=pointer]:
      - img "YARDIM" [ref=e431]:
        - img
      - generic [ref=e432]: YARDIM
  - generic [ref=e433]:
    - generic [ref=e434]: HABERLER // Rule of Nations hazır.
    - generic [ref=e435]:
      - generic [ref=e436]: DÜNYA GÜNDEMİ
      - generic [ref=e437]: OYUNCU · SİYASİ · SİYASİ · KÜRE
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