# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> entry and setup screens carry the Rule of Nations mark over the cover art
- Location: e2e/fluidCommand091.spec.ts:71:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.wizard-header small')
Expected substring: "Rule of Nations"
Error: strict mode violation: locator('.wizard-header small') resolved to 5 elements:
    1) <small>…</small> aka getByText('Rule of Nations0.90.0-')
    2) <small>IDENTITY</small> aka getByText('IDENTITY', { exact: true })
    3) <small>PORTRAIT</small> aka getByText('PORTRAIT')
    4) <small>NATION</small> aka getByText('NATION', { exact: true })
    5) <small>CONFIRM</small> aka getByText('CONFIRM')

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.wizard-header small')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: RON
        - strong [ref=e8]: Rule of Nations
      - generic [ref=e9]: Be the president you have always dreamed of.
      - generic [ref=e10]: 0.90.0-playtest.9
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: Rule of Nations
          - generic [ref=e14]: 0.90.0-playtest.9
        - heading "Your identity" [level=1] [ref=e15]
        - paragraph [ref=e16]: Create your leader and choose a country.
      - generic [ref=e17]:
        - generic [ref=e19]: "1"
        - generic [ref=e21]: "2"
        - generic [ref=e23]: "3"
        - generic [ref=e25]: "4"
    - generic [ref=e27]:
      - generic [ref=e28]:
        - text: STEP 01 / LEADER IDENTITY
        - heading "Every era begins with a leader." [level=2] [ref=e29]
        - paragraph [ref=e30]: Choose the name that will appear in national briefings, diplomatic reports and your command profile.
      - generic [ref=e31]:
        - generic [ref=e32]: Commander name
        - textbox "Commander name" [active] [ref=e33]:
          - /placeholder: Commander
      - generic [ref=e34]:
        - generic [ref=e35]:
          - generic [ref=e36]: CITIZENSHIP
          - combobox "Citizenship" [ref=e37]:
            - option "Afghanistan"
            - option "Albania"
            - option "Algeria"
            - option "Andorra"
            - option "Angola"
            - option "Antigua and Barbuda"
            - option "Argentina"
            - option "Armenia"
            - option "Australia"
            - option "Austria"
            - option "Azerbaijan"
            - option "Bahamas"
            - option "Bahrain"
            - option "Bangladesh"
            - option "Barbados"
            - option "Belarus"
            - option "Belgium"
            - option "Belize"
            - option "Benin"
            - option "Bhutan"
            - option "Bolivia"
            - option "Bosnia and Herz."
            - option "Botswana"
            - option "Brazil"
            - option "Brunei"
            - option "Bulgaria"
            - option "Burkina Faso"
            - option "Burundi"
            - option "Cabo Verde"
            - option "Cambodia"
            - option "Cameroon"
            - option "Canada"
            - option "Central African Rep."
            - option "Chad"
            - option "Chile"
            - option "China"
            - option "Colombia"
            - option "Comoros"
            - option "Congo"
            - option "Costa Rica"
            - option "Côte d'Ivoire"
            - option "Croatia"
            - option "Cuba"
            - option "Czechia"
            - option "Dem. Rep. Congo"
            - option "Denmark"
            - option "Djibouti"
            - option "Dominica"
            - option "Dominican Rep."
            - option "Ecuador"
            - option "Egypt"
            - option "El Salvador"
            - option "Eq. Guinea"
            - option "Eritrea"
            - option "Estonia"
            - option "Eswatini"
            - option "Ethiopia"
            - option "Falkland Is."
            - option "Fiji"
            - option "Finland"
            - option "Fr. S. Antarctic Lands"
            - option "France"
            - option "Gabon"
            - option "Gambia"
            - option "Georgia"
            - option "Germany"
            - option "Ghana"
            - option "Greece"
            - option "Greenland"
            - option "Grenada"
            - option "Guatemala"
            - option "Guinea"
            - option "Guinea-Bissau"
            - option "Guyana"
            - option "Haiti"
            - option "Holy See (Vatican City State)"
            - option "Honduras"
            - option "Hungary"
            - option "Iceland"
            - option "India"
            - option "Indonesia"
            - option "Iran"
            - option "Iraq"
            - option "Ireland"
            - option "Israel"
            - option "Italy"
            - option "Jamaica"
            - option "Japan"
            - option "Jordan"
            - option "Kazakhstan"
            - option "Kenya"
            - option "Kiribati"
            - option "Kosovo"
            - option "Kuwait"
            - option "Kyrgyzstan"
            - option "Laos"
            - option "Latvia"
            - option "Lebanon"
            - option "Lesotho"
            - option "Liberia"
            - option "Libya"
            - option "Liechtenstein"
            - option "Lithuania"
            - option "Luxembourg"
            - option "Madagascar"
            - option "Malawi"
            - option "Malaysia"
            - option "Maldives"
            - option "Mali"
            - option "Malta"
            - option "Marshall Islands"
            - option "Mauritania"
            - option "Mauritius"
            - option "Mexico"
            - option "Micronesia, Federated States of"
            - option "Moldova"
            - option "Monaco"
            - option "Mongolia"
            - option "Montenegro"
            - option "Morocco"
            - option "Mozambique"
            - option "Myanmar"
            - option "N. Cyprus"
            - option "Namibia"
            - option "Nauru"
            - option "Nepal"
            - option "Netherlands"
            - option "New Caledonia"
            - option "New Zealand"
            - option "Nicaragua"
            - option "Niger"
            - option "Nigeria"
            - option "North Korea"
            - option "North Macedonia"
            - option "Norway"
            - option "Oman"
            - option "Pakistan"
            - option "Palau"
            - option "Palestine"
            - option "Panama"
            - option "Papua New Guinea"
            - option "Paraguay"
            - option "Peru"
            - option "Philippines"
            - option "Poland"
            - option "Portugal"
            - option "Puerto Rico"
            - option "Qatar"
            - option "Romania"
            - option "Russia"
            - option "Rwanda"
            - option "S. Sudan"
            - option "Saint Kitts and Nevis"
            - option "Saint Lucia"
            - option "Saint Vincent and the Grenadines"
            - option "Samoa"
            - option "San Marino"
            - option "Sao Tome and Principe"
            - option "Saudi Arabia"
            - option "Senegal"
            - option "Serbia"
            - option "Seychelles"
            - option "Sierra Leone"
            - option "Singapore"
            - option "Slovakia"
            - option "Slovenia"
            - option "Solomon Is."
            - option "Somaliland"
            - option "South Africa"
            - option "South Korea"
            - option "Spain"
            - option "Sri Lanka"
            - option "Sudan"
            - option "Suriname"
            - option "Sweden"
            - option "Switzerland"
            - option "Syria"
            - option "Taiwan"
            - option "Tajikistan"
            - option "Tanzania"
            - option "Thailand"
            - option "Timor-Leste"
            - option "Togo"
            - option "Tonga"
            - option "Trinidad and Tobago"
            - option "Tunisia"
            - option "Türkiye" [selected]
            - option "Turkmenistan"
            - option "Tuvalu"
            - option "Uganda"
            - option "Ukraine"
            - option "United Arab Emirates"
            - option "United Kingdom"
            - option "United States of America"
            - option "Uruguay"
            - option "Uzbekistan"
            - option "Vanuatu"
            - option "Venezuela"
            - option "Vietnam"
            - option "W. Sahara"
            - option "Yemen"
            - option "Zambia"
            - option "Zimbabwe"
          - generic [ref=e38]: Your citizenship is independent of the country you choose to govern.
        - generic [ref=e39]:
          - generic [ref=e40]: DATE OF BIRTH
          - textbox "Date of birth" [ref=e41]
          - generic [ref=e42]: Optional. Campaign calendar begins on 1 January 2026.
      - figure "— Nelson Mandela" [ref=e43]:
        - generic [ref=e44]: “
        - blockquote [ref=e45]: Education is the most powerful weapon which you can use to change the world.
        - generic [ref=e46]: ”
        - generic [ref=e47]: — Nelson Mandela
    - generic [ref=e48]:
      - generic [ref=e49]:
        - button "Load previous progress" [ref=e50] [cursor=pointer]
        - status [ref=e51]: New campaign started
      - generic [ref=e52]:
        - button "BACK" [disabled] [ref=e53]
        - generic [ref=e54]: STEP 1 / 4
        - button "CONTINUE" [disabled] [ref=e55]
  - button "Game menu" [ref=e56]
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
  67 |  await page.locator('[data-guide="rail-help"]').click();await expect(page.locator('#help-window .game-notes h3')).toHaveText('Rule of Nations');
  68 |  expect(await page.locator('body').innerText()).not.toMatch(/Real President|Gerçek Başkan|Gerçekten O'nun|AlpyX(?! Game Studios)/);
  69 | });
  70 | 
  71 | test('entry and setup screens carry the Rule of Nations mark over the cover art',async({page})=>{
  72 |  await page.goto('/');await expect(page.locator('.entry-art .brand-mark')).toContainText('Rule of Nations');
  73 |  await expect(page.locator('.entry-art .brand-mark')).toHaveAttribute('translate','no');
  74 |  await expect(page.locator('.entry-art .brand-mark-emblem')).toHaveText('RON');
  75 |  await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
> 76 |  await expect(page.locator('.setup-cover .brand-mark')).toContainText('Rule of Nations');await expect(page.locator('.wizard-header small')).toContainText('Rule of Nations');
     |                                                                                                                                             ^ Error: expect(locator).toContainText(expected) failed
  77 |  await page.screenshot({path:'test-results/ron-setup-091.png'});
  78 | });
  79 | 
```