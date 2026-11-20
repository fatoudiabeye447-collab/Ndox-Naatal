from .crops import CROPS, PHASE_FOCUS, moisture_range, phase_label
from .simulator import nutrients

def _range_status(v, lo, hi, low="bas", high="élevé"):
    return low if v < lo else high if v > hi else "ok"

def evaluate(st, real):
    """Construit les valeurs, statuts et alertes à partir de l'état et d'une éventuelle mesure réelle."""
    crop, phase = st["crop"], st["phase"]
    c = CROPS[crop]
    lo, hi = moisture_range(crop, phase)
    nut = nutrients(st)
    soil = st["soil"]
    soil_status = "sec" if soil < lo else "humide" if soil > hi else "optimal"
    hybrid = real is not None
    s_real = "réel" if hybrid else "simulé"

    items = [
        ("ph", "pH du sol", nut["ph"], "", c["ph"], "à vérifier" if not c["ph"][0] <= nut["ph"] <= c["ph"][1] else "ok"),
        ("salinity", "Salinité", nut["salinity"], "dS/m", (0, c["salinity_max"]), "élevé" if nut["salinity"] > c["salinity_max"] else "ok"),
        ("nitrogen", "Azote (N)", nut["nitrogen"], "mg/kg", c["n"], _range_status(nut["nitrogen"], *c["n"])),
        ("phosphorus", "Phosphore (P)", nut["phosphorus"], "mg/kg", c["p"], _range_status(nut["phosphorus"], *c["p"])),
        ("potassium", "Potassium (K)", nut["potassium"], "mg/kg", c["k"], _range_status(nut["potassium"], *c["k"])),
    ]
    nutrient_list = [{"key": k, "label": l, "value": v, "unit": u, "min": r[0], "max": r[1],
                      "status": s, "source": "simulé"} for k, l, v, u, r, s in items]

    alerts = []  # (kind, level, title, message)
    if soil_status == "sec" and not st["pump_on"]:
        alerts.append(("dry_soil", "danger", "Sol sec détecté",
                       f"Humidité {soil:.1f} % sous le seuil minimal ({lo} %) pour {c['label']} en phase {phase_label(phase).lower()}. Arrosage conseillé."))
    if soil_status == "humide":
        alerts.append(("wet_soil", "info", "Sol très humide",
                       f"Humidité {soil:.1f} % au-dessus du maximum ({hi} %). Inutile d'arroser."))
    for n in nutrient_list:
        if n["status"] == "ok":
            continue
        if n["key"] == "ph":
            msg = f"pH simulé {n['value']} hors de la plage {n['min']}–{n['max']} pour {c['label']}. Faire analyser le sol avant toute correction."
        elif n["key"] == "salinity":
            msg = f"Salinité simulée {n['value']} dS/m au-dessus de {n['max']} dS/m pour {c['label']}. Vérifier l'eau d'irrigation et le drainage."
        else:
            msg = (f"{n['label']} simulé à {n['value']} {n['unit']} ({n['status']}, plage {n['min']}–{n['max']}). "
                   "Un apport mérite d'être vérifié.") if n["status"] == "bas" else \
                  f"{n['label']} simulé à {n['value']} {n['unit']}, au-dessus de la plage {n['min']}–{n['max']} : éviter tout apport."
        alerts.append((f"nut_{n['key']}", "warning", f"{n['label']} à vérifier", msg))

    if soil_status == "sec":
        irr = ("Arrosage conseillé", f"Sol sec : {soil:.1f} % pour un minimum de {lo} %. Démarrez la pompe (simulée) ou arrosez.")
    elif soil_status == "humide":
        irr = ("Éviter l'arrosage", f"Humidité {soil:.1f} % au-dessus du maximum de {hi} %.")
    elif soil < lo + 5:
        irr = ("Surveiller l'humidité", f"Humidité {soil:.1f} % proche du minimum ({lo} %). Arrosage probable bientôt.")
    else:
        irr = ("Humidité adaptée", f"{soil:.1f} % dans la plage cible {lo}–{hi} % pour la phase {phase_label(phase).lower()}.")
    bad = [n for n in nutrient_list if n["status"] != "ok"]
    fert_title = f"{len(bad)} paramètre(s) à vérifier" if bad else "Nutriments dans la plage cible"
    fert_detail = " ".join([PHASE_FOCUS[phase]] + c["tips"][:1])

    values = {"soil_moisture": soil, "air_temperature": st["temp"], "air_humidity": st["air"], "rain": nut["rain"]}
    return {
        "parcel": st["parcel"], "mode": "hybride" if hybrid else "simulation",
        "crop": {"id": crop, "label": c["label"], "icon": c["icon"]},
        "phase": {"id": phase, "label": phase_label(phase)},
        "moisture": {"min": lo, "max": hi, "status": soil_status},
        "values": values,
        "sources": {"soil_moisture": s_real, "air_temperature": s_real, "air_humidity": s_real, "rain": "simulé"},
        "nutrients": nutrient_list,
        "pump": {"on": st["pump_on"], "since": st["pump_since"], "simulated": True},
        "recommendations": {"irrigation": {"title": irr[0], "detail": irr[1]},
                            "fertilisation": {"title": fert_title, "detail": fert_detail, "tips": c["tips"]}},
        "_alerts": alerts, "_nut": nut,
    }
