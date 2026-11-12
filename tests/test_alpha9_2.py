"""Regressões: reatividade dos seis campos das fichas clássicas.

Executar: python3 -m pytest -q tests/test_alpha9_2.py
O teste estrutural garante que cada atualização de phase / p recomputa os progressos
em uma variável $: do Svelte, em vez de uma chamada opaca dentro de {@const}.
"""
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
BOTTOM = (ROOT / 'src/components/BottomTechnical.svelte').read_text(encoding='utf-8')
LEGACY = (ROOT / 'src/components/LegacyShape.svelte').read_text(encoding='utf-8')


def legacy_phase(time: float, duration: float, entrance=1.3, exit=0.5):
    d = max(0.05, duration)
    out = min(exit, d * .25)
    entering = min(entrance, d * .65)
    if time >= d or time <= 0:
        return 0.0
    if time < d - out:
        return min(time, entering) * (entrance / entering)
    return entrance * max(0.0, min((d - time) / out, 1.0))


def stage(phase: float, start: float, length: float):
    x = max(0.0, min((phase - start) / max(.001, length), 1.0))
    return 1 - (1 - x) ** 3


def test_bottom_reactivity_explicit():
    assert '$: rowReveals = Array.from({ length: 6 }' in BOTTOM
    assert 'legacyStage(p, .32 + .085 * i, .28)' in BOTTOM
    assert '{@const revealed = rowReveals[i]}' in BOTTOM
    assert '{@const revealed = rowProgress(i)}' not in BOTTOM


def test_legacy_reactivity_explicit():
    assert '$: rowReveals = Array.from({ length: 6 }' in LEGACY
    assert 'legacyStage(phase, .55 + .09 * i, .32)' in LEGACY
    assert '{@const progress = rowReveals[i]}' in LEGACY
    assert '{@const p = rowReveals[i]}' in LEGACY
    assert 'rowProgress(i)' not in LEGACY


def test_bottom_six_lines_appear_and_exit():
    duration = 5.3
    def vis(t):
        p = legacy_phase(t, duration)
        return [stage(p, .32 + .085 * i, .28) for i in range(6)]
    assert all(a == 0 for a in vis(0))
    assert any(a > 0 for a in vis(.5))
    assert all(math.isclose(a, 1.0) for a in vis(2.6))
    assert any(a < 1 for a in vis(5.1))
    assert all(a == 0 for a in vis(5.3))
    assert vis(.5)[0] > vis(.5)[5]


def test_legacy_six_lines_appear_and_exit():
    duration = 5.3
    def vis(t):
        p = legacy_phase(t, duration, 1.43, .65)
        return [stage(p, .55 + .09*i, .32) for i in range(6)]
    assert all(a == 0 for a in vis(0))
    assert vis(.9)[0] > vis(.9)[5]
    assert all(math.isclose(a, 1.0) for a in vis(2.6))
    assert all(a == 0 for a in vis(5.3))
