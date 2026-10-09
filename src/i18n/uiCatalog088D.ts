// 0.88 track D: AI-declared wars, the defender path and allied co-belligerents (audit E1, B9, E5).
// Order: [tr, es, zh, ru]. Keys with {n} are matched as templates by translateText.
export const UI_CATALOG_088_D: Record<string, string[]> = {
  "WAR // {0} declared war on {1}. You are the defender.": [
    "SAVAŞ // {0}, {1} ülkesine savaş ilan etti. Savunan tarafsın.",
    "GUERRA // {0} declaró la guerra a {1}. Eres el defensor.",
    "战争 // {0}向{1}宣战。你是防守方。",
    "ВОЙНА // {0} объявила войну {1}. Вы — обороняющаяся сторона.",
  ],
  "ALLIANCE // {0} joined the war on {1}'s side against {2}.": [
    "İTTİFAK // {0}, {2} karşısında {1} tarafında savaşa katıldı.",
    "ALIANZA // {0} entró en la guerra del lado de {1} contra {2}.",
    "同盟 // {0}站在{1}一方参战，对抗{2}。",
    "СОЮЗ // {0} вступила в войну на стороне {1} против {2}.",
  ],
  "ALLIANCE // {0} attacked your ally {1}.": [
    "İTTİFAK // {0}, müttefikin {1} ülkesine saldırdı.",
    "ALIANZA // {0} atacó a tu aliado {1}.",
    "同盟 // {0}攻击了你的盟友{1}。",
    "СОЮЗ // {0} напала на вашего союзника {1}.",
  ],
  "WAR // {0} withdrew from {1}. Ceasefire established under hostile relations.": [
    "SAVAŞ // {0}, {1} cephesinden çekildi. Düşmanca ilişkiler altında ateşkes sağlandı.",
    "GUERRA // {0} se retiró de {1}. Alto el fuego establecido con relaciones hostiles.",
    "战争 // {0}从{1}撤军。双方在敌对关系下达成停火。",
    "ВОЙНА // {0} отвела войска из {1}. Установлено перемирие при враждебных отношениях.",
  ],
  "PEACE // {0} withdrew from {1}; independence restored under a peace settlement.": [
    "BARIŞ // {0}, {1} topraklarından çekildi; barış anlaşmasıyla bağımsızlık yeniden sağlandı.",
    "PAZ // {0} se retiró de {1}; la independencia se restableció mediante un acuerdo de paz.",
    "和平 // {0}撤出{1}；根据和平协议恢复独立。",
    "МИР // {0} ушла из {1}; независимость восстановлена мирным соглашением.",
  ],
  "CAMPAIGN LOST // {0} fell under {1} control.": [
    "KAMPANYA KAYBEDİLDİ // {0}, {1} kontrolüne geçti.",
    "CAMPAÑA PERDIDA // {0} cayó bajo el control de {1}.",
    "战役失败 // {0}已落入{1}的控制。",
    "КАМПАНИЯ ПРОИГРАНА // {0} перешла под контроль {1}.",
  ],
  "War declared on your country": [
    "Ülkene savaş ilan edildi",
    "Han declarado la guerra a tu país",
    "有国家向你宣战",
    "Вашей стране объявлена война",
  ],
  "{0} declared war on {1}. Open War Command to defend, fight in HD War or concede. Conceding hands control of the country to the attacker and ends the campaign.": [
    "{0}, {1} ülkesine savaş ilan etti. Savunmak, HD War'da savaşmak ya da teslim olmak için Savaş Komutası'nı aç. Teslim olmak ülkenin kontrolünü saldırgana bırakır ve kampanyayı bitirir.",
    "{0} declaró la guerra a {1}. Abre el Mando de guerra para defenderte, combatir en HD War o rendirte. Rendirse entrega el control del país al atacante y termina la campaña.",
    "{0}向{1}宣战。打开战争指挥部进行防御、在HD War中作战或认输。认输会把国家控制权交给进攻方，并结束战役。",
    "{0} объявила войну {1}. Откройте военное командование, чтобы обороняться, сражаться в HD War или капитулировать. Капитуляция передаёт контроль над страной нападающему и завершает кампанию.",
  ],
  "Ceasefire agreed": [
    "Ateşkes sağlandı",
    "Alto el fuego acordado",
    "已达成停火",
    "Перемирие заключено",
  ],
  "{0} withdrew its forces from {1}. The war is over; relations remain hostile.": [
    "{0}, kuvvetlerini {1} topraklarından çekti. Savaş bitti; ilişkiler düşmanca kalıyor.",
    "{0} retiró sus fuerzas de {1}. La guerra terminó; las relaciones siguen siendo hostiles.",
    "{0}已从{1}撤出部队。战争结束，双方关系仍然敌对。",
    "{0} вывела свои войска из {1}. Война окончена; отношения остаются враждебными.",
  ],
  "Allies of the defender: {0} (+{1}% defender power)": [
    "Savunanın müttefikleri: {0} (savunan gücüne +%{1})",
    "Aliados del defensor: {0} (+{1}% de poder defensivo)",
    "防守方盟友：{0}（防守方战力+{1}%）",
    "Союзники обороняющейся стороны: {0} (+{1}% к мощи обороны)",
  ],
  "Withdrawing as the defender concedes control of the country to the attacker. Losing your home country ends the campaign.": [
    "Savunan olarak geri çekilmek, ülkenin kontrolünü saldırgana bırakır. Ana ülkeni kaybetmek kampanyayı bitirir.",
    "Retirarse como defensor cede el control del país al atacante. Perder tu país de origen termina la campaña.",
    "作为防守方撤退会把国家控制权让给进攻方。失去本国将结束战役。",
    "Отступление обороняющейся стороны передаёт контроль над страной нападающему. Потеря родной страны завершает кампанию.",
  ],
};
