import { useEffect, useState } from 'react';
import { LocaleText, formatLive, translateLive } from '../../i18n/localeText';
import { useAudioSettings } from '../../audio/audioSettings';
import { audio } from '../../audio/audioService';
import { useAdaptiveAudio } from '../../audio/adaptiveAudio';
import type { AmbientMood, Pressure } from '../../audio/ambientMood';
import type { SoundChannel } from '../../presentation/battleEffects';
import '../styles/battleFx.css';

const MOOD_NAME: Record<AmbientMood, string> = { peace: 'Calm', tension: 'Uneasy', crisis: 'Crisis', war: 'War footing' };
const PRESSURE_NAME: Record<Pressure, string> = { inflation: 'High inflation', stability: 'Low stability', chamber: 'Tense chamber or strike', iaea: 'IAEA pressure' };
const CHANNELS: [SoundChannel, string][] = [['ui', 'Interface'], ['war', 'Battle and radio'], ['ambient', 'Ambience']];

/** Phase 5: sound and effect preferences (stored in this browser only, never in a save). */
export function AudioOptions() {
  const a = useAudioSettings();
  const adaptive = useAdaptiveAudio((s) => s.adaptive), setAdaptive = useAdaptiveAudio((s) => s.setAdaptive);
  const mood = useAdaptiveAudio((s) => s.mood), pressures = useAdaptiveAudio((s) => s.pressures);
  const [state, setState] = useState(audio.state());
  useEffect(() => { const t = setInterval(() => setState(audio.state()), 500); return () => clearInterval(t); }, []);
  const slider = (label: string, value: number, set: (v: number) => void, key: string) => (
    <label className="audio-slider" key={key}>
      <span><LocaleText value={label} /></span>
      <input type="range" min={0} max={100} step={5} value={Math.round(value * 100)} disabled={a.muted} aria-label={translateLive(label)} onChange={(e) => set(Number(e.target.value) / 100)} />
      <output>{Math.round(value * 100)}%</output>
    </label>
  );
  return (
    <section className="campaign-options-section audio-options" data-testid="audio-options">
      <div><small><LocaleText value="SOUND AND EFFECTS" /></small><h3><LocaleText value="Sound and effects" /></h3><p><LocaleText value="Sound starts after your first click or key press. Effects only replay recorded results and never change the campaign." /></p></div>
      <label className="audio-toggle"><input type="checkbox" checked={a.muted} onChange={(e) => a.setMuted(e.target.checked)} /><LocaleText value="Mute all sound" /></label>
      {slider('Master volume', a.master, a.setMaster, 'master')}
      {CHANNELS.map(([channel, label]) => slider(label, a.channels[channel], (v) => a.setChannel(channel, v), channel))}
      <label className="audio-toggle"><input type="checkbox" data-testid="audio-adaptive" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} /><LocaleText value="Adaptive ambience: the background tone follows your country" /></label>
      {adaptive && <p className="audio-mood" role="status" data-testid="audio-mood" data-mood={mood}>
        {formatLive('Ambience now: {0}', [translateLive(MOOD_NAME[mood])])}{' '}
        <small>{pressures.length ? pressures.map((p) => translateLive(PRESSURE_NAME[p])).join(', ') : translateLive('No pressure on your country.')}</small>
      </p>}
      <label className="audio-toggle"><input type="checkbox" checked={a.lowEffects} onChange={(e) => a.setLowEffects(e.target.checked)} /><LocaleText value="Low effects: show one summary per battle round" /></label>
      <p className="muted"><LocaleText value="Your system's reduced-motion setting also turns battle animation into summaries." /></p>
      {state === 'unavailable' && <p className="audio-status" role="status"><LocaleText value="Sound could not be loaded. The game continues silently." /></p>}
    </section>
  );
}
