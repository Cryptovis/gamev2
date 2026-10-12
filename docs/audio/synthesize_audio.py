"""Rule of Nations (RON) — original sound effects for Phase 5 (0.90.0-playtest.14).

Every sound is synthesized here from sine waves and seeded noise; no recordings or third-party samples are used.
Run from the repository root:  python3 docs/audio/synthesize_audio.py
Requires numpy, scipy and ffmpeg (libopus, libmp3lame). Output: public/assets/audio/<name>.webm and .mp3.
The same seed gives byte-identical WAV data; the encoders may differ slightly between ffmpeg versions.
Licence: original work of RON Interactive, recorded in docs/ASSET_MANIFEST.md.
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

RATE = 48000
OUT = os.path.join('public', 'assets', 'audio')
rng = np.random.default_rng(20261014)


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def env(n, attack=0.005, release=0.1, total=None):
    """Linear attack, exponential release over n samples."""
    a = max(1, int(RATE * attack))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    tail = np.arange(n - a) / RATE
    e[a:] = np.exp(-tail / max(1e-3, release))
    return e


def lowpass(x, cutoff):
    """One-pole low-pass filter (cutoff in Hz, scalar or per-sample array)."""
    if np.isscalar(cutoff):
        from scipy.signal import lfilter
        alpha = 1 - np.exp(-2 * np.pi * cutoff / RATE)
        return lfilter([alpha], [1, alpha - 1], x)
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha[i] * (x[i] - acc)
        y[i] = acc
    return y


def bandpass(x, low, high):
    return lowpass(x, high) - lowpass(x, low)


def normalize(x, peak=0.8):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def tone(freq, seconds, shape='sine'):
    tt = t(seconds)
    phase = 2 * np.pi * np.cumsum(np.broadcast_to(freq, tt.shape)) / RATE
    if shape == 'saw':
        return 2 * ((phase / (2 * np.pi)) % 1) - 1
    return np.sin(phase)


def ui_click():
    n = int(RATE * 0.045)
    noise = bandpass(rng.standard_normal(n), 1500, 6000) * env(n, 0.001, 0.008)
    ping = np.sin(2 * np.pi * 2100 * t(0.045)) * env(n, 0.001, 0.012)
    return normalize(noise * 0.6 + ping * 0.5, 0.5)


def ui_confirm():
    a = tone(660, 0.09) * env(int(RATE * 0.09), 0.004, 0.05)
    b = tone(990, 0.16) * env(int(RATE * 0.16), 0.004, 0.08)
    return normalize(np.concatenate([a, b]) + 0.25 * np.concatenate([tone(1320, 0.09) * env(int(RATE * 0.09), 0.004, 0.03), np.zeros(int(RATE * 0.16))]), 0.55)


def war_alarm():
    seconds = 1.6
    tt = t(seconds)
    # Two alternating tones gated four times: an alert, not a siren imitation.
    gate = (np.floor(tt * 5) % 2 == 0).astype(float)
    freq = np.where(np.floor(tt * 2.5) % 2 == 0, 740, 587)
    x = tone(freq, seconds, 'saw') * gate
    x = lowpass(x, 3200) * env(len(tt), 0.01, 1.2)
    return normalize(x, 0.6)


def radio_chirp():
    n1 = int(RATE * 0.14)
    squelch = bandpass(rng.standard_normal(n1), 400, 3000) * env(n1, 0.002, 0.05) * 0.5
    beep = tone(1180, 0.07) * env(int(RATE * 0.07), 0.002, 0.04)
    gap = np.zeros(int(RATE * 0.03))
    beep2 = tone(1480, 0.07) * env(int(RATE * 0.07), 0.002, 0.04)
    return normalize(np.concatenate([squelch, gap, beep, gap, beep2]), 0.5)


def artillery_fire():
    seconds = 0.7
    n = int(RATE * seconds)
    boom = tone(np.linspace(90, 38, n), seconds) * env(n, 0.002, 0.18)
    crack = lowpass(rng.standard_normal(n), np.linspace(4000, 300, n)) * env(n, 0.001, 0.06)
    return normalize(boom * 0.9 + crack * 0.7, 0.85)


def impact(distant=False):
    seconds = 1.1
    n = int(RATE * seconds)
    rumble = lowpass(rng.standard_normal(n), np.linspace(2200 if not distant else 700, 120, n)) * env(n, 0.003, 0.35)
    thump = tone(np.linspace(70, 30, n), seconds) * env(n, 0.002, 0.25)
    x = rumble * 1.0 + thump * 0.8
    return normalize(x, 0.45 if distant else 0.85)


def capture():
    notes = [523.25, 659.25, 783.99]
    parts = []
    for i, f in enumerate(notes):
        d = 0.14 if i < 2 else 0.42
        s = lowpass(tone(f, d, 'saw'), 2400) + 0.3 * tone(f * 2, d)
        parts.append(s * env(len(s), 0.01, 0.08 if i < 2 else 0.3))
    return normalize(np.concatenate(parts), 0.5)


def unit_lost():
    seconds = 0.9
    x = lowpass(tone(np.linspace(392, 196, int(RATE * seconds)), seconds, 'saw'), 1400) * env(int(RATE * seconds), 0.01, 0.4)
    return normalize(x, 0.45)


def loop(seconds, layers):
    """Seamless loop: render a little longer and crossfade the tail into the head."""
    fade = int(RATE * 1.5)
    n = int(RATE * seconds) + fade
    x = layers(n)
    head, tail = x[:fade], x[-fade:]
    ramp = np.linspace(0, 1, fade)
    body = x[:n - fade].copy()
    body[:fade] = head * ramp + tail * (1 - ramp)
    return body


def ambient_command():
    def layers(n):
        tt = np.arange(n) / RATE
        drone = 0.5 * np.sin(2 * np.pi * 55 * tt) + 0.35 * np.sin(2 * np.pi * 82.6 * tt + 0.7) + 0.15 * np.sin(2 * np.pi * 110.3 * tt)
        drone *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.05 * tt)
        air = lowpass(rng.standard_normal(n), 500) * 0.35
        return normalize(drone + air, 0.3)
    return loop(24, layers)


def ambient_war():
    def layers(n):
        tt = np.arange(n) / RATE
        drone = 0.5 * np.sin(2 * np.pi * 41 * tt) + 0.3 * np.sin(2 * np.pi * 61.7 * tt)
        bed = lowpass(rng.standard_normal(n), 260) * 0.5
        thumps = np.zeros(n)
        for start in rng.uniform(0.5, n / RATE - 2, 9):
            i = int(start * RATE)
            m = int(RATE * 1.2)
            seg = impact(distant=True)[:m] * rng.uniform(0.3, 0.7)
            thumps[i:i + len(seg)] += seg[: max(0, min(len(seg), n - i))]
        return normalize(drone + bed + thumps, 0.35)
    return loop(30, layers)


SOUNDS = {
    'ui-click': ui_click,
    'ui-confirm': ui_confirm,
    'war-alarm': war_alarm,
    'radio-chirp': radio_chirp,
    'artillery-fire': artillery_fire,
    'impact': impact,
    'impact-distant': lambda: impact(distant=True),
    'capture': capture,
    'unit-lost': unit_lost,
    'ambient-command': ambient_command,
    'ambient-war': ambient_war,
}


def write_wav(path, x):
    data = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            wav = os.path.join(tmp, name + '.wav')
            write_wav(wav, make())
            ambient = name.startswith('ambient')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', '64k' if ambient else '80k', '-map_metadata', '-1', os.path.join(OUT, name + '.webm')], check=True)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '96k' if ambient else '112k', '-map_metadata', '-1', os.path.join(OUT, name + '.mp3')], check=True)
            print(name)


if __name__ == '__main__':
    main()
