"""Tanıtım müziği: 96 BPM, 48 vuruş = 30 sn, sakin ve zarif (sadece numpy).

Akış (vuruş): 0–6 pad girişi ve logoda derin çan, 6'dan itibaren yumuşak kick ve
pluck arpej, 12'den rim, 20'den hafif hi-hat. Adım düğümlerinde (29,8 / 32,4 / 35)
çan. 38–40 yumuşak yükseliş, 39,5'te davul susar, 40'ta çözülen akor (kapanış),
son 1,5 sn sönümlenir.

Kullanım: python3 muzik.py cikti.wav
"""
import sys
import wave

import numpy as np

SR = 48000
BPM = 96
BT = 60 / BPM
TOTAL = 30.0
N = int(TOTAL * SR)
rng = np.random.default_rng(96)


def b(n):
    return n * BT


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))


def hp(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (fc / np.maximum(f, 1e-3)) ** 4), len(x))


def put(dst, sig, t, g=1.0):
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[..., -i:], 0
    if i >= dst.shape[-1]:
        return
    s = sig[..., :dst.shape[-1] - i]
    dst[..., i:i + s.shape[-1]] += s * g


def tt(d):
    return np.arange(int(d * SR)) / SR


# akorlar (MIDI): her 4 vuruşta bir; Fmaj7 – G6 – Em7 – Am9 döngüsü
CH = [[53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62], [57, 60, 64, 71]]
ROOT = [41, 43, 40, 45]
FIN = [53, 57, 60, 64, 67]  # Fmaj9: kapanış


def chord_at(beat):
    return int(beat // 4) % 4


def pad(notes, d, bright=1.0):
    t = tt(d)
    s = np.zeros((2, len(t)))
    for m in notes:
        for ch, det in ((0, -.07), (1, .07)):
            for dt in (-1, 0, 1):
                f = hz(m + det * dt)
                ph = rng.uniform(0, 2 * np.pi)
                s[ch] += np.sin(2 * np.pi * f * t + ph) + .25 * bright * np.sin(4 * np.pi * f * t + ph)
    a = np.clip(t / .9, 0, 1) * np.clip((d - t) / 1.2, 0, 1)
    return s * a / (len(notes) * 3)


def pluck(m, d=.7):
    t = tt(d)
    f = hz(m)
    s = (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)) * np.exp(-t / .16)
    s *= np.clip(t / .004, 0, 1)
    return s


def bell(m, d=3.0):
    t = tt(d)
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .5) + .25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .25)
    return s * np.clip(t / .003, 0, 1)


def kick(g=1.0):
    t = tt(.5)
    f = 45 + 70 * np.exp(-t / .045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / .22) * g


def rim():
    t = tt(.12)
    n = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t / .02)
    return n * .5 + np.sin(2 * np.pi * 1700 * t) * np.exp(-t / .015) * .3


def hat():
    t = tt(.08)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / .018)


def reverb(x, secs=2.6, mix=.28):
    L = int(secs * SR)
    t = np.arange(L) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(L) * np.exp(-t / (secs / 5))
        ir = lp(ir, 5000)
        ir /= np.sqrt((ir ** 2).sum())
        n = len(x[ch]) + L
        nf = 1 << (n - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[ch], nf) * np.fft.rfft(ir, nf), nf)[:len(x[ch])]
        out[ch] = x[ch] + mix * y
    return out


def main():
    out = sys.argv[1]
    mus = np.zeros((2, N))
    drums = np.zeros((2, N))

    # pad: 0–40 döngü, 40'tan sonra kapanış akoru
    for bar in range(10):
        s = bar * 4
        if s >= 40:
            break
        put(mus, pad(CH[bar % 4], b(4) + 1.2, .8 if s < 6 else 1.0), b(s) - .3, .34 if s >= 4 else .26)
    put(mus, pad(FIN, TOTAL - b(40) + .5, 1.2), b(40), .42)

    # bas
    for bar in range(10):
        s = bar * 4
        if s < 6 or s >= 40:
            continue
        for off in (0, 2.5):
            if s + off >= 39.5:
                continue
            t = tt(b(1.4))
            f = hz(ROOT[bar % 4] - 12)
            put(mus, np.stack([np.sin(2 * np.pi * f * t) * np.exp(-t / .5)] * 2) * np.clip(t / .01, 0, 1), b(s + off), .32)
    t = tt(4.5)
    put(mus, np.stack([np.sin(2 * np.pi * hz(29) * t) * np.exp(-t / 1.6)] * 2), b(40), .45)

    # pluck arpej (sekizlik), 6–39.5
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for i in range(int(6 * 2), int(39.5 * 2)):
        beat = i / 2
        notes = CH[chord_at(beat)]
        m = notes[pat[i % 8]] + 12
        pan = .5 + .35 * np.sin(i * .9)
        s = pluck(m)
        put(mus, np.stack([s * (1 - pan), s * pan]) * 1.4, b(beat), .16 if beat < 20 else .19)
    # kapanışta seyrek arpej
    for j, m in enumerate([65, 69, 72, 76, 79, 76, 72]):
        s = pluck(m + 12, 1.2)
        put(mus, np.stack([s, s]), b(41 + j * .5), .09)

    # çanlar: logo, adım düğümleri, kapanış
    for beat, m, g in [(1.0, 72, .22), (29.8, 76, .16), (32.4, 79, .16), (35.0, 84, .16), (40.3, 77, .24), (43.6, 84, .14)]:
        s = bell(m)
        put(mus, np.stack([s, s]), b(beat), g)

    # yumuşak yükseliş 38–40
    t = tt(b(2))
    sw = lp(rng.standard_normal(len(t)), 3000) * (t / t[-1]) ** 2 * .12
    put(mus, np.stack([sw, sw]), b(38))

    # davullar
    for beat in range(6, 48):
        if 39.5 <= beat < 41:
            continue
        g = .55 if beat < 12 else .7
        if beat >= 41:
            g = .5
        if beat >= 46:
            continue
        put(drums, np.stack([kick(g)] * 2), b(beat))
        if beat >= 12 and beat % 2 == 1:
            r = rim()
            put(drums, np.stack([r * .8, r]), b(beat), .5)
    for i in range(40, 79):
        beat = i / 2
        if beat >= 39.5:
            break
        h = hat()
        put(drums, np.stack([h * .7, h]), b(beat) + (.012 if i % 2 else 0), .09 if i % 2 else .05)

    # kick altında hafif sidechain
    duck = np.ones(N)
    for beat in range(6, 46):
        if 39.5 <= beat < 41:
            continue
        i = int(b(beat) * SR)
        n = min(int(.3 * SR), N - i)
        duck[i:i + n] *= 1 - .35 * np.exp(-np.arange(n) / SR / .09)
    mus *= duck

    mix = reverb(mus, 2.8, .3) + reverb(drums, 1.2, .12)
    tsec = np.arange(N) / SR
    mix *= np.clip(tsec / .25, 0, 1) * np.clip((TOTAL - tsec) / 1.5, 0, 1)
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix /= np.abs(mix).max() / .89
    pcm = (mix.T * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{out}: {TOTAL} sn, {BPM} BPM')


if __name__ == '__main__':
    main()
