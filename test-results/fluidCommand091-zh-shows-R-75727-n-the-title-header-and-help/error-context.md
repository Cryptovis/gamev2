# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluidCommand091.spec.ts >> zh shows Rule of Nations untranslated in the title, header and help
- Location: e2e/fluidCommand091.spec.ts:63:33

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-guide="rail-help"]')
    - locator resolved to <button class="rail-button" aria-pressed="false" data-guide="rail-help" title="帮助 · Closed — click to open">…</button>
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
      - strong: 土耳其
      - generic: 拖动 Global ^ 轮子缩放 ^ 点击主权领土
    - group "Interactive world map" [ref=e5]:
      - generic [ref=e8]:
        - generic "坦桑尼亚" [ref=e9] [cursor=pointer]
        - generic "西撒哈拉" [ref=e10] [cursor=pointer]
        - generic "加拿大" [ref=e11] [cursor=pointer]
        - generic "美国" [ref=e12] [cursor=pointer]
        - generic "哈萨克斯坦" [ref=e13] [cursor=pointer]
        - generic "乌兹别克斯坦" [ref=e14] [cursor=pointer]
        - generic "印度尼西亚" [ref=e15] [cursor=pointer]
        - generic "刚果（金）" [ref=e16] [cursor=pointer]
        - generic "索马里" [ref=e17] [cursor=pointer]
        - generic "肯尼亚" [ref=e18] [cursor=pointer]
        - generic "苏丹" [ref=e19] [cursor=pointer]
        - generic "乍得" [ref=e20] [cursor=pointer]
        - generic "海地" [ref=e21] [cursor=pointer]
        - generic "多米尼加共和国" [ref=e22] [cursor=pointer]
        - generic "俄罗斯" [ref=e23] [cursor=pointer]
        - generic "挪威" [ref=e24] [cursor=pointer]
        - generic "格陵兰" [ref=e25] [cursor=pointer]
        - generic "法属南部领地" [ref=e26] [cursor=pointer]
        - generic "南非" [ref=e27] [cursor=pointer]
        - generic "莱索托" [ref=e28] [cursor=pointer]
        - generic "巴西" [ref=e29] [cursor=pointer]
        - generic "委内瑞拉" [ref=e30] [cursor=pointer]
        - generic "圭亚那" [ref=e31] [cursor=pointer]
        - generic "苏里南" [ref=e32] [cursor=pointer]
        - generic "法国" [ref=e33] [cursor=pointer]
        - generic "波多黎各" [ref=e34] [cursor=pointer]
        - generic "津巴布韦" [ref=e35] [cursor=pointer]
        - generic "博茨瓦纳" [ref=e36] [cursor=pointer]
        - generic "纳米比亚" [ref=e37] [cursor=pointer]
        - generic "塞内加尔" [ref=e38] [cursor=pointer]
        - generic "马里" [ref=e39] [cursor=pointer]
        - generic "毛里塔尼亚" [ref=e40] [cursor=pointer]
        - generic "贝宁" [ref=e41] [cursor=pointer]
        - generic "尼日尔" [ref=e42] [cursor=pointer]
        - generic "尼日利亚" [ref=e43] [cursor=pointer]
        - generic "喀麦隆" [ref=e44] [cursor=pointer]
        - generic "多哥" [ref=e45] [cursor=pointer]
        - generic "加纳" [ref=e46] [cursor=pointer]
        - generic "科特迪瓦" [ref=e47] [cursor=pointer]
        - generic "几内亚" [ref=e48] [cursor=pointer]
        - generic "几内亚比绍" [ref=e49] [cursor=pointer]
        - generic "利比里亚" [ref=e50] [cursor=pointer]
        - generic "塞拉利昂" [ref=e51] [cursor=pointer]
        - generic "布基纳法索" [ref=e52] [cursor=pointer]
        - generic "中非共和国" [ref=e53] [cursor=pointer]
        - generic "刚果（布）" [ref=e54] [cursor=pointer]
        - generic "加蓬" [ref=e55] [cursor=pointer]
        - generic "赤道几内亚" [ref=e56] [cursor=pointer]
        - generic "赞比亚" [ref=e57] [cursor=pointer]
        - generic "马拉维" [ref=e58] [cursor=pointer]
        - generic "莫桑比克" [ref=e59] [cursor=pointer]
        - generic "斯威士兰" [ref=e60] [cursor=pointer]
        - generic "安哥拉" [ref=e61] [cursor=pointer]
        - generic "布隆迪" [ref=e62] [cursor=pointer]
        - generic "以色列" [ref=e63] [cursor=pointer]
        - generic "黎巴嫩" [ref=e64] [cursor=pointer]
        - generic "马达加斯加" [ref=e65] [cursor=pointer]
        - generic "巴勒斯坦" [ref=e66] [cursor=pointer]
        - generic "冈比亚" [ref=e67] [cursor=pointer]
        - generic "突尼斯" [ref=e68] [cursor=pointer]
        - generic "阿尔及利亚" [ref=e69] [cursor=pointer]
        - generic "约旦" [ref=e70] [cursor=pointer]
        - generic "阿拉伯联合酋长国" [ref=e71] [cursor=pointer]
        - generic "卡塔尔" [ref=e72] [cursor=pointer]
        - generic "科威特" [ref=e73] [cursor=pointer]
        - generic "伊拉克" [ref=e74] [cursor=pointer]
        - generic "阿曼" [ref=e75] [cursor=pointer]
        - generic "柬埔寨" [ref=e76] [cursor=pointer]
        - generic "泰国" [ref=e77] [cursor=pointer]
        - generic "老挝" [ref=e78] [cursor=pointer]
        - generic "缅甸" [ref=e79] [cursor=pointer]
        - generic "越南" [ref=e80] [cursor=pointer]
        - generic "朝鲜" [ref=e81] [cursor=pointer]
        - generic "韩国" [ref=e82] [cursor=pointer]
        - generic "蒙古" [ref=e83] [cursor=pointer]
        - generic "印度" [ref=e84] [cursor=pointer]
        - generic "孟加拉国" [ref=e85] [cursor=pointer]
        - generic "不丹" [ref=e86] [cursor=pointer]
        - generic "尼泊尔" [ref=e87] [cursor=pointer]
        - generic "巴基斯坦" [ref=e88] [cursor=pointer]
        - generic "阿富汗" [ref=e89] [cursor=pointer]
        - generic "塔吉克斯坦" [ref=e90] [cursor=pointer]
        - generic "吉尔吉斯斯坦" [ref=e91] [cursor=pointer]
        - generic "土库曼斯坦" [ref=e92] [cursor=pointer]
        - generic "伊朗" [ref=e93] [cursor=pointer]
        - generic "叙利亚" [ref=e94] [cursor=pointer]
        - generic "亚美尼亚" [ref=e95] [cursor=pointer]
        - generic "瑞典" [ref=e96] [cursor=pointer]
        - generic "白俄罗斯" [ref=e97] [cursor=pointer]
        - generic "乌克兰" [ref=e98] [cursor=pointer]
        - generic "波兰" [ref=e99] [cursor=pointer]
        - generic "奥地利" [ref=e100] [cursor=pointer]
        - generic "匈牙利" [ref=e101] [cursor=pointer]
        - generic "摩尔多瓦" [ref=e102] [cursor=pointer]
        - generic "罗马尼亚" [ref=e103] [cursor=pointer]
        - generic "立陶宛" [ref=e104] [cursor=pointer]
        - generic "拉脱维亚" [ref=e105] [cursor=pointer]
        - generic "爱沙尼亚" [ref=e106] [cursor=pointer]
        - generic "德国" [ref=e107] [cursor=pointer]
        - generic "保加利亚" [ref=e108] [cursor=pointer]
        - generic "希腊" [ref=e109] [cursor=pointer]
        - generic "土耳其" [ref=e110] [cursor=pointer]
        - generic "阿尔巴尼亚" [ref=e111] [cursor=pointer]
        - generic "克罗地亚" [ref=e112] [cursor=pointer]
        - generic "瑞士" [ref=e113] [cursor=pointer]
        - generic "卢森堡" [ref=e114] [cursor=pointer]
        - generic "比利时" [ref=e115] [cursor=pointer]
        - generic "荷兰" [ref=e116] [cursor=pointer]
        - generic "葡萄牙" [ref=e117] [cursor=pointer]
        - generic "西班牙" [ref=e118] [cursor=pointer]
        - generic "爱尔兰" [ref=e119] [cursor=pointer]
        - generic "斯里兰卡" [ref=e120] [cursor=pointer]
        - generic "中国" [ref=e121] [cursor=pointer]
        - generic "台湾" [ref=e122] [cursor=pointer]
        - generic "意大利" [ref=e123] [cursor=pointer]
        - generic "丹麦" [ref=e124] [cursor=pointer]
        - generic "英国" [ref=e125] [cursor=pointer]
        - generic "冰岛" [ref=e126] [cursor=pointer]
        - generic "阿塞拜疆" [ref=e127] [cursor=pointer]
        - generic "格鲁吉亚" [ref=e128] [cursor=pointer]
        - generic "菲律宾" [ref=e129] [cursor=pointer]
        - generic "马来西亚" [ref=e130] [cursor=pointer]
        - generic "文莱" [ref=e131] [cursor=pointer]
        - generic "斯洛文尼亚" [ref=e132] [cursor=pointer]
        - generic "芬兰" [ref=e133] [cursor=pointer]
        - generic "斯洛伐克" [ref=e134] [cursor=pointer]
        - generic "捷克" [ref=e135] [cursor=pointer]
        - generic "厄立特里亚" [ref=e136] [cursor=pointer]
        - generic "日本" [ref=e137] [cursor=pointer]
        - generic "也门" [ref=e138] [cursor=pointer]
        - generic "沙特阿拉伯" [ref=e139] [cursor=pointer]
        - generic "塞浦路斯" [ref=e140] [cursor=pointer]
        - generic "塞浦路斯" [ref=e141] [cursor=pointer]
        - generic "摩洛哥" [ref=e142] [cursor=pointer]
        - generic "埃及" [ref=e143] [cursor=pointer]
        - generic "利比亚" [ref=e144] [cursor=pointer]
        - generic "埃塞俄比亚" [ref=e145] [cursor=pointer]
        - generic "吉布提" [ref=e146] [cursor=pointer]
        - generic "索马里" [ref=e147] [cursor=pointer]
        - generic "乌干达" [ref=e148] [cursor=pointer]
        - generic "卢旺达" [ref=e149] [cursor=pointer]
        - generic "波斯尼亚和黑塞哥维那" [ref=e150] [cursor=pointer]
        - generic "北马其顿" [ref=e151] [cursor=pointer]
        - generic "塞尔维亚" [ref=e152] [cursor=pointer]
        - generic "黑山" [ref=e153] [cursor=pointer]
        - generic "科索沃" [ref=e154] [cursor=pointer]
        - generic "特立尼达和多巴哥" [ref=e155] [cursor=pointer]
        - generic "南苏丹" [ref=e156] [cursor=pointer]
      - generic:
        - generic:
          - generic: 土耳其
        - generic:
          - generic: 俄罗斯
        - generic:
          - generic: 中国
        - generic:
          - generic: 印度
        - generic:
          - generic: 阿尔及利亚
        - generic:
          - generic: 刚果（金）
        - generic:
          - generic: 哈萨克斯坦
        - generic:
          - generic: 沙特阿拉伯
        - generic:
          - generic: 苏丹
        - generic:
          - generic: 利比亚
        - generic:
          - generic: 伊朗
        - generic:
          - generic: 乍得
        - generic:
          - generic: 尼日尔
        - generic:
          - generic: 加拿大
        - generic:
          - generic: 埃塞俄比亚
        - generic:
          - generic: 马里
        - generic:
          - generic: 格陵兰
        - generic:
          - generic: 埃及
        - generic:
          - generic: 安哥拉
        - generic:
          - generic: 巴西
        - generic:
          - generic: 尼日利亚
        - generic:
          - generic: 坦桑尼亚
        - generic:
          - generic: 南非
        - generic:
          - generic: 印度尼西亚
        - generic:
          - generic: 北大西洋
        - generic:
          - generic: 南极洲
    - generic "Map camera controls" [ref=e157]:
      - button "Zoom out" [ref=e158] [cursor=pointer]: −
      - status "Map zoom level" [ref=e159]: 100%
      - button "Zoom in" [ref=e160] [cursor=pointer]: +
      - button "回到你的国家" [ref=e161] [cursor=pointer]:
        - img [ref=e162]
      - button "续:" [ref=e166] [cursor=pointer]
  - generic:
    - generic [ref=e167]:
      - generic [ref=e168]:
        - button "行政领袖 ⋯" [ref=e169] [cursor=pointer]:
          - img "行政领袖" [ref=e170]
          - generic [ref=e171]: ⋯
        - generic [ref=e172]:
          - generic [ref=e173]: Rule of Nations
          - generic [ref=e174]:
            - strong [ref=e175]: Browser playtest
            - generic [ref=e176]: 日 1
      - generic "国家指挥指标" [ref=e177]:
        - generic [ref=e178]:
          - img [ref=e181]
          - generic [ref=e182]:
            - generic [ref=e183]: 国库
            - strong [ref=e184]: $143.0B
        - generic [ref=e185]:
          - img [ref=e188]
          - generic [ref=e189]:
            - generic [ref=e190]: 每日预算
            - strong [ref=e191]: +$0.167B
        - generic [ref=e192]:
          - img [ref=e195]
          - generic [ref=e196]:
            - generic [ref=e197]: 支持率
            - strong [ref=e198]: 56%
        - generic [ref=e199]:
          - img [ref=e202]
          - generic [ref=e203]:
            - generic [ref=e204]: 稳定
            - strong [ref=e205]: 67%
    - generic [ref=e206]:
      - generic [ref=e207]:
        - generic "游戏速度控制" [ref=e208]:
          - button "Ⅱ 暂停" [pressed] [ref=e209] [cursor=pointer]:
            - strong [ref=e210]: Ⅱ
            - generic [ref=e211]: 暂停
          - button "1× 15s/日" [ref=e212] [cursor=pointer]:
            - strong [ref=e213]: 1×
            - generic [ref=e214]: 15s/日
          - button "2× 7s/日" [ref=e215] [cursor=pointer]:
            - strong [ref=e216]: 2×
            - generic [ref=e217]: 7s/日
          - button "3× 3s/日" [ref=e218] [cursor=pointer]:
            - strong [ref=e219]: 3×
            - generic [ref=e220]: 3s/日
          - button "5× 1s/日" [ref=e221] [cursor=pointer]:
            - strong [ref=e222]: 5×
            - generic [ref=e223]: 1s/日
        - generic [ref=e224]:
          - generic [ref=e225]: 战役日期
          - strong [ref=e226]: 2026-01-01
      - button "打开你的祖国" [pressed] [ref=e227] [cursor=pointer]:
        - generic [ref=e228]: 🇹🇷
        - generic [ref=e229]:
          - strong [ref=e230]: 土耳其
          - generic [ref=e231]: 民主制
          - emphasis [ref=e232]: 打开你的祖国
  - complementary [ref=e233]:
    - generic [ref=e234]:
      - generic [ref=e235]: 国家指挥部
      - button "关闭国别小组" [active] [ref=e236] [cursor=pointer]: ×
    - combobox "选择国家" [ref=e237]:
      - option "阿富汗 (AF)"
      - option "阿尔巴尼亚 (AL)"
      - option "阿尔及利亚 (DZ)"
      - option "安道尔 (AD)"
      - option "安哥拉 (AO)"
      - option "安提瓜和巴布达 (AG)"
      - option "阿根廷 (AR)"
      - option "亚美尼亚 (AM)"
      - option "澳大利亚 (AU)"
      - option "奥地利 (AT)"
      - option "阿塞拜疆 (AZ)"
      - option "巴哈马 (BS)"
      - option "巴林 (BH)"
      - option "孟加拉国 (BD)"
      - option "巴巴多斯 (BB)"
      - option "白俄罗斯 (BY)"
      - option "比利时 (BE)"
      - option "伯利兹 (BZ)"
      - option "贝宁 (BJ)"
      - option "不丹 (BT)"
      - option "玻利维亚 (BO)"
      - option "波斯尼亚和黑塞哥维那 (BA)"
      - option "博茨瓦纳 (BW)"
      - option "巴西 (BR)"
      - option "文莱 (BN)"
      - option "保加利亚 (BG)"
      - option "布基纳法索 (BF)"
      - option "布隆迪 (BI)"
      - option "佛得角 (CV)"
      - option "柬埔寨 (KH)"
      - option "喀麦隆 (CM)"
      - option "加拿大 (CA)"
      - option "中非共和国 (CF)"
      - option "乍得 (TD)"
      - option "智利 (CL)"
      - option "中国 (CN)"
      - option "哥伦比亚 (CO)"
      - option "科摩罗 (公里)"
      - option "刚果（布） (CG)"
      - option "哥斯达黎加 (CR)"
      - option "科特迪瓦 (CI)"
      - option "克罗地亚 (HR)"
      - option "古巴 (CU)"
      - option "捷克 (CZ)"
      - option "刚果（金） (CD)"
      - option "丹麦 (DK)"
      - option "吉布提 (DJ)"
      - option "多米尼克 (DM)"
      - option "多米尼加共和国 (DO)"
      - option "厄瓜多尔 (EC)"
      - option "埃及 (EG)"
      - option "萨尔瓦多 (SV)"
      - option "赤道几内亚 (GQ)"
      - option "厄立特里亚 (ER)"
      - option "爱沙尼亚 (EE)"
      - option "斯威士兰 (SZ)"
      - option "埃塞俄比亚 (ET)"
      - option "福克兰群岛（马尔维纳斯群岛） (FK)"
      - option "斐济 (FJ)"
      - option "芬兰 (FI)"
      - option "法属南部领地 (TF)"
      - option "法国 (FR)"
      - option "加蓬 (GA)"
      - option "冈比亚 (GM)"
      - option "格鲁吉亚 (GE)"
      - option "德国 (DE)"
      - option "加纳 (GH)"
      - option "希腊 (GR)"
      - option "格陵兰 (GL)"
      - option "格林纳达 (GD)"
      - option "危地马拉 (GT)"
      - option "几内亚 (GN)"
      - option "几内亚比绍 (GW)"
      - option "圭亚那 (GY)"
      - option "海地 (HT)"
      - option "梵蒂冈 (VA)"
      - option "洪都拉斯 (HN)"
      - option "匈牙利 (HU)"
      - option "冰岛 (IS)"
      - option "印度 (IN)"
      - option "印度尼西亚 (ID)"
      - option "伊朗 (IR)"
      - option "伊拉克 (IQ)"
      - option "爱尔兰 (IE)"
      - option "以色列 (IL)"
      - option "意大利 (IT)"
      - option "牙买加 (JM)"
      - option "日本 (JP)"
      - option "约旦 (JO)"
      - option "哈萨克斯坦 (KZ)"
      - option "肯尼亚 (KE)"
      - option "基里巴斯 (KI)"
      - option "科索沃 (XK)"
      - option "科威特 (KW)"
      - option "吉尔吉斯斯坦 (KG)"
      - option "老挝 (LA)"
      - option "拉脱维亚 (LV)"
      - option "黎巴嫩 (LB)"
      - option "莱索托 (LS)"
      - option "利比里亚 (LR)"
      - option "利比亚 (LY)"
      - option "列支敦士登 (LI)"
      - option "立陶宛 (LT)"
      - option "卢森堡 (LU)"
      - option "马达加斯加 (MG)"
      - option "马拉维 (MW)"
      - option "马来西亚 (MY)"
      - option "马尔代夫 (MV)"
      - option "马里 (ML)"
      - option "马耳他 (MT)"
      - option "马绍尔群岛 (MH)"
      - option "毛里塔尼亚 (MR)"
      - option "毛里求斯 (MU)"
      - option "墨西哥 (MX)"
      - option "密克罗尼西亚 (FM)"
      - option "摩尔多瓦 (MD)"
      - option "摩纳哥 (MC)"
      - option "蒙古 (MN)"
      - option "黑山 (ME)"
      - option "摩洛哥 (MA)"
      - option "莫桑比克 (MZ)"
      - option "缅甸 (MM)"
      - option "塞浦路斯 (CY)"
      - option "纳米比亚 (NA)"
      - option "瑙鲁 (NR)"
      - option "尼泊尔 (NP)"
      - option "荷兰 (NL)"
      - option "新喀里多尼亚 (NC)"
      - option "新西兰 (NZ)"
      - option "尼加拉瓜 (NI)"
      - option "尼日尔 (NE)"
      - option "尼日利亚 (NG)"
      - option "朝鲜 (KP)"
      - option "北马其顿 (MK)"
      - option "挪威 (反对)"
      - option "阿曼 (OM)"
      - option "巴基斯坦 (PK)"
      - option "帕劳 (PW)"
      - option "巴勒斯坦 (PS)"
      - option "巴拿马 (PA)"
      - option "巴布亚新几内亚 (PG)"
      - option "巴拉圭 (PY)"
      - option "秘鲁 (PE)"
      - option "菲律宾 (PH)"
      - option "波兰 (PL)"
      - option "葡萄牙 (PT)"
      - option "波多黎各 (PR)"
      - option "卡塔尔 (QA)"
      - option "罗马尼亚 (RO)"
      - option "俄罗斯 (RU)"
      - option "卢旺达 (RW)"
      - option "南苏丹 (SS)"
      - option "圣基茨和尼维斯 (KN)"
      - option "圣卢西亚 (LC)"
      - option "圣文森特和格林纳丁斯 (VC)"
      - option "萨摩亚 (WS)"
      - option "圣马力诺 (SM)"
      - option "圣多美和普林西比 (ST)"
      - option "沙特阿拉伯 (SA)"
      - option "塞内加尔 (SN)"
      - option "塞尔维亚 (RS)"
      - option "塞舌尔 (SC)"
      - option "塞拉利昂 (SL)"
      - option "新加坡 (SG)"
      - option "斯洛伐克 (SK)"
      - option "斯洛文尼亚 (SI)"
      - option "所罗门群岛 (SB)"
      - option "索马里 (SO)"
      - option "南非 (ZA)"
      - option "韩国 (KR)"
      - option "西班牙 (ES)"
      - option "斯里兰卡 (LK)"
      - option "苏丹 (SD)"
      - option "苏里南 (SR)"
      - option "瑞典 (SE)"
      - option "瑞士 (CH)"
      - option "叙利亚 (SY)"
      - option "台湾 (TW)"
      - option "塔吉克斯坦 (TJ)"
      - option "坦桑尼亚 (TZ)"
      - option "泰国 (TH)"
      - option "东帝汶 (TL)"
      - option "多哥 (TG)"
      - option "汤加 (TO)"
      - option "特立尼达和多巴哥 (TT)"
      - option "突尼斯 (TN)"
      - option "土耳其 (TR)" [selected]
      - option "土库曼斯坦 (TM)"
      - option "图瓦卢 (TV)"
      - option "乌干达 (UG)"
      - option "乌克兰 (UA)"
      - option "阿拉伯联合酋长国 (AE)"
      - option "英国 (GB)"
      - option "美国 (US)"
      - option "乌拉圭 (UY)"
      - option "乌兹别克斯坦 (UZ)"
      - option "瓦努阿图 (VU)"
      - option "委内瑞拉 (VE)"
      - option "越南 (VN)"
      - option "西撒哈拉 (EH)"
      - option "也门 (YE)"
      - option "赞比亚 (ZM)"
      - option "津巴布韦 (ZW)"
    - generic [ref=e239]:
      - generic [ref=e240]: 🇹🇷
      - generic [ref=e241]:
        - heading "土耳其" [level=1] [ref=e242]
        - paragraph [ref=e243]: 玩家国家 · 民主制 · 亚洲
    - generic [ref=e244]:
      - generic [ref=e245]:
        - generic [ref=e246]: ☪
        - generic [ref=e247]:
          - generic [ref=e248]: 宗教
          - strong [ref=e249]: 伊斯兰教
      - generic [ref=e250]:
        - img "bloc" [ref=e251]:
          - img [ref=e252]
        - generic [ref=e253]:
          - generic [ref=e254]: 意识形态
          - strong [ref=e255]: 多元主义
      - generic [ref=e256]:
        - img [ref=e258]
        - generic [ref=e259]:
          - generic [ref=e260]: 军事排名
          - strong [ref=e261]: "GFP #9"
    - generic [ref=e262]:
      - button "概览" [pressed] [ref=e263] [cursor=pointer]:
        - img [ref=e265]
        - generic [ref=e266]: 概览
      - button "实力" [ref=e267] [cursor=pointer]:
        - img [ref=e268]
        - generic [ref=e272]: 实力
      - button "补给指挥" [ref=e273] [cursor=pointer]:
        - img [ref=e275]
        - generic [ref=e276]: 补给指挥
    - generic [ref=e277]:
      - button "政务" [ref=e278] [cursor=pointer]:
        - img [ref=e280]
        - generic [ref=e281]: 政务
      - button "经济" [ref=e282] [cursor=pointer]:
        - img [ref=e284]
        - generic [ref=e285]: 经济
      - button "政策" [ref=e286] [cursor=pointer]:
        - img [ref=e288]
        - generic [ref=e289]: 政策
      - button "trade 贸易" [ref=e290] [cursor=pointer]:
        - img "trade" [ref=e291]:
          - img [ref=e292]
        - generic [ref=e293]: 贸易
      - button "生产" [ref=e294] [cursor=pointer]:
        - img [ref=e296]
        - generic [ref=e297]: 生产
      - button "外交" [ref=e298] [cursor=pointer]:
        - img [ref=e300]
        - generic [ref=e301]: 外交
      - button "军事" [ref=e302] [cursor=pointer]:
        - img [ref=e304]
        - generic [ref=e305]: 军事
      - button "情报" [ref=e306] [cursor=pointer]:
        - img [ref=e308]
        - generic [ref=e309]: 情报
      - button "内阁" [ref=e310] [cursor=pointer]:
        - img [ref=e312]
        - generic [ref=e313]: 内阁
    - generic [ref=e314]:
      - button "科技" [ref=e315] [cursor=pointer]:
        - img [ref=e317]
        - generic [ref=e318]: 科技
      - button "世界" [ref=e319] [cursor=pointer]:
        - img [ref=e321]
        - generic [ref=e322]: 世界
      - button "战备" [ref=e323] [cursor=pointer]:
        - img [ref=e325]
        - generic [ref=e326]: 战备
    - generic [ref=e327]:
      - generic [ref=e328]:
        - generic [ref=e329]: 国内生产总值
        - strong [ref=e330]: $1300.0B
      - generic [ref=e331]:
        - generic [ref=e332]: 经济状况
        - strong [ref=e333]: 100%
      - generic [ref=e334]:
        - generic [ref=e335]: 人口
        - strong [ref=e336]: 86.0M
      - generic [ref=e337]:
        - generic [ref=e338]: 军事能力
        - strong [ref=e339]: 81.5/100
      - generic [ref=e340]:
        - generic [ref=e341]: 工业产出
        - strong [ref=e342]: "52.68"
      - generic [ref=e343]:
        - generic [ref=e344]: 资源压力
        - strong [ref=e345]: 71.2%
    - generic [ref=e346]:
      - generic [ref=e347]:
        - img "燃料" [ref=e348]:
          - img
        - generic [ref=e349]: 燃料
        - strong [ref=e350]: "25.6"
      - generic [ref=e351]:
        - img "钢" [ref=e352]:
          - img
        - generic [ref=e353]: 钢
        - strong [ref=e354]: "50.0"
      - generic [ref=e355]:
        - img "电力" [ref=e356]:
          - img
        - generic [ref=e357]: 能源
        - strong [ref=e358]: "43.2"
      - generic [ref=e359]:
        - img [ref=e360]
        - generic [ref=e363]: R&D
        - strong [ref=e364]: "29.9"
    - generic [ref=e365]:
      - generic [ref=e366]:
        - generic [ref=e367]: 每日预算
        - strong [ref=e368]: +0.183B
      - generic [ref=e369]:
        - generic [ref=e370]: 国内生产总值趋势
        - strong [ref=e371]: +0.0109%
      - generic [ref=e372]:
        - generic [ref=e373]: 粮食/日
        - strong [ref=e374]: "+4.11"
      - generic [ref=e375]:
        - generic [ref=e376]: 石油/日数
        - strong [ref=e377]: "-0.33"
      - generic [ref=e378]:
        - generic [ref=e379]: 铁/ 日
        - strong [ref=e380]: "+0.21"
      - generic [ref=e381]:
        - generic [ref=e382]: 通胀
        - strong [ref=e383]: 5.50%
      - generic [ref=e384]:
        - generic [ref=e385]: 稳定
        - strong [ref=e386]: 67.2%
      - generic [ref=e387]:
        - generic [ref=e388]: 凝聚力
        - strong [ref=e389]: 71.2%
  - navigation "世界命令工具" [ref=e390]:
    - button "市场 市场" [ref=e391] [cursor=pointer]:
      - img "市场" [ref=e393]:
        - img
      - generic [ref=e394]: 市场
    - button "世界 世界" [ref=e395] [cursor=pointer]:
      - img "世界" [ref=e397]:
        - img
      - generic [ref=e398]: 世界
    - button "警报 1 补给" [ref=e399] [cursor=pointer]:
      - img "警报" [ref=e401]:
        - img
      - generic [ref=e402]: "1"
      - generic [ref=e403]: 补给
  - navigation "信息工具" [ref=e404]:
    - button "objectives 0/6 目标" [ref=e405] [cursor=pointer]:
      - img "objectives" [ref=e407]:
        - img
      - generic [ref=e408]: 0/6
      - generic [ref=e409]: 目标
    - button "外交 外交" [ref=e410] [cursor=pointer]:
      - img "外交" [ref=e412]:
        - img
      - generic [ref=e413]: 外交
    - button "警报 1 警报" [ref=e414] [cursor=pointer]:
      - img "警报" [ref=e416]:
        - img
      - generic [ref=e417]: "1"
      - generic [ref=e418]: 警报
    - button "情报 2 新闻" [ref=e419] [cursor=pointer]:
      - img "情报" [ref=e421]:
        - img
      - generic [ref=e422]: "2"
      - generic [ref=e423]: 新闻
  - navigation "地图和帮助工具" [ref=e424]:
    - button "地图 地图" [ref=e425] [cursor=pointer]:
      - img "地图" [ref=e427]:
        - img
      - generic [ref=e428]: 地图
    - button "帮助 帮助" [ref=e429] [cursor=pointer]:
      - img "帮助" [ref=e431]:
        - img
      - generic [ref=e432]: 帮助
  - generic [ref=e433]:
    - generic [ref=e434]: 新闻// Rule of Nations 已准备就绪。
    - generic [ref=e435]:
      - generic [ref=e436]: 世界指挥中心
      - generic [ref=e437]: 玩家(游戏) · 政治 · 政治 · 格洛贝
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