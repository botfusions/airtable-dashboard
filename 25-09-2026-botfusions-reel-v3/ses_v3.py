"""Reel v3 ses bandı: 128 BPM müzik + kesmelerle eşleşen ses efektleri (sadece numpy).

Müzik 64 vuruş (30 sn). Kick ilk vuruştan başlar; 52–55,75. vuruşlar kırılma
(riser ve hızlanan trampet), 55,75–56 tam sessizlik, 56. vuruşta drop.
Ses efektleri, sayfanın darbe listesinden (render.mjs CUES=cues.json) okunur,
böylece her kesme ve darbe kendi sesini alır.

Kullanım: python3 ses_v3.py cues.json cikti.wav [muzik_only.wav]
"""
import json
import sys
import wave

import numpy as np

SR = 48000
BPM = 128
BT = 60 / BPM
TOTAL = 30.0
N = int(TOTAL * SR)
rng = np.random.default_rng(128)


def b(n):
    return n * BT


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


def put(dst, sig, t, g=1.0):
    i = int(round(t * SR))
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= len(dst):
        return
    s = sig[:len(dst) - i]
    dst[i:i + len(s)] += s * g


def env(n, a, d):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    k = max(1, int(a * SR))
    e[:k] *= np.linspace(0, 1, k)
    return e


def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + ph) % 1.0) - 1


def noise(sec):
    return rng.standard_normal(int(sec * SR))


# ------------------------------------------------------------------ enstrümanlar
def kick():
    n = int(.42 * SR)
    t = np.arange(n) / SR
    f = 48 + 120 * np.exp(-t / .028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .26)
    click = band(noise(.42), 1500, 9000) * np.exp(-t / .004) * .5
    return np.tanh((body + click) * 1.8)


def clap():
    n = int(.35 * SR)
    nz = band(noise(.35), 900, 6000)
    e = np.zeros(n)
    for d in (0, .01, .02):
        i = int(d * SR)
        e[i:] += np.exp(-np.arange(n - i) / SR / (.011 if d < .02 else .12))
    return nz * e * .55


def hat(op=False):
    n = int((.22 if op else .05) * SR)
    return band(noise(n / SR), 7500, 16000) * env(n, .001, .08 if op else .014)


def snare(c):
    n = int(.16 * SR)
    t = np.arange(n) / SR
    return (band(noise(.16), c * .5, c * 2.4) * np.exp(-t / .05) + np.sin(2 * np.pi * 200 * t) * np.exp(-t / .04) * .4) * .6


def supersaw(notes, dur, a, r, spread=1.0):
    n = int((dur + r) * SR)
    L, R = np.zeros(n), np.zeros(n)
    det = [-22, -13, -6, 0, 6, 13, 22]
    for m in notes:
        for j, c in enumerate(det):
            s = saw(midi(m) * 2 ** (c * spread / 1200), n, rng.random())
            pan = j / (len(det) - 1) * 2 - 1
            L += s * (1 - pan) * .5
            R += s * (1 + pan) * .5
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.clip((dur + r - t) / r, 0, 1)
    k = 1 / (len(notes) * len(det)) ** .5
    return L * e * k, R * e * k


def reverb(x, sec=2.2, d=.5):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = band(rng.standard_normal(n) * np.exp(-t / d), 150, 7000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << (len(x) + n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]


CH = {'Dm': [50, 57, 62, 65, 69], 'Bb': [46, 53, 58, 62, 65], 'F': [53, 57, 60, 65, 69], 'C': [48, 55, 60, 64, 67], 'A': [45, 52, 57, 61, 64]}
ROOT = {'Dm': 38, 'Bb': 34, 'F': 41, 'C': 36, 'A': 33}
PROG = ['Dm', 'Bb', 'F', 'C'] * 3 + ['A', 'Dm', 'Bb', 'Dm']  # 16 ölçü × 4 vuruş


def music():
    L, R = np.zeros(N), np.zeros(N)
    padL, padR, leadL, leadR = (np.zeros(N) for _ in range(4))
    arp, bass, drums, fx = (np.zeros(N) for _ in range(4))
    kicks = [n for n in range(0, 52) if n != 11] + list(range(56, 64))
    for bar, ch in enumerate(PROG):
        t0 = b(bar * 4)
        l, r = supersaw(CH[ch], b(4), .3, .5, .7)
        put(padL, l, t0)
        put(padR, r, t0)
        if 3 <= bar <= 12 or bar >= 14:
            l, r = supersaw([m + 12 for m in CH[ch][2:]], b(4), .01, .2)
            put(leadL, l, t0, 1.25 if bar >= 14 else 1)
            put(leadR, r, t0, 1.25 if bar >= 14 else 1)
            notes = CH[ch][1:] + [CH[ch][2] + 12]
            for q in range(16):
                ln = int(.12 * SR)
                put(arp, saw(midi(notes[q % len(notes)] + 12), ln, rng.random()) * env(ln, .002, .045), t0 + q * b(.25), .9 if q % 4 == 0 else .55)
        if bar != 13:
            roll = 9.5 <= bar <= 12
            for q in range(16 if roll else 4):
                n = bar * 4 + (q * .25 if roll else q + .5)
                if 11 <= n < 12:
                    continue
                ln = int((.1 if roll else .2) * SR)
                put(bass, np.tanh(saw(midi(ROOT[ch]), ln) * 2.2) * env(ln, .003, .09 if roll else .12), b(n))
    for n in kicks:
        put(drums, kick(), b(n))
    for n in range(4, 64):
        if n % 2 == 1 and not (52 <= n < 56) and n != 11:
            put(drums, clap(), b(n), .6)
    for n in range(0, 64):
        if 52 <= n < 56:
            continue
        put(drums, hat(n >= 56), b(n + .5), .25)
        if n >= 20:
            put(drums, hat(), b(n + .25), .12)
            put(drums, hat(), b(n + .75), .12)
    # trampet dolguları ve kırılma
    for n0, n1 in ((10, 11.9), (50, 52)):
        t = b(n0)
        while t < b(n1) - .01:
            p = (t - b(n0)) / (b(n1) - b(n0))
            put(drums, snare(900 + 2600 * p), t, .15 + .45 * p)
            t += b(.25)
    t = b(52)
    while t < b(55.75) - .02:
        p = (t - b(52)) / (b(55.75) - b(52))
        put(drums, snare(900 + 3000 * p), t, .15 + .6 * p)
        t += b(.5) if p < .4 else b(.25) if p < .75 else b(.125)
    # riser'lar ve darbeler
    for r0, r1, g in ((b(9.5), b(11.9), .35), (b(52), b(55.75), .6)):
        ln = int((r1 - r0) * SR)
        tt = np.arange(ln) / SR / (r1 - r0)
        rs = band(noise(ln / SR), 2000, 12000) * tt ** 2 + np.sin(2 * np.pi * np.cumsum(180 * 10 ** tt) / SR) * .25 * tt
        put(fx, rs, r0, g)
    for n, g in ((0, .9), (12, .9), (56, 1.2)):
        ln = int(2.4 * SR)
        tt = np.arange(ln) / SR
        put(fx, np.sin(2 * np.pi * np.cumsum(36 + 70 * np.exp(-tt / .07)) / SR) * np.exp(-tt / .8) + band(noise(2.4), 3500, 15000) * np.exp(-tt / 1.0) * .4, b(n), g)
    # sidechain
    duck = np.zeros(N)
    tail = np.exp(-np.arange(int(.45 * SR)) / SR / .12)
    for n in kicks:
        i = int(round(b(n) * SR))
        seg = duck[i:i + len(tail)]
        np.maximum(seg, tail[:len(seg)], out=seg)
    padL, padR = band(padL * (1 - .5 * duck), 60, 1600) * .9, band(padR * (1 - .5 * duck), 60, 1600) * .9
    leadL, leadR = band(leadL * (1 - .75 * duck), 150, 7000) * .75, band(leadR * (1 - .75 * duck), 150, 7000) * .75
    arp = band(arp, 250, 4000) * .14 * (1 - .6 * duck)
    bass = band(bass, 30, 600) * .5 * (1 - .8 * duck)
    wet = reverb(padL + leadL + arp + drums * .12), reverb(padR + leadR + arp + drums * .12)
    L = padL + leadL + arp * .8 + bass + drums + fx + wet[0] * .3
    R = padR + leadR + arp * 1.2 + bass + drums + fx + wet[1] * .3
    return np.stack([L, R], 1), duck


# ------------------------------------------------------------------ ses efektleri
def sfx(kind, g):
    if kind == 'hit':
        n = int(.35 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * np.cumsum(60 + 140 * np.exp(-t / .02)) / SR) * np.exp(-t / .09) + band(noise(.35), 1200, 9000) * np.exp(-t / .03) * .7) * g, 0
    if kind == 'boom':
        n = int(1.6 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * np.cumsum(32 + 80 * np.exp(-t / .06)) / SR) * np.exp(-t / .5) * 1.2 + band(noise(1.6), 60, 900) * np.exp(-t / .3) * .6) * g, 0
    if kind == 'whoosh':
        d = .42; n = int(d * SR); tt = np.arange(n) / n
        x = np.zeros(n)
        nz = noise(d)
        for lo, hi, w0 in ((300, 1500, 0), (1500, 5000, .35), (5000, 14000, .7)):
            w = np.clip(1 - abs(tt - w0 - .15) / .3, 0, 1)
            x += band(nz, lo, hi) * w
        return x * np.sin(np.pi * tt) ** .7 * g * .8, -d * .85
    if kind == 'zap':
        n = int(.12 * SR); t = np.arange(n) / SR
        f = 1800 * np.exp(-t / .03) + 200
        sq = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
        return np.round(sq * 4) / 4 * np.exp(-t / .04) * .35 * g, 0
    if kind == 'pop':
        n = int(.09 * SR); t = np.arange(n) / SR
        f0 = 900 + rng.random() * 900
        return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.5 * np.exp(-t / .01))) / SR) * np.exp(-t / .03) * .45 * g, 0
    if kind == 'tick':
        n = int(.05 * SR)
        return band(noise(.05), 2500, 12000) * env(n, .0005, .008) * .8 * g, 0
    if kind == 'count':
        n = int(.4 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * 880 * t) * np.exp(-t / .15) * .45 + np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-t / .02)) / SR) * np.exp(-t / .12)) * g, 0
    if kind == 'crash':
        n = int(2.0 * SR); t = np.arange(n) / SR
        return band(noise(2.0), 4000, 16000) * np.exp(-t / .9) * .5 * g, 0
    if kind == 'riser':
        d = 2 * BT; n = int(d * SR); tt = np.arange(n) / n
        return band(noise(d), 3000, 14000) * tt ** 2 * .35 * g, 0
    return None, 0


def main():
    cues = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    mus, duck = music()
    fxL, fxR = np.zeros(N), np.zeros(N)
    for c in cues:
        s, off = sfx(c['kind'], c['g'])
        if s is None:
            continue
        pan = (rng.random() - .5) * .5
        put(fxL, s * (1 - pan) * .7, c['t'] + off)
        put(fxR, s * (1 + pan) * .7, c['t'] + off)
    fx = np.stack([fxL, fxR], 1)
    fx /= np.percentile(np.abs(fx), 99.9) + 1e-9
    mus /= np.percentile(np.abs(mus), 99.9) + 1e-9
    t = np.arange(N) / SR
    gate = np.clip(np.maximum((b(55.75) - t) / .004, (t - b(56)) / .004), 0, 1)
    gate *= np.clip((TOTAL - t) / .12, 0, 1)
    mix = (mus * .82 + fx * .48 * (1 - .25 * duck)[:, None]) * gate[:, None]
    mix = np.tanh(mix * .95)
    mix *= .95 / np.max(np.abs(mix))
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    if len(sys.argv) > 3:
        m = mus * .9 / np.max(np.abs(mus)) * gate[:, None]
        with wave.open(sys.argv[3], 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((m * 32767).astype('<i2').tobytes())
    print(f'{out}: {len(cues)} ipucu, 128 BPM, drop {b(56):.2f} sn')


if __name__ == '__main__':
    main()
