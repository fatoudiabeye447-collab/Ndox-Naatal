"""Simulation de la parcelle : assèchement progressif, pompe, nutriments.

Tout ce qui sort d'ici est SIMULÉ. Vitesse réglable : variable d'environnement
NDOX_SIM_SPEED (1 = ~2 %/min d'assèchement ; 5 = démo accélérée).
"""
import math
import os
import random
from datetime import datetime

SPEED = float(os.environ.get("NDOX_SIM_SPEED", "1"))
DRY_PER_MIN = 2.0      # % d'humidité perdus par minute à 28 °C
PUMP_PER_MIN = 12.0    # % d'humidité gagnés par minute pompe active
N_USE_PER_MIN = 0.25   # mg/kg d'azote consommés par minute
MAX_STEP = 60          # secondes max prises en compte par mise à jour

BASE = {"ph": 5.8, "salinity": 1.7, "nitrogen": 45.0, "phosphorus": 35.0, "potassium": 48.0, "rain": 0.0}

def new_state(now, crop="tomate", phase="croissance"):
    return {
        "parcel": "Parcelle de Miss", "crop": crop, "phase": phase,
        "soil": 65.0, "temp": 28.0, "air": 65.0,
        "pump_on": False, "pump_since": None,
        "n_used": 0.0, "last_ts": now, "last_record": 0, "last_notif": {},
    }

def _weather(now):
    h = datetime.fromtimestamp(now).hour + datetime.fromtimestamp(now).minute / 60
    wave = math.sin(2 * math.pi * (h - 9) / 24)
    return (round(28 + 4 * wave + random.uniform(-.4, .4), 1),
            round(max(20, min(95, 65 - 10 * wave + random.uniform(-1.5, 1.5))), 1))

def advance(st, now, real=None):
    """Fait avancer la simulation de (now - last_ts) secondes. `real` = dernière mesure ESP32 fraîche ou None."""
    dt = max(0.0, min(now - st["last_ts"], MAX_STEP)) * SPEED
    st["last_ts"] = now
    if real:   # mode hybride : sol / air réels, la simulation se recale dessus
        st["soil"], st["temp"], st["air"] = real["soil_moisture"], real["air_temperature"], real["air_humidity"]
    else:
        st["temp"], st["air"] = _weather(now)
        drying = DRY_PER_MIN / 60 * (1 + (st["temp"] - 28) * 0.03)
        gain = PUMP_PER_MIN / 60 if st["pump_on"] else 0.0
        st["soil"] = round(max(0.0, min(100.0, st["soil"] + (gain - drying) * dt)), 2)
    st["n_used"] = min(st["n_used"] + N_USE_PER_MIN / 60 * dt, 35.0)

def nutrients(st):
    return {"ph": BASE["ph"], "salinity": BASE["salinity"], "nitrogen": round(BASE["nitrogen"] - st["n_used"], 1),
            "phosphorus": BASE["phosphorus"], "potassium": BASE["potassium"], "rain": BASE["rain"]}
