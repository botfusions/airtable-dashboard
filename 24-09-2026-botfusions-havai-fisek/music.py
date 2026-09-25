"""Gösterinin müziğini tamamen hesaplamayla üretir (sadece numpy).

120 BPM, 30 sn, D minör. Bütün olaylar vuruş numarasıyla yazılır: vuruş n = n * 0,5 sn.
index.html'deki koreografi de aynı ızgarayı kullandığı için görüntü ile müzik kaymaz.

Yapı:
  ölçü 1–4   (0–8 sn)     pad
  ölçü 5–6   (8–12 sn)    kick ve bas girer
  12–13 sn                hi-hat eklenir
  13–14 sn                kick durur (nefes)
  14 ve 14,5 sn           kalp atışı vuruşları
  ölçü 8–12  (15–24 sn)   clap, supersaw akorlar, arpej; 20 sn'den sonra onaltılık hi-hat
  ölçü 13    (24–25,9 sn) kırılma: riser ve hızlanan trampet
  25,9–26 sn              tam sessizlik
  26 sn                   drop (BOTFUSIONS kilitlenmesi)
Kick her çaldığında pad, akor, arpej ve bas bir anlık kısılır (sidechain).

Kullanım: python3 music.py muzik.wav beats.json
"""
import json
import sys
import wave

import numpy as np

SR = 48000
BPM = 120
TOTAL = 30.0
DROP = 26.0
SILENCE = (25.9, 26.0)
N = int(TOTAL * SR)
rng = np.random.default_rng(2026)


def b(n):
    """Vuruş numarasını saniyeye çevirir."""
    return n * 60.0 / BPM


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def put(dst, sig, t, gain=1.0):
    i = int(round(t * SR))
    if i >= len(dst):
        return
    s = sig[:len(dst) - i]
    dst[i:i + len(s)] += s * gain


def env_ad(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = max(1, int(attack * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e


def saw(freq, n, phase):
    t = np.arange(n) / SR
    return 2 * ((freq * t + phase) % 1.0) - 1


# ---------------------------------------------------------------- akorlar
CHORDS = {
    'Dm': [50, 57, 62, 65, 69],
    'Bb': [46, 53, 58, 62, 65],
    'F': [53, 57, 60, 65, 69],
    'C': [48, 55, 60, 64, 67],
    'A': [45, 52, 57, 61, 64],
}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'A': 33}
# ölçü başına akor (ölçü = 2 sn, 15 ölçü)
PROG = ['Dm', 'Bb', 'F', 'C'] * 3 + ['A', 'Dm', 'Dm']
DETUNE = [-22, -13, -6, 0, 6, 13, 22]  # cent, 7 sesli supersaw


def supersaw_seg(notes, dur, attack, release, spread=1.0):
    """Bir ölçülük stereo supersaw akor; kuyruğu release kadar taşar."""
    n = int((dur + release) * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in notes:
        f0 = midi(m)
        for k, c in enumerate(DETUNE):
            s = saw(f0 * 2 ** (c * spread / 1200), n, rng.random())
            pan = (k / (len(DETUNE) - 1)) * 2 - 1
            L += s * (1 - pan) * .5
            R += s * (1 + pan) * .5
    t = np.arange(n) / SR
    e = np.minimum(1, t / attack) * np.clip((dur + release - t) / release, 0, 1)
    k = 1 / (len(notes) * len(DETUNE))
    return L * e * k, R * e * k


def kick():
    n = int(.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 105 * np.exp(-t / .03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .28)
    click = band(rng.standard_normal(n), 1500, 8000) * np.exp(-t / .004) * .4
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(.4 * SR)
    nz = band(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for d in (0, .011, .022):
        i = int(d * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / (.012 if d < .02 else .13))
    return nz * e * .5


def hat(open_=False):
    n = int((.25 if open_ else .06) * SR)
    return band(rng.standard_normal(n), 7000, 16000) * env_ad(n, .001, .09 if open_ else .018)


def snare(center):
    n = int(.18 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05) * .5
    return (band(rng.standard_normal(n), center * .5, center * 2.5) * np.exp(-t / .06) + body) * .6


def reverb(x, sec=2.6, decay=.6):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = band(rng.standard_normal(n) * np.exp(-t / decay), 150, 7000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << (len(x) + n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]


def main():
    out_wav = sys.argv[1] if len(sys.argv) > 1 else 'muzik.wav'
    out_json = sys.argv[2] if len(sys.argv) > 2 else 'beats.json'

    # vuruş listeleri
    kicks = [b(n) for n in range(16, 26)] + [b(28), b(29)] + [b(n) for n in range(30, 48)] + [b(n) for n in range(52, 60)]
    claps = [b(n) for n in range(30, 48) if n % 2 == 1] + [b(n) for n in range(52, 60) if n % 2 == 1]

    # sidechain eğrisi: kick anında 1, 130 ms'de söner
    duck = np.zeros(N)
    tail = np.exp(-np.arange(int(.5 * SR)) / SR / .13)
    for tk in kicks:
        i = int(round(tk * SR))
        seg = duck[i:i + len(tail)]
        np.maximum(seg, tail[:len(seg)], out=seg)

    padL, padR = np.zeros(N), np.zeros(N)
    leadL, leadR = np.zeros(N), np.zeros(N)
    arp = np.zeros(N)
    bass = np.zeros(N)
    drums = np.zeros(N)
    fx = np.zeros(N)

    for bar, ch in enumerate(PROG):
        t0 = bar * 2.0
        L, R = supersaw_seg(CHORDS[ch], 2.0, .5, .6, spread=.8)
        put(padL, L, t0)
        put(padR, R, t0)
        # parlak akorlar: 16–24 sn ve drop sonrası
        if 8 <= bar <= 11 or bar >= 13:
            L, R = supersaw_seg([m + 12 for m in CHORDS[ch][2:]], 2.0, .02, .25)
            g = 1.3 if bar >= 13 else 1.0
            put(leadL, L, t0, g)
            put(leadR, R, t0, g)
        # bas: arka zamanlarda sekizlikler
        if 4 <= bar <= 11 or bar >= 13:
            for k in range(4):
                n = bar * 4 + k
                if n in (26, 27):
                    continue
                tn = b(n + .5)
                ln = int(.22 * SR)
                s = np.tanh(saw(midi(ROOT[ch]), ln, 0) * 2) * env_ad(ln, .004, .12)
                put(bass, s, tn)
        # arpej: 16–24 sn ve drop sonrası onaltılıklar
        if 8 <= bar <= 11 or bar >= 13:
            notes = CHORDS[ch][1:] + [CHORDS[ch][2] + 12]
            for k in range(16):
                ln = int(.14 * SR)
                s = saw(midi(notes[k % len(notes)] + 12), ln, rng.random()) * env_ad(ln, .002, .05)
                put(arp, s, t0 + k * b(.25), .9 if k % 4 == 0 else .6)

    for tk in kicks:
        put(drums, kick(), tk, 1.0)
    # kalp atışı: kick'e alçak tom
    for tk in (b(28), b(29)):
        ln = int(.6 * SR)
        t = np.arange(ln) / SR
        put(drums, np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t / .05)) / SR) * np.exp(-t / .3), tk, .8)
    for tc in claps:
        put(drums, clap(), tc, .55)
    # hi-hat: 12 sn'den sekizlik arka zaman, 20 sn'den onaltılık
    for n in range(24, 48):
        if n in (26, 27):
            continue
        put(drums, hat(), b(n + .5), .22)
        if n >= 40:
            put(drums, hat(), b(n + .25), .1)
            put(drums, hat(), b(n + .75), .1)
    for n in range(52, 60):
        put(drums, hat(True), b(n + .5), .2)
        put(drums, hat(), b(n + .25), .1)
        put(drums, hat(), b(n + .75), .1)
    # kırılma: hızlanan trampet
    t = b(48)
    step = b(.5)
    while t < SILENCE[0] - .02:
        prog = (t - b(48)) / (SILENCE[0] - b(48))
        put(drums, snare(900 + 2500 * prog), t, .15 + .5 * prog)
        step = b(.5) if t < b(50) else b(.25) if t < b(51) else b(.125)
        t += step

    # riser: 24 → 25,9 sn
    r0, r1 = b(48), SILENCE[0]
    ln = int((r1 - r0) * SR)
    tt = np.arange(ln) / SR
    prog = tt / (r1 - r0)
    nz = rng.standard_normal(ln)
    riser = np.zeros(ln)
    for lo, hi, w0 in ((300, 1200, 0), (1200, 4000, .33), (4000, 12000, .66)):
        w = np.clip((prog - w0) / .34, 0, 1) * np.clip((w0 + .68 - prog) / .34, 0, 1) if w0 < .66 else np.clip((prog - w0) / .34, 0, 1)
        riser += band(nz, lo, hi) * w
    f = 150 * (10 ** prog)
    riser += np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    put(fx, riser * prog ** 1.5, r0, .55)
    # drop darbesi
    ln = int(2.6 * SR)
    tt = np.arange(ln) / SR
    impact = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt / .08)) / SR) * np.exp(-tt / .9)
    crash = band(rng.standard_normal(ln), 3500, 15000) * np.exp(-tt / 1.1) * .45
    put(fx, impact + crash, DROP, 1.0)

    # sidechain ve seviyeler
    pad_amp = np.where(np.arange(N) / SR < 8, 2.2, 1.3)
    padL *= pad_amp * (1 - .55 * duck)
    padR *= pad_amp * (1 - .55 * duck)
    leadL *= 1.1 * (1 - .75 * duck)
    leadR *= 1.1 * (1 - .75 * duck)
    arp = band(arp, 200, 3500) * .16 * (1 - .6 * duck)
    bass = band(bass, 30, 550) * .42 * (1 - .8 * duck)
    padL, padR = band(padL, 60, 1500), band(padR, 60, 1500)
    leadL, leadR = band(leadL, 120, 6500), band(leadR, 120, 6500)

    wet_src_L = padL + leadL + arp * .8 + drums * .15
    wet_src_R = padR + leadR + arp * 1.2 + drums * .15
    L = padL + leadL + arp * .8 + bass + drums + fx + reverb(wet_src_L) * .35
    R = padR + leadR + arp * 1.2 + bass + drums + fx + reverb(wet_src_R) * .35

    # drop öncesi tam sessizlik (5 ms kenar yumuşatma) ve kapanış
    t = np.arange(N) / SR
    gate = np.clip(np.maximum((SILENCE[0] - t) / .005, (t - SILENCE[1]) / .005), 0, 1)
    gate *= np.clip((TOTAL - t) / .7, 0, 1)
    st = np.stack([L * gate, R * gate], 1)
    st = np.tanh(st / (np.percentile(np.abs(st), 99.9) + 1e-9) * .8)
    st *= .89 / np.max(np.abs(st))

    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())
    json.dump({'bpm': BPM, 'drop': DROP, 'silence': list(SILENCE), 'kicks': kicks, 'claps': claps},
              open(out_json, 'w'), indent=1)
    print(f'{out_wav}: {TOTAL:.0f} sn, {len(kicks)} kick, drop {DROP} sn')


if __name__ == '__main__':
    main()
