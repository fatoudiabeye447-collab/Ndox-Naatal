let chart, CAT, CUR = {}, HIST = [], refreshSeq = 0, settingsSeq = 0;
const $ = id => document.getElementById(id);
const text = (id, v) => { $(id).textContent = v };
const fmt = n => Number(n).toFixed(1);
const hhmm = s => new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const badgeSrc = (id, v) => { $(id).textContent = v === "réel" ? "RÉEL" : "SIMULÉ"; $(id).className = v === "réel" ? "" : "sim" };
const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then(r => r.json().then(j => ({ ok: r.ok, ...j })));

function renderPickers(d) {
  if (!CAT) return;
  const key = d.crop.id + "|" + d.phase.id;
  if (CUR.pick === key) return; CUR.pick = key;
  $("cropPick").innerHTML = CAT.crops.map(c => `<button class="chip ${c.id === d.crop.id ? "on" : ""}" data-crop="${c.id}">${c.icon} ${c.label}</button>`).join("");
  $("phasePick").innerHTML = CAT.phases.map(p => `<button class="chip ${p.id === d.phase.id ? "on" : ""}" data-phase="${p.id}">${p.label}</button>`).join("");
}
document.addEventListener("click", async e => {
  const b = e.target.closest(".chip"); if (!b) return;
  const crop = b.dataset.crop || CUR.crop || "tomate";
  const phase = b.dataset.phase || CUR.phase || "croissance";
  CUR.crop = crop; CUR.phase = phase; CUR.pick = null;
  renderPickers({ crop: { id: crop }, phase: { id: phase } });
  const mySeq = ++settingsSeq;
  await post("/api/settings", { crop, phase });
  if (mySeq === settingsSeq) refresh();
});

function renderNutrients(list) {
  $("nutList").innerHTML = list.map(n => {
    const max = Math.max(n.max * 1.4, n.value * 1.1, 1), pct = v => Math.min(100, v / max * 100);
    const bad = n.status !== "ok";
    return `<div class="nut"><span>${n.label}</span><div class="track"><div class="range" style="left:${pct(n.min)}%;width:${pct(n.max) - pct(n.min)}%"></div><div class="dot ${bad ? "bad" : ""}" style="left:${pct(n.value)}%"></div></div><span><b>${n.value}</b> ${n.unit} <span class="tag ${bad ? "bad" : "ok"}">${bad ? n.status.toUpperCase() : "OK"}</span></span></div>`;
  }).join("");
}

function renderPump(d) {
  const on = d.pump.on;
  $("pumpDot").className = "pump-dot" + (on ? " on" : "");
  text("pumpText", on ? "En marche (simulée)" : "Arrêtée");
  text("pumpSince", on && d.pump.since ? "Démarrée à " + hhmm(d.pump.since) : "Prête");
  $("pumpStart").disabled = on; $("pumpStop").disabled = !on;
}

function renderFertPump(d) {
  const fp = d.fert_pump || { on: false, since: null };
  const on = fp.on;
  $("fertPumpDot").className = "pump-dot fert" + (on ? " on" : "");
  text("fertPumpText", on ? "En marche (simulée)" : "Arrêtée");
  text("fertPumpSince", on && fp.since ? "Démarrée à " + hhmm(fp.since) : "Prête");
  $("fertPumpStart").disabled = on; $("fertPumpStop").disabled = !on;
}

function draw() {
  const rows = HIST.slice().reverse(), metric = $("metric").value;
  const labels = rows.map(r => hhmm(r.ts)), vals = rows.map(r => r[metric]);
  const ds = [{ data: vals, label: $("metric").selectedOptions[0].text, borderColor: "#218b69", backgroundColor: "rgba(33,139,105,.10)", fill: true, tension: .3, pointRadius: 3,
    pointBackgroundColor: rows.map(r => r.pump_on ? "#2f9bd8" : "#218b69") }];
  if (metric === "soil_moisture") {
    ds.push({ data: rows.map(r => r.moisture_min), borderColor: "#d9893a", borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, label: "Seuil min" });
    ds.push({ data: rows.map(r => r.moisture_max), borderColor: "#4f8fc6", borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, label: "Seuil max" });
  }
  const scales = { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } };
  if (metric === "soil_moisture" || metric === "air_humidity") scales.y = { min: 0, max: 100 };
  if (chart) chart.destroy();
  chart = new Chart($("chart"), { type: "line", data: { labels, datasets: ds }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: ds.length > 1, labels: { boxWidth: 10, font: { size: 10 } } } }, scales } });
}

function renderHistory(h) {
  HIST = h.readings;
  $("histTable").querySelector("tbody").innerHTML = HIST.slice(0, 40).map(r => `<tr><td>${hhmm(r.ts)}</td><td>${r.mode}</td><td>${r.crop}</td><td>${fmt(r.soil_moisture)}</td><td>${fmt(r.air_temperature)}</td><td>${fmt(r.air_humidity)}</td><td>${r.pump_on ? "ON" : "—"}</td><td>${r.fert_pump_on ? "ON" : "—"}</td></tr>`).join("") || `<tr><td colspan="8">Aucune mesure</td></tr>`;
  $("events").innerHTML = h.events.map(e => `<p><small>${hhmm(e.ts)}</small>${e.text}</p>`).join("") || `<p>Aucune action enregistrée.</p>`;
  draw();
}

function renderNotifs(n) {
  const c = n.unread;
  for (const id of ["badge", "badge2"]) { $(id).hidden = !c; $(id).textContent = c }
  $("notifList").innerHTML = n.items.map(i => `<div class="notif ${i.level} ${i.is_read ? "" : "unread"}" data-id="${i.id}"><span class="dot"></span><div><b>${i.title}</b><em class="sim">SIMULÉE</em><p>${i.message}</p><small>${new Date(i.ts).toLocaleString("fr-FR")}</small></div></div>`).join("") || `<p class="muted">Aucune notification.</p>`;
}
$("notifList").addEventListener("click", async e => { const n = e.target.closest(".notif"); if (!n) return; await post("/api/notifications/read", { id: Number(n.dataset.id) }); refresh() });
$("readAll").addEventListener("click", async () => { await post("/api/notifications/read", {}); refresh() });

async function refresh() {
  const seq = ++refreshSeq, sSeq = settingsSeq;
  try {
    const [r, h, n] = await Promise.all([fetch("/api/dashboard", { cache: "no-store" }), fetch("/api/history?limit=60"), fetch("/api/notifications")]);
    if (!r.ok) throw Error("API");
    const d = await r.json();
    if (seq !== refreshSeq || sSeq !== settingsSeq) return;
    CUR.crop = d.crop.id; CUR.phase = d.phase.id;
    const v = d.values, nut = Object.fromEntries(d.nutrients.map(x => [x.key, x]));
    text("parcel", d.parcel); renderPickers(d);
    text("cropName", d.crop.icon + " " + d.crop.label); text("phaseName", d.phase.label);
    text("thMin", d.moisture.min + " %"); text("thMax", d.moisture.max + " %");
    $("soilStatus").textContent = d.moisture.status.toUpperCase(); $("soilStatus").className = "st " + d.moisture.status;
    text("soil", fmt(v.soil_moisture)); text("temp", fmt(v.air_temperature)); text("air", fmt(v.air_humidity));
    text("ph", fmt(nut.ph.value)); text("salinity", fmt(nut.salinity.value)); text("rain", v.rain + " mm");
    text("phRange", `Cible ${nut.ph.min}–${nut.ph.max}`); text("salRange", `Maximum ${nut.salinity.max} dS/m`);
    badgeSrc("src-soil", d.sources.soil_moisture); badgeSrc("src-temp", d.sources.air_temperature); badgeSrc("src-air", d.sources.air_humidity);
    $("soilbar").style.width = Math.max(0, Math.min(100, v.soil_moisture)) + "%";
    $("mkMin").style.left = d.moisture.min + "%"; $("mkMax").style.left = d.moisture.max + "%";
    const hybrid = d.mode === "hybride";
    text("mode", hybrid ? "Capteurs ESP32 détectés · Mode hybride" : "Mode simulation active");
    text("modeText", hybrid ? "Sol et air réels · reste simulé : pH, salinité, NPK, pluie, pompe" : "Aucune mesure ESP32 récente · toutes les valeurs sont simulées");
    $("statusDot").style.background = hybrid ? "#23966d" : "#d5a448";
    text("updated", "Actualisé " + new Date().toLocaleTimeString("fr-FR"));
    text("irrigationTitle", d.recommendations.irrigation.title); text("irrigationDetail", d.recommendations.irrigation.detail);
    text("fertTitle", d.recommendations.fertilisation.title); text("fertDetail", d.recommendations.fertilisation.detail);
    $("fertTips").innerHTML = d.recommendations.fertilisation.tips.map(t => `<li>${t}</li>`).join("");
    renderNutrients(d.nutrients); renderPump(d); renderFertPump(d);
    renderHistory(await h.json()); renderNotifs(await n.json());
  } catch (e) { text("mode", "Serveur indisponible"); text("modeText", "Lancez le serveur pour démarrer Ndox & Naatal."); console.error(e) }
}

$("pumpStart").addEventListener("click", async () => { const r = await post("/api/pump", { action: "start" }); text("pumpMsg", r.message); refresh() });
$("pumpStop").addEventListener("click", async () => { const r = await post("/api/pump", { action: "stop" }); text("pumpMsg", r.message); refresh() });
$("fertPumpStart").addEventListener("click", async () => { const r = await post("/api/fert-pump", { action: "start" }); text("fertPumpMsg", r.message); refresh() });
$("fertPumpStop").addEventListener("click", async () => { const r = await post("/api/fert-pump", { action: "stop" }); text("fertPumpMsg", r.message); refresh() });
$("resetSim").addEventListener("click", async () => { await post("/api/simulation/reset"); refresh() });
$("refresh").addEventListener("click", refresh);
$("metric").addEventListener("change", draw);
$("date").textContent = new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
fetch("/api/catalog").then(r => r.json()).then(c => { CAT = c; refresh() });
setInterval(refresh, 5000);
