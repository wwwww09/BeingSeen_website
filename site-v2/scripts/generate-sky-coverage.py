#!/usr/bin/env python3
"""
Build the 10,000-point mock-SN sky-coverage dataset.

The mock catalogue is deliberately constructed to match the stated result:
6,843 matches to Lenscat within 5.7 deg, 3,157 outside. Matched points are
sampled uniformly inside a 5.7 deg spherical cap around a Lenscat lens;
unmatched points are rejection-sampled from the rest of the sky. The nearest
lens and its angular separation are stored for every point so the UI can
explain both matched and unmatched hovers.

Usage:
    python3 scripts/generate-sky-coverage.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
LENS_PATH = ROOT / "public" / "lens_data.json"
OUT_PATH = ROOT / "public" / "sky_coverage.json"

TOTAL = 10_000
MATCHED = 6_843
UNMATCHED = TOTAL - MATCHED
MATCH_RADIUS_DEG = 5.7
SEED = 20261026


def unit_vectors(ra_deg: np.ndarray, dec_deg: np.ndarray) -> np.ndarray:
    ra = np.radians(ra_deg)
    dec = np.radians(dec_deg)
    return np.column_stack(
        [np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)]
    )


def random_sphere(rng: np.random.Generator, n: int) -> np.ndarray:
    ra = rng.random(n) * 2 * np.pi
    dec = np.arcsin(2 * rng.random(n) - 1)
    return np.column_stack(
        [np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)]
    )


def nearest_lens(points: np.ndarray, lens_xyz: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    best_dot = np.empty(len(points), dtype=np.float64)
    best_index = np.empty(len(points), dtype=np.int32)
    for start in range(0, len(points), 500):
        chunk = points[start : start + 500]
        dots = chunk @ lens_xyz.T
        index = np.argmax(dots, axis=1)
        best_index[start : start + 500] = index
        best_dot[start : start + 500] = dots[np.arange(len(chunk)), index]
    separation = np.degrees(np.arccos(np.clip(best_dot, -1.0, 1.0)))
    return best_index, separation


def main() -> None:
    lens_data = json.loads(LENS_PATH.read_text())
    lenses = lens_data["lenses"]
    lens_ra = np.array([row["ra"] for row in lenses], dtype=np.float64)
    lens_dec = np.array([row["dec"] for row in lenses], dtype=np.float64)
    lens_xyz = unit_vectors(lens_ra, lens_dec)
    rng = np.random.default_rng(SEED)

    # ---- matched SNe: uniform inside a 5.7 deg spherical cap around a lens
    chosen = rng.integers(0, len(lenses), size=MATCHED)
    anchor = lens_xyz[chosen]
    tangent_a = rng.normal(size=(MATCHED, 3))
    tangent_a -= (np.sum(tangent_a * anchor, axis=1, keepdims=True) * anchor)
    tangent_a /= np.linalg.norm(tangent_a, axis=1, keepdims=True)
    tangent_b = np.cross(anchor, tangent_a)

    cos_radius = math.cos(math.radians(MATCH_RADIUS_DEG))
    cos_theta = 1.0 - rng.random(MATCHED) * (1.0 - cos_radius)
    sin_theta = np.sqrt(np.maximum(0.0, 1.0 - cos_theta**2))
    phi = rng.random(MATCHED) * 2 * np.pi
    matched_xyz = (
        anchor * cos_theta[:, None]
        + (tangent_a * np.cos(phi)[:, None] + tangent_b * np.sin(phi)[:, None])
        * sin_theta[:, None]
    )
    matched_xyz /= np.linalg.norm(matched_xyz, axis=1, keepdims=True)

    # ---- unmatched SNe: rejection sample outside every 5.7 deg cap
    unmatched_xyz_parts: list[np.ndarray] = []
    kept = 0
    while kept < UNMATCHED:
        batch = random_sphere(rng, 4_000)
        max_dot = np.empty(len(batch), dtype=np.float64)
        for start in range(0, len(batch), 500):
            chunk = batch[start : start + 500]
            max_dot[start : start + 500] = np.max(chunk @ lens_xyz.T, axis=1)
        keep = batch[max_dot < cos_radius - 1e-9]
        if len(keep):
            unmatched_xyz_parts.append(keep)
            kept += len(keep)
    unmatched_xyz = np.vstack(unmatched_xyz_parts)[:UNMATCHED]

    # ---- combine, classify by the nearest lens, and export compact arrays
    points = np.vstack([matched_xyz, unmatched_xyz])
    matched_flags = np.concatenate(
        [np.ones(MATCHED, dtype=np.int8), np.zeros(UNMATCHED, dtype=np.int8)]
    )
    order = rng.permutation(len(points))
    points = points[order]
    matched_flags = matched_flags[order]

    lens_index, separation = nearest_lens(points, lens_xyz)
    ra = np.degrees(np.arctan2(points[:, 1], points[:, 0])) % 360.0
    dec = np.degrees(np.arcsin(np.clip(points[:, 2], -1.0, 1.0)))

    # Guard against floating-point blur at the cap boundary.
    assert int(matched_flags.sum()) == MATCHED
    assert np.all(separation[matched_flags == 1] <= MATCH_RADIUS_DEG + 1e-6)
    assert np.all(separation[matched_flags == 0] > MATCH_RADIUS_DEG)

    payload = {
        "meta": {
            "total": TOTAL,
            "matched": MATCHED,
            "unmatched": UNMATCHED,
            "coverage": round(MATCHED / TOTAL * 100, 2),
            "matchRadius": MATCH_RADIUS_DEG,
            "lensCount": len(lenses),
            "seed": SEED,
        },
        "ra": np.round(ra, 3).tolist(),
        "dec": np.round(dec, 3).tolist(),
        "matched": matched_flags.tolist(),
        "lens": lens_index.astype(int).tolist(),
        "sep": np.round(separation, 3).tolist(),
    }
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"wrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KB)")
    print(payload["meta"])
    print(
        "matched sep range",
        float(separation[matched_flags == 1].min()),
        float(separation[matched_flags == 1].max()),
    )
    print(
        "unmatched sep range",
        float(separation[matched_flags == 0].min()),
        float(separation[matched_flags == 0].max()),
    )


if __name__ == "__main__":
    main()
