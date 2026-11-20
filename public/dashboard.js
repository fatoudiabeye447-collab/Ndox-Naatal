/* ==========================================================================
   NDox et Naatal — Script Client
   - Compteur animé sur les chiffres (0 -> valeur en douceur)
   - Coloration automatique des alertes (pH / Salinité hors-plage)
   - Mode Sombre (Bascule et mémorisation locale)
   - Graphique lissé avec dégradé et points uniquement au survol
   ========================================================================== */

let chart, CAT, CUR = {}, HIST = [], isRefreshing = false, animatedOnce = false;

const $ = id => document.getElementById(id);
const text = (id, v) => {
  const el = $(id);
  if (el && v !== undefined && v !== null) el.textContent = v;
};
const fmt = n => (n !== undefined && n !== null && !isNaN(n)) ? Number(n).toFixed(1) : "—";
const hhmm = s => {
  try {
    return new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return s || "—";
  }
};

const badgeSrc = (id, v) => {
  const el = $(id);
  if (!el) return;
  el.textContent = v === "réel" ? "RÉEL" : "SIMULÉ";
  el.className = v === "réel" ? "" : "sim";
};

// Animation progressive des compteurs numériques (0 -> target)
function animateCount(id, targetValue, duration = 900) {
  const el = $(id);
  if (!el) return;

  const target = parseFloat(targetValue);
  if (isNaN(target)) {
    el.textContent = targetValue;
    return;
  }

  const start = 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * ease;

    el.textContent = current.toFixed(1);

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.textContent = target.toFixed(1);
    }
  }

  requestAnimationFrame(updateCount);
}

const post = async (url, body) => {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, ...data };
  } catch (err) {
    console.error(`Erreur POST ${url}:`, err);
    return { ok: false, error: err };
  }
};

/* --- Sélecteurs Cultures & Phases --- */
function renderPickers(d) {
  if (!CAT) return;
  const key = d.crop.id + "|" + d.phase.id;
  if (CUR.pick === key) return;
  CUR.pick = key;

  const cropContainer = $("cropPick");
  if (cropContainer && CAT.crops) {
    cropContainer.innerHTML = CAT.crops.map(c =>
      `<button class="chip ${c.id === d.crop.id ? "on" : ""}" data-crop="${c.id}" type="button">${c.icon} ${c.label}</button>`
    ).join("");
  }

  const phaseContainer = $("phasePick");
  if (phaseContainer && CAT.phases) {
    phaseContainer.innerHTML = CAT.phases.map(p =>
      `<button class="chip ${p.id === d.phase.id ? "on" : ""}" data-phase="${p.id}" type="button">${p.label}</button>`
    ).join("");
  }
}

document.addEventListener("click", async e => {
  const b = e.target.closest(".chip");
  if (!b) return;

  const isCrop = b.hasAttribute("data-crop");
  const isPhase = b.hasAttribute("data-phase");
  if (!isCrop && !isPhase) return;

  const siblings = b.parentElement.querySelectorAll(".chip");
  siblings.forEach(s => s.classList.remove("on"));
  b.classList.add("on");

  const crop = isCrop ? b.dataset.crop : CUR.crop;
  const phase = isPhase ? b.dataset.phase : CUR.phase;

  CUR.crop = crop;
  CUR.phase = phase;

  const res = await post("/api/settings", { crop, phase });
  if (res.ok) {
    CUR.pick = null;
    refresh();
  }
});

/* --- Nutriments --- */
function renderNutrients(list) {
  const el = $("nutList");
  if (!el || !list) return;

  el.innerHTML = list.map(n => {
    const max = Math.max(n.max * 1.4, n.value * 1.1, 1);
    const pct = v => Math.min(100, Math.max(0, (v / max) * 100));
    const bad = n.status !== "ok";
    return `
      <div class="nut">
        <span>${n.label}</span>
        <div class="track">
          <div class="range" style="left:${pct(n.min)}%;width:${pct(n.max) - pct(n.min)}%"></div>
          <div class="dot ${bad ? "bad" : ""}" style="left:${pct(n.value)}%"></div>
        </div>
        <span>
          <b>${fmt(n.value)}</b> ${n.unit}
          <span class="tag ${bad ? "bad" : "ok"}">${bad ? (n.status || "").toUpperCase() : "OK"}</span>
        </span>
      </div>`;
  }).join("");
}

/* --- Pompe --- */
function renderPump(d) {
  const on = Boolean(d.pump && d.pump.on);
  const dot = $("pumpDot");
  if (dot) dot.className = "pump-dot" + (on ? " on" : "");

  text("pumpText", on ? "En marche (simulée)" : "Arrêtée");
  text("pumpSince", on && d.pump.since ? "Démarrée à " + hhmm(d.pump.since) : "Prête");

  const startBtn = $("pumpStart");
  const stopBtn = $("pumpStop");
  if (startBtn) startBtn.disabled = on;
  if (stopBtn) stopBtn.disabled = !on;
}

/* --- Graphique Lissé avec Dégradé et Points au Survol --- */
function draw() {
  const canvas = $("chart");
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext("2d");

  const rows = HIST.slice().reverse();
  const metricSelect = $("metric");
  const metric = metricSelect ? metricSelect.value : "soil_moisture";
  const labelText = metricSelect && metricSelect.selectedOptions[0] ? metricSelect.selectedOptions[0].text : "Mesure";

  const labels = rows.map(r => hhmm(r.ts));
  const vals = rows.map(r => r[metric]);

  // Dégradé sous la courbe
  let gradient = "rgba(27,122,87,0.12)";
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 180);
    g.addColorStop(0, "rgba(27,122,87,0.22)");
    g.addColorStop(1, "rgba(27,122,87,0.0)");
    gradient = g;
  }

  const ds = [{
    data: vals,
    label: labelText,
    borderColor: "#1b7a57",
    backgroundColor: gradient,
    fill: true,
    tension: 0.4, // Courbe lissée
    pointRadius: 0, // Points visibles uniquement au survol
    pointHoverRadius: 5,
    pointHoverBackgroundColor: "#1b7a57",
    pointHoverBorderColor: "#fff",
    pointHoverBorderWidth: 2,
    borderWidth: 2.2
  }];

  if (metric === "soil_moisture") {
    ds.push({
      data: rows.map(r => r.moisture_min),
      borderColor: "#d97706",
      borderDash: [5, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      label: "Seuil min",
      fill: false
    });
    ds.push({
      data: rows.map(r => r.moisture_max),
      borderColor: "#0284c7",
      borderDash: [5, 4],
      pointRadius: 0,
      borderWidth: 1.5,
      label: "Seuil max",
      fill: false
    });
  }

  const scales = {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 7, font: { size: 10 } } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 } } }
  };
  if (metric === "soil_moisture" || metric === "air_humidity") {
    scales.y.min = 0;
    scales.y.max = 100;
  }

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = ds;
    chart.options.scales = scales;
    chart.update("none");
  } else {
    chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: ds.length > 1,
            labels: { boxWidth: 12, font: { size: 11, family: "Plus Jakarta Sans" } }
          }
        },
        scales
      }
    });
  }
}

/* --- Historique --- */
function renderHistory(h) {
  if (!h) return;
  HIST = h.readings || [];

  const tableBody = $("histTable") ? $("histTable").querySelector("tbody") : null;
  if (tableBody) {
    tableBody.innerHTML = HIST.slice(0, 40).map(r => `
      <tr>
        <td>${hhmm(r.ts)}</td>
        <td>${r.mode}</td>
        <td>${r.crop}</td>
        <td>${fmt(r.soil_moisture)}</td>
        <td>${fmt(r.air_temperature)}</td>
        <td>${fmt(r.air_humidity)}</td>
        <td>${r.pump_on ? "<b style='color:#0284c7'>ON</b>" : "—"}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">Aucune mesure</td></tr>`;
  }

  const eventsEl = $("events");
  if (eventsEl) {
    eventsEl.innerHTML = (h.events || []).map(e =>
      `<p><small>${hhmm(e.ts)}</small>${e.text}</p>`
    ).join("") || `<p>Aucune action enregistrée.</p>`;
  }

  draw();
}

/* --- Notifications --- */
function renderNotifs(n) {
  if (!n) return;
  const c = n.unread || 0;
  ["badge", "badge2"].forEach(id => {
    const b = $(id);
    if (b) {
      b.hidden = !c;
      b.textContent = c;
    }
  });

  const listEl = $("notifList");
  if (!listEl) return;

  listEl.innerHTML = (n.items || []).map(i => `
    <div class="notif ${i.level} ${i.is_read ? "" : "unread"}" data-id="${i.id}">
      <span class="dot"></span>
      <div>
        <b>${i.title}</b><em class="sim">SIMULÉE</em>
        <p>${i.message}</p>
        <small>${new Date(i.ts).toLocaleString("fr-FR")}</small>
      </div>
    </div>
  `).join("") || `<p class="muted">Aucune notification.</p>`;
}

/* --- Actualisation Globale des Données --- */
async function refresh() {
  if (isRefreshing) return;
  isRefreshing = true;

  try {
    const [r, h, n] = await Promise.all([
      fetch("/api/dashboard", { cache: "no-store" }),
      fetch("/api/history?limit=60", { cache: "no-store" }),
      fetch("/api/notifications", { cache: "no-store" })
    ]);

    if (!r.ok) throw new Error("Dashboard API status " + r.status);

    const d = await r.json();
    CUR.crop = d.crop.id;
    CUR.phase = d.phase.id;

    const v = d.values || {};
    const nut = Object.fromEntries((d.nutrients || []).map(x => [x.key, x]));

    text("parcel", d.parcel || "Parcelle");
    renderPickers(d);

    text("cropName", (d.crop.icon || "🌱") + " " + d.crop.label);
    text("phaseName", d.phase.label);
    text("thMin", (d.moisture.min || "—") + " %");
    text("thMax", (d.moisture.max || "—") + " %");

    const stEl = $("soilStatus");
    if (stEl) {
      stEl.textContent = (d.moisture.status || "—").toUpperCase();
      stEl.className = "st " + (d.moisture.status || "");
    }

    // Compteurs animés au premier chargement, texte direct ensuite
    if (!animatedOnce) {
      animateCount("soil", v.soil_moisture);
      animateCount("temp", v.air_temperature);
      animateCount("air", v.air_humidity);
      if (nut.ph) animateCount("ph", nut.ph.value);
      if (nut.salinity) animateCount("salinity", nut.salinity.value);
      animateCount("rain", v.rain || 0);
      animatedOnce = true;
    } else {
      text("soil", fmt(v.soil_moisture));
      text("temp", fmt(v.air_temperature));
      text("air", fmt(v.air_humidity));
      if (nut.ph) text("ph", fmt(nut.ph.value));
      if (nut.salinity) text("salinity", fmt(nut.salinity.value));
      text("rain", (v.rain ?? 0) + " mm");
    }

    // Coloration dynamique des alertes (pH / Salinité hors-plage)
    if (nut.ph) {
      text("phRange", `Cible ${nut.ph.min}–${nut.ph.max}`);
      const phEl = $("ph");
      const phBadge = $("badge-ph-warning");
      const isPhOutOfRange = nut.ph.value < nut.ph.min || nut.ph.value > nut.ph.max;
      if (phEl) phEl.className = isPhOutOfRange ? "text-warning count-up" : "count-up";
      if (phBadge) phBadge.hidden = !isPhOutOfRange;
    }

    if (nut.salinity) {
      text("salRange", `Maximum ${nut.salinity.max} dS/m`);
      const salEl = $("salinity");
      const salBadge = $("badge-sal-warning");
      const isSalOutOfRange = nut.salinity.value > nut.salinity.max;
      if (salEl) salEl.className = isSalOutOfRange ? "text-warning count-up" : "count-up";
      if (salBadge) salBadge.hidden = !isSalOutOfRange;
    }

    badgeSrc("src-soil", d.sources?.soil_moisture);
    badgeSrc("src-temp", d.sources?.air_temperature);
    badgeSrc("src-air", d.sources?.air_humidity);

    const barEl = $("soilbar");
    if (barEl) barEl.style.width = Math.max(0, Math.min(100, v.soil_moisture || 0)) + "%";

    const mkMin = $("mkMin");
    const mkMax = $("mkMax");
    if (mkMin) mkMin.style.left = (d.moisture.min || 0) + "%";
    if (mkMax) mkMax.style.left = (d.moisture.max || 0) + "%";

    const hybrid = d.mode === "hybride";
    text("mode", hybrid ? "Capteurs ESP32 détectés · Mode hybride" : "Mode simulation active");
    text("modeText", hybrid ? "Sol et air réels · reste simulé : pH, salinité, NPK, pluie, pompe" : "Aucune mesure ESP32 récente · toutes les valeurs sont simulées");

    const dot = $("statusDot");
    if (dot) dot.style.background = hybrid ? "#1b7a57" : "#d97706";

    text("updated", "Actualisé " + new Date().toLocaleTimeString("fr-FR"));

    if (d.recommendations) {
      text("irrigationTitle", d.recommendations.irrigation?.title || "—");
      text("irrigationDetail", d.recommendations.irrigation?.detail || "—");
      text("fertTitle", d.recommendations.fertilisation?.title || "—");
      text("fertDetail", d.recommendations.fertilisation?.detail || "—");

      const tipsEl = $("fertTips");
      if (tipsEl && d.recommendations.fertilisation?.tips) {
        tipsEl.innerHTML = d.recommendations.fertilisation.tips.map(t => `<li>${t}</li>`).join("");
      }
    }

    renderNutrients(d.nutrients);
    renderPump(d);

    if (h.ok) renderHistory(await h.json());
    if (n.ok) renderNotifs(await n.json());

  } catch (e) {
    console.error("Erreur de rafraîchissement:", e);
  } finally {
    isRefreshing = false;
  }
}

/* --- Initialisation & Mode Sombre --- */
document.addEventListener("DOMContentLoaded", () => {
  // Mode Sombre (Persistance Locale)
  const themeToggle = $("themeToggle");
  const themeIcon = $("themeIcon");
  const savedTheme = localStorage.getItem("ndox_theme") || "light";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ndox_theme", theme);
    if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // Boutons
  const refreshBtn = $("refresh");
  if (refreshBtn) refreshBtn.addEventListener("click", refresh);

  const pStart = $("pumpStart");
  if (pStart) {
    pStart.addEventListener("click", async () => {
      pStart.disabled = true;
      const r = await post("/api/pump", { action: "start" });
      text("pumpMsg", r.message || "");
      await refresh();
    });
  }

  const pStop = $("pumpStop");
  if (pStop) {
    pStop.addEventListener("click", async () => {
      pStop.disabled = true;
      const r = await post("/api/pump", { action: "stop" });
      text("pumpMsg", r.message || "");
      await refresh();
    });
  }

  const resetBtn = $("resetSim");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      await post("/api/simulation/reset");
      refresh();
    });
  }

  const notifList = $("notifList");
  if (notifList) {
    notifList.addEventListener("click", async e => {
      const n = e.target.closest(".notif");
      if (!n) return;
      await post("/api/notifications/read", { id: Number(n.dataset.id) });
      refresh();
    });
  }

  const readAllBtn = $("readAll");
  if (readAllBtn) {
    readAllBtn.addEventListener("click", async () => {
      await post("/api/notifications/read", {});
      refresh();
    });
  }

  const metricSelect = $("metric");
  if (metricSelect) metricSelect.addEventListener("change", draw);

  const dateEl = $("date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  fetch("/api/catalog")
    .then(r => r.json())
    .then(c => {
      CAT = c;
      refresh();
    })
    .catch(() => refresh());

  setInterval(refresh, 5000);
});
