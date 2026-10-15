#!/usr/bin/env python3
"""
BeingSeen 数据管线
把研究用的原始数据 (FITS / CSV / VizieR 星表) 转成前端友好的 JSON。

运行: /opt/anaconda3/bin/python build_data.py
输出: public/data/*.json  +  public/charts/*.png
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# ----------------------------------------------------------------------------
# 路径与常量
# ----------------------------------------------------------------------------
REPO = Path("/Users/eva/Documents/GitHub/BeingSeen_website")
OUT_DATA = Path(__file__).parent / "public" / "data"
OUT_CHARTS = Path(__file__).parent / "public" / "charts"
OUT_DATA.mkdir(parents=True, exist_ok=True)
OUT_CHARTS.mkdir(parents=True, exist_ok=True)

# ZTF 探测极限 (i 波段, AB 星等) —— 与 Subq1 notebook 保持一致
ZTF_LIMITING_MAG = 20.5

# 对不稳定质量间隙 (pair-instability mass gap) 下界, 单位 M_sun
PAIR_INSTABILITY_GAP = 45.0

# 宇宙学 (与 Subq1 notebook 一致)
H0, OM0 = 70.0, 0.3

# 已知引力透镜超新星真实样本 (来自 gISNe_sample.csv)
GISNE_CSV = REPO / "gISNe_sample.csv"


def log(msg: str) -> None:
    print(f"[build_data] {msg}", flush=True)


# ----------------------------------------------------------------------------
# 宇宙学: 平直 ΛCDM 光度距离 (Mpc)
# 手写积分, 避免依赖 astropy.cosmology
# ----------------------------------------------------------------------------
def luminosity_distance_mpc(z: float, h0: float = H0, om0: float = OM0) -> float:
    """平直 ΛCDM 光度距离, 单位 Mpc。"""
    c_km_s = 299792.458
    n = 512
    # 用 Simpson 法积分 1/E(z') dz'
    zs = np.linspace(0.0, z, n + 1)
    ez = 1.0 / np.sqrt(om0 * (1.0 + zs) ** 3 + (1.0 - om0))
    integral = np.trapezoid(ez, zs)
    dh = c_km_s / h0  # Hubble 距离, Mpc
    return dh * integral * (1.0 + z)


def distance_modulus(z: float) -> float:
    d_l = luminosity_distance_mpc(z)
    return 5.0 * math.log10(d_l * 1e5)  # d_l[Mpc] / 10pc = d_l * 1e5


# ============================================================================
# 1. 超新星 (页面二: Lensing & SNe)
# ============================================================================
def build_supernovae() -> dict:
    log("构建超新星数据 ...")
    M_B = -19.25  # SN Ia 峰值绝对星等 (标准值)

    df = pd.read_csv(GISNE_CSV)
    rows = []
    for _, r in df.iterrows():
        z = float(r["redshift"])
        mu = float(r["magnification"])
        dm = distance_modulus(z)
        m_no_lens = M_B + dm
        m_lensed = m_no_lens - 2.5 * math.log10(mu)
        rows.append(
            {
                "name": r["name"],
                "redshift": z,
                "magnification": mu,
                "timeDelayDays": None
                if pd.isna(r["time_delay_days"])
                else float(r["time_delay_days"]),
                "reference": r["reference"],
                "ra": float(r["ra"]),
                "dec": float(r["dec"]),
                "magNoLens": round(m_no_lens, 3),
                "magLensed": round(m_lensed, 3),
                "detectedNoLens": bool(m_no_lens < ZTF_LIMITING_MAG),
                "detectedLensed": bool(m_lensed < ZTF_LIMITING_MAG),
            }
        )

    n_no = sum(1 for x in rows if x["detectedNoLens"])
    n_yes = sum(1 for x in rows if x["detectedLensed"])

    payload = {
        "limitingMag": ZTF_LIMITING_MAG,
        "absoluteMagB": M_B,
        "sampleSize": len(rows),
        "detectedNoLens": n_no,
        "detectedLensed": n_yes,
        "events": rows,
    }
    log(f"  真实样本: {len(rows)} 个, 无透镜可见 {n_no}, 有透镜可见 {n_yes}")
    return payload


def build_mock_supernovae() -> dict:
    """处理 64,309 行的透镜超新星模拟星表 (18MB FITS) → 预聚合 JSON。"""
    log("构建模拟超新星星表 (FITS 18MB, 请稍候) ...")
    from astropy.io import fits

    with fits.open(REPO / "lensed_sn_mock.fits") as hdul:
        d = hdul[1].data
        n = len(d)
        src_z = np.asarray(d["source_redshift"], dtype=float)
        lens_z = np.asarray(d["lens_redshift"], dtype=float)
        mag_i = np.asarray(d["apparent_mag_i_band"], dtype=float)
        mag_first = np.asarray(d["apparent_mag_first_arrival_i_band"], dtype=float)
        mag_matrix = np.asarray(d["magnification"], dtype=float)  # (n, 4)
        sn_type = np.asarray(d["sn_type"], dtype=int)
        v_disp = np.asarray(d["v_disp"], dtype=float)
        image_sep = np.asarray(d["image_sep"], dtype=float)
        time_delay = np.asarray(d["time_delay"], dtype=float)  # (n, 4)
        image_number = np.asarray(d["image_number"], dtype=int)

    # 首个到达像的放大率 (magnification 是 4 个像的数组; 不可见的像为 0)
    with np.errstate(invalid="ignore"):
        mag_pos = np.where(mag_matrix > 0, mag_matrix, np.nan)
    mu_first = np.nanmax(mag_pos, axis=1)
    # 总放大率 = 所有像之和
    mu_total = np.nansum(mag_pos, axis=1)

    # 探测判定: 用"首个到达像"的星等, 因为探测到的是最早到达的那个像。
    # 注意 apparent_mag_i_band (总星等) 的最暗值为 20.64, 在 20.5 极限下无一可探测;
    # 而任何单个像的星等不会亮于总星等, 所以这个判据对样本是保守的。
    detected = mag_first < ZTF_LIMITING_MAG

    def hist(values: np.ndarray, bins: np.ndarray, weights=None) -> dict:
        counts, edges = np.histogram(values, bins=bins, weights=weights)
        return {
            "counts": counts.astype(int).tolist(),
            "edges": [round(float(e), 4) for e in edges],
        }

    # 源红移分布: 全部模拟 vs 可被 ZTF 探测的
    z_bins = np.linspace(0.0, 3.6, 37)
    hist_all_z = hist(src_z, z_bins)
    hist_det_z = hist(src_z[detected], z_bins)

    # 透镜红移分布
    lz_bins = np.linspace(0.0, 2.0, 21)
    hist_all_lz = hist(lens_z, lz_bins)
    hist_det_lz = hist(lens_z[detected], lz_bins)

    # 星等分布 (i 波段)。注意: apparent_mag_first_arrival_i_band 的最亮值 (19.47)
    # 亮于 apparent_mag_i_band 的最亮值 (20.64), 而首个到达像不可能亮于总星等。
    # 该 FITS 文件不含任何来源元数据, 无法判定各列的准确定义, 因此
    # 这里只做分布呈现, 不对二者的物理含义作断言, 也不据此推导"无透镜星等"。
    mag_bins = np.linspace(19.0, 32.0, 53)
    hist_mag = hist(mag_first, mag_bins)
    hist_mag_total = hist(mag_i, mag_bins)

    # 放大率分布 (对数分箱)
    mu_bins = np.logspace(0.0, 2.4, 49)
    hist_mu = hist(mu_total[np.isfinite(mu_total) & (mu_total > 0)], mu_bins)

    # 散点图用抽样 (前端绘图不需 6 万点)
    rng = np.random.default_rng(42)
    n_scatter = 3000
    idx = rng.choice(n, size=min(n_scatter, n), replace=False)
    scatter = [
        {
            "sourceRedshift": round(float(src_z[i]), 3),
            "lensRedshift": round(float(lens_z[i]), 3),
            "mag": round(float(mag_first[i]), 3),
            "mu": round(float(mu_total[i]), 3)
            if np.isfinite(mu_total[i])
            else None,
            "detected": bool(detected[i]),
        }
        for i in idx
    ]

    payload = {
        "totalRows": int(n),
        "detectedByZTF": int(detected.sum()),
        "limitingMag": ZTF_LIMITING_MAG,
        "brightestTotalMag": round(float(np.min(mag_i)), 3),
        "brightestImageMag": round(float(np.min(mag_first)), 3),
        "medianImageMag": round(float(np.median(mag_first)), 3),
        "provenance": (
            "模拟星表文件不含任何来源元数据 (无 TELESCOP/FILTER 关键字), "
            "因此不对其生成所用的巡天或星等系统作断言。"
        ),
        "redshiftDistribution": {
            "all": hist_all_z,
            "detected": hist_det_z,
        },
        "lensRedshiftDistribution": {
            "all": hist_all_lz,
            "detected": hist_det_lz,
        },
        "magnitudeDistribution": hist_mag,
        "magnitudeDistributionTotal": hist_mag_total,
        "magnificationDistribution": hist_mu,
        "scatterSample": scatter,
        "stats": {
            "snTypeCounts": {
                str(int(t)): int((sn_type == t).sum())
                for t in np.unique(sn_type)
            },
            "vDispMedian": round(float(np.median(v_disp)), 1),
            "imageSepMedian": round(float(np.median(image_sep)), 2),
            "imageNumberCounts": {
                str(int(k)): int((image_number == k).sum())
                for k in np.unique(image_number)
            },
            "muTotalMedian": round(float(np.nanmedian(mu_total)), 3),
            "timeDelayMedianAbsDays": round(
                float(np.nanmedian(np.abs(time_delay[np.isfinite(time_delay)]))), 1
            ),
        },
    }
    log(
        f"  模拟星表: {n} 行, 最亮总星等 {payload['brightestTotalMag']}, "
        f"最亮单像星等 {payload['brightestImageMag']}, "
        f"极限 {ZTF_LIMITING_MAG} 下可探测 {int(detected.sum())}"
    )
    return payload


# ============================================================================
# 2. FRB (页面三: Lensing & FRBs)
# ============================================================================
def parse_vizier_mrt(path: Path) -> pd.DataFrame:
    """解析 VizieR 的 byte-by-byte (MRT) 定宽星表。"""
    text = path.read_text(errors="replace")
    lines = text.splitlines()

    # 找到 "Byte-by-byte Description" 段, 解析字段定义
    fields: list[tuple[int, int, str]] = []
    in_desc = False
    pat = re.compile(r"^\s*(\d+)-\s*(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$")
    for ln in lines:
        if "Byte-by-byte Description" in ln:
            in_desc = True
            continue
        if not in_desc:
            continue
        if set(ln.strip()) <= {"-"} and ln.strip():
            continue  # 分隔线
        m = pat.match(ln)
        if m:
            b1, b2, fmt, unit, label, expl = m.groups()
            fields.append((int(b1) - 1, int(b2), label))
        elif ln.strip().startswith("---") or not ln.strip():
            if fields:
                break
    if not fields:
        raise RuntimeError("无法解析 VizieR 字段定义")

    labels = [f[2] for f in fields]
    log(f"  解析到 {len(fields)} 个字段")

    # 数据行以 tns_name (例如 FRB20180725A) 开头。
    # 注意: 星表里既有数据行, 也有以 "FRB" 开头的前言 "FRB ..." 说明文字,
    # 因此用颜色严格的模式: 12 字符 TNS 名称 = FRB + 8 位日期 + 1 位字母
    name_pat = re.compile(r"^FRB\d{8}[A-Z]\b")
    rows = []
    for ln in lines:
        if not name_pat.match(ln):
            continue
        rec = {}
        for (a, b, lab) in fields:
            rec[lab] = ln[a:b].strip() if len(ln) > a else ""
        rows.append(rec)
    df = pd.DataFrame(rows)
    log(f"  解析出 {len(df)} 条记录, 字段数 {len(df.columns)}")
    return df


def find_frb_pairs(events: list[dict]) -> dict:
    """
    在真实 CHIME/FRB 星表上做透镜配对搜索。

    判据 (引力透镜的必要条件):
      1. 两个暴在天空上位置重合 (透镜的多重像不会分离很远)
      2. 色散量 DM 必须相符 (两条光路穿过同一片电离介质, 透镜不改变 DM)
      3. 两个暴都不能是已知重复暴 (重复暴天然会重复, 是伪信号)

    注意: 本项目早期的 notebook 里有一个 dm_diff 列, 记录为 0.0 / 5.2,
    但该列从未在任何 notebook cell 中被计算过 (candidates_df 是残留变量),
    且与星表实际值 (75.8 / 739.5) 严重不符。此处一律以星表原始值为准。
    """
    import itertools

    def parse_date(name: str):
        m = re.search(r"FRB(\d{4})(\d{2})(\d{2})", name)
        if not m:
            return None
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    # 只用非重复暴
    pool = [e for e in events if not e["isRepeater"]]
    n = len(pool)
    log(f"  配对搜索: 非重复暴 {n} 个")

    ra = np.radians(np.array([e["ra"] for e in pool]))
    dec = np.radians(np.array([e["dec"] for e in pool]))
    dm = np.array([e["dm"] for e in pool])

    # 预计算所有角距 < MAX_SEP 的配对
    MAX_SEP = 3.0
    all_pairs = []
    for i, j in itertools.combinations(range(n), 2):
        cos_sep = (
            np.sin(dec[i]) * np.sin(dec[j])
            + np.cos(dec[i]) * np.cos(dec[j]) * np.cos(ra[i] - ra[j])
        )
        sep = float(np.degrees(np.arccos(np.clip(cos_sep, -1.0, 1.0))))
        if sep < MAX_SEP:
            all_pairs.append(
                {
                    "i": i,
                    "j": j,
                    "sep": sep,
                    "dmDiff": float(abs(dm[i] - dm[j])),
                }
            )
    log(f"  角距 < {MAX_SEP}° 的配对: {len(all_pairs)} 对")

    def enrich(p) -> dict:
        A, B = pool[p["i"]], pool[p["j"]]
        da, db = parse_date(A["name"]), parse_date(B["name"])
        delay = abs((da - db).days) if (da and db) else None
        lo, hi = sorted([A["dm"], B["dm"]])
        return {
            "frb1": A["name"],
            "frb2": B["name"],
            "sepDeg": round(p["sep"], 4),
            "dm1": round(A["dm"], 2),
            "dm2": round(B["dm"], 2),
            "dmDiff": round(p["dmDiff"], 2),
            "dmRatio": round(hi / lo, 3) if lo > 0 else None,
            "snr1": A["snr"],
            "snr2": B["snr"],
            "timeDelayDays": delay,
            "ra1": A["ra"],
            "dec1": A["dec"],
            "ra2": B["ra"],
            "dec2": B["dec"],
        }

    enriched = [enrich(p) for p in all_pairs]

    # 漏斗: 逐级收紧判据
    FUNNEL = [
        {
            "label": "Positions overlap (< 1°)",
            "criteria": "sep < 1°",
            "count": sum(1 for p in enriched if p["sepDeg"] < 1.0),
        },
        {
            "label": "+ time delay recorded",
            "criteria": "sep < 1° and delay known",
            "count": sum(
                1 for p in enriched if p["sepDeg"] < 1.0 and p["timeDelayDays"] is not None
            ),
        },
        {
            "label": "+ DM agrees (< 30)",
            "criteria": "sep < 1° and |ΔDM| < 30",
            "count": sum(
                1 for p in enriched if p["sepDeg"] < 1.0 and p["dmDiff"] < 30
            ),
        },
        {
            "label": "+ DM agrees tightly (< 10)",
            "criteria": "sep < 1° and |ΔDM| < 10",
            "count": sum(
                1 for p in enriched if p["sepDeg"] < 1.0 and p["dmDiff"] < 10
            ),
        },
        {
            "label": "+ DM agrees very tightly (< 1)",
            "criteria": "sep < 1° and |ΔDM| < 1",
            "count": sum(
                1 for p in enriched if p["sepDeg"] < 1.0 and p["dmDiff"] < 1
            ),
        },
    ]

    # 通过最严格实用判据的全部配对 (sep < 1° 且 ΔDM < 30)
    survivors = sorted(
        [p for p in enriched if p["sepDeg"] < 1.0 and p["dmDiff"] < 30],
        key=lambda p: p["dmDiff"],
    )

    # 按 DM 相符度排序的最佳配对 (位置放宽到 2°)
    best_by_dm = sorted(
        [p for p in enriched if p["sepDeg"] < 2.0],
        key=lambda p: p["dmDiff"],
    )[:10]

    # 按位置最接近排序
    best_by_sep = sorted(enriched, key=lambda p: p["sepDeg"])[:10]

    # 网站早期声称的两对 —— 用真实值核验
    claimed = []
    by_name = {e["name"]: e for e in events}
    for a, b in [
        ("FRB20181129A", "FRB20181224A"),
        ("FRB20190425B", "FRB20190609B"),
    ]:
        if a in by_name and b in by_name:
            A, B = by_name[a], by_name[b]
            ra1, dec1 = np.radians(A["ra"]), np.radians(A["dec"])
            ra2, dec2 = np.radians(B["ra"]), np.radians(B["dec"])
            sep = float(
                np.degrees(
                    np.arccos(
                        np.clip(
                            np.sin(dec1) * np.sin(dec2)
                            + np.cos(dec1) * np.cos(dec2) * np.cos(ra1 - ra2),
                            -1.0,
                            1.0,
                        )
                    )
                )
            )
            lo, hi = sorted([A["dm"], B["dm"]])
            da, db = parse_date(a), parse_date(b)
            claimed.append(
                {
                    "frb1": a,
                    "frb2": b,
                    "sepDeg": round(sep, 4),
                    "dm1": round(A["dm"], 2),
                    "dm2": round(B["dm"], 2),
                    "dmDiff": round(abs(A["dm"] - B["dm"]), 2),
                    "dmRatio": round(hi / lo, 3) if lo > 0 else None,
                    "timeDelayDays": abs((da - db).days) if (da and db) else None,
                    "passesDmTest": bool(abs(A["dm"] - B["dm"]) < 30),
                }
            )

    return {
        "poolSize": n,
        "maxSepDeg": MAX_SEP,
        "totalPairsWithinMaxSep": len(enriched),
        "funnel": FUNNEL,
        "survivors": survivors,
        "survivorCount": len(survivors),
        "bestByDmAgreement": best_by_dm,
        "bestBySeparation": best_by_sep,
        "claimedPairs": claimed,
        "dmToleranceNote": (
            "Gravitational lensing does not change dispersion measure: both images "
            "travel through the same ionised medium. Any DM difference must come from "
            "the host galaxy along slightly different sightlines, so it should be small "
            "(single digits). Pairs differing by tens or hundreds of pc cm⁻³ cannot be "
            "two images of the same burst."
        ),
    }


def build_frbs() -> dict:
    log("构建 FRB 数据 ...")
    df = parse_vizier_mrt(REPO / "chime_frb_catalog")

    # VizieR 用 -9999 表示缺失值
    df = df.replace("-9999", np.nan).replace(-9999, np.nan)

    def to_num(col: str) -> pd.Series:
        if col not in df.columns:
            return pd.Series(np.nan, index=df.index, dtype=float)
        return pd.to_numeric(df[col], errors="coerce")

    df["ra_n"] = to_num("ra")
    df["dec_n"] = to_num("dec")
    # dm_fitb 是 fitburst 拟合的 DM; bonsai_dm 是探测流水线的 DM。优先用拟合值
    df["dm_n"] = to_num("dm_fitb")
    df["dm_n"] = df["dm_n"].fillna(to_num("bonsai_dm"))
    df["snr_n"] = to_num("bonsai_snr").fillna(to_num("snr_fitb"))
    df["is_rep"] = df["repeater_name"].notna() & (
        df["repeater_name"].astype(str).str.strip() != ""
    )

    # 去重: 同一 FRB 可能出现多行 (重复暴的多次爆发 / 多个子暴)
    df_unique = df.drop_duplicates(subset=["tns_name"]).copy()
    valid = df_unique.dropna(subset=["ra_n", "dec_n", "dm_n"])
    log(f"  原始数据行 {len(df)}, 唯一 FRB {df_unique['tns_name'].nunique()}, 坐标+DM 完整 {len(valid)}")

    events = [
        {
            "name": r["tns_name"],
            "ra": round(float(r["ra_n"]), 4),
            "dec": round(float(r["dec_n"]), 4),
            "dm": round(float(r["dm_n"]), 2),
            "snr": None if pd.isna(r["snr_n"]) else round(float(r["snr_n"]), 1),
            "isRepeater": bool(r["is_rep"]),
        }
        for _, r in valid.iterrows()
    ]

    # 两个干净候选对 (来自 Subq2 notebook 的筛选结果, 已核对)
    candidates = [
        {
            "frb1": "FRB20181129A",
            "frb2": "FRB20181224A",
            "dmDiff": 0.0,
            "timeDelayDays": 24.931106,
        },
        {
            "frb1": "FRB20190425B",
            "frb2": "FRB20190609B",
            "dmDiff": 5.2,
            "timeDelayDays": 44.945751,
        },
    ]

    total = len(events)
    search = find_frb_pairs(events)

    # 最严格判据下的候选数 (位置 < 1° 且 DM 差 < 30)
    tight = search["funnel"][2]["count"]

    payload = {
        "catalogTotal": total,
        "uniqueCount": int(df_unique["tns_name"].nunique()),
        "rawRowCount": int(len(df)),
        "repeaterCount": int(valid["is_rep"].sum()),
        "nonRepeaterCount": total - int(valid["is_rep"].sum()),
        "search": search,
        "reliableCandidateCount": tight,
        "events": events,
    }
    log(
        f"  FRB: {total} 条可用事件 (重复暴 {payload['repeaterCount']}), "
        f"角距<1° 且 ΔDM<30 的可靠候选 = {tight}"
    )
    if search["bestByDmAgreement"]:
        b = search["bestByDmAgreement"][0]
        log(
            f"  DM 相符度最佳: {b['frb1']} <-> {b['frb2']} "
            f"(ΔDM={b['dmDiff']}, sep={b['sepDeg']}°)"
        )
    return payload


# ============================================================================
# 3. 引力波 (页面四: GW Lensing)
# ============================================================================
def build_gravitational_waves() -> dict:
    log("构建引力波数据 ...")
    df = pd.read_csv(REPO / "GWTC-5.0.csv")

    # 筛选: 两个源质量都超过对不稳定间隙下界 —— 与 Subq3 notebook 一致
    # NOTE: *_lower / *_upper 是相对中心值的误差范围 (可正可负), 不是绝对值
    mask = (df["mass_1_source"] > PAIR_INSTABILITY_GAP) & (
        df["mass_2_source"] > PAIR_INSTABILITY_GAP
    )
    gap = df[mask].copy()
    log(f"  质量间隙候选: {len(gap)} 个事件")

    GAP = PAIR_INSTABILITY_GAP
    candidates = []
    for _, r in gap.iterrows():
        m1 = float(r["mass_1_source"])
        m2 = float(r["mass_2_source"])

        # 标准引力波透镜关系: m_obs = m_true * sqrt(mu)
        # 假设真实主质量位于间隙下界 45 M☉ -> mu = (m1 / 45)^2
        sqrt_mu = m1 / GAP
        mu = sqrt_mu**2

        # 单一透镜对所有像施加同一个放大率 -> 质量比保持不变
        # 因此两个质量都用同一个 sqrt(mu) 修正
        m1_corr = m1 / sqrt_mu
        m2_corr = m2 / sqrt_mu

        def asym(center, lo, up, div):
            """按同一个因子缩放非对称误差棒。"""
            return (
                round(float(center + lo) / div, 3),
                round(float(center + up) / div, 3),
            )

        m1_lo, m1_up = asym(
            m1, r["mass_1_source_lower"], r["mass_1_source_upper"], sqrt_mu
        )
        m2_lo, m2_up = asym(
            m2, r["mass_2_source_lower"], r["mass_2_source_upper"], sqrt_mu
        )

        candidates.append(
            {
                "name": r["name"],
                "m1Obs": m1,
                "m2Obs": m2,
                "m1Corr": round(m1_corr, 3),
                "m2Corr": round(m2_corr, 3),
                "m1ObsRange": [
                    round(m1 + r["mass_1_source_lower"], 3),
                    round(m1 + r["mass_1_source_upper"], 3),
                ],
                "m1CorrRange": [m1_lo, m1_up],
                "m2ObsRange": [
                    round(m2 + r["mass_2_source_lower"], 3),
                    round(m2 + r["mass_2_source_upper"], 3),
                ],
                "m2CorrRange": [m2_lo, m2_up],
                "sqrtMu": round(sqrt_mu, 4),
                "mu": round(mu, 4),
                "luminosityDistance": float(r["luminosity_distance"]),
                "luminosityDistanceRange": [
                    round(
                        float(r["luminosity_distance"]) + r["luminosity_distance_lower"],
                        1,
                    ),
                    round(
                        float(r["luminosity_distance"]) + r["luminosity_distance_upper"],
                        1,
                    ),
                ],
                "snr": float(r["network_matched_filter_snr"]),
                "redshift": float(r["redshift"]),
                "pAstro": float(r["p_astro"]) if pd.notna(r["p_astro"]) else None,
                "far": float(r["far"]) if pd.notna(r["far"]) else None,
                "interpretation": (
                    "Single lens cannot change the mass ratio: both masses are "
                    "scaled by the same sqrt(mu). The corrected masses are a "
                    "hypothesis test — the magnification that *would* be required — "
                    "not a measurement of mu."
                ),
            }
        )

    # 全体事件 (用于背景直方图)
    all_events = [
        {
            "name": r["name"],
            "m1": float(r["mass_1_source"]),
            "m2": float(r["mass_2_source"]),
            "distance": float(r["luminosity_distance"]),
            "snr": float(r["network_matched_filter_snr"]),
        }
        for _, r in df.iterrows()
    ]

    payload = {
        "catalogName": "GWTC-5.0",
        "catalogTotal": int(len(df)),
        "gapLowerBound": GAP,
        "candidateCount": len(candidates),
        "candidates": candidates,
        "allEvents": all_events,
    }
    for c in candidates:
        log(
            f"  {c['name']}: m1 {c['m1Obs']} -> {c['m1Corr']} "
            f"(mu={c['mu']}), m2 {c['m2Obs']} -> {c['m2Corr']}"
        )
    return payload


# ============================================================================
# 4. 透镜星表 (3D 星图背景)
# ============================================================================
def build_lenses() -> dict:
    log("构建透镜星表数据 ...")
    df = pd.read_csv(REPO / "lenscat_catalog.csv")
    df.columns = [c.strip() for c in df.columns]

    z_col = [c for c in df.columns if "zlens" in c.lower()][0]
    df[z_col] = pd.to_numeric(df[z_col], errors="coerce")

    df = df.dropna(subset=["RA [deg]", "DEC [deg]"])
    log(f"  lenscat 共 {len(df)} 条, 有红移 {df[z_col].notna().sum()} 条")

    # 抽样以控制前端体积 (天区覆盖用)
    rng = np.random.default_rng(7)
    n_sample = 4000
    idx = rng.choice(len(df), size=min(n_sample, len(df)), replace=False)
    sample = [
        {
            "ra": round(float(df.iloc[i]["RA [deg]"]), 3),
            "dec": round(float(df.iloc[i]["DEC [deg]"]), 3),
            "z": None
            if pd.isna(df.iloc[i][z_col])
            else round(float(df.iloc[i][z_col]), 3),
        }
        for i in idx
    ]

    # 红移直方图
    zs = df[z_col].dropna().values
    counts, edges = np.histogram(zs, bins=np.linspace(0, 2.0, 41))

    payload = {
        "total": int(len(df)),
        "withRedshift": int(df[z_col].notna().sum()),
        "sample": sample,
        "redshiftHistogram": {
            "counts": counts.astype(int).tolist(),
            "edges": [round(float(e), 3) for e in edges],
        },
        "types": {
            str(k): int(v)
            for k, v in df["type"].value_counts().head(12).items()
        },
    }
    log(f"  抽样 {len(sample)} 条用于前端")
    return payload


# ============================================================================
# 5. 图表 (matplotlib → PNG)
# ============================================================================
def build_charts(payload: dict) -> None:
    log("生成图表 ...")
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    sn = payload["supernovae"]
    mock = payload["mockSupernovae"]
    frb = payload["frbs"]
    gw = payload["gravitationalWaves"]

    # ---- 图表 A: 文档要求但缺失的 gisne_theoretical_with_real.png ----
    # 左: 同一批模拟源在"无透镜 / 有透镜"两种情况的星等分布 (理论侧)
    # 右: 真实 gISNe 样本 有/无透镜 亮度对比 (dumbbell, 避免反转轴上的零基线柱)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15.5, 6))
    fig.patch.set_facecolor("#0b1020")

    for ax in (ax1, ax2):
        ax.set_facecolor("#0b1020")
        ax.tick_params(colors="#c9d6e8")
        for s in ax.spines.values():
            s.set_color("#2a3550")
        ax.xaxis.label.set_color("#c9d6e8")
        ax.yaxis.label.set_color("#c9d6e8")
        ax.title.set_color("#eaf2ff")
        ax.grid(alpha=0.15, color="#4a5a80")

    lim = mock["limitingMag"]
    ue = mock["magnitudeDistribution"]["edges"]
    uc = mock["magnitudeDistribution"]["counts"]
    centers = [(ue[i] + ue[i + 1]) / 2 for i in range(len(ue) - 1)]
    width = (ue[1] - ue[0]) * 0.92

    ax1.bar(centers, uc, width=width, color="#3b6ea5", alpha=0.9, zorder=2)
    ax1.bar(
        [c for c in centers if c < lim],
        [n for c, n in zip(centers, uc) if c < lim],
        width=width, color="#27ae60", alpha=0.95, zorder=3,
    )
    ax1.axvline(lim, color="#ffb703", ls="--", lw=2, zorder=4,
                label=f"Detection limit  m = {lim}")
    ax1.set_yscale("log")
    ax1.set_xlabel("Apparent magnitude of the first-arriving image  (i band)")
    ax1.set_ylabel("Number of systems (log scale)")
    ax1.set_title(f"Simulated lensed SNe — N = {mock['totalRows']:,}")

    # 手动图例 (绿色代表可探测区)
    from matplotlib.patches import Patch
    ax1.legend(
        handles=[
            Patch(facecolor="#3b6ea5", label="Below detection limit"),
            Patch(facecolor="#27ae60", label="Above detection limit"),
            plt.Line2D([], [], color="#ffb703", ls="--", lw=2,
                       label=f"Detection limit  m = {lim}"),
        ],
        facecolor="#141c30", edgecolor="#2a3550", labelcolor="#c9d6e8",
        loc="upper left", fontsize=9,
    )
    ax1.text(
        0.97, 0.95,
        f"brightest single image:  {mock['brightestImageMag']:.2f}\n"
        f"median image magnitude:  {mock['medianImageMag']:.2f}\n"
        f"detectable:  {mock['detectedByZTF']} / {mock['totalRows']:,}",
        transform=ax1.transAxes, ha="right", va="top", color="#eaf2ff",
        fontsize=9.5, family="monospace",
        bbox=dict(facecolor="#141c30", edgecolor="#2a3550", boxstyle="round,pad=0.5"),
    )

    # 右: 真实样本 dumbbell
    events = sorted(sn["events"], key=lambda e: e["magNoLens"])
    ys = np.arange(len(events))
    for y, e in zip(ys, events):
        detected = e["detectedLensed"]
        ax2.plot([e["magNoLens"], e["magLensed"]], [y, y],
                 color="#ffb703" if detected else "#5a6b8c", lw=2.8, zorder=2,
                 solid_capstyle="round")
        ax2.scatter([e["magNoLens"]], [y], s=120, color="#c0392b", zorder=3,
                    edgecolor="#0b1020", linewidth=1.2,
                    label="Without lensing" if y == 0 else None)
        ax2.scatter([e["magLensed"]], [y], s=120, color="#27ae60", zorder=3,
                    edgecolor="#0b1020", linewidth=1.2,
                    label="With lensing" if y == 0 else None)
        ax2.text(e["magLensed"] - 0.15, y, f"{e['magLensed']:.1f}", ha="right",
                 va="center", color="#9fe6b8" if detected else "#8b9bb8", fontsize=9)
        ax2.text(e["magNoLens"] + 0.15, y, f"{e['magNoLens']:.1f}", ha="left",
                 va="center", color="#e8a49c", fontsize=9)

    ax2.axvline(lim, color="#ffb703", ls="--", lw=2, zorder=1,
                label=f"ZTF limit  m = {lim}")
    ax2.axvspan(lim, 27.6, color="#c0392b", alpha=0.07, zorder=0)
    ax2.text((lim + 27.6) / 2, 0.35, "undetectable", ha="center",
             color="#e8a49c", fontsize=10, style="italic")
    ax2.text((lim + 17.0) / 2, 0.35, "detectable", ha="center",
             color="#9fe6b8", fontsize=10, style="italic")

    ax2.set_yticks(ys)
    ax2.set_yticklabels([e["name"] for e in events], fontsize=10)
    ax2.set_xlabel("Apparent magnitude  (brighter ←)")
    ax2.set_xlim(17.0, 27.6)
    ax2.set_ylim(len(events) - 0.35, -0.75)
    ax2.set_title("Real gISNe sample: lensing vs no lensing")
    ax2.legend(facecolor="#141c30", edgecolor="#2a3550", labelcolor="#c9d6e8",
               loc="lower left", fontsize=9, framealpha=0.95)

    fig.tight_layout()
    out = OUT_CHARTS / "gisne_theoretical_with_real.png"
    fig.savefig(out, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)
    log(f"  写出 {out.name}")

    # ---- 图表 B: FRB 配对筛选漏斗 ----
    fig, ax = plt.subplots(figsize=(11, 5.8))
    fig.patch.set_facecolor("#0b1020")
    ax.set_facecolor("#0b1020")
    ax.tick_params(colors="#c9d6e8")
    for s in ax.spines.values():
        s.set_color("#2a3550")
    ax.xaxis.label.set_color("#c9d6e8")
    ax.yaxis.label.set_color("#c9d6e8")
    ax.title.set_color("#eaf2ff")

    labels = ["Non-repeaters\nsearched"] + [f["label"] for f in frb["search"]["funnel"]]
    vals = [frb["nonRepeaterCount"]] + [f["count"] for f in frb["search"]["funnel"]]
    colors = ["#3b6ea5", "#4a7fb5", "#6a8fc0", "#c0873b", "#e05252", "#ffb703"][: len(vals)]

    bars = ax.bar(range(len(vals)), vals, color=colors, width=0.6)
    for b, v in zip(bars, vals):
        ax.text(
            b.get_x() + b.get_width() / 2,
            v + max(vals) * 0.02,
            str(v),
            ha="center",
            color="#eaf2ff",
            fontsize=13,
            fontweight="bold",
        )
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=18, ha="right", fontsize=9.5)
    ax.set_ylabel("Number of pairs")
    ax.set_title("Searching for lensed FRB pairs: what survives each cut")
    ax.grid(alpha=0.15, color="#4a5a80", axis="y")
    fig.tight_layout()
    out = OUT_CHARTS / "frb_candidate_filtering.png"
    fig.savefig(out, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)
    log(f"  写出 {out.name}")

    # ---- 图表 B2: DM 相符度 vs 角距 散点 (说明为什么没有候选) ----
    if frb["search"]["bestByDmAgreement"] or frb["search"]["claimedPairs"]:
        fig, ax = plt.subplots(figsize=(11, 6))
        fig.patch.set_facecolor("#0b1020")
        ax.set_facecolor("#0b1020")
        ax.tick_params(colors="#c9d6e8")
        for s in ax.spines.values():
            s.set_color("#2a3550")
        ax.xaxis.label.set_color("#c9d6e8")
        ax.yaxis.label.set_color("#c9d6e8")
        ax.title.set_color("#eaf2ff")
        ax.grid(alpha=0.15, color="#4a5a80")

        # 去掉 symlog 造成的无意义负刻度
        ax.set_yscale("log")
        ax.set_ylim(0.05, 4000)

        # 所有角距 < 2° 的配对 (去重)
        seen = set()
        xs, ys, cs = [], [], []
        for p in frb["search"]["bestBySeparation"] + frb["search"]["bestByDmAgreement"]:
            key = (p["frb1"], p["frb2"])
            if key in seen or p["sepDeg"] > 2.0 or p["dmDiff"] <= 0:
                continue
            seen.add(key)
            xs.append(p["sepDeg"])
            ys.append(p["dmDiff"])
            cs.append("#27ae60" if p["dmDiff"] < 30 else "#e05252")
        ax.scatter(xs, ys, s=95, c=cs, edgecolor="#0b1020", linewidth=1.2, zorder=3)

        # 被否掉的两对声称候选 —— 单独标出来
        claimed_labels = []
        for cp in frb["search"]["claimedPairs"]:
            ax.scatter(
                [cp["sepDeg"]], [cp["dmDiff"]],
                s=240, facecolor="none", edgecolor="#ffb703", linewidth=2.2, zorder=4,
            )
            claimed_labels.append(cp)

        ax.axhline(30, color="#ffb703", ls="--", lw=1.8, label="|ΔDM| = 30  (acceptable)")
        ax.axvline(1.0, color="#4da3ff", ls="--", lw=1.8, label="separation = 1°  (overlap)")

        # 只给被否掉的两对 + DM 最相符的一对加标签, 避免堆叠
        to_label = claimed_labels[:2] + frb["search"]["bestByDmAgreement"][:1]
        offsets = [(14, 10), (14, -18), (14, 12)]
        for cp, off in zip(to_label, offsets):
            ax.annotate(
                f"{cp['frb1']}\n{cp['frb2']}",
                (cp["sepDeg"], cp["dmDiff"]),
                textcoords="offset points",
                xytext=off,
                color="#e8eefc",
                fontsize=8.5,
                arrowprops=dict(arrowstyle="-", color="#4a5a80", lw=0.8),
            )

        ax.set_xlim(0, 2.1)
        ax.set_xlabel("Angular separation (degrees)")
        ax.set_ylabel("|ΔDM|  (pc cm⁻³, log scale)")
        ax.set_title(
            "A lensed pair must sit in the bottom-left corner — nothing does\n"
            "gold rings = the two pairs an earlier analysis flagged"
        )
        ax.legend(facecolor="#141c30", edgecolor="#2a3550", labelcolor="#c9d6e8", fontsize=9)

        fig.tight_layout()
        out = OUT_CHARTS / "frb_dm_vs_separation.png"
        fig.savefig(out, dpi=160, facecolor=fig.get_facecolor())
        plt.close(fig)
        log(f"  写出 {out.name}")

    # ---- 图表 C: GW 观测质量 vs 修正质量 (带误差棒) ----
    fig, ax = plt.subplots(figsize=(10, 5.8))
    fig.patch.set_facecolor("#0b1020")
    ax.set_facecolor("#0b1020")
    ax.tick_params(colors="#c9d6e8")
    for s in ax.spines.values():
        s.set_color("#2a3550")

    cands = gw["candidates"]
    x = np.arange(len(cands))
    w = 0.2

    def yerr_for(center, rng):
        return [[max(0.0, center - rng[0])], [max(0.0, rng[1] - center)]]

    series = [
        ("m1Obs", "m1ObsRange", "#c0392b", "m₁ observed", -1.5),
        ("m1Corr", "m1CorrRange", "#2e86de", "m₁ corrected", -0.5),
        ("m2Obs", "m2ObsRange", "#e67e22", "m₂ observed", 0.5),
        ("m2Corr", "m2CorrRange", "#27ae60", "m₂ corrected", 1.5),
    ]
    for key, rng_key, color, label, offset in series:
        heights = [c[key] for c in cands]
        errs = np.hstack(
            [yerr_for(c[key], c[rng_key]) for c in cands]
        ).reshape(2, len(cands))
        ax.bar(x + offset * w, heights, w, yerr=errs, color=color,
               capsize=3, label=label, alpha=0.92)

    ax.axhline(
        gw["gapLowerBound"], color="#ffb703", ls="--", lw=1.8,
        label=f"Mass-gap boundary  {gw['gapLowerBound']} M☉",
    )
    ax.set_xticks(x)
    ax.set_xticklabels([c["name"] for c in cands], fontsize=10)
    ax.set_ylabel("Mass  (M☉)")
    ax.set_title("Observed vs lensing-corrected black hole masses")
    ax.grid(alpha=0.15, color="#4a5a80", axis="y")
    ax.legend(facecolor="#141c30", edgecolor="#2a3550", labelcolor="#c9d6e8", fontsize=9)
    fig.tight_layout()
    out = OUT_CHARTS / "gw_mass_correction.png"
    fig.savefig(out, dpi=160, facecolor=fig.get_facecolor())
    plt.close(fig)
    log(f"  写出 {out.name}")


# ============================================================================
# JSON 序列化辅助
# ============================================================================
def jsonable(obj):
    """
    递归把 NaN / inf / numpy 标量转成合法 JSON。
    注意: json.dumps 默认会把 NaN 写成裸 NaN, 那不是合法 JSON,
    浏览器/打包器会直接报 "Unable to make a module from invalid JSON"。
    """
    if obj is None or isinstance(obj, (str, bool)):
        return obj
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, (int,)):
        return obj
    if isinstance(obj, np.floating):
        v = float(obj)
        return v if math.isfinite(v) else None
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, dict):
        return {str(k): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return [jsonable(v) for v in obj.tolist()]
    # pandas NA / NaT
    try:
        if pd.isna(obj):
            return None
    except (TypeError, ValueError):
        pass
    return obj


def write_json(path: Path, payload: dict) -> None:
    """写出严格合法的 JSON (NaN → null)。"""
    clean = jsonable(payload)
    # allow_nan=False 会在我漏掉 NaN 时立刻抛错, 而不是产出坏文件
    text = json.dumps(clean, separators=(",", ":"), allow_nan=False)
    path.write_text(text)
    log(f"  写出 {path.name} ({len(text)/1024:.0f} KB)")


# ============================================================================
# 主流程
# ============================================================================
def main() -> None:
    overall = {
        "generatedBy": "build_data.py",
        "supernovae": build_supernovae(),
        "mockSupernovae": build_mock_supernovae(),
        "frbs": build_frbs(),
        "gravitationalWaves": build_gravitational_waves(),
        "lenses": build_lenses(),
    }

    # 分开写, 便于前端按页加载
    files = {
        "supernovae.json": ["supernovae", "mockSupernovae"],
        "frbs.json": ["frbs"],
        "gravitational-waves.json": ["gravitationalWaves"],
        "lenses.json": ["lenses"],
    }
    for fname, keys in files.items():
        payload = {"generatedBy": overall["generatedBy"]}
        for k in keys:
            payload[k] = overall[k]
        write_json(OUT_DATA / fname, payload)

    build_charts(overall)

    log("完成。")


if __name__ == "__main__":
    main()
