import { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
const steps = [
  [
    "Welcome to national command",
    "Learn the ten essential command areas. Time stays paused during the tutorial.",
    "Komutaya hoş geldin",
    "On temel komuta alanını tanıyalım. Eğitim boyunca oyun zamanı durur.",
    "overview",
  ],
  [
    "Budget & reserves",
    "Check treasury, daily budget, approval and resource reserves before committing to an investment.",
    "Bütçe ve rezervler",
    "Yatırım öncesi hazineni, günlük bütçeni, halk desteğini ve kaynak rezervlerini kontrol et.",
    "economy",
  ],
  [
    "Explore the world",
    "Drag to move, scroll to zoom. Map Command switches projection, geographic surface and relations colors.",
    "Dünyayı keşfet",
    "Haritayı sürükle, tekerlekle yakınlaş. Map menüsünden coğrafi yüzeyi ve ilişki renklerini seç.",
    "map",
  ],
  [
    "Build national industry",
    "Production lists facilities and their input chains. Review a build to compare output, costs and budget before confirming.",
    "Sanayini geliştir",
    "Production tesisleri ve girdi zincirlerini gösterir. Build incelemesinde üretim, maliyet ve bütçeyi karşılaştır.",
    "production",
  ],
  [
    "Research new capabilities",
    "Spend research points to unlock mining, engine production, tank assembly and diplomatic influence. Prerequisites connect the branches.",
    "Yeni yetenekler araştır",
    "Araştırma puanları maden, motor, tank montajı ve diplomatik nüfuz açar. Ön koşullar dalları birbirine bağlar.",
    "technology",
  ],
  [
    "Trade & secure supply",
    "Market shows goods, partners and prices. Review imports or exports; monthly contracts can secure resources or generate revenue.",
    "Ticaret ve tedarik",
    "Market ürünleri, ortakları ve fiyatları gösterir. İthalat/ihracatı incele; aylık sözleşmeler kaynak ve gelir sağlar.",
    "market",
  ],
  [
    "Respond to shortages",
    "Supply shows reserve days and supplier access. Low Relations explains the blocker and takes you to diplomacy.",
    "Eksikleri gider",
    "Supply rezerv günlerini ve tedarikçileri gösterir. Low Relations engeli açıklar ve diplomasiye götürür.",
    "resources",
  ],
  [
    "Build trust",
    "Select another country and open Diplomacy. Missions, aid and embassies improve access; a trade pact unlocks commerce.",
    "Güven inşa et",
    "Başka ülkeyi seçip Diplomacy aç. Görevler, yardımlar ve elçilikler ilişkiyi geliştirir; ticaret paktı pazarı açar.",
    "diplomacy",
  ],
  [
    "Equip your military",
    "Factories produce equipment reserves. Deploy equipment to reinforce forces; fuel, power and logistics constrain readiness.",
    "Ordunu donat",
    "Fabrikalar ekipman rezervi üretir. Deploy ile orduyu güçlendir; yakıt, enerji ve lojistik sınırlarını gözet.",
    "military",
  ],
  [
    "Participate in world affairs",
    "World contains institutions, membership achievements, votes and community outreach. Rejected attack proposals carry diplomatic consequences. Replay this tutorial using HELP.",
    "Dünya işlerine katıl",
    "World kurumları, üyelik koşullarını, oylamaları ve toplumsal faaliyetleri içerir. Reddedilen saldırıların diplomatik sonuçları vardır. HELP ile eğitimi tekrar açabilirsin.",
    "world",
  ],
];
export function CampaignTutorial() {
  const state = useGameStore(),
    t = state.world.tutorial;
  useEffect(() => {
    if (t.active && state.playerProfile.setupComplete) {
      state.setSpeed(0);
      const foreign =
        t.step === 7
          ? Object.values(state.countries).find(
              (c) =>
                c.id !== state.playerCountryId &&
                (state.countries[state.playerCountryId].diplomacy.relations[
                  c.id
                ]?.score ?? 0) >= 15,
            )?.id
          : undefined;
      state.navigate(steps[t.step][4], foreign);
    }
  }, [t.active, t.step, state.playerProfile.setupComplete]);
  if (!t.active || !state.playerProfile.setupComplete) return null;
  const tr = state.playerProfile.language === "tr",
    step = steps[t.step];
  return (
    <section
      className="tutorial-dialog"
      role="dialog"
      aria-label="Campaign tutorial"
    >
      <small>
        {tr ? "KOMUTA EĞİTİMİ" : "COMMAND TUTORIAL"} · {t.step + 1}/10
      </small>
      <progress max={10} value={t.step + 1} />
      <h2>{step[tr ? 2 : 0]}</h2>
      <p>{step[tr ? 3 : 1]}</p>
      <footer>
        <button onClick={() => state.setTutorial(t.step, false)}>
          {tr ? "Atla" : "SKIP"}
        </button>
        <button
          disabled={t.step === 0}
          onClick={() => state.setTutorial(t.step - 1, true)}
        >
          {tr ? "Geri" : "BACK"}
        </button>
        <button
          className="primary"
          onClick={() => state.setTutorial(t.step + 1, t.step < 9)}
        >
          {t.step === 9 ? (tr ? "Başla" : "FINISH") : tr ? "İleri" : "NEXT"}
        </button>
      </footer>
    </section>
  );
}
