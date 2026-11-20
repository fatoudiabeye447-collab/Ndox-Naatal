import Script from "next/script";

export default function DashboardPage() {
  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">N</span>
          <div><b>NDox et Naatal</b><small>AGRICULTURE INTELLIGENTE</small></div>
        </div>
        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <nav>
          <a className="active" href="#overview">▦　Vue d&apos;ensemble</a>
          <a href="#crops">🌱　Cultures</a>
          <a href="#water">💧　Gestion de l&apos;eau</a>
          <a href="#fert">⚗　Engrais</a>
          <a href="#notifs">🔔　Notifications <span className="badge" id="badge" hidden>0</span></a>
          <a href="#history">◷　Historique</a>
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
            <span className="date" id="date"></span>
            <a className="bell" href="#notifs" title="Notifications">🔔<span className="badge" id="badge2" hidden>0</span></a>
          </div>
        </header>

        <section className="toolbar">
          <div><label>PARCELLE SUIVIE</label><b id="parcel">Parcelle de Miss</b></div>
          <div className="connection">
            <i id="statusDot"></i>
            <div><b id="mode">Simulation active</b><small id="modeText">Aucune donnée ESP32 récente</small></div>
          </div>
          <button id="refresh">↻ Actualiser</button>
          <small id="updated">Chargement…</small>
        </section>

        <div className="section-title" id="crops">
          <div><h2>Gestion des cultures</h2><p>Les seuils d&apos;humidité s&apos;adaptent à la culture et à sa phase.</p></div>
        </div>
        <section className="panel crop-panel">
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
          <article>
            <div className="card-top"><span className="ico green">◉</span><em id="src-soil">SIMULÉ</em></div>
            <label>Humidité du sol</label>
            <strong><span id="soil">—</span><small>%</small></strong>
            <div className="bar"><i id="soilbar"></i><u id="mkMin"></u><u id="mkMax"></u></div>
          </article>
          <article>
            <div className="card-top"><span className="ico orange">♨</span><em id="src-temp">SIMULÉ</em></div>
            <label>Température de l&apos;air</label>
            <strong><span id="temp">—</span><small>°C</small></strong>
            <p>Capteur DHT11</p>
          </article>
          <article>
            <div className="card-top"><span className="ico blue">≈</span><em id="src-air">SIMULÉ</em></div>
            <label>Humidité de l&apos;air</label>
            <strong><span id="air">—</span><small>%</small></strong>
            <p>Capteur DHT11</p>
          </article>
          <article>
            <div className="card-top"><span className="ico violet">⚗</span><em className="sim">SIMULÉ</em></div>
            <label>pH du sol</label>
            <strong id="ph">—</strong>
            <p id="phRange"></p>
          </article>
          <article>
            <div className="card-top"><span className="ico cyan">⌁</span><em className="sim">SIMULÉ</em></div>
            <label>Salinité</label>
            <strong><span id="salinity">—</span><small>dS/m</small></strong>
            <p id="salRange"></p>
          </article>
          <article>
            <div className="card-top"><span className="ico yellow">☂</span><em className="sim">SIMULÉ</em></div>
            <label>Pluie prévue / 24 h</label>
            <strong id="rain">—</strong>
            <p>Aucune station météo connectée</p>
          </article>
        </section>

        <div className="section-title" id="water">
          <div><h2>Gestion intelligente de l&apos;eau</h2><p>Assèchement progressif simulé, détection de sol sec et pilotage de la pompe.</p></div>
        </div>
        <section className="two-col">
          <article className="panel pump">
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
          <article className="advice">
            <span>💧</span>
            <div><small>ANALYSE D&apos;IRRIGATION</small><h3 id="irrigationTitle">—</h3><p id="irrigationDetail">Chargement…</p></div>
          </article>
        </section>

        <div className="section-title" id="fert">
          <div><h2>Gestion des engrais</h2><p>Surveillance des paramètres nutritifs selon la culture. Valeurs simulées, conseils indicatifs.</p></div>
        </div>
        <section className="two-col">
          <article className="panel">
            <div className="panel-head"><div><h3>Paramètres nutritifs</h3><p>Valeur mesurée par rapport à la plage cible de la culture</p></div><em className="sim">SIMULÉ</em></div>
            <div className="nut-list" id="nutList"></div>
          </article>
          <article className="advice">
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
        <section className="panel">
          <div className="chart"><canvas id="chart"></canvas></div>
          <p className="hint">Points bleus : pompe en marche. Lignes pointillées : seuils min / max de la culture.</p>
        </section>

        <div className="section-title" id="notifs">
          <div><h2>Centre de notifications</h2><p>Notifications affichées dans l&apos;application (simulées en version 1).</p></div>
          <button id="readAll" className="link">Tout marquer comme lu</button>
        </div>
        <section className="panel"><div id="notifList" className="notif-list"><p className="muted">Aucune notification.</p></div></section>

        <div className="section-title" id="history">
          <div><h2>Historique</h2><p>Dernières mesures enregistrées et journal des actions.</p></div>
        </div>
        <section className="two-col bottom">
          <article className="panel">
            <div className="panel-head"><div><h3>Mesures</h3><p>Une ligne toutes les ~10 s</p></div></div>
            <div className="tbl-wrap">
              <table id="histTable">
                <thead><tr><th>Heure</th><th>Mode</th><th>Culture</th><th>Sol %</th><th>T °C</th><th>Air %</th><th>Pompe</th></tr></thead>
                <tbody></tbody>
              </table>
            </div>
          </article>
          <article className="panel">
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
