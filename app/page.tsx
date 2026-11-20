import Script from "next/script";

export default function DashboardPage() {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="NDox et Naatal" className="brand-logo-img" />
          <div><b>NDox et Naatal</b><small>AGRICULTURE INTELLIGENTE</small></div>
        </div>
        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <nav>
          <a className="active" href="#overview">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            Vue d&apos;ensemble
          </a>
          <a href="#crops">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/><path d="M12 22V12"/><path d="M12 12c-3-2-6 0-6 3s3 5 6 3"/><path d="M12 12c3-2 6 0 6 3s-3 5-6 3"/></svg>
            Cultures
          </a>
          <a href="#water">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            Gestion de l&apos;eau
          </a>
          <a href="#fert">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31L4.35 20.6A2 2 0 0 0 6.13 23h11.74a2 2 0 0 0 1.78-2.4L14 9.31V2"/></svg>
            Engrais
          </a>
          <a href="#notifs">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notifications <span className="badge" id="badge" hidden>0</span>
          </a>
          <a href="#history">
            <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historique
          </a>
        </nav>
        <div className="sidebar-foot">
          <b>Gestion agricole</b>
          <small>Version 1 · pompe et notifications simulées</small>
        </div>
      </aside>

      <main id="overview">
        <header>
          <div>
            <div className="eyebrow">TABLEAU DE BORD / VUE GÉNÉRALE</div>
            <h1>NDox et Naatal <span>✦</span></h1>
            <p>État de votre exploitation en temps réel.</p>
          </div>
          <div className="top-right">
            <button id="themeToggle" className="theme-toggle" type="button" aria-label="Basculer le mode sombre" title="Mode sombre">
              <span id="themeIcon">🌙</span>
            </button>
            <span className="date" id="date"></span>
            <a className="bell" href="#notifs" title="Notifications">🔔<span className="badge" id="badge2" hidden>0</span></a>
          </div>
        </header>

        <section className="toolbar animated-card">
          <div><label>PARCELLE SUIVIE</label><b id="parcel">Parcelle de Miss</b></div>
          <div className="connection">
            <span className="pulse-wrapper"><i id="statusDot"></i></span>
            <div><b id="mode">Simulation active</b><small id="modeText">Aucune donnée ESP32 récente</small></div>
          </div>
          <button id="refresh">↻ Actualiser</button>
          <small id="updated">Chargement…</small>
        </section>

        <div className="section-title" id="crops">
          <div><h2>Gestion des cultures</h2><p>Les seuils d&apos;humidité s&apos;adaptent à la culture et à sa phase.</p></div>
        </div>
        <section className="panel crop-panel animated-card">
          <div className="crop-pick" id="cropPick"></div>
          <div className="phase-pick" id="phasePick"></div>
          <div className="thresholds">
            <div><small>CULTURE</small><b id="cropName">—</b></div>
            <div><small>PHASE</small><b id="phaseName">—</b></div>
            <div><small>SEUIL MINIMAL</small><b id="thMin">—</b></div>
            <div><small>SEUIL MAXIMAL</small><b id="thMax">—</b></div>
            <div><small>ÉTAT DU SOL</small><b id="soilStatus" className="st">—</b></div>
          </div>
        </section>

        <div className="section-title">
          <div><h2>Indicateurs de suivi</h2><p>Mesures physiques et paramètres simulés.</p></div>
          <div className="legend"><span>● Réel</span><span>● Simulé</span></div>
        </div>
        <section className="cards">
          <article className="animated-card" style={{ animationDelay: "0.05s" }}>
            <div className="card-top"><span className="ico green">◉</span><em id="src-soil">SIMULÉ</em></div>
            <label>Humidité du sol</label>
            <strong><span id="soil" className="count-up">—</span><small>%</small></strong>
            <div className="bar"><i id="soilbar"></i><u id="mkMin"></u><u id="mkMax"></u></div>
          </article>

          <article className="animated-card" style={{ animationDelay: "0.10s" }}>
            <div className="card-top"><span className="ico orange">♨</span><em id="src-temp">SIMULÉ</em></div>
            <label>Température de l&apos;air</label>
            <strong><span id="temp" className="count-up">—</span><small>°C</small></strong>
            <p>Capteur DHT11</p>
          </article>

          <article className="animated-card" style={{ animationDelay: "0.15s" }}>
            <div className="card-top"><span className="ico blue">≈</span><em id="src-air">SIMULÉ</em></div>
            <label>Humidité de l&apos;air</label>
            <strong><span id="air" className="count-up">—</span><small>%</small></strong>
            <p>Capteur DHT11</p>
          </article>

          <article className="animated-card" id="card-ph" style={{ animationDelay: "0.20s" }}>
            <div className="card-top">
              <span className="ico violet">⚗</span>
              <div className="badge-group">
                <span id="badge-ph-warning" className="warning-pill" hidden>Hors plage</span>
                <em className="sim">SIMULÉ</em>
              </div>
            </div>
            <label>pH du sol</label>
            <strong><span id="ph" className="count-up">—</span></strong>
            <p id="phRange"></p>
          </article>

          <article className="animated-card" id="card-salinity" style={{ animationDelay: "0.25s" }}>
            <div className="card-top">
              <span className="ico cyan">⌁</span>
              <div className="badge-group">
                <span id="badge-sal-warning" className="warning-pill" hidden>Hors plage</span>
                <em className="sim">SIMULÉ</em>
              </div>
            </div>
            <label>Salinité</label>
            <strong><span id="salinity" className="count-up">—</span><small>dS/m</small></strong>
            <p id="salRange"></p>
          </article>

          <article className="animated-card" style={{ animationDelay: "0.30s" }}>
            <div className="card-top"><span className="ico yellow">☂</span><em className="sim">SIMULÉ</em></div>
            <label>Pluie prévue / 24 h</label>
            <strong><span id="rain" className="count-up">—</span></strong>
            <p>Aucune station météo connectée</p>
          </article>
        </section>

        <div className="section-title" id="water">
          <div><h2>Gestion intelligente de l&apos;eau</h2><p>Assèchement progressif simulé, détection de sol sec et pilotage de la pompe.</p></div>
        </div>
        <section className="two-col">
          <article className="panel pump animated-card">
            <div className="panel-head">
              <div><h3>Pompe d&apos;irrigation</h3><p>Pompe simulée — aucune commande physique en version 1</p></div>
              <em className="sim">SIMULÉE</em>
            </div>
            <div className="pump-state">
              <span className="pump-dot" id="pumpDot"></span>
              <div><strong id="pumpText">Arrêtée</strong><small id="pumpSince">—</small></div>
            </div>
            <div className="pump-btns">
              <button id="pumpStart" className="btn primary">▶ Démarrer la pompe</button>
              <button id="pumpStop" className="btn">■ Arrêter la pompe</button>
            </div>
            <p className="hint" id="pumpMsg">Arrêt automatique (simulé) dès que le seuil maximal est atteint.</p>
            <button id="resetSim" className="link">↺ Réinitialiser la simulation du sol</button>
          </article>
          <article className="advice animated-card">
            <span>💧</span>
            <div><small>ANALYSE D&apos;IRRIGATION</small><h3 id="irrigationTitle">—</h3><p id="irrigationDetail">Chargement…</p></div>
          </article>
        </section>

        <div className="section-title" id="fert">
          <div><h2>Gestion des engrais</h2><p>Surveillance des paramètres nutritifs selon la culture. Valeurs simulées, conseils indicatifs.</p></div>
        </div>
        <section className="two-col">
          <article className="panel animated-card">
            <div className="panel-head"><div><h3>Paramètres nutritifs</h3><p>Valeur mesurée par rapport à la plage cible de la culture</p></div><em className="sim">SIMULÉ</em></div>
            <div className="nut-list" id="nutList"></div>
          </article>
          <article className="advice animated-card">
            <span>🌱</span>
            <div><small>CONSEILS ENGRAIS</small><h3 id="fertTitle">—</h3><p id="fertDetail">Chargement…</p><ul id="fertTips"></ul></div>
          </article>
        </section>

        <div className="section-title">
          <div><h2>Évolution</h2><p>Graphique d&apos;évolution des dernières mesures.</p></div>
          <select id="metric">
            <option value="soil_moisture">Humidité du sol (%)</option>
            <option value="air_temperature">Température (°C)</option>
            <option value="air_humidity">Humidité de l&apos;air (%)</option>
            <option value="nitrogen">Azote (mg/kg)</option>
          </select>
        </div>
        <section className="panel animated-card">
          <div className="chart"><canvas id="chart"></canvas></div>
          <p className="hint">Points visibles au survol. Lignes pointillées : seuils min / max de la culture.</p>
        </section>

        <div className="section-title" id="notifs">
          <div><h2>Centre de notifications</h2><p>Notifications affichées dans l&apos;application (simulées en version 1).</p></div>
          <button id="readAll" className="link">Tout marquer comme lu</button>
        </div>
        <section className="panel animated-card"><div id="notifList" className="notif-list"><p className="muted">Aucune notification.</p></div></section>

        <div className="section-title" id="history">
          <div><h2>Historique</h2><p>Dernières mesures enregistrées et journal des actions.</p></div>
        </div>
        <section className="two-col bottom">
          <article className="panel animated-card">
            <div className="panel-head"><div><h3>Mesures</h3><p>Une ligne toutes les ~10 s</p></div></div>
            <div className="tbl-wrap">
              <table id="histTable">
                <thead><tr><th>Heure</th><th>Mode</th><th>Culture</th><th>Sol %</th><th>T °C</th><th>Air %</th><th>Pompe</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </article>
          <article className="panel animated-card">
            <div className="panel-head"><div><h3>Journal des actions</h3><p>Pompe, culture, système</p></div><span className="online">● Actif</span></div>
            <div id="events" className="events"></div>
          </article>
        </section>
        <footer>© 2026 NDox et Naatal · Prototype IoT agricole <span>Les valeurs et actions marquées simulées sont fictives.</span></footer>
      </main>

      <Script src="/dashboard.js" strategy="afterInteractive" />
    </>
  );
}
