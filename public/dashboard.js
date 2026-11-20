/* ==========================================================================
   NDox et Naatal — Client Script Ultra-Réactif
   - Retours instantanés (Optimistic UI)
   - ScrollSpy et surlignage dynamique de la barre de navigation
   - Mise à jour fluide du graphique Chart.js sans scintillement
   ========================================================================== */

let chart, CAT, CUR = {}, HIST = [], isRefreshing = false;

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

/* --- Rendu des Sélecteurs de Cultures & Phases (Instantané) --- */
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

// Clics sur les chips avec retour visuel immédiat (0ms)
document.addEventListener("click", async e => {
  const b = e.target.closest(".chip");
  if (!b) return;

  const isCrop = b.hasAttribute("data-crop");
  const isPhase = b.hasAttribute("data-phase");
  if (!isCrop && !isPhase) return;

  // Optimistic highlight
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

/* --- Rendu des Nutriments --- */
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

/* --- Rendu de la Pompe --- */
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

/* --- Rendu du Graphique (Mise à jour fluide sans destruction) --- */
function draw() {
  const canvas = $("chart");
  if (!canvas || !window.Chart) return;

  const rows = HIST.slice().reverse();
  const metricSelect = $("metric");
  const metric = metricSelect ? metricSelect.value : "soil_moisture";
  const labelText = metricSelect && metricSelect.selectedOptions[0] ? metricSelect.selectedOptions[0].text : "Mesure";

  const labels = rows.map(r => hhmm(r.ts));
  const vals = rows.map(r => r[metric]);

  const ds = [{
    data: vals,
    label: labelText,
    borderColor: "#1b7a57",
    backgroundColor: "rgba(27,122,87,0.08)",
    fill: true,
    tension: 0.35,
    pointRadius: 3,
    pointBackgroundColor: rows.map(r => r.pump_on ? "#0284c7" : "#1b7a57"),
    borderWidth: 2
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
    x: { grid: { display: false }, ticks: { maxTicksLimit: 7, font: { size: 10.5 } } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10.5 } } }
  };
  if (metric === "soil_moisture" || metric === "air_humidity") {
    scales.y.min = 0;
    scales.y.max = 100;
  }

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = ds;
    chart.options.scales = scales;
    chart.update("none"); // Mise à jour 60fps instantanée
  } else {
    chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
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

/* --- Rendu Historique & Événements --- */
function renderHistory(h) {
  if (!h) return;
  HIST = h.readings || [];

  const tableBody = $("histTable") ? $("histTable").querySelector("tbody") : null;
  if (tableBody) {
    tableBody.innerHTML = HIST.slice(0, 40).map(r => `
      <tr>
        <td>${hhmm(r.ts)}</td>
        <td><span class="st ${r.mode === "hybride" ? "optimal" : ""}">${r.mode || "sim"}</span></td>
        <td><b>${r.crop || "—"}</b></td>
        <td>${fmt(r.soil_moisture)} %</td>
        <td>${fmt(r.air_temperature)} °C</td>
        <td>${fmt(r.air_humidity)} %</td>
        <td>${r.pump_on ? "<b style='color:#0284c7'>ON</b>" : "<span style='color:#8fa097'>OFF</span>"}</td>
      </tr>
    `).join("") || `<tr><td colspan="7" style="text-align:center;padding:16px;">Aucune mesure enregistrée</td></tr>`;
  }

  const eventsEl = $("events");
  if (eventsEl) {
    eventsEl.innerHTML = (h.events || []).map(e =>
      `<p><small>${hhmm(e.ts)}</small>${e.text}</p>`
    ).join("") || `<p style="color:var(--muted)">Aucune action enregistrée.</p>`;
  }

  draw();
}

/* --- Rendu Notifications --- */
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
    <div class="notif ${i.level || "info"} ${i.is_read ? "" : "unread"}" data-id="${i.id}">
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

    text("soil", fmt(v.soil_moisture));
    text("temp", fmt(v.air_temperature));
    text("air", fmt(v.air_humidity));

    if (nut.ph) {
      text("ph", fmt(nut.ph.value));
      text("phRange", `Cible ${nut.ph.min}–${nut.ph.max}`);
    }
    if (nut.salinity) {
      text("salinity", fmt(nut.salinity.value));
      text("salRange", `Maximum ${nut.salinity.max} dS/m`);
    }
    text("rain", (v.rain ?? 0) + " mm");

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
    text("modeText", hybrid ? "Sol et air réels · reste simulé : pH, salinité, NPK, pluie, pompe" : "Aucune mesure ESP32 récente · valeurs simulées en direct");

    const dot = $("statusDot");
    if (dot) dot.style.background = hybrid ? "#16a34a" : "#d97706";

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

/* --- Initialisation & Gestionnaires d'Événements des Boutons --- */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Bouton Actualiser manuel avec animation
  const refreshBtn = $("refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.textContent = "↻ Chargement…";
      refreshBtn.disabled = true;
      await refresh();
      refreshBtn.textContent = "↻ Actualiser";
      refreshBtn.disabled = false;
    });
  }

  // 2. Boutons de la Pompe avec réponse instantanée
  const pStart = $("pumpStart");
  if (pStart) {
    pStart.addEventListener("click", async () => {
      pStart.disabled = true;
      text("pumpText", "Démarrage en cours…");
      const r = await post("/api/pump", { action: "start" });
      text("pumpMsg", r.message || "");
      await refresh();
    });
  }

  const pStop = $("pumpStop");
  if (pStop) {
    pStop.addEventListener("click", async () => {
      pStop.disabled = true;
      text("pumpText", "Arrêt en cours…");
      const r = await post("/api/pump", { action: "stop" });
      text("pumpMsg", r.message || "");
      await refresh();
    });
  }

  // 3. Réinitialiser la simulation
  const resetBtn = $("resetSim");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      resetBtn.textContent = "↺ Réinitialisation…";
      await post("/api/simulation/reset");
      resetBtn.textContent = "↺ Réinitialiser la simulation du sol";
      await refresh();
    });
  }

  // 4. Notifications (marquer comme lu)
  const notifList = $("notifList");
  if (notifList) {
    notifList.addEventListener("click", async e => {
      const n = e.target.closest(".notif");
      if (!n) return;
      n.classList.remove("unread");
      await post("/api/notifications/read", { id: Number(n.dataset.id) });
      refresh();
    });
  }

  const readAllBtn = $("readAll");
  if (readAllBtn) {
    readAllBtn.addEventListener("click", async () => {
      document.querySelectorAll(".notif.unread").forEach(el => el.classList.remove("unread"));
      await post("/api/notifications/read", {});
      refresh();
    });
  }

  // 5. Changement de métrique graphique
  const metricSelect = $("metric");
  if (metricSelect) {
    metricSelect.addEventListener("change", draw);
  }

  // 6. Date du jour
  const dateEl = $("date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  // 7. Navigation latérale (Surlignage + Défilement fluide)
  const navLinks = document.querySelectorAll(".sidebar nav a");
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();

      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // 8. ScrollSpy automatique (surveille la section visible pour surligner le menu)
  const sectionIds = ["overview", "crops", "water", "fert", "notifs", "history"];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(l => {
          if (l.getAttribute("href") === "#" + id) {
            navLinks.forEach(other => other.classList.remove("active"));
            l.classList.add("active");
          }
        });
      }
    });
  }, { threshold: 0.25, rootMargin: "-80px 0px -50% 0px" });

  sections.forEach(s => observer.observe(s));

  // 9. Chargement initial du catalogue puis rafraîchissement
  fetch("/api/catalog")
    .then(r => r.json())
    .then(c => {
      CAT = c;
      refresh();
    })
    .catch(() => refresh());

  // Rafraîchissement automatique régulier (toutes les 5 secondes)
  setInterval(refresh, 5000);
});
