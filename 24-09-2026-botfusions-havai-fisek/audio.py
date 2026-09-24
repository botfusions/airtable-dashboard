"""Gösterinin olay listesinden (events.json) stereo ses bandı sentezler.

Her patlama, fırlatma, ıslık, çıtırtı ve şelale sesi, sayfanın render sırasında
kaydettiği zaman, kazanç ve pan değerleriyle yeniden üretilir. Ses gecikmesi
(uzaklık / ses hızı) sayfada zaten hesaplandığı için burada eklenmez.
Kullanım: python3 audio.py events.json cikti.wav [sure_sn]
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(924)


def band(x, lo, hi):
    """FFT ile yumuşak kenarlı bant geçiren filtre."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, n)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def env(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def sweep(f0, f1, sec, curve='exp'):
    t = np.arange(int(sec * SR)) / SR
    if curve == 'exp':
        f = f1 + (f0 - f1) * np.exp(-t * 4.0)
    else:
        f = f0 + (f1 - f0) * t / sec
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def v_boom(g):
    n = int(2.6 * SR)
    body = sweep(72, 30, 2.6) * env(n, .008, .36) * .9
    rumble = band(noise(2.6), 25, 260) * env(n, .01, .75) * 2.2
    crack = band(noise(2.6), 700, 4200) * env(n, .002, .05) * .9
    return (body + rumble + crack) * g


def v_mine(g):
    n = int(.7 * SR)
    return (band(noise(.7), 900, 5000) * env(n, .001, .045) * 1.1
            + sweep(95, 45, .7) * env(n, .004, .12) * .5) * g


def v_launch(g):
    n = int(.45 * SR)
    return (sweep(130, 55, .45) * env(n, .004, .07) * .45
            + band(noise(.45), 250, 1400) * env(n, .003, .1) * .6) * g


def v_whistle(g, dur):
    t = np.arange(int(dur * SR)) / SR
    f = 900 + 1600 * t / dur + 35 * np.sin(2 * np.pi * 13 * t)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    e = np.minimum(1, t / .15) * np.minimum(1, (dur - t) / .1)
    return s * e * .06 * g


def v_crackle(g, dur):
    n = int((dur + .1) * SR)
    out = np.zeros(n)
    click = band(noise(.02), 2200, 12000) * env(int(.02 * SR), 0, .003)
    for _ in range(int(30 + dur * 26)):
        i = rng.integers(0, n - len(click))
        out[i:i + len(click)] += click * rng.uniform(.1, .5)
    return out * g


def v_pop(g):
    n = int(.1 * SR)
    return band(noise(.1), 900, 3500) * env(n, .001, .018) * .6 * g


def v_hiss(g, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / .8) * np.minimum(1, (dur - t) / .8)
    s = band(noise(dur), 2800, 11000) * e * .16
    return (s + v_crackle(.25, dur)[:n]) * g


def reverb(x, sec=3.0):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / .75)
    ir = band(ir, 60, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    N = 1 << (L - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[:len(x)]


def main():
    ev_path, out_path = sys.argv[1], sys.argv[2]
    total = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
    events = json.load(open(ev_path))
    n = int(total * SR)
    L = np.zeros(n + SR * 3)
    R = np.zeros(n + SR * 3)
    for e in events:
        k, g, d = e['kind'], e['gain'], e.get('dur', 0)
        sig = {'boom': lambda: v_boom(g), 'mine': lambda: v_mine(g), 'launch': lambda: v_launch(g),
               'whistle': lambda: v_whistle(g, max(d, .3)), 'crackle': lambda: v_crackle(g, max(d, .5)),
               'pop': lambda: v_pop(g), 'hiss': lambda: v_hiss(g, max(d, 1))}.get(k)
        if sig is None:
            continue
        s = sig()
        i = int(e['t'] * SR)
        if i >= n or i < 0:
            continue
        s = s[:len(L) - i]
        a = (e['pan'] + 1) * np.pi / 4
        L[i:i + len(s)] += s * np.cos(a)
        R[i:i + len(s)] += s * np.sin(a)
    # uzak su ve şehir uğultusu
    amb = band(noise(len(L) / SR), 30, 380)[:len(L)] * .05
    L += amb
    R += np.roll(amb, 2400)
    wetL, wetR = reverb(L), reverb(R)
    L = L + wetL * .55
    R = R + wetR * .55
    L, R = L[:n], R[:n]
    # açılış/kapanış fade
    t = np.arange(n) / SR
    fade = np.minimum(1, t / 1.0) * np.clip((total - t) / .7, 0, 1)
    st = np.stack([L * fade, R * fade], 1)
    st = np.tanh(st / (np.percentile(np.abs(st), 99.95) + 1e-9) * .9) * .95
    st /= np.max(np.abs(st)) / .97
    pcm = (st * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{len(events)} olay -> {out_path}')


if __name__ == '__main__':
    main()
