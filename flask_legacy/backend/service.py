"""Orchestration : met à jour la simulation, génère notifications et historique."""
import time
from datetime import datetime, timezone

from . import database as db, simulator as sim
from .crops import CROPS, phase_ids, phase_label, moisture_range
from .logic import evaluate

ESP32_FRESH_S = 35
NOTIF_COOLDOWN_S = 300
RECORD_EVERY_S = 10

def _iso(ts=None):
    return datetime.fromtimestamp(ts or time.time(), timezone.utc).isoformat()

def _load(now):
    st = db.get_state()
    if st is None:
        st = sim.new_state(now)
        db.set_state(st)
    return st

def _fresh_esp32(now):
    r = db.latest_esp32()
    if not r:
        return None
    try:
        age = now - datetime.fromisoformat(r["received_at"]).timestamp()
    except (ValueError, TypeError):
        return None
    return r if 0 <= age <= ESP32_FRESH_S else None

def _notify(st, now, kind, level, title, msg):
    last = st["last_notif"].get(kind, 0)
    if now - last >= NOTIF_COOLDOWN_S:
        st["last_notif"][kind] = now
        db.add_notification(_iso(now), level, kind, title, msg)

def snapshot():
    with db.LOCK:
        now = time.time()
        st = _load(now)
        real = _fresh_esp32(now)
        was_mode = st.get("mode")
        sim.advance(st, now, real)
        data = evaluate(st, real)
        lo, hi = data["moisture"]["min"], data["moisture"]["max"]

        # Arrêt automatique de sécurité (simulé) quand la cible est atteinte
        if st["pump_on"] and st["soil"] >= hi:
            st["pump_on"], st["pump_since"] = False, None
            db.add_event(_iso(now), "pompe", "Pompe arrêtée automatiquement (humidité cible atteinte) — simulé")
            _notify(st, now, "target_reached", "success", "Humidité cible atteinte",
                    f"Humidité {st['soil']:.1f} % ≥ {hi} %. La pompe simulée a été arrêtée.")
            data = evaluate(st, real)

        mode = data["mode"]
        if was_mode and was_mode != mode:
            db.add_event(_iso(now), "systeme", "Capteurs ESP32 détectés : mode hybride" if mode == "hybride"
                         else "Plus de mesure ESP32 récente : retour à la simulation complète")
        st["mode"] = mode

        for kind, level, title, msg in data.pop("_alerts"):
            _notify(st, now, kind, level, title, msg)
        nut = data.pop("_nut")

        if now - st["last_record"] >= RECORD_EVERY_S:
            st["last_record"] = now
            v = data["values"]
            db.save_reading({"ts": _iso(now), "parcel": st["parcel"], "crop": st["crop"], "phase": st["phase"],
                             "mode": mode, "soil_moisture": round(v["soil_moisture"], 1),
                             "air_temperature": v["air_temperature"], "air_humidity": v["air_humidity"],
                             "ph": nut["ph"], "salinity": nut["salinity"], "nitrogen": nut["nitrogen"],
                             "phosphorus": nut["phosphorus"], "potassium": nut["potassium"],
                             "moisture_min": lo, "moisture_max": hi, "pump_on": int(st["pump_on"])})
        db.set_state(st)
        data["updated_at"] = _iso(now)
        data["unread"] = db.unread_count()
        return data

def set_pump(action):
    with db.LOCK:
        now = time.time()
        st = _load(now)
        real = _fresh_esp32(now)
        sim.advance(st, now, real)
        lo, hi = moisture_range(st["crop"], st["phase"])
        if action == "start":
            if st["pump_on"]:
                return {"ok": True, "message": "La pompe est déjà en marche (simulée)."}, 200
            if st["soil"] >= hi:
                return {"ok": False, "message": f"Humidité déjà au-dessus du maximum ({hi} %). Démarrage refusé."}, 409
            st["pump_on"], st["pump_since"] = True, _iso(now)
            db.add_event(_iso(now), "pompe", "Pompe démarrée manuellement — simulé")
            msg = "Pompe démarrée (simulation)."
        elif action == "stop":
            if not st["pump_on"]:
                return {"ok": True, "message": "La pompe est déjà à l'arrêt."}, 200
            st["pump_on"], st["pump_since"] = False, None
            db.add_event(_iso(now), "pompe", "Pompe arrêtée manuellement — simulé")
            msg = "Pompe arrêtée (simulation)."
        else:
            return {"ok": False, "message": "action doit être 'start' ou 'stop'"}, 400
        db.set_state(st)
        return {"ok": True, "message": msg, "pump_on": st["pump_on"]}, 200

def set_settings(body):
    crop, phase = body.get("crop"), body.get("phase")
    if crop not in CROPS or phase not in phase_ids():
        return {"ok": False, "message": "Culture ou phase invalide"}, 400
    with db.LOCK:
        now = time.time()
        st = _load(now)
        changed = (st["crop"], st["phase"]) != (crop, phase)
        st["crop"], st["phase"], st["last_notif"] = crop, phase, {}
        db.set_state(st)
        if changed:
            db.add_event(_iso(now), "culture", f"{CROPS[crop]['label']} · phase {phase_label(phase).lower()} sélectionnées")
    return {"ok": True, "message": "Culture et phase enregistrées"}, 200

def reset_simulation():
    with db.LOCK:
        now = time.time()
        old = _load(now)
        st = sim.new_state(now, old["crop"], old["phase"])
        db.set_state(st)
        db.add_event(_iso(now), "systeme", "Simulation réinitialisée (sol à 65 %)")
    return {"ok": True, "message": "Simulation réinitialisée"}, 200
