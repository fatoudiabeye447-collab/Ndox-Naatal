from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify
from backend import database as db, service
from backend.crops import catalog

app = Flask(__name__)
db.init_db()

@app.get("/")
def index():
    return render_template("dashboard.html")

@app.get("/api/catalog")
def api_catalog():
    return jsonify(catalog())

@app.get("/api/dashboard")
def dashboard():
    return jsonify(service.snapshot())

@app.post("/api/settings")
def settings():
    body = request.get_json(silent=True) or {}
    out, code = service.set_settings(body)
    return jsonify(out), code

@app.post("/api/pump")
def pump():
    body = request.get_json(silent=True) or {}
    out, code = service.set_pump(body.get("action"))
    return jsonify(out), code

@app.post("/api/simulation/reset")
def reset():
    out, code = service.reset_simulation()
    return jsonify(out), code

@app.get("/api/notifications")
def notifications():
    return jsonify(items=db.list_notifications(request.args.get("limit", 40, type=int)), unread=db.unread_count())

@app.post("/api/notifications/read")
def notifications_read():
    body = request.get_json(silent=True) or {}
    db.mark_read(body.get("id"))
    return jsonify(ok=True, unread=db.unread_count())

@app.get("/api/history")
def api_history():
    limit = min(max(request.args.get("limit", 50, type=int), 1), 500)
    return jsonify(readings=db.history(limit), events=db.list_events(30))

@app.post("/api/esp32")
def esp32():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error="JSON invalide"), 400
    try:
        v = {k: float(body[k]) for k in ("soil_moisture", "air_temperature", "air_humidity")}
    except (KeyError, TypeError, ValueError):
        return jsonify(error="soil_moisture, air_temperature et air_humidity sont requis"), 400
    if not 0 <= v["soil_moisture"] <= 100 or not 0 <= v["air_humidity"] <= 100 or not -10 <= v["air_temperature"] <= 70:
        return jsonify(error="Valeurs hors limites"), 400
    rec = {**v, "parcel": str(body.get("parcel", "Parcelle de Miss"))[:80],
           "received_at": datetime.now(timezone.utc).isoformat()}
    db.save_esp32(rec)
    # pump_command : préparation de la future commande physique (pompe simulée pour l'instant)
    st = db.get_state() or {}
    return jsonify(ok=True, message="Mesures ESP32 enregistrées", received_at=rec["received_at"],
                   pump_command="on" if st.get("pump_on") else "off", pump_simulated=True), 201

if __name__ == "__main__":
    print("NDox et Naatal : http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
