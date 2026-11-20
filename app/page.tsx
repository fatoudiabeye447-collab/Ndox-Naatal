import Script from "next/script";

export default function DashboardPage() {
  return (
    <div className="app-shell">
      {/* --- Barre latérale (Visible uniquement sur Bureau >= 1024px) --- */}
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          <img src="/logo.jpg" alt="NDox et Naatal" className="brand-logo-img" width="44" height="44" />
          <div>
            <b>NDox et Naatal</b>
            <small>AGRICULTURE INTELLIGENTE</small>
          </div>
        </div>
        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <nav>
          <a className="active" href="#overview" aria-current="page">
            <span className="nav-ico">▦</span> Vue d&apos;ensemble
          </a>
          <a href="#crops">
            <span className="nav-ico">🌱</span> Cultures
          </a>
          <a href="#water">
            <span className="nav-ico">💧</span> Gestion de l&apos;eau
          </a>
          <a href="#fert">
            <span className="nav-ico">⚗</span> Engrais
          </a>
          <a href="#notifs">
            <span className="nav-ico">🔔</span> Notifications <span className="badge" id="badge" hidden>0</span>
          </a>
          <a href="#history">
            <span className="nav-ico">◷</span> Historique
          </a>
        </nav>
        <div className="sidebar-foot">
          <b>Gestion agricole</b>
          <small>Version 1 · pompe et notifications simulées</small>
        </div>
      </aside>

      {/* --- Conteneur Principal --- */}
      <main id="overview" className="main-content">
        {/* En-tête compact et collant (Sticky Header) */}
        <header className="sticky-header">
          <div className="header-left">
            <img src="/logo.jpg" alt="NDox et Naatal" className="header-logo-mobile" width="38" height="38" />
            <div>
              <div className="eyebrow">TABLEAU DE BORD</div>
              <h1>
                NDox et Naatal <span className="accent-star">✦</span>
              </h1>
              <div className="header-date" id="date"></div>
            </div>
          </div>
          <div className="header-right">
            <a className="bell-btn" href="#notifs" aria-label="Voir les notifications" title="Notifications">
              <span aria-hidden="true">🔔</span>
              <span className="badge" id="badge2" hidden>0</span>
            </a>
          </div>
        </header>

        {/* Bandeau Parcelle Suivie (Carte empilée en Mobile) */}
        <section className="card toolbar" aria-labelledby="parcel-label">
          <div className="parcel-info">
            <label id="parcel-label">PARCELLE SUIVIE</label>
            <b id="parcel">Parcelle de Miss</b>
          </div>
          <div className="connection-status">
            <i id="statusDot" aria-hidden="true"></i>
            <div>
              <b id="mode">Simulation active</b>
              <small id="modeText">Aucune donnée ESP32 récente</small>
            </div>
          </div>
          <div className="refresh-box">
            <button id="refresh" className="btn-refresh" type="button" aria-label="Actualiser les données">
              ↻ Actualiser
            </button>
            <small id="updated">Chargement…</small>
          </div>
        </section>

        {/* Section Gestion des Cultures */}
        <div className="section-title" id="crops">
          <div>
            <h2>Gestion des cultures</h2>
            <p>Les seuils s&apos;adaptent à la culture et à sa phase.</p>
          </div>
        </div>
        <section className="card crop-panel">
          {/* Lignes défilantes horizontales (scroll-snap) */}
          <div className="scroll-row" id="cropPick" aria-label="Choisir la culture"></div>
          <div className="scroll-row phase-row" id="phasePick" aria-label="Choisir la phase de culture"></div>

          {/* Résumé en grille (2 colonnes sur mobile, 5 sur bureau) */}
          <div className="thresholds">
            <div className="th-item">
              <small>CULTURE</small>
              <b id="cropName">—</b>
            </div>
            <div className="th-item">
              <small>PHASE</small>
              <b id="phaseName">—</b>
            </div>
            <div className="th-item">
              <small>SEUIL MIN</small>
              <b id="thMin">—</b>
            </div>
            <div className="th-item">
              <small>SEUIL MAX</small>
              <b id="thMax">—</b>
            </div>
            <div className="th-item th-status-full">
              <small>ÉTAT DU SOL</small>
              <b id="soilStatus" className="st">—</b>
            </div>
          </div>
        </section>

        {/* Section Indicateurs de Suivi */}
        <div className="section-title">
          <div>
            <h2>Indicateurs de suivi</h2>
            <p>Mesures physiques et paramètres simulés.</p>
          </div>
          <div className="legend" aria-hidden="true">
            <span>● Réel</span>
            <span>● Simulé</span>
          </div>
        </div>
        <section className="cards-grid" aria-label="Indicateurs de mesure">
          <article className="card metric-card">
            <div className="card-top">
              <span className="ico green" aria-hidden="true">◉</span>
              <em id="src-soil">SIMULÉ</em>
            </div>
            <label>Humidité du sol</label>
            <strong>
              <span id="soil">—</span><small>%</small>
            </strong>
            <div className="bar" aria-hidden="true">
              <i id="soilbar"></i>
              <u id="mkMin"></u>
              <u id="mkMax"></u>
            </div>
          </article>

          <article className="card metric-card">
            <div className="card-top">
              <span className="ico orange" aria-hidden="true">♨</span>
              <em id="src-temp">SIMULÉ</em>
            </div>
            <label>Température de l&apos;air</label>
            <strong>
              <span id="temp">—</span><small>°C</small>
            </strong>
            <p>Capteur DHT11</p>
          </article>

          <article className="card metric-card">
            <div className="card-top">
              <span className="ico blue" aria-hidden="true">≈</span>
              <em id="src-air">SIMULÉ</em>
            </div>
            <label>Humidité de l&apos;air</label>
            <strong>
              <span id="air">—</span><small>%</small>
            </strong>
            <p>Capteur DHT11</p>
          </article>

          <article className="card metric-card">
            <div className="card-top">
              <span className="ico violet" aria-hidden="true">⚗</span>
              <em className="sim">SIMULÉ</em>
            </div>
            <label>pH du sol</label>
            <strong id="ph">—</strong>
            <p id="phRange"></p>
          </article>

          <article className="card metric-card">
            <div className="card-top">
              <span className="ico cyan" aria-hidden="true">⌁</span>
              <em className="sim">SIMULÉ</em>
            </div>
            <label>Salinité</label>
            <strong>
              <span id="salinity">—</span><small>dS/m</small>
            </strong>
            <p id="salRange"></p>
          </article>

          <article className="card metric-card">
            <div className="card-top">
              <span className="ico yellow" aria-hidden="true">☂</span>
              <em className="sim">SIMULÉ</em>
            </div>
            <label>Pluie prévue / 24 h</label>
            <strong id="rain">—</strong>
            <p>Aucune station météo connectée</p>
          </article>
        </section>

        {/* Section Gestion de l'Eau */}
        <div className="section-title" id="water">
          <div>
            <h2>Gestion intelligente de l&apos;eau</h2>
            <p>Assèchement progressif, détection sol sec et pompe.</p>
          </div>
        </div>
        <section className="two-col">
          <article className="card panel pump-card">
            <div className="panel-head">
              <div>
                <h3>Pompe d&apos;irrigation</h3>
                <p>Pompe simulée — commande logique</p>
              </div>
              <em className="sim">SIMULÉE</em>
            </div>
            <div className="pump-state">
              <span className="pump-dot" id="pumpDot" aria-hidden="true"></span>
              <div>
                <strong id="pumpText">Arrêtée</strong>
                <small id="pumpSince">—</small>
              </div>
            </div>
            <div className="pump-btns">
              <button id="pumpStart" className="btn primary" type="button">
                ▶ Démarrer la pompe
              </button>
              <button id="pumpStop" className="btn" type="button">
                ■ Arrêter la pompe
              </button>
            </div>
            <p className="hint" id="pumpMsg">Arrêt automatique dès que le seuil maximal est atteint.</p>
            <button id="resetSim" className="link-action" type="button">
              ↺ Réinitialiser la simulation du sol
            </button>
          </article>

          <article className="card advice-card">
            <span className="advice-ico" aria-hidden="true">💧</span>
            <div>
              <small>ANALYSE D&apos;IRRIGATION</small>
              <h3 id="irrigationTitle">—</h3>
              <p id="irrigationDetail">Chargement…</p>
            </div>
          </article>
        </section>

        {/* Section Gestion des Engrais */}
        <div className="section-title" id="fert">
          <div>
            <h2>Gestion des engrais</h2>
            <p>Surveillance des paramètres nutritifs cibles.</p>
          </div>
        </div>
        <section className="two-col">
          <article className="card panel">
            <div className="panel-head">
              <div>
                <h3>Paramètres nutritifs</h3>
                <p>Mesure vs plage cible de la culture</p>
              </div>
              <em className="sim">SIMULÉ</em>
            </div>
            <div className="nut-list" id="nutList"></div>
          </article>

          <article className="card advice-card">
            <span className="advice-ico" aria-hidden="true">🌱</span>
            <div>
              <small>CONSEILS ENGRAIS</small>
              <h3 id="fertTitle">—</h3>
              <p id="fertDetail">Chargement…</p>
              <ul id="fertTips"></ul>
            </div>
          </article>
        </section>

        {/* Section Évolution Graphique */}
        <div className="section-title">
          <div>
            <h2>Évolution</h2>
            <p>Graphique des dernières mesures.</p>
          </div>
          <select id="metric" aria-label="Métrique à afficher sur le graphique">
            <option value="soil_moisture">Humidité du sol (%)</option>
            <option value="air_temperature">Température (°C)</option>
            <option value="air_humidity">Humidité de l&apos;air (%)</option>
            <option value="nitrogen">Azote (mg/kg)</option>
          </select>
        </div>
        <section className="card panel chart-card">
          <div className="chart-wrapper">
            <canvas id="chart"></canvas>
          </div>
          <p className="hint">Points bleus : pompe en marche. Lignes pointillées : seuils min / max.</p>
        </section>

        {/* Section Notifications */}
        <div className="section-title" id="notifs">
          <div>
            <h2>Centre de notifications</h2>
            <p>Alertes et états du système.</p>
          </div>
          <button id="readAll" className="link-action" type="button">
            Tout marquer comme lu
          </button>
        </div>
        <section className="card panel">
          <div id="notifList" className="notif-list">
            <p className="muted">Aucune notification.</p>
          </div>
        </section>

        {/* Section Historique */}
        <div className="section-title" id="history">
          <div>
            <h2>Historique</h2>
            <p>Dernières mesures et journal des actions.</p>
          </div>
        </div>
        <section className="two-col">
          <article className="card panel">
            <div className="panel-head">
              <div>
                <h3>Mesures récentes</h3>
                <p>Enregistrées périodiquement</p>
              </div>
            </div>
            <div className="tbl-wrap">
              <table id="histTable">
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Mode</th>
                    <th>Culture</th>
                    <th>Sol %</th>
                    <th>T °C</th>
                    <th>Air %</th>
                    <th>Pompe</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </article>

          <article className="card panel">
            <div className="panel-head">
              <div>
                <h3>Journal des actions</h3>
                <p>Pompe, culture, système</p>
              </div>
              <span className="online">● Actif</span>
            </div>
            <div id="events" className="events-log"></div>
          </article>
        </section>

        {/* Pied de page */}
        <footer className="footer">
          <div>© 2026 NDox et Naatal · Agriculture intelligente</div>
          <span>Prototype IoT agricole</span>
        </footer>
      </main>

      {/* --- Barre de navigation basse (Mobile & Tablette < 1024px) --- */}
      <nav className="bottom-nav" aria-label="Navigation mobile">
        <a href="#overview" className="bottom-nav-item active" aria-current="page" data-target="overview">
          <span className="b-icon">▦</span>
          <span className="b-label">Accueil</span>
        </a>
        <a href="#crops" className="bottom-nav-item" data-target="crops">
          <span className="b-icon">🌱</span>
          <span className="b-label">Cultures</span>
        </a>
        <a href="#water" className="bottom-nav-item" data-target="water">
          <span className="b-icon">💧</span>
          <span className="b-label">Eau</span>
        </a>
        <a href="#fert" className="bottom-nav-item" data-target="fert">
          <span className="b-icon">⚗</span>
          <span className="b-label">Engrais</span>
        </a>
        <a href="#notifs" className="bottom-nav-item" data-target="notifs">
          <span className="b-icon">
            🔔
            <span className="bottom-badge" id="bottomBadge" hidden>0</span>
          </span>
          <span className="b-label">Notifs</span>
        </a>
        <button type="button" className="bottom-nav-item" id="moreMenuBtn" aria-label="Menu Plus d'options" aria-expanded="false">
          <span className="b-icon">⋯</span>
          <span className="b-label">Plus</span>
        </button>
      </nav>

      {/* --- Menu "Plus" (Bottom Sheet pour Mobile) --- */}
      <div id="moreSheet" className="sheet-backdrop" hidden>
        <div className="sheet-content" role="dialog" aria-modal="true" aria-label="Options secondaires">
          <div className="sheet-handle"></div>
          <div className="sheet-header">
            <b>Options secondaires</b>
            <button type="button" id="closeSheetBtn" className="sheet-close" aria-label="Fermer">✕</button>
          </div>
          <div className="sheet-links">
            <a href="#history" className="sheet-link" id="sheetLinkHistory">
              <span>◷</span>
              <div>
                <b>Historique & Journal</b>
                <small>Consulter les mesures et événements passés</small>
              </div>
            </a>
            <div className="sheet-info">
              <b>NDox et Naatal v1.0</b>
              <small>Agriculture intelligente · ESP32 & Simulation</small>
            </div>
          </div>
        </div>
      </div>

      <Script src="/dashboard.js" strategy="afterInteractive" />
    </div>
  );
}
