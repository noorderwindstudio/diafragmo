/* Diafragmo – klikbaar prototype (front-end only). Geen backend, alle data is fictief. */
(function () {
  'use strict';
  const D = window.FRAME_DATA;
  const STATUSES = D.STATUSES;

  // ---------- State (alleen in geheugen; herladen = reset) ----------
  const S = {
    projects: D.projects.map(p => Object.assign({}, p)),
    invoices: D.invoices.map(i => Object.assign({}, i)),
    comments: JSON.parse(JSON.stringify(D.comments)),
    hours: JSON.parse(JSON.stringify(D.hours)),
    planning: JSON.parse(JSON.stringify(D.planning)),
    shotlist: JSON.parse(JSON.stringify(D.shotlist)),
    files: JSON.parse(JSON.stringify(D.files)),
    finance: JSON.parse(JSON.stringify(D.finance)),
    approved: {},
    urenBasis: 812,
    urenDoel: 1225,
    projectFilter: 'Alle',
    projectView: 'kaarten',
    search: '',
    commentFilter: 'Alle',
    quote: null,
    showreel: {
      domein: 'sannedevries.nl',
      titel: 'Sanne de Vries Video',
      intro: 'Videomaker uit Zwolle. Ik maak eerlijke bedrijfsfilms, aftermovies en social content voor ondernemers in heel Overijssel.',
      kleur: '#ff6a3d',
      formulier: true,
      items: [{ id: 'p7', on: true }, { id: 'p10', on: true }, { id: 'p9', on: true }, { id: 'p8', on: false }, { id: 'p11', on: false }]
    },
    showreelSent: null,
    portal: { uploads: [{ naam: 'Logo_VanDam_2026.svg', grootte: '48 KB', klaar: true }, { naam: "Archieffoto's_1951.zip", grootte: '312 MB', klaar: true }], comments: [], paidIds: {} },
    settings: { plan: 'Pro', koppelingen: { Moneybird: true, 'e-Boekhouden': false, Jortt: false } },
    // 0.4.3: Tikkie (Tikkie Zakelijk, ABN AMRO) als extra betaalmethode naast iDEAL | Wero – standaard uit (demo)
    tikkie: { on: false, gekoppeld: false, sinds: null, verzoeken: {} },
    // 0.4.1: één koppeling per aanbieder voor e-mail én agenda (los aan/uit te zetten)
    koppeling: {
      microsoft: { adres: 'sanne@sannedevriesvideo.nl', connected: false, sinds: null, mail: true, agenda: true },
      google: { adres: 'sannedevriesvideo@gmail.com', connected: false, sinds: null, mail: true, agenda: true }
    },
    email: {
      active: null, sigOn: true, bcc: false, autoKoppel: true, tplSel: 'offerte', filter: 'Alle',
      sig: 'Sanne de Vries\nSanne de Vries Video · videoproductie in Zwolle\nsannedevries.nl',
      templates: null, threads: JSON.parse(JSON.stringify(D.emails))
    },
    timer: null,
    timerUren: [],
    agenda: { autoZet: true, checkBeschikbaar: true },
    quotes: JSON.parse(JSON.stringify(D.quotes || {})),
    callsheets: JSON.parse(JSON.stringify(D.callsheets || {})),
    csSel: {},
    subs: {},
    subsShow: true,
    subsJob: null,
    signOpen: false,
    sigInk: false,
    tkAtt: null,
    tkFilter: { status: 'Alle', cat: 'Alle' }
  };
  const DEFAULT_TPL = {
    offerte: { naam: 'Offerte', onderwerp: 'Offerte {documentnr} – {project}', body: 'Hoi {voornaam},\n\nBedankt voor het fijne gesprek! In de bijlage vind je de offerte voor “{project}” ({bedrag} incl. btw).\n\nIn je persoonlijke klantportaal bekijk je de offerte en geef je met één klik akkoord:\n{portaallink}\n\nVragen of iets aanpassen? Laat het gerust weten.\n\nHartelijke groet,\nSanne' },
    factuur: { naam: 'Factuur', onderwerp: 'Factuur {documentnr} – {project}', body: 'Hoi {voornaam},\n\nIn de bijlage vind je factuur {documentnr} voor “{project}” van {bedrag} (incl. btw), te voldoen vóór {vervaldatum}.\n\nBetalen kan direct met iDEAL | Wero via je klantportaal:\n{portaallink}\n\nBedankt voor de fijne samenwerking!\n\nHartelijke groet,\nSanne' },
    herinnering: { naam: 'Herinnering', onderwerp: 'Herinnering: factuur {documentnr} – {project}', body: 'Hoi {voornaam},\n\nEen vriendelijke herinnering: factuur {documentnr} van {bedrag} voor “{project}” staat nog open (vervaldatum {vervaldatum}).\n\nBetalen kan snel met iDEAL | Wero via je klantportaal:\n{portaallink}\n\nIs de betaling al onderweg? Dan kun je deze mail negeren.\n\nHartelijke groet,\nSanne' },
    tikkie: { naam: 'Tikkie', onderwerp: 'Betaalverzoek via Tikkie: factuur {documentnr} – {project}', body: 'Hoi {voornaam},\n\nVoor factuur {documentnr} (“{project}”) heb ik een Tikkie aangemaakt van {bedrag}. Betalen kan in een paar tikken via deze link, geldig tot {geldigtot}:\n{tikkielink}\n\nLiever via je klantportaal met iDEAL | Wero? Dat kan ook:\n{portaallink}\n\nBedankt!\n\nHartelijke groet,\nSanne' },
    oplevering: { naam: 'Oplevering', onderwerp: 'Je video is klaar: {project}', body: 'Hoi {voornaam},\n\nDe definitieve versie van “{project}” staat klaar! Je downloadt de video in 4K, de social-versie en de ondertitels via je klantportaal:\n{portaallink}\n\nDe downloadlink blijft 12 maanden geldig. Bedankt voor het vertrouwen, {klant}!\n\nHartelijke groet,\nSanne' }
  };
  S.email.templates = JSON.parse(JSON.stringify(DEFAULT_TPL));
  let addedHours = 0;
  let cleanupFns = [];

  // ---------- Helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eurFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });
  const eur = n => eurFmt.format(n || 0);
  const num = (n, d) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: d == null ? 1 : d }).format(n || 0);
  const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  const pd = iso => new Date(iso + 'T12:00:00');
  const fdate = iso => { const d = pd(iso); return isNaN(d) ? esc(iso) : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const fdateShort = iso => { const d = pd(iso); return isNaN(d) ? esc(iso) : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const nowLabel = () => { const d = new Date(); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const tc = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 25); return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
  const initials = n => { const w = String(n).split(/\s+/).filter(x => /^[A-Za-zÀ-ÿ]/.test(x) && !/\.$/.test(x)); const caps = w.filter(x => /^[A-ZÀ-Þ]/.test(x)); const use = caps.length >= 2 ? caps : w; return use.slice(0, 2).map(x => x[0].toUpperCase()).join(''); };
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const proj = id => S.projects.find(p => p.id === id);
  const statusPill = s => `<span class="pill st-${slug(s)}">${esc(s)}</span>`;
  const statusPillInv = s => `<span class="pill inv-${slug(s)}">${esc(s)}</span>`;
  const thumb = (p, extra) => `<div class="thumb ${extra || ''}" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><span class="thumb-play">${icon('play')}</span><span class="thumb-type">${esc(p.type)}</span></div>`;
  const dateChip = iso => `<div class="date-chip"><span>${pd(iso).getDate()}</span><small>${MONTHS[pd(iso).getMonth()]}</small></div>`;

  const ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2.2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    up: '<polyline points="18 15 12 9 6 15"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="13" y2="14"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    camera: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="11"/><line x1="12" y1="7.5" x2="12.01" y2="7.5"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    bug: '<rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 3.5l1 2.5M14 3.5l-1 2.5"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'
  };
  function icon(n, cls) { return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`; }

  // ---------- Thema (licht / donker / systeem) ----------
  // Het inline script in <head> zet data-theme al vóór de eerste weergave; dit houdt knop, Instellingen en systeemwissel in sync.
  const THEME_KEY = 'diafragmo-thema';
  const themeMq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themePref() { try { const v = localStorage.getItem(THEME_KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch (e) { return 'system'; } }
  function themeEffective(pref) { pref = pref || themePref(); return pref === 'system' ? (themeMq && themeMq.matches ? 'dark' : 'light') : pref; }
  function themeNote(pref, t) { return pref === 'system' ? `Volgt de instelling van je apparaat (nu ${t === 'dark' ? 'donker' : 'licht'}).` : 'Je keuze wordt op dit apparaat onthouden.'; }
  let themeAnimTimer = null;
  function applyTheme(animate) {
    const pref = themePref(), t = themeEffective(pref), root = document.documentElement;
    if (animate) { root.classList.add('theme-anim'); clearTimeout(themeAnimTimer); themeAnimTimer = setTimeout(() => root.classList.remove('theme-anim'), 400); }
    root.setAttribute('data-theme', t);
    const b = $('#theme-toggle');
    if (b) { const l = t === 'dark' ? 'Licht thema' : 'Donker thema'; b.setAttribute('aria-label', l); b.setAttribute('title', l); }
    $$('[data-action="set-theme"]').forEach(x => { const on = x.dataset.v === pref; x.classList.toggle('active', on); x.setAttribute('aria-pressed', String(on)); });
    const n = $('#theme-note'); if (n) n.textContent = themeNote(pref, t);
  }
  function setTheme(pref) {
    try { if (pref === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, pref); } catch (e) { /* privémodus: alleen voor deze sessie */ }
    applyTheme(true);
  }
  if (themeMq) { const onSys = () => { if (themePref() === 'system') applyTheme(true); }; if (themeMq.addEventListener) themeMq.addEventListener('change', onSys); else if (themeMq.addListener) themeMq.addListener(onSys); }
  function themeSettingsHtml() {
    const pref = themePref();
    const opts = [['light', 'Licht', 'sun'], ['dark', 'Donker', 'moon'], ['system', 'Systeem', 'monitor']];
    return `<div class="card-head mt"><h2>Weergave</h2></div>
          <div class="seg theme-seg" role="group" aria-label="Weergave">${opts.map(o => `<button type="button" class="${pref === o[0] ? 'active' : ''}" data-action="set-theme" data-v="${o[0]}" aria-pressed="${pref === o[0]}">${icon(o[2])}${o[1]}</button>`).join('')}</div>
          <p class="tiny muted theme-note" id="theme-note">${themeNote(pref, themeEffective(pref))}</p>`;
  }

  // EU-sterrencirkel (12 sterren) als inline SVG
  function euBadge(cls) {
    let stars = '';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; stars += `<polygon transform="translate(${(24 + 14 * Math.cos(a)).toFixed(2)} ${(24 + 14 * Math.sin(a)).toFixed(2)})" points="0.00,-2.60 0.62,-0.85 2.47,-0.80 1.00,0.32 1.53,2.10 0.00,1.05 -1.53,2.10 -1.00,0.32 -2.47,-0.80 -0.62,-0.85"/>`; }
    return `<svg class="${cls || 'eu-badge'}" viewBox="0 0 48 48" role="img" aria-label="EU"><circle cx="24" cy="24" r="24" fill="#003399"/><g fill="#ffcc00">${stars}</g></svg>`;
  }

  // ---------- Afgeleide/ingevulde projectdata voor projecten zonder uitgewerkte voorbeelddata ----------
  function ensure(p) {
    const id = p.id;
    const idx = STATUSES.indexOf(p.status);
    const dl = pd(p.deadline);
    const shift = days => { const d = new Date(dl); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
    const n = parseInt(id.slice(1), 10) % 90 || 1;
    if (!S.planning[id]) {
      S.planning[id] = {
        draaidagen: idx >= 1 ? [{ datum: shift(-21), tijd: '09:00 – 17:00', titel: 'Draaidag 1', locatie: `Bij ${p.klant}`, crew: 'Sanne' }] : [],
        locaties: idx >= 1 ? [{ naam: 'Hoofdlocatie', adres: `Bij ${p.klant} (fictief adres)`, notitie: 'Nog af te stemmen met ' + p.contact + '.' }] : []
      };
    }
    if (!S.shotlist[id]) {
      S.shotlist[id] = idx >= 2 ? [
        { scene: '1', shot: 'Openingsshot locatie', type: 'Wide', lens: '24mm', locatie: 'Buiten', klaar: idx >= 4 },
        { scene: '2', shot: 'Interview ' + p.contact, type: 'Medium', lens: '50mm', locatie: 'Binnen', klaar: idx >= 4 },
        { scene: '3', shot: 'Detailshots product/dienst', type: 'Close-up', lens: '85mm', locatie: 'Binnen', klaar: idx >= 4 },
        { scene: '4', shot: 'Slotshot met logo', type: 'Wide', lens: '35mm', locatie: 'Buiten', klaar: idx >= 4 }
      ] : [];
    }
    if (!S.files[id]) {
      S.files[id] = idx >= 3 ? [
        { map: 'Ruw materiaal', naam: 'A-cam (96 clips)', grootte: '184 GB', datum: fdateShort(shift(-21)) },
        { map: 'Aangeleverd door klant', naam: 'Logo.svg', grootte: '36 KB', datum: fdateShort(shift(-30)) }
      ].concat(idx >= 5 ? [{ map: 'Exports', naam: slug(p.titel) + '_' + p.versie + '.mp4', grootte: '1,4 GB', datum: fdateShort(shift(-5)) }] : [])
        : [{ map: 'Aangeleverd door klant', naam: 'Briefing_' + slug(p.klant).slice(0, 18) + '.pdf', grootte: '420 KB', datum: '28 sep' }];
    }
    if (!S.hours[id]) {
      const base = [{ datum: shift(-40), activiteit: 'Intake & offerte', uren: 2, km: 0 }];
      if (idx >= 2) base.push({ datum: shift(-30), activiteit: 'Voorbereiding & draaiboek', uren: 4, km: 22 });
      if (idx >= 3) base.push({ datum: shift(-21), activiteit: 'Draaidag', uren: 9, km: 58 });
      if (idx >= 4) base.push({ datum: shift(-14), activiteit: 'Montage', uren: 12, km: 0 });
      S.hours[id] = base;
    }
    if (!S.finance[id]) {
      const half = Math.round(p.budget * 1.21 * 50) / 100;
      S.finance[id] = {
        offerte: { nr: idx === 0 ? '–' : 'O2026-0' + (10 + n), bedrag: p.budget, status: idx === 0 ? 'Nog niet gemaakt' : idx === 1 ? 'Verstuurd' : 'Geaccepteerd', datum: idx === 0 ? '–' : '15 sep' },
        aanbetaling: { nr: idx >= 2 ? 'F2026-' + String(idx >= 6 ? n : 12 + n).padStart(3, '0') : '–', bedrag: half, status: idx >= 2 ? (idx >= 4 ? 'Betaald' : 'Open') : 'Nog niet verstuurd', datum: idx >= 2 ? (idx >= 6 ? dayMonth(shift(-60)) : '20 sep') : '–', vervalt: idx >= 6 ? shift(-46) : '2026-10-04' },
        eindfactuur: { nr: idx >= 6 ? 'F2026-' + String(5 + n).padStart(3, '0') : '–', bedrag: half, status: idx >= 6 ? 'Betaald' : 'Na oplevering', datum: idx >= 6 ? dayMonth(p.deadline) : '–', vervalt: shift(14) },
        freelancers: idx >= 3 ? [{ naam: 'Mark Jansen (fictief)', rol: 'Tweede camera', dagen: 1, kosten: 450 }] : [],
        overig: idx >= 4 ? [{ omschrijving: 'Muzieklicentie', kosten: 49 }] : []
      };
    }
    if (!S.comments[id]) {
      const fb = D.feedbackWaiting.find(f => f.projectId === id);
      const done = p.status === 'Opgeleverd';
      S.comments[id] = {
        v1: [{ t: 2.0, van: p.contact, rol: 'klant', tekst: 'Goede eerste versie! Tempo mag iets omhoog.', opgelost: p.versie !== 'v1' }, { t: 6.5, van: p.contact, rol: 'klant', tekst: fb && fb.versie === 'v1' ? fb.quote : 'Kan dit shot iets langer?', opgelost: p.versie !== 'v1' }],
        v2: [{ t: 4.2, van: p.contact, rol: 'klant', tekst: fb && fb.versie === 'v2' ? fb.quote : 'Muziek iets zachter onder de voice-over.', opgelost: done }],
        v3: [{ t: 8.0, van: 'Sanne de Vries', rol: 'maker', tekst: 'Laatste aanpassingen verwerkt.', opgelost: done }]
      };
    }
    if (!S.email.threads[id]) S.email.threads[id] = seedThread(p);
    linkFinance(p);
  }
  // 0.4.4: één bron voor facturen. S.invoices is leidend; de kaarten Aanbetaling/Eindfactuur in project → Financiën
  // lezen daar live uit. Facturen die alleen in de projectdata stonden, worden één keer naar S.invoices overgezet.
  const dayMonth = iso => { const d = pd(iso); return isNaN(d) ? '–' : `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const invSlot = i => /^eind/i.test(String(i.omschrijving || '')) ? 'eindfactuur' : 'aanbetaling';
  const slotInvoice = (pid, w) => S.invoices.find(i => i.projectId === pid && invSlot(i) === w) || null;
  const invDatum = d => d.datum || (d.status === 'Concept' || !d.vervalt ? '–' : dayMonth(isoAdd(d.vervalt, -14)));
  function linkFinance(p) {
    const f = S.finance[p.id]; if (!f || f.__linked) return;
    Object.defineProperty(f, '__linked', { value: true });
    ['aanbetaling', 'eindfactuur'].forEach(w => {
      const d = f[w];
      // Echte factuur (nummer, niet meer “nog niet verstuurd”) die nog niet in het overzicht staat: overzetten
      if (d && d.nr && d.nr !== '–' && !slotInvoice(p.id, w) && !S.invoices.some(i => i.nr === d.nr)) {
        S.invoices.push({ nr: d.nr, projectId: p.id, klant: p.klant, omschrijving: w === 'eindfactuur' ? 'Eindfactuur' : 'Aanbetaling 50%', bedrag: d.bedrag, vervalt: d.vervalt || isoAdd(todayIso(), 14), status: d.status, datum: d.datum });
      }
      // Wat overblijft is alleen de stand zónder factuur (bijv. “Na oplevering”)
      let fallback = d && d.nr !== '–' ? { nr: '–', bedrag: d.bedrag, status: w === 'eindfactuur' ? 'Na oplevering' : 'Nog niet verstuurd', datum: '–' } : d;
      Object.defineProperty(f, w, {
        enumerable: true, configurable: true,
        get: () => {
          const inv = slotInvoice(p.id, w); if (inv) return inv;
          // Restbedrag eindfactuur = projecttotaal incl. btw min de aanbetaling (bijv. 60% na 40% aanbetaling)
          if (w === 'eindfactuur' && fallback && fallback.nr === '–' && p.budget) return Object.assign({}, fallback, { bedrag: Math.round((p.budget * 1.21 - f.aanbetaling.bedrag) * 100) / 100 });
          return fallback;
        },
        // Een factuur zelf hoort in S.invoices; hier bewaren we alleen de stand zonder factuur
        set: v => { fallback = v && v.nr && v.nr !== '–' ? Object.assign({}, v, { nr: '–', status: w === 'eindfactuur' ? 'Na oplevering' : 'Nog niet verstuurd', datum: '–' }) : v; }
      });
    });
  }
  const projectHours = id => (S.hours[id] || []).reduce((a, h) => a + Number(h.uren || 0), 0);
  const projectKm = id => (S.hours[id] || []).reduce((a, h) => a + Number(h.km || 0), 0);
  const urenTotaal = () => S.urenBasis + addedHours;
  function financeCosts(id) { const f = S.finance[id]; return f.freelancers.reduce((a, x) => a + x.kosten, 0) + f.overig.reduce((a, x) => a + x.kosten, 0); }

  // ---------- Toast & modal ----------
  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.setAttribute('role', 'status');
    el.innerHTML = `${icon('check')}<span>${msg}</span>`;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  }
  let modalHandlers = [];
  function modal(opts) {
    modalHandlers = opts.actions || [];
    $('#modal-root').innerHTML = `
      <div class="modal-backdrop" data-action="modal-close"></div>
      <div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
        <div class="modal-head"><h3>${esc(opts.title)}</h3><button class="icon-btn" data-action="modal-close" aria-label="Sluiten">${icon('x')}</button></div>
        <div class="modal-body">${opts.body}</div>
        <div class="modal-foot">${modalHandlers.map((a, i) => `<button class="btn ${a.cls || ''}" data-action="modal-act" data-i="${i}">${a.label}</button>`).join('')}</div>
      </div>`;
    $('#modal-root').classList.add('open');
    const f = $('#modal-root form input, #modal-root form select');
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { const m = $('#modal-root'); if (!m) return; m.classList.remove('open'); m.innerHTML = ''; modalHandlers = []; }
  function formModal(title, fields, submitLabel, onSubmit) {
    modal({
      title, body: `<form id="modal-form" class="form-col">${fields}<button type="submit" hidden></button></form>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, {
        label: submitLabel, cls: 'primary', onClick: () => {
          const f = $('#modal-form'); if (!f.reportValidity()) return;
          onSubmit(Object.fromEntries(new FormData(f).entries()));
        }
      }]
    });
    $('#modal-form').addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); modalHandlers[1].onClick(); });
  }

  // ---------- Router ----------
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'dashboard', a: parts[1], b: parts[2] };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  function render() {
    cleanupFns.forEach(f => { try { f(); } catch (e) { /* noop */ } });
    cleanupFns = [];
    closeModal();
    closeInfo(false);
    document.body.classList.remove('nav-open');
    const r = route();
    let external = false, html = '', mount = null, nav = r.name;
    switch (r.name) {
      case 'dashboard': html = viewDashboard(); break;
      case 'projecten': html = viewProjects(); break;
      case 'project': {
        const p = proj(r.a); if (!p) { html = viewNotFound(); break; }
        ensure(p); const tab = r.b || 'planning';
        html = viewProject(p, tab); mount = () => mountProject(p, tab); nav = 'projecten'; break;
      }
      case 'review': {
        const p = proj(r.a || 'p1') || proj('p1'); ensure(p);
        const v = ['v1', 'v2', 'v3'].includes(r.b) ? r.b : (p.versie !== '-' ? p.versie : 'v1');
        html = viewReview(p, v); mount = () => mountReview(p, v); break;
      }
      case 'financien': html = viewBuilder(); mount = renderQuoteLive; break;
      case 'showreel':
        if (r.a === 'live') { external = true; html = viewPublicShowreel(); }
        else { html = viewShowreelEditor(); mount = mountShowreelEditor; }
        nav = 'showreel'; break;
      case 'klant': {
        const p = proj(r.a || 'p1') || proj('p1'); ensure(p); external = true;
        html = r.b === 'betaald' ? viewPaid(p) : r.b === 'offerte' ? viewPortalQuote(p) : viewPortal(p);
        mount = () => { mountPortal(p); if (r.b === 'offerte') initSigPad(); }; break;
      }
      case 'instellingen': {
        html = viewSettings();
        const anchor = { email: '#koppeling', mail: '#koppeling', agenda: '#koppeling', koppeling: '#koppeling', koppelingen: '#koppeling', hosting: '#hosting-privacy', abonnement: '#abonnement', betaalmethoden: '#betaalmethoden', betalen: '#betaalmethoden', tikkie: '#betaalmethoden' }[r.a];
        if (anchor) mount = () => { const el = $(anchor); if (el) el.scrollIntoView(); };
        break;
      }
      case 'support':
        nav = '';
        if (r.a === 'nieuw') html = viewSupportNew();
        else if (r.a === 'ticket') { const t = ticket(r.b); html = t && t.eigen ? viewTicket(t, false) : viewNotFound(); }
        else html = viewSupportList();
        break;
      case 'beheer': nav = ''; html = r.a === 'support' && r.b ? viewTicket(ticket(r.b), true) : viewBeheer(); break;
      default: html = viewNotFound();
    }
    document.body.classList.toggle('external-mode', external);
    if (external) { $('#external').innerHTML = html; $('#view').innerHTML = ''; }
    else { $('#view').innerHTML = html; $('#external').innerHTML = ''; }
    $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
    const clientBtn = $('#topbar-client');
    if (clientBtn) clientBtn.setAttribute('href', '#/klant/' + ((r.name === 'project' || r.name === 'review') && proj(r.a) ? r.a : 'p1'));
    const me = $('.side-foot .me .tiny'); if (me) me.textContent = `${D.studio.naam} · ${S.settings.plan}`;
    renderTimerPill();
    window.scrollTo(0, 0);
    if (mount) mount();
  }

  // ---------- Dashboard ----------
  function viewDashboard() {
    const lopend = S.projects.filter(p => p.status !== 'Opgeleverd');
    const open = S.invoices.filter(i => i.status === 'Open' || i.status === 'Verlopen');
    const openSum = open.reduce((a, i) => a + i.bedrag, 0);
    const uren = urenTotaal(), pct = Math.min(100, uren / S.urenDoel * 100);
    const now = new Date(); const end = new Date(now.getFullYear(), 11, 31);
    const weeks = Math.max(1, (end - now) / (7 * 864e5));
    const rest = Math.max(0, S.urenDoel - uren);
    const h = now.getHours(); const groet = h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond';
    const maanden = [72, 88, 95, 81, 102, 97, 64, 98, 115];
    const upcoming = [];
    S.projects.forEach(p => { ensure(p); (S.planning[p.id].draaidagen || []).forEach(d => { if (d.datum >= '2026-10-01') upcoming.push({ p, d }); }); });
    upcoming.sort((a, b) => a.d.datum.localeCompare(b.d.datum));
    const verlopen = S.invoices.filter(i => i.status === 'Verlopen').length;
    return `
      <div class="page-head">
        <div><h1>${groet}, Sanne</h1><p class="muted">Je hebt ${lopend.length} lopende projecten, ${D.feedbackWaiting.length} feedbackrondes die op je wachten en ${open.length} openstaande facturen.</p></div>
        <div class="head-actions"><button class="btn" data-action="new-project">${icon('plus')} Nieuw project</button><a class="btn primary" href="#/financien">${icon('file')} Nieuwe offerte</a></div>
      </div>
      <div class="kpis">
        <a class="kpi" href="#/projecten"><span class="kpi-label">Lopende projecten</span><strong>${lopend.length}</strong><span class="muted small">${S.projects.length - lopend.length} opgeleverd dit jaar</span></a>
        <a class="kpi" href="#/financien"><span class="kpi-label">Openstaand</span><strong>${eur(openSum)}</strong><span class="small ${verlopen ? 'danger' : 'muted'}">${verlopen ? verlopen + ' factuur verlopen' : 'niets verlopen'}</span></a>
        <a class="kpi" href="#/financien"><span class="kpi-label">Omzet 2026 (excl. btw)</span><strong>${eur(41320)}</strong><span class="small ok">+12% t.o.v. 2025</span></a>
        <button class="kpi" data-action="scroll" data-target="urenteller"><span class="kpi-label">Uren dit jaar</span><strong>${num(uren, 2)} u</strong><span class="muted small">${Math.round(pct)}% van urencriterium</span></button>
      </div>
      <div class="pipeline card">
        ${STATUSES.map(s => { const c = S.projects.filter(p => p.status === s).length; return `<button class="pipe st-bg-${slug(s)}" data-action="filter-status" data-status="${esc(s)}"><span>${esc(s)}</span><strong>${c}</strong></button>`; }).join('')}
      </div>
      ${weekCardHtml()}
      <div class="grid-dash">
        <section class="card span-2">
          <div class="card-head"><h2>Lopende projecten</h2><a class="link" href="#/projecten">Alle projecten →</a></div>
          <div class="proj-cards">${lopend.map(projectCard).join('')}</div>
        </section>
        <section class="card" id="urenteller">
          <div class="card-head"><h2>Urencriterium 2026</h2><span class="muted small">doel ${num(S.urenDoel, 0)} uur</span></div>
          <div class="uren-big"><strong>${num(uren, 2)}</strong><span> / ${num(S.urenDoel, 0)} uur</span></div>
          <div class="progress big"><div style="width:${pct}%"></div></div>
          <p class="small muted">Nog <strong>${num(rest, 1)} uur</strong> te gaan · gemiddeld <strong>${num(rest / weeks, 1)} uur per week</strong> tot 31 december.</p>
          <div class="bars">${maanden.map((m, i) => `<div class="bar" title="${MONTHS[i]}: ${m} uur"><div style="height:${m / 1.3}%"></div><span>${MONTHS[i][0]}</span></div>`).join('')}<div class="bar now" title="okt: ${num(addedHours, 2)} uur"><div style="height:${Math.max(2, addedHours / 1.3)}%"></div><span>o</span></div></div>
          <p class="tiny muted">Indicatie op basis van je geregistreerde uren. Geen fiscaal advies.</p>
        </section>
        <section class="card">
          <div class="card-head"><h2>Openstaande facturen</h2><span class="muted small">${eur(openSum)}</span></div>
          <ul class="list">${S.invoices.filter(i => i.status !== 'Betaald').map(i => `
            <li class="row-item">
              <div class="grow"><div class="strong">${esc(i.klant)}</div><div class="small muted">${esc(i.nr)} · ${esc(i.omschrijving)} · vervalt ${fdateShort(i.vervalt)}</div></div>
              <div class="right"><div class="strong">${eur(i.bedrag)}</div>${statusPillInv(i.status)}</div>
              ${i.status === 'Concept' ? `<button class="btn sm" data-action="send-invoice" data-nr="${i.nr}">Versturen</button>` : `<button class="btn sm ghost" data-action="remind" data-nr="${i.nr}">Herinner</button>`}
            </li>`).join('') || '<li class="muted small">Alles betaald 🎉</li>'}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>Feedback die op je wacht</h2><a class="link" href="#/review/p1/v3">Naar review →</a></div>
          <ul class="list">${D.feedbackWaiting.map(f => { const p = proj(f.projectId); return `
            <li class="row-item click" data-action="go" data-href="#/review/${p.id}/${f.versie}">
              <span class="avatar">${initials(f.van)}</span>
              <div class="grow"><div class="strong">${esc(p.klant)} <span class="muted">· ${esc(f.versie)}</span></div><div class="small muted">“${esc(f.quote)}”</div><div class="tiny muted">${esc(f.van)} · ${esc(f.wanneer)}</div></div>
              <span class="badge" title="${f.aantal} opmerkingen">${f.aantal}</span>
            </li>`; }).join('')}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>Komende draaidagen</h2></div>
          <ul class="list">${upcoming.slice(0, 4).map(u => `
            <li class="row-item click" data-action="go" data-href="#/project/${u.p.id}/callsheet">
              ${dateChip(u.d.datum)}
              <div class="grow"><div class="strong">${esc(u.p.titel)}</div><div class="small muted">${esc(u.d.tijd)} · ${esc(u.d.locatie)}</div></div>
            </li>`).join('') || '<li class="muted small">Geen draaidagen gepland.</li>'}</ul>
        </section>
      </div>`;
  }
  function steps(p) { const i = STATUSES.indexOf(p.status); return `<div class="steps" title="${esc(p.status)}">${STATUSES.map((s, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>`; }
  function projectCard(p) {
    return `<a class="proj-card" href="#/project/${p.id}/planning">
      ${thumb(p)}
      <div class="proj-card-body">
        <div class="row-between">${statusPill(p.status)}<span class="tiny muted">${icon('calendar')} ${fdateShort(p.deadline)}</span></div>
        <div class="strong clamp">${esc(p.titel)}</div>
        <div class="small muted">${esc(p.klant)}</div>
        ${steps(p)}
      </div></a>`;
  }

  // ---------- Projecten ----------
  function viewProjects() {
    const q = S.search.trim().toLowerCase();
    const list = S.projects.filter(p => (S.projectFilter === 'Alle' || p.status === S.projectFilter) && (!q || (p.titel + ' ' + p.klant + ' ' + p.type).toLowerCase().includes(q)));
    return `
      <div class="page-head">
        <div><h1>Projecten</h1><p class="muted">${S.projects.length} projecten · van aanvraag tot oplevering</p></div>
        <div class="head-actions"><button class="btn primary" data-action="new-project">${icon('plus')} Nieuw project</button></div>
      </div>
      <div class="toolbar">
        <div class="chips">${['Alle'].concat(STATUSES).map(s => `<button class="chip ${S.projectFilter === s ? 'active' : ''}" data-action="filter-status" data-status="${esc(s)}">${esc(s)} <span>${s === 'Alle' ? S.projects.length : S.projects.filter(p => p.status === s).length}</span></button>`).join('')}</div>
        <div class="toolbar-right">
          <label class="search-inline">${icon('search')}<input id="proj-search" type="search" placeholder="Zoek project of klant…" value="${esc(S.search)}" aria-label="Zoek project"></label>
          <div class="seg"><button class="${S.projectView === 'kaarten' ? 'active' : ''}" data-action="proj-view" data-v="kaarten">Kaarten</button><button class="${S.projectView === 'lijst' ? 'active' : ''}" data-action="proj-view" data-v="lijst">Lijst</button></div>
        </div>
      </div>
      ${!list.length ? `<div class="empty card">${icon('folder')}<p>Geen projecten gevonden${q ? ` voor “${esc(S.search)}”` : ''}.</p><button class="btn" data-action="clear-filters">Filters wissen</button></div>` :
        S.projectView === 'kaarten' ? `<div class="proj-cards wide">${list.map(projectCard).join('')}</div>` : `
      <div class="card table-wrap"><table class="table">
        <thead><tr><th>Project</th><th>Klant</th><th>Status</th><th>Deadline</th><th class="num">Budget (excl.)</th><th></th></tr></thead>
        <tbody>${list.map(p => `<tr class="click" data-action="go" data-href="#/project/${p.id}/planning">
          <td><div class="cell-proj">${thumb(p, 'mini')}<span class="strong">${esc(p.titel)}</span></div></td><td>${esc(p.klant)}</td><td>${statusPill(p.status)}</td><td>${fdate(p.deadline)}</td><td class="num">${eur(p.budget)}</td><td class="num"><span class="link">Openen →</span></td></tr>`).join('')}</tbody>
      </table></div>`}`;
  }

  // ---------- Projectpagina ----------
  const TABS = [['planning', 'Planning'], ['callsheet', 'Callsheet'], ['shotlist', 'Shotlist & draaiboek'], ['bestanden', 'Bestanden'], ['feedback', 'Feedback'], ['email', 'E-mail'], ['uren', 'Uren & km'], ['financien', 'Financiën']];
  function viewProject(p, tab) {
    if (!TABS.find(t => t[0] === tab)) tab = 'planning';
    const body = { planning: tabPlanning, callsheet: tabCallsheet, shotlist: tabShotlist, bestanden: tabFiles, feedback: tabFeedback, email: tabEmail, uren: tabHours, financien: tabFinance }[tab](p);
    const unread = (S.email.threads[p.id] || []).filter(m => m.nieuw).length;
    const si = STATUSES.indexOf(p.status);
    return `
      <a class="back" href="#/projecten">${icon('arrowLeft')} Projecten</a>
      <div class="proj-hero card">
        ${thumb(p, 'hero-thumb')}
        <div class="grow">
          <div class="row gap wrap">${statusPill(p.status)}<span class="small muted">${esc(p.type)} · deadline ${fdate(p.deadline)} · budget ${eur(p.budget)} excl. btw</span></div>
          <h1>${esc(p.titel)}</h1>
          <p class="muted">${esc(p.klant)} · contactpersoon ${esc(p.contact)}</p>
          <div class="stepper">${STATUSES.map((s, k) => `<button class="step ${k < si ? 'done' : ''} ${k === si ? 'current' : ''}" data-action="set-status" data-id="${p.id}" data-status="${esc(s)}" title="Zet status op ${esc(s)}"><span class="dot">${k < si ? icon('check') : k + 1}</span><span class="lbl">${esc(s)}</span></button>`).join('')}</div>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="#/review/${p.id}">${icon('play')} Open review</a>
          <a class="btn" href="#/klant/${p.id}">${icon('eye')} Bekijk als klant</a>
          <button class="btn ghost" data-action="quote-for" data-id="${p.id}">${icon('file')} Offerte maken</button>
          ${timerBtnHtml(p)}
        </div>
      </div>
      <nav class="tabs">${TABS.map(t => `<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/project/${p.id}/${t[0]}">${t[1]}${t[0] === 'email' && unread ? ` <span class="tab-badge" title="${unread} nieuw">${unread}</span>` : ''}</a>`).join('')}</nav>
      <div class="tab-body">${body}</div>`;
  }
  function tabPlanning(p) {
    const pl = S.planning[p.id];
    return `<div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>Draaidagen</h2><button class="btn sm" data-action="add-shootday" data-id="${p.id}">${icon('plus')} Draaidag</button></div>
        ${pl.draaidagen.length ? `<ul class="list">${pl.draaidagen.map(d => `
          <li class="row-item">
            ${dateChip(d.datum)}
            <div class="grow"><div class="strong">${esc(d.titel)}</div><div class="small muted">${icon('clock')} ${esc(d.tijd)} · ${icon('pin')} ${esc(d.locatie)}</div><div class="small muted">${icon('users')} ${esc(d.crew)}</div>${calProvider() && S.agenda.autoZet ? `<span class="cal-tag">${icon('calendar')} In je ${esc(CAL[calProvider()].label)}</span>` : ''}</div>
            <button class="btn sm ghost" data-action="open-callsheet" data-id="${p.id}" data-datum="${esc(d.datum)}">Callsheet</button>
          </li>`).join('')}</ul>` : `<div class="empty small">${icon('calendar')}<p>Nog geen draaidagen gepland.</p></div>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Locaties</h2><button class="btn sm" data-action="add-location" data-id="${p.id}">${icon('plus')} Locatie</button></div>
        ${pl.locaties.length ? `<ul class="list">${pl.locaties.map(l => `
          <li class="row-item"><span class="icon-box">${icon('pin')}</span><div class="grow"><div class="strong">${esc(l.naam)}</div><div class="small muted">${esc(l.adres)}</div><div class="small">${esc(l.notitie)}</div></div><button class="btn sm ghost" data-action="route">Route</button></li>`).join('')}</ul>` : `<div class="empty small">${icon('pin')}<p>Nog geen locaties.</p></div>`}
      </section>
    </div>`;
  }
  function tabShotlist(p) {
    const sl = S.shotlist[p.id]; const done = sl.filter(s => s.klaar).length;
    return `<div class="grid-2 wide-left">
      <section class="card">
        <div class="card-head"><h2>Shotlist</h2><span class="small muted">${done}/${sl.length} shots klaar</span></div>
        <div class="progress"><div style="width:${sl.length ? done / sl.length * 100 : 0}%"></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th></th><th>Sc.</th><th>Shot</th><th>Type</th><th>Lens</th><th>Locatie</th></tr></thead>
          <tbody>${sl.map((s, i) => `<tr class="${s.klaar ? 'done-row' : ''}"><td><input type="checkbox" data-action="toggle-shot" data-id="${p.id}" data-i="${i}" ${s.klaar ? 'checked' : ''} aria-label="Shot klaar"></td><td>${esc(s.scene)}</td><td>${esc(s.shot)}</td><td><span class="tag">${esc(s.type)}</span></td><td class="small">${esc(s.lens)}</td><td class="small">${esc(s.locatie)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nog geen shots. Voeg je eerste shot toe.</td></tr>'}</tbody>
        </table></div>
        <form class="inline-form" data-form="add-shot" data-id="${p.id}">
          <input name="shot" placeholder="Nieuw shot, bijv. ‘Close-up handen bij de oven’" required aria-label="Nieuw shot">
          <select name="type" aria-label="Type shot"><option>Wide</option><option>Medium</option><option>Close-up</option><option>Insert</option><option>Aerial</option></select>
          <button class="btn sm primary" type="submit">${icon('plus')} Shot</button>
        </form>
      </section>
      <section class="card">
        <div class="card-head"><h2>Draaiboek – draaidag 1</h2><a class="btn sm ghost" href="#/project/${p.id}/callsheet">${icon('calendar')} Open callsheet</a></div>
        <ol class="timeline">${D.draaiboek.map(d => `<li><span class="t">${d.tijd}</span><span>${esc(d.item)}</span></li>`).join('')}</ol>
      </section>
    </div>`;
  }
  function tabFiles(p) {
    const fl = S.files[p.id]; const maps = [...new Set(fl.map(f => f.map))];
    return `<section class="card">
      <div class="card-head"><h2>Bestanden</h2><div class="row gap"><button class="btn sm ghost" data-action="share-folder">${icon('link')} Deel met klant</button><button class="btn sm primary" data-action="upload-file" data-id="${p.id}">${icon('upload')} Uploaden</button></div></div>
      <div class="storage"><div class="small muted">Opslag: 1,24 TB van 2 TB gebruikt (Pro)</div><div class="progress"><div style="width:62%"></div></div></div>
      <div id="upload-progress"></div>
      ${maps.map(m => `<h3 class="folder-h">${icon('folder')} ${esc(m)}</h3><ul class="list files">${fl.filter(f => f.map === m).map(f => `
        <li class="row-item"><span class="icon-box">${icon(/\.(mp4|mov)$/.test(f.naam) ? 'film' : 'file')}</span><div class="grow"><div class="strong">${esc(f.naam)}</div><div class="small muted">${esc(f.grootte)} · ${esc(f.datum)}</div></div><button class="icon-btn" data-action="download" data-name="${esc(f.naam)}" aria-label="Download">${icon('download')}</button></li>`).join('')}</ul>`).join('')}
    </section>`;
  }
  function tabFeedback(p) {
    const c = S.comments[p.id];
    return `<div class="grid-2 wide-left">
      <section class="card">
        <div class="card-head"><h2>Feedback per versie</h2><a class="btn sm primary" href="#/review/${p.id}">${icon('play')} Open review</a></div>
        ${['v3', 'v2', 'v1'].map(v => { const list = (c[v] || []).slice().sort((a, b) => a.t - b.t); const open = list.filter(x => !x.opgelost).length; return `
          <div class="version-block">
            <div class="row-between"><div class="row gap wrap"><span class="vtag">${v}</span><span class="strong">${list.length} opmerkingen</span>${open ? `<span class="pill inv-open">${open} open</span>` : `<span class="pill inv-betaald">alles opgelost</span>`}${S.approved[p.id + ':' + v] ? '<span class="pill inv-betaald">goedgekeurd</span>' : ''}</div><a class="link" href="#/review/${p.id}/${v}">Bekijk ${v} →</a></div>
            <ul class="comments mini">${list.map(x => `<li class="${x.opgelost ? 'resolved' : ''}"><a class="tc" href="#/review/${p.id}/${v}">${tc(x.t)}</a><div><span class="strong">${esc(x.van)}</span> <span>${esc(x.tekst)}</span></div></li>`).join('')}</ul>
          </div>`; }).join('')}
      </section>
      <section class="card">
        <div class="card-head"><h2>Reviewlink</h2></div>
        <p class="small muted">Je klant geeft feedback zonder account via een persoonlijke link.</p>
        <div class="copy-field"><input readonly value="https://frame.voorbeeld/r/${p.id}-8f3k2" aria-label="Reviewlink"><button class="btn sm" data-action="copy-link">Kopieer</button></div>
        <a class="btn block" href="#/klant/${p.id}">${icon('eye')} Bekijk als klant</a>
      </section>
    </div>`;
  }
  function tabHours(p) {
    const h = S.hours[p.id]; const tu = projectHours(p.id), tk = projectKm(p.id);
    return `${isPro() ? '' : lockedHtml('timer')}<div class="kpis three">
        <div class="kpi"><span class="kpi-label">Uren dit project</span><strong>${num(tu, 2)} u</strong><span class="small muted">telt mee voor urencriterium</span></div>
        <div class="kpi"><span class="kpi-label">Kilometers</span><strong>${num(tk, 0)} km</strong><span class="small muted">${eur(tk * 0.23)} à €0,23/km (voorbeeld)</span></div>
        <div class="kpi"><span class="kpi-label">Effectief uurtarief</span><strong>${tu ? eur((p.budget - financeCosts(p.id)) / tu) : '–'}</strong><span class="small muted">(budget − kosten) / uren</span></div>
      </div>
      <section class="card">
        <div class="card-head"><h2>Uren & kilometers</h2>${timerBtnHtml(p, true)}</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Datum</th><th>Activiteit</th><th class="num">Uren</th><th class="num">Km</th></tr></thead>
          <tbody>${h.map(x => `<tr><td>${fdateShort(x.datum)}</td><td>${esc(x.activiteit)}${x.tid ? ` <button class="tag timer-tag" data-action="hours-edit" data-id="${p.id}" data-tid="${esc(x.tid)}" title="Gemeten met de timer – klik om te bewerken">${icon('clock')} timer · bewerk</button>` : ''}</td><td class="num">${num(x.uren, 2)}</td><td class="num">${num(x.km, 0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">Totaal</td><td class="num">${num(tu, 2)}</td><td class="num">${num(tk, 0)}</td></tr></tfoot>
        </table></div>
        <form class="inline-form" data-form="add-hours" data-id="${p.id}">
          <input type="date" name="datum" value="2026-10-01" required aria-label="Datum">
          <input name="activiteit" placeholder="Activiteit, bijv. Montage v3" required aria-label="Activiteit">
          <input type="number" name="uren" min="0" step="0.25" placeholder="Uren" required aria-label="Uren">
          <input type="number" name="km" min="0" step="1" placeholder="Km" aria-label="Kilometers">
          <button class="btn sm primary" type="submit">${icon('plus')} Toevoegen</button>
        </form>
      </section>`;
  }
  function tabFinance(p) {
    const f = S.finance[p.id]; const kosten = financeCosts(p.id); const tu = projectHours(p.id);
    const act = d => d.projectId && d.status === 'Concept' ? `<button class="btn sm ghost" data-action="send-invoice" data-nr="${esc(d.nr)}">${icon('send')} Versturen</button>` : d.status === 'Open' || d.status === 'Verlopen' ? `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="herinnering" data-nr="${esc(d.nr)}">${icon('send')} Herinner</button>` : d.status === 'Verstuurd' ? `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="offerte">${icon('send')} Opnieuw sturen</button>` : d.status === 'Betaald' || d.status === 'Geaccepteerd' ? '' : `<button class="btn sm ghost" data-action="quote-for" data-id="${p.id}">Maken</button>`;
    const q = S.quotes[p.id];
    const doc = (label, d, extra, inv) => `<div class="fin-doc card"><div class="small muted">${label}</div><div class="strong big">${eur(d.bedrag)}</div><div class="small muted">${esc(d.nr)} · ${esc(invDatum(d))}</div>${extra || ''}<div class="row-between">${statusPillInv(d.status)}${act(d)}</div>${inv ? tikkieStatusHtml(d.nr) + tikkieActionsHtml(d.nr, p.id, d.status) : ''}</div>`;
    return `${quoteSignCard(p)}<div class="fin-docs">
        ${doc('Offerte (excl. btw)', f.offerte, q ? `<div class="tiny ${q.signed ? 'ok' : 'muted'}">${icon(q.signed ? 'check' : 'pen')} ${q.signed ? 'Digitaal ondertekend' : 'Wacht op handtekening'}</div>` : '')}
        ${doc(`${esc(f.aanbetaling.omschrijving || 'Aanbetaling')} (incl. btw)`, f.aanbetaling, '', true)}
        ${doc('Eindfactuur (incl. btw)', f.eindfactuur, '', true)}
      </div>
      <div class="grid-2 wide-left">
        <section class="card">
          <div class="card-head"><h2>Ingehuurde freelancers & kosten</h2><button class="btn sm" data-action="add-freelancer" data-id="${p.id}">${icon('plus')} Freelancer</button></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Naam</th><th>Rol</th><th class="num">Dagen</th><th class="num">Kosten</th></tr></thead>
            <tbody>${f.freelancers.map(x => `<tr><td>${esc(x.naam)}</td><td><span class="tag">${esc(x.rol)}</span></td><td class="num">${num(x.dagen, 1)}</td><td class="num">${eur(x.kosten)}</td></tr>`).join('')}
            ${f.overig.map(x => `<tr><td colspan="3">${esc(x.omschrijving)}</td><td class="num">${eur(x.kosten)}</td></tr>`).join('')}
            ${!f.freelancers.length && !f.overig.length ? '<tr><td colspan="4" class="muted">Nog geen kosten.</td></tr>' : ''}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Projectresultaat</h2></div>
          <dl class="sum">
            <dt>Omzet (excl. btw)</dt><dd>${eur(p.budget)}</dd>
            <dt>Kosten freelancers & extra's</dt><dd>− ${eur(kosten)}</dd>
            <dt class="strong">Marge</dt><dd class="strong">${eur(p.budget - kosten)}</dd>
            <dt>Gewerkte uren</dt><dd>${num(tu, 2)} u</dd>
            <dt>Effectief uurtarief</dt><dd>${tu ? eur((p.budget - kosten) / tu) : '–'}</dd>
          </dl>
          <p class="tiny muted">Met een actieve boekhoudkoppeling wordt dit automatisch gesynchroniseerd (zie Instellingen).</p>
        </section>
      </div>`;
  }
  function mountProject(p, tab) {
    if (tab === 'email') (S.email.threads[p.id] || []).forEach(m => { m.nieuw = false; });
  }

  // ---------- Review ----------
  function videoTag(v, extra) { return `<video id="vid" controls playsinline preload="metadata" ${extra || ''}>${D.videos[v].map(src => `<source src="${src}" type="video/mp4">`).join('')}Je browser ondersteunt geen video.</video>`; }
  function reviewProjectSelect(p) {
    const list = S.projects.filter(x => x.versie !== '-' || x.id === p.id);
    return `<select class="select" data-action-change="review-project" aria-label="Kies project">${list.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.klant)} – ${esc(x.titel)}</option>`).join('')}</select>`;
  }
  function viewReview(p, v) {
    if (p.versie === '-') {
      return `<div class="page-head"><div><h1>Review</h1><p class="muted">${esc(p.titel)} · ${esc(p.klant)}</p></div><div class="head-actions">${reviewProjectSelect(p)}</div></div>
        <div class="empty card">${icon('film')}<p>Voor dit project is nog geen versie geüpload.</p><button class="btn primary" data-action="upload-v1" data-id="${p.id}">${icon('upload')} Upload v1 (demo)</button></div>`;
    }
    const list = (S.comments[p.id][v] || []).slice().sort((a, b) => a.t - b.t);
    const filtered = list.filter(c => S.commentFilter === 'Alle' || (S.commentFilter === 'Open' ? !c.opgelost : c.opgelost));
    const appr = S.approved[p.id + ':' + v];
    return `
      <div class="page-head">
        <div><a class="back" href="#/project/${p.id}/feedback">${icon('arrowLeft')} ${esc(p.titel)}</a><h1>Review</h1><p class="muted">${esc(p.klant)} · klik op een opmerking om naar dat moment in de video te springen</p></div>
        <div class="head-actions">${reviewProjectSelect(p)}<button class="btn" data-action="share-review" data-id="${p.id}">${icon('link')} Deel reviewlink</button><button class="btn primary" data-action="approve" data-id="${p.id}" data-v="${v}" ${appr ? 'disabled' : ''}>${icon('check')} ${appr ? 'Goedgekeurd' : 'Goedkeuren'}</button></div>
      </div>
      ${appr ? `<div class="banner ok">${icon('check')}<span class="grow">Versie ${v} is goedgekeurd op ${esc(appr)}. De klant kan nu de definitieve video downloaden.</span><button class="btn sm" data-action="compose" data-id="${p.id}" data-kind="oplevering">${icon('send')} Mail de klant</button></div>` : ''}
      <div class="review">
        <div class="review-main card">
          <div class="vswitch" role="tablist">${['v1', 'v2', 'v3'].map(x => `<a role="tab" class="${x === v ? 'active' : ''}" href="#/review/${p.id}/${x}">${x}${x === p.versie ? ' <small>nieuwste</small>' : ''}</a>`).join('')}<span class="tiny muted vs-note">Voorbeeldbeelden: open-source testclips</span></div>
          <div class="player" id="player">
            ${videoTag(v)}
            <div class="sub-overlay" id="sub-overlay" hidden></div>
            <div class="player-fallback" id="fallback" hidden>
              <div class="fb-inner" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><button class="fb-play" data-action="fb-toggle" aria-label="Afspelen">${icon('play')}</button><div class="small">Voorbeeldvideo kon niet laden (offline?) – gesimuleerde speler</div></div>
            </div>
          </div>
          <div class="scrub" id="scrub" data-action="scrub" title="Klik om te spoelen">
            <div class="scrub-fill" id="scrub-fill"></div>
            ${list.map(c => `<button class="marker ${c.rol} ${c.opgelost ? 'resolved' : ''}" data-action="seek" data-t="${c.t}" style="left:${Math.min(99, c.t / 10 * 100)}%" title="${tc(c.t)} – ${esc(c.van)}" aria-label="Spring naar ${tc(c.t)}"></button>`).join('')}
          </div>
          <div class="row-between player-meta"><span class="tc-now" id="tc-now">${tc(0)}</span><span class="small muted">${list.length} opmerkingen · ${list.filter(c => !c.opgelost).length} open</span></div>
          <form class="comment-form" data-form="add-comment" data-id="${p.id}" data-v="${v}">
            <span class="avatar sm">SV</span>
            <input name="tekst" placeholder="Opmerking op huidig tijdstip…" required autocomplete="off" aria-label="Nieuwe opmerking">
            <button class="btn primary sm" type="submit">${icon('msg')} Plaatsen</button>
          </form>
          ${subsPanelHtml(p, v)}
        </div>
        <aside class="review-side card">
          <div class="card-head"><h2>Opmerkingen ${v}</h2><div class="seg sm">${['Alle', 'Open', 'Opgelost'].map(f => `<button class="${S.commentFilter === f ? 'active' : ''}" data-action="comment-filter" data-f="${f}">${f}</button>`).join('')}</div></div>
          <ul class="comments" id="comments">${filtered.map(c => `
            <li class="comment ${c.opgelost ? 'resolved' : ''}" data-action="seek" data-t="${c.t}" tabindex="0">
              <div class="row-between"><span class="row gap"><span class="avatar sm ${c.rol}">${initials(c.van)}</span><span class="strong">${esc(c.van)}</span></span><span class="tc">${tc(c.t)}</span></div>
              <p>${esc(c.tekst)}</p>
              <label class="resolve" data-stop="1"><input type="checkbox" data-action="resolve" data-id="${p.id}" data-v="${v}" data-t="${c.t}" data-txt="${esc(c.tekst)}" ${c.opgelost ? 'checked' : ''}> Opgelost</label>
            </li>`).join('') || '<li class="muted small">Geen opmerkingen in deze weergave.</li>'}</ul>
        </aside>
      </div>`;
  }
  // Speler-abstractie: echte video of gesimuleerde fallback als de testclip niet laadt
  const Player = { mode: 'video', t: 0, dur: 10, iv: null, update: null };
  function wireVideo(vid) {
    const sources = $$('source', vid); const last = sources[sources.length - 1];
    const fail = () => { Player.mode = 'sim'; vid.hidden = true; const fb = $('#fallback'); if (fb) fb.hidden = false; };
    if (last) last.addEventListener('error', fail);
    cleanupFns.push(() => { clearInterval(Player.iv); Player.iv = null; try { vid.pause(); } catch (e) { /* noop */ } });
  }
  function mountReview(p, v) {
    const vid = $('#vid'); if (!vid) return;
    Player.mode = 'video'; Player.t = 0; Player.dur = 10; Player.subKey = p ? p.id + ':' + v : null;
    const update = () => {
      const t = Player.mode === 'video' ? vid.currentTime : Player.t;
      const el = $('#tc-now'); if (el) el.textContent = tc(t);
      const f = $('#scrub-fill'); if (f) f.style.width = Math.min(100, t / Player.dur * 100) + '%';
      $$('.comment').forEach(c => c.classList.toggle('near', Math.abs(Number(c.dataset.t) - t) < 0.6));
      subOverlay(t);
    };
    Player.update = update;
    vid.addEventListener('timeupdate', update);
    vid.addEventListener('loadedmetadata', () => {
      if (isFinite(vid.duration) && vid.duration > 0) { Player.dur = vid.duration; $$('.marker').forEach(m => { m.style.left = Math.min(99, Number(m.dataset.t) / Player.dur * 100) + '%'; }); }
    });
    wireVideo(vid);
  }
  function seek(t) {
    const vid = $('#vid');
    t = Math.max(0, Math.min(t, Player.dur - 0.05));
    if (Player.mode === 'video' && vid && !vid.hidden) {
      try { vid.currentTime = t; vid.pause(); } catch (e) { /* noop */ }
    } else { Player.t = t; }
    if (Player.update) Player.update();
  }

  // ---------- Klantportaal ----------
  const CLIENT_STEPS = ['Aanvraag', 'Offerte', 'Voorbereiding', 'Opnames', 'Montage', 'Jouw feedback', 'Opgeleverd'];
  function portalBar(p, label, backHref, backLabel) {
    return `<div class="preview-bar">${icon('eye')}<span>${label}</span><a class="btn sm" href="${backHref || '#/project/' + p.id + '/planning'}">${icon('arrowLeft')} ${backLabel || 'Terug naar Diafragmo'}</a></div>`;
  }
  function portalInvoice(p) {
    const list = S.invoices.filter(i => i.projectId === p.id && i.status !== 'Concept');
    const inv = list.find(i => i.status === 'Open' || i.status === 'Verlopen') || list.find(i => invSlot(i) === 'eindfactuur') || list[0];
    if (inv) return inv;
    const e = S.finance[p.id].eindfactuur, a = S.finance[p.id].aanbetaling;
    const d = a.status === 'Open' ? a : e;
    return { nr: d.nr === '–' ? 'F2026-0XX' : d.nr, bedrag: d.bedrag, vervalt: p.deadline, omschrijving: d === a ? 'Aanbetaling' : 'Eindfactuur', status: d.status === 'Betaald' ? 'Betaald' : 'Open', virtual: true };
  }
  function portalUploadsHtml() {
    return S.portal.uploads.map((u, i) => `<li class="row-item"><span class="icon-box">${icon('file')}</span><div class="grow"><div class="strong small">${esc(u.naam)}</div>${u.klaar ? `<div class="tiny muted">${esc(u.grootte)} · ontvangen</div>` : `<div class="progress thin"><div style="width:${u.pct || 0}%"></div></div>`}</div>${u.klaar ? `<span class="ok">${icon('check')}</span>` : ''}</li>`).join('');
  }
  function viewPortal(p) {
    const idx = STATUSES.indexOf(p.status);
    const inv = portalInvoice(p);
    const paid = !!S.portal.paidIds[p.id] || inv.status === 'Betaald';
    const approved = p.status === 'Opgeleverd' || !!S.approved[p.id + ':' + p.versie];
    const v = p.versie !== '-' ? p.versie : 'v1';
    const cur = approved ? 6 : idx;
    const q = S.quotes[p.id], qMain = !!q && p.versie === '-', qPending = !!q && !q.signed;
    return `${portalBar(p, `Je bekijkt het klantportaal zoals <strong>${esc(p.contact)}</strong> (${esc(p.klant)}) het ziet`)}
    <div class="portal" style="--brand:${S.showreel.kleur}">
      <header class="portal-head">
        <div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">Videoproductie · Zwolle</div></div></div>
        <div class="small muted">Welkom, ${esc(p.contact.split(' ')[0] === 'Dr.' ? p.contact : p.contact.split(' ')[0])}</div>
      </header>
      <section class="portal-hero">
        <div><div class="small muted">Jouw project</div><h1>${esc(p.titel)}</h1><p class="muted">Verwachte oplevering: ${fdate(p.deadline)}</p></div>
        ${qPending ? `<div class="callout">${icon('pen')}<div class="grow"><div class="strong">Volgende stap: onderteken de offerte</div><div class="small">Bekijk offerte ${esc(q.nr)} en geef digitaal akkoord.</div></div><a class="btn sm brand-btn" href="#/klant/${p.id}/offerte">Bekijken</a></div>` : approved ? `<div class="callout ok">${icon('check')}<div><div class="strong">Video goedgekeurd</div><div class="small">Je kunt de definitieve video downloaden.</div></div></div>` : idx >= 5 ? `<div class="callout">${icon('play')}<div><div class="strong">Volgende stap: bekijk versie ${v}</div><div class="small">Geef feedback of keur de video goed.</div></div></div>` : ''}
      </section>
      <ol class="ctimeline">${CLIENT_STEPS.map((s, k) => `<li class="${k < cur ? 'done' : ''} ${k === cur ? 'current' : ''}"><span class="dot">${k < cur ? icon('check') : ''}</span><span>${s}</span></li>`).join('')}</ol>
      <div class="portal-grid">
        ${qMain ? portalQuoteCard(p, q) : `<section class="pcard span-2">
          <h2>${icon('play')} Bekijk & geef feedback <span class="vtag">${v}</span></h2>
          <div class="player small-player">${videoTag(v)}
            <div class="player-fallback" id="fallback" hidden><div class="fb-inner" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><div class="small">Voorbeeldvideo kon niet laden</div></div></div></div>
          <form class="comment-form" data-form="portal-comment">
            <input name="tekst" placeholder="Typ je feedback – wordt gekoppeld aan het huidige moment" required autocomplete="off" aria-label="Feedback">
            <button class="btn sm brand-btn" type="submit">Verstuur</button>
          </form>
          <ul class="comments mini" id="portal-comments">${S.portal.comments.map(c => `<li><span class="tc">${tc(c.t)}</span><div>${esc(c.tekst)}</div></li>`).join('')}</ul>
          <div class="row-between approve-row">
            <span class="small muted">${approved ? 'Goedgekeurd – bedankt!' : 'Helemaal tevreden? Keur de video goed, dan maakt Sanne de definitieve export.'}</span>
            <button class="btn brand-btn" data-action="portal-approve" data-id="${p.id}" ${approved ? 'disabled' : ''}>${icon('check')} ${approved ? 'Goedgekeurd' : 'Goedkeuren'}</button>
          </div>
        </section>`}
        <section class="pcard">
          <h2>${icon('upload')} Materiaal aanleveren</h2>
          <label class="dropzone" id="dropzone"><input type="file" id="portal-file" multiple hidden>${icon('upload')}<span class="strong">Sleep bestanden hierheen</span><span class="small muted">of klik om te kiezen · logo's, foto's, muziek, teksten</span><span class="tiny muted">Prototype: bestanden worden niet echt geüpload.</span></label>
          <button class="btn sm ghost block" data-action="portal-demo-upload">Voorbeeldbestand toevoegen</button>
          <ul class="list files" id="portal-uploads">${portalUploadsHtml()}</ul>
          <div class="eu-note">${icon('lock')} Versleuteld verstuurd en opgeslagen in de EU</div>
        </section>
        <section class="pcard">
          <h2>${icon('download')} Definitieve video</h2>
          ${approved ? `<p class="small muted">Je video staat klaar. De link blijft 12 maanden geldig.</p>
            <button class="btn brand-btn block" data-action="portal-download" data-f="4K master (MP4, 2,1 GB)">${icon('download')} Download 4K master</button>
            <button class="btn block" data-action="portal-download" data-f="Social versie 9:16 (MP4, 180 MB)">${icon('download')} Social versie 9:16</button>
            <button class="btn block ghost" data-action="portal-download" data-f="Ondertitels (SRT)">Ondertitels (.srt)</button>`
            : `<div class="locked">${icon('lock')}<span>Beschikbaar na goedkeuring</span></div>`}
        </section>
        <section class="pcard">
          <h2>${icon('euro')} Factuur</h2>
          ${q && !S.invoices.some(i => i.projectId === p.id && i.status !== 'Concept') ? `<div class="invoice-mini"><div class="small muted">Aanbetaling ${q.aanbetalingPct}%</div><div class="amount">${eur(quoteCalc(q).aanb)}</div><div class="small muted">${q.signed ? 'Bedankt voor je akkoord! De aanbetalingsfactuur volgt binnenkort per e-mail.' : 'Na ondertekening van de offerte ontvang je de aanbetalingsfactuur. Betalen kan dan met iDEAL | Wero.'}</div></div>` : `<div class="invoice-mini">
            <div class="row-between"><span class="small muted">${esc(inv.nr)} · ${esc(inv.omschrijving)}</span>${statusPillInv(paid ? 'Betaald' : 'Open')}</div>
            <div class="amount">${eur(inv.bedrag)}</div>
            <div class="small muted">incl. 21% btw · vervaldatum ${fdate(inv.vervalt)}</div>
          </div>
          ${paid ? `<div class="banner ok small">${icon('check')} Betaald – bedankt!</div>` : `<button class="btn ideal block" data-action="ideal" data-id="${p.id}" aria-label="Betalen met iDEAL | Wero">Betalen met <span class="pay-pill">iDEAL | Wero</span></button>`}
          <button class="btn ghost block sm" data-action="download" data-name="${esc(inv.nr)}.pdf">${icon('file')} Factuur als PDF</button>`}
        </section>
      </div>
      <div class="eu-trust"><span class="eu-trust-badge">${euBadge('eu-flag')}${icon('lock')} Veilig gedeeld · gehost in de EU</span><span class="eu-trust-sub">Je video's, bestanden en gegevens blijven in Europa en worden beschermd volgens de AVG.</span></div>
      <footer class="portal-foot">Klantportaal van ${esc(D.studio.naam)} · aangedreven door <span class="pf-brand"><img class="pf-mark" src="img/beeldmerk.svg" alt=""><strong>Diafragmo</strong></span> · Prototype – voorbeelddata</footer>
    </div>`;
  }
  function fakeUpload(name, size) {
    const u = { naam: name, grootte: size, klaar: false, pct: 0 }; S.portal.uploads.push(u);
    const redraw = () => { const ul = $('#portal-uploads'); if (ul) ul.innerHTML = portalUploadsHtml(); };
    redraw();
    const iv = setInterval(() => {
      u.pct += 20 + Math.random() * 25;
      if (u.pct >= 100) { u.pct = 100; u.klaar = true; clearInterval(iv); toast(`“${esc(name)}” ontvangen (demo)`); }
      redraw();
    }, 300);
    cleanupFns.push(() => { clearInterval(iv); u.klaar = true; });
  }
  const mb = f => (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB';
  function mountPortal() {
    const vid = $('#vid');
    if (vid) { Player.mode = 'video'; Player.update = null; wireVideo(vid); }
    const fi = $('#portal-file');
    if (fi) fi.addEventListener('change', () => { Array.from(fi.files).forEach(f => fakeUpload(f.name, mb(f))); fi.value = ''; });
    const dz = $('#dropzone');
    if (dz) {
      ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
      dz.addEventListener('drop', e => { Array.from((e.dataTransfer && e.dataTransfer.files) || []).forEach(f => fakeUpload(f.name, mb(f))); });
    }
  }
  function viewPaid(p) {
    const inv = portalInvoice(p);
    return `${portalBar(p, 'Klantweergave – betaalbevestiging')}
      <div class="portal paid-wrap" style="--brand:${S.showreel.kleur}">
        <div class="paid card">
          <div class="paid-check">${icon('check')}</div>
          <h1>Betaling gelukt</h1>
          <p class="muted">Bedankt! Je betaling van <strong>${eur(inv.bedrag)}</strong> voor factuur ${esc(inv.nr)} is ontvangen.</p>
          <p class="small muted">${esc(D.studio.naam)} krijgt automatisch bericht. Je ontvangt een bevestiging per e-mail.</p>
          <div class="tiny muted">Demo – er is geen echte betaling gedaan · ${nowLabel()}</div>
          <a class="btn brand-btn" href="#/klant/${p.id}">Terug naar je project</a>
        </div>
      </div>`;
  }

  // ---------- Offerte- & factuurbouwer ----------
  function defaultQuote(pid) {
    const p = proj(pid) || proj('p6');
    return {
      type: 'Offerte', nr: 'O2026-022', projectId: p.id, datum: '2026-10-01', geldig: '2026-10-31', status: 'Concept', aanbetaling: true,
      lines: [
        { soort: 'Draaidag', omschrijving: 'Draaidag incl. camera- en lichtset (dagtarief)', aantal: 1, eenheid: 'dag', prijs: 750 },
        { soort: 'Montage', omschrijving: 'Montage, kleurcorrectie en geluidsmix', aantal: 14, eenheid: 'uur', prijs: 85 },
        { soort: 'Kilometers', omschrijving: 'Reiskosten Zwolle v.v.', aantal: 96, eenheid: 'km', prijs: 0.23 },
        { soort: 'Extra', omschrijving: 'Drone-opnames (gecertificeerde piloot)', aantal: 1, eenheid: 'stuk', prijs: 395 },
        { soort: 'Extra', omschrijving: 'Ondertiteling per video', aantal: 6, eenheid: 'stuk', prijs: 35 },
        { soort: 'Extra', omschrijving: 'Muzieklicentie (1 jaar, online gebruik)', aantal: 1, eenheid: 'stuk', prijs: 49 }
      ]
    };
  }
  const PRESETS = {
    Draaidag: { soort: 'Draaidag', omschrijving: 'Draaidag (dagtarief)', aantal: 1, eenheid: 'dag', prijs: 750 },
    Halvedag: { soort: 'Draaidag', omschrijving: 'Halve draaidag', aantal: 1, eenheid: 'dagdeel', prijs: 425 },
    Montage: { soort: 'Montage', omschrijving: 'Montage-uren', aantal: 8, eenheid: 'uur', prijs: 85 },
    Kilometers: { soort: 'Kilometers', omschrijving: 'Kilometers', aantal: 50, eenheid: 'km', prijs: 0.23 },
    Extra: { soort: 'Extra', omschrijving: 'Extra: tweede camera (incl. operator)', aantal: 1, eenheid: 'dag', prijs: 450 },
    Vrij: { soort: 'Overig', omschrijving: '', aantal: 1, eenheid: 'stuk', prijs: 0 }
  };
  const lineTotal = l => (Number(l.aantal) || 0) * (Number(l.prijs) || 0);
  const qCalc = q => { const sub = q.lines.reduce((a, l) => a + lineTotal(l), 0); const btw = sub * 0.21; return { sub, btw, tot: sub + btw }; };
  function viewBuilder() {
    if (!S.quote) S.quote = defaultQuote('p6');
    const q = S.quote;
    const docs = [
      { nr: 'O2026-021', soort: 'Offerte', klant: proj('p5').klant, bedrag: 2450, status: S.quotes.p5 ? S.quotes.p5.status : 'Verstuurd', pid: 'p5' },
      { nr: 'O2026-018', soort: 'Offerte', klant: proj('p1').klant, bedrag: 4850, status: 'Geaccepteerd', pid: 'p1' }
    ].concat(S.invoices.slice().sort((a, b) => String(b.nr).localeCompare(String(a.nr))).map(i => ({ nr: i.nr, soort: 'Factuur', klant: i.klant, bedrag: i.bedrag, status: i.status, pid: i.projectId })));
    return `
      <div class="page-head">
        <div><h1>Offertes & facturen</h1><p class="muted">Stel je offerte samen – totalen worden live berekend.</p></div>
        <div class="head-actions"><button class="btn" data-action="new-quote">${icon('plus')} Nieuwe offerte</button></div>
      </div>
      <div class="builder">
        <section class="card builder-edit">
          <div class="row gap wrap"><span class="doc-type ${q.type === 'Factuur' ? 'inv' : ''}">${q.type}</span><span class="strong">${esc(q.nr)}</span>${statusPillInv(q.status)}</div>
          <div class="form-grid three">
            <label>Project / klant<select data-q="projectId">${S.projects.filter(x => x.status !== 'Opgeleverd').map(x => `<option value="${x.id}" ${x.id === q.projectId ? 'selected' : ''}>${esc(x.klant)} – ${esc(x.titel)}</option>`).join('')}</select></label>
            <label>Datum<input type="date" data-q="datum" value="${q.datum}"></label>
            <label>${q.type === 'Factuur' ? 'Vervaldatum' : 'Geldig tot'}<input type="date" data-q="geldig" value="${q.geldig}"></label>
          </div>
          <div class="table-wrap"><table class="table lines">
            <thead><tr><th class="desc-col">Omschrijving</th><th class="num">Aantal</th><th class="num">Prijs (€)</th><th class="num">Totaal</th><th></th></tr></thead>
            <tbody>${q.lines.map((l, i) => `<tr>
              <td><span class="tag soort">${esc(l.soort)}</span><input data-line="${i}" data-f="omschrijving" value="${esc(l.omschrijving)}" placeholder="Omschrijving" aria-label="Omschrijving"></td>
              <td class="num"><div class="qty"><input type="number" step="any" min="0" data-line="${i}" data-f="aantal" value="${l.aantal}" class="n" aria-label="Aantal"><span class="tiny muted">${esc(l.eenheid)}</span></div></td>
              <td class="num"><input type="number" step="0.01" min="0" data-line="${i}" data-f="prijs" value="${l.prijs}" class="n" aria-label="Prijs"></td>
              <td class="num strong" id="lt-${i}">${eur(lineTotal(l))}</td>
              <td><button class="icon-btn" data-action="del-line" data-i="${i}" aria-label="Regel verwijderen">${icon('trash')}</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Voeg hieronder een regel toe.</td></tr>'}</tbody>
          </table></div>
          <div class="add-lines"><span class="small muted">Regel toevoegen:</span>
            <button class="chip" data-action="add-line" data-k="Draaidag">+ Dagtarief</button>
            <button class="chip" data-action="add-line" data-k="Halvedag">+ Halve dag</button>
            <button class="chip" data-action="add-line" data-k="Montage">+ Montage-uren</button>
            <button class="chip" data-action="add-line" data-k="Kilometers">+ Kilometers (€0,23)</button>
            <button class="chip" data-action="add-line" data-k="Extra">+ Extra</button>
            <button class="chip" data-action="add-line" data-k="Vrij">+ Vrije regel</button>
          </div>
          <label class="check"><input type="checkbox" data-q="aanbetaling" ${q.aanbetaling ? 'checked' : ''}> Vraag 50% aanbetaling bij akkoord</label>
          <div class="totals" id="totals"></div>
          ${q.type === 'Factuur' ? tikkieStatusHtml(q.nr) + (S.tikkie.verzoeken[q.nr] && !S.tikkie.verzoeken[q.nr].betaald && q.status !== 'Betaald' ? tikkieActionsHtml(q.nr, q.projectId, q.status, 'paid-only') : '') : ''}
          <div class="builder-actions">
            <button class="btn ghost" data-action="pdf">${icon('download')} PDF</button>
            ${q.type === 'Offerte' ? `<button class="btn" data-action="to-invoice">${icon('euro')} Zet om naar factuur</button><button class="btn primary" data-action="send-quote">${icon('send')} Verstuur offerte</button>`
              : `<button class="btn" data-action="back-to-quote">Terug naar offerte</button>${tikkieOn() && q.status !== 'Betaald' ? `<button class="btn" data-action="tikkie-open" data-id="${q.projectId}" data-nr="${esc(q.nr)}">${icon('send')} Tikkie sturen</button>` : ''}<button class="btn primary" data-action="send-quote">${icon('send')} Verstuur factuur</button>`}
          </div>
        </section>
        <section class="doc-preview card" id="quote-preview" aria-label="Voorbeeld document"></section>
      </div>
      <section class="card sign-overview">
        <div class="card-head"><h2>${icon('pen')} Digitaal ondertekenen</h2><span class="small muted">${Object.keys(S.quotes).filter(k => !S.quotes[k].signed).length} wacht op handtekening</span></div>
        <ul class="list">${Object.keys(S.quotes).map(k => { const qq = S.quotes[k], pp = proj(k); return `<li class="row-item sign-row">
          <span class="icon-box">${icon('file')}</span>
          <div class="grow"><div class="strong">${esc(qq.nr)} · ${esc(pp.klant)}</div>${signStatusHtml(qq)}</div>
          <div class="row gap wrap sign-row-actions">${qq.signed ? '' : `<button class="btn sm" data-action="sign-copy" data-id="${k}">${icon('link')} Link voor ondertekening kopiëren</button>`}<button class="btn sm ghost" data-action="quote-view" data-id="${k}">Bekijk</button></div>
        </li>`; }).join('') || '<li class="muted small">Geen offertes die op een handtekening wachten.</li>'}</ul>
      </section>
      <section class="card">
        <div class="card-head"><h2>Recente documenten</h2></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Nummer</th><th>Soort</th><th>Klant</th><th class="num">Bedrag</th><th>Status</th><th></th></tr></thead>
          <tbody>${docs.map(d => `<tr class="click" data-action="go" data-href="#/project/${d.pid}/financien"><td class="strong nr-cell">${esc(d.nr)}</td><td>${d.soort}</td><td>${esc(d.klant)}</td><td class="num">${eur(d.bedrag)}${d.soort === 'Offerte' ? ' <span class="tiny muted">excl.</span>' : ''}</td><td>${statusPillInv(d.status)}${d.soort === 'Factuur' ? tikkieStatusHtml(d.nr) : ''}</td><td class="num"><div class="doc-row-actions">${d.soort === 'Factuur' ? tikkieActionsHtml(d.nr, d.pid, d.status) : ''}<span class="link">Project →</span></div></td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }
  function renderQuoteLive() {
    const q = S.quote; if (!q) return; const p = proj(q.projectId) || proj('p6'); const c = qCalc(q);
    q.lines.forEach((l, i) => { const el = $('#lt-' + i); if (el) el.textContent = eur(lineTotal(l)); });
    const t = $('#totals');
    if (t) t.innerHTML = `<dl class="sum"><dt>Subtotaal</dt><dd>${eur(c.sub)}</dd><dt>Btw 21%</dt><dd>${eur(c.btw)}</dd><dt class="strong total">Totaal incl. btw</dt><dd class="strong total" id="grand-total">${eur(c.tot)}</dd>${q.aanbetaling && q.type === 'Offerte' ? `<dt class="muted">Aanbetaling 50%</dt><dd class="muted">${eur(c.tot / 2)}</dd>` : ''}</dl>`;
    const pv = $('#quote-preview');
    if (pv) pv.innerHTML = `
      <div class="doc">
        <div class="doc-top"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${esc(D.studio.email)}<br>KvK ${esc(D.studio.kvk)}<br>Btw ${esc(D.studio.btw)}</div></div></div><div class="doc-title">${q.type.toUpperCase()}<div class="tiny muted">${esc(q.nr)}</div></div></div>
        <div class="doc-meta"><div><div class="tiny muted">Aan</div><div class="strong">${esc(p.klant)}</div><div class="small">t.a.v. ${esc(p.contact)}</div></div><div><div class="tiny muted">Datum</div><div class="small">${fdate(q.datum)}</div><div class="tiny muted">${q.type === 'Factuur' ? 'Vervaldatum' : 'Geldig tot'}</div><div class="small">${fdate(q.geldig)}</div></div></div>
        <div class="small"><span class="muted">Betreft:</span> ${esc(p.titel)}</div>
        <table class="doc-lines"><thead><tr><th>Omschrijving</th><th class="num">Aantal</th><th class="num">Prijs</th><th class="num">Totaal</th></tr></thead>
          <tbody>${q.lines.map(l => `<tr><td>${esc(l.omschrijving || '—')}</td><td class="num">${num(l.aantal, 2)} ${esc(l.eenheid)}</td><td class="num">${eur(l.prijs)}</td><td class="num">${eur(lineTotal(l))}</td></tr>`).join('')}</tbody></table>
        <dl class="sum doc-sum"><dt>Subtotaal</dt><dd>${eur(c.sub)}</dd><dt>Btw 21%</dt><dd>${eur(c.btw)}</dd><dt class="strong">Totaal</dt><dd class="strong">${eur(c.tot)}</dd></dl>
        ${q.type === 'Factuur' ? `<div class="doc-pay"><span class="pay-pill">iDEAL | Wero</span><div class="small">Betaal direct online met iDEAL | Wero via de link in de e-mail, of maak over naar ${esc(D.studio.iban)} o.v.v. ${esc(q.nr)}.</div></div>`
          : `<div class="small muted">${q.aanbetaling ? `Bij akkoord ontvang je een aanbetalingsfactuur van 50% (${eur(c.tot / 2)}). ` : ''}Akkoord geven kan online met één klik.</div>`}
        <div class="tiny muted doc-foot">Voorbeelddocument – fictieve gegevens</div>
      </div>`;
  }

  // ---------- Showreel ----------
  const orderedReel = () => S.showreel.items.map(it => Object.assign({ p: proj(it.id) }, it)).filter(x => x.p);
  function viewShowreelEditor() {
    const sr = S.showreel;
    const items = orderedReel();
    return `
      <div class="page-head">
        <div><h1>Showreel & website</h1><p class="muted">Kies opgeleverde projecten, zet ze in volgorde en publiceer op je eigen domein.</p></div>
        <div class="head-actions"><a class="btn" href="#/showreel/live">${icon('ext')} Bekijk publieke pagina</a><button class="btn primary" data-action="publish">${icon('globe')} Publiceren</button></div>
      </div>
      <div class="reel-grid">
        <div class="reel-left">
        <section class="card">
          <div class="card-head"><h2>Projecten</h2><span class="small muted">${sr.items.filter(i => i.on).length} van ${sr.items.length} geselecteerd</span></div>
          <p class="tiny muted">Sleep om te ordenen of gebruik de pijltjes. Alleen opgeleverde projecten.</p>
          <ul class="reel-list" id="reel-list">${items.map((it, i) => `
            <li class="reel-item ${it.on ? '' : 'off'}" draggable="true" data-i="${i}">
              <span class="grip" title="Slepen">${icon('grip')}</span>
              <input type="checkbox" data-action="sr-toggle" data-i="${i}" ${it.on ? 'checked' : ''} aria-label="Toon ${esc(it.p.titel)} in showreel">
              ${thumb(it.p, 'mini')}
              <div class="grow"><div class="strong small">${esc(it.p.titel)}</div><div class="tiny muted">${esc(it.p.klant)}</div></div>
              <button class="icon-btn" data-action="sr-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Omhoog">${icon('up')}</button>
              <button class="icon-btn" data-action="sr-move" data-i="${i}" data-d="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Omlaag">${icon('down')}</button>
            </li>`).join('')}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>Pagina-instellingen</h2></div>
          <div class="form-col">
            <label>Domein<div class="input-prefix"><span>https://</span><input data-sr="domein" value="${esc(sr.domein)}" placeholder="jouwnaam.nl"></div><span class="tiny muted">Eigen domein koppelen via een CNAME-record (stap-voor-stap uitleg).</span></label>
            <label>Paginatitel<input data-sr="titel" value="${esc(sr.titel)}"></label>
            <label>Introtekst<textarea data-sr="intro" rows="4">${esc(sr.intro)}</textarea></label>
            <div><div class="lbl-txt">Accentkleur (ook gebruikt in je klantportaal)</div><div class="swatches">${['#ff6a3d', '#6366f1', '#10b981', '#e11d48', '#0ea5e9', '#f5b301'].map(c => `<button class="swatch ${c === sr.kleur ? 'active' : ''}" style="background:${c}" data-action="sr-color" data-c="${c}" aria-label="Kleur ${c}"></button>`).join('')}</div></div>
            <label class="check"><input type="checkbox" data-sr="formulier" ${sr.formulier ? 'checked' : ''}> Aanvraagformulier tonen op de pagina</label>
          </div>
        </section>
        </div>
        <section class="card reel-preview-card">
          <div class="card-head"><h2>Live voorbeeld</h2><a class="link" href="#/showreel/live">Volledig scherm →</a></div>
          <div class="browser"><div class="browser-bar"><span></span><span></span><span></span><div class="url">${icon('lock')} ${esc(sr.domein || 'jouwnaam.nl')}</div></div>
            <div class="browser-body"><div class="mini-site" style="--brand:${sr.kleur}">${publicSiteInner(true)}</div></div></div>
        </section>
      </div>`;
  }
  function publicSiteInner(mini) {
    const sr = S.showreel; const items = orderedReel().filter(i => i.on); const feat = items[0];
    const nav = (t, label, cls) => mini ? `<span class="${cls || ''}">${label}</span>` : `<a href="#/showreel/live" class="${cls || ''}" data-action="scroll" data-target="${t}">${label}</a>`;
    return `
      <header class="site-head"><span class="site-logo">${esc(initials(sr.titel || 'S V') || 'SV')}</span><span class="strong">${esc(sr.titel)}</span><nav class="site-nav">${nav('site-werk', 'Werk')}${mini ? '' : nav('site-over', 'Over')}${sr.formulier ? nav('site-form', 'Project aanvragen', 'site-cta') : ''}</nav></header>
      <section class="site-hero">
        <div><h1>${esc(sr.titel)}</h1><p>${esc(sr.intro)}</p>${sr.formulier ? (mini ? '<span class="site-btn">Vraag een offerte aan</span>' : `<a href="#/showreel/live" class="site-btn" data-action="scroll" data-target="site-form">Vraag een offerte aan</a>`) : ''}</div>
        ${feat ? `<div class="site-feature" ${mini ? '' : `data-action="play-reel" data-id="${feat.p.id}" role="button" tabindex="0"`} style="background:linear-gradient(135deg,${feat.p.grad[0]},${feat.p.grad[1]})"><span class="thumb-play">${icon('play')}</span><span class="tiny">Showreel 2026</span></div>` : ''}
      </section>
      <section class="site-work" id="${mini ? '' : 'site-werk'}"><h2>Recent werk</h2>
        <div class="site-grid">${items.map(it => `<div class="site-item" ${mini ? '' : `data-action="play-reel" data-id="${it.p.id}" role="button" tabindex="0"`}>${thumb(it.p)}<div class="strong small">${esc(it.p.titel)}</div><div class="tiny muted">${esc(it.p.klant)}</div></div>`).join('') || '<p class="muted small">Selecteer projecten in de editor.</p>'}</div>
      </section>
      ${mini ? '' : `<section class="site-about" id="site-over"><h2>Over mij</h2><p>Al ruim acht jaar maak ik video's voor mkb, gemeenten en evenementen. Van eerste idee tot de laatste export: één aanspreekpunt, heldere planning en een vaste prijs vooraf.</p></section>`}
      ${sr.formulier ? (mini ? `<section class="site-form-mini"><div class="strong small">Project aanvragen</div><div class="fake-input"></div><div class="fake-input"></div><div class="fake-btn"></div></section>` : publicForm()) : ''}
      <footer class="site-foot">© 2026 ${esc(sr.titel)} · ${esc(sr.domein)} · gemaakt met <span class="pf-brand"><img class="pf-mark" src="img/beeldmerk.svg" alt="">Diafragmo</span></footer>`;
  }
  function publicForm() {
    const sent = S.showreelSent;
    if (sent) {
      return `<section class="site-form" id="site-form"><div class="sent">
        <div class="paid-check">${icon('check')}</div>
        <h2>Bedankt, ${esc(sent.naam)}!</h2><p>Je aanvraag is verstuurd. ${esc(S.showreel.titel)} neemt binnen twee werkdagen contact met je op.</p>
        <div class="maker-note"><div class="tiny muted">Ondertussen in Diafragmo (wat de videomaker ziet):</div><div class="strong ok-text">${icon('check')} Nieuw project aangemaakt</div><div class="small">“${esc(sent.titel)}” voor ${esc(sent.klant)} · status <strong>Aanvraag</strong></div>
          <div class="row gap"><a class="btn sm primary" href="#/project/${sent.id}/planning">Open in Diafragmo</a><button class="btn sm ghost" data-action="reset-form">Nog een aanvraag</button></div></div>
      </div></section>`;
    }
    return `<section class="site-form" id="site-form"><h2>Project aanvragen</h2><p class="muted small">Vertel kort over je plannen, dan ontvang je snel een voorstel.</p>
      <form data-form="public-request" class="form-grid two">
        <label>Naam*<input name="naam" required placeholder="Voor- en achternaam"></label>
        <label>E-mail*<input name="email" type="email" required placeholder="naam@bedrijf.nl"></label>
        <label>Bedrijf / organisatie<input name="bedrijf" placeholder="Optioneel"></label>
        <label>Soort project<select name="type"><option>Bedrijfsfilm</option><option>Aftermovie</option><option>Social content</option><option>Productvideo</option><option>Trouwfilm</option><option>Anders</option></select></label>
        <label>Gewenste datum<input name="datum" type="date"></label>
        <label>Budget-indicatie<select name="budget"><option>€ 1.000 – 2.500</option><option>€ 2.500 – 5.000</option><option>€ 5.000 – 10.000</option><option>Weet ik nog niet</option></select></label>
        <label class="full">Bericht*<textarea name="bericht" rows="4" required placeholder="Waar gaat de video over en waar wordt hij gebruikt?"></textarea></label>
        <div class="full row-between wrap"><span class="tiny muted">Voorbeeldformulier – er worden geen gegevens verstuurd.</span><button class="site-btn" type="submit">Aanvraag versturen</button></div>
      </form></section>`;
  }
  function viewPublicShowreel() {
    return `<div class="preview-bar">${icon('eye')}<span>Voorbeeld van je publieke showreel op <strong>${esc(S.showreel.domein || 'jouwnaam.nl')}</strong></span><a class="btn sm" href="#/showreel">${icon('arrowLeft')} Terug naar editor</a></div>
      <div class="public-site" style="--brand:${S.showreel.kleur}">${publicSiteInner(false)}</div>`;
  }
  function mountShowreelEditor() {
    const ul = $('#reel-list'); if (!ul) return; let from = null;
    $$('.reel-item', ul).forEach(li => {
      li.addEventListener('dragstart', e => { from = Number(li.dataset.i); li.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(from)); } catch (er) { /* noop */ } });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('drop-target'); });
      li.addEventListener('dragleave', () => li.classList.remove('drop-target'));
      li.addEventListener('drop', e => { e.preventDefault(); const to = Number(li.dataset.i); if (from !== null && from !== to) { const it = S.showreel.items.splice(from, 1)[0]; S.showreel.items.splice(to, 0, it); render(); toast('Volgorde aangepast'); } from = null; });
    });
  }
  function refreshReelPreview() {
    const b = $('.browser-body'); if (b) b.innerHTML = `<div class="mini-site" style="--brand:${S.showreel.kleur}">${publicSiteInner(true)}</div>`;
    const u = $('.browser .url'); if (u) u.innerHTML = `${icon('lock')} ${esc(S.showreel.domein || 'jouwnaam.nl')}`;
  }

  // ---------- Koppeling e-mail & agenda (gesimuleerd): één login per aanbieder, Microsoft 365 of Google ----------
  const ACC_KEYS = ['microsoft', 'google'];
  const ACC = {
    microsoft: { naam: 'Microsoft 365', sub: 'Outlook-mail + agenda', detail: 'Microsoft 365, Outlook.com en Exchange', bedrijf: 'Microsoft', mail: 'Outlook', cal: 'Outlook-agenda', logo: 'outlook', login: 'Aanmelden bij Microsoft (demo)' },
    google: { naam: 'Google', sub: 'Gmail + Google Agenda', detail: 'Gmail, Google Agenda en Google Workspace', bedrijf: 'Google', mail: 'Gmail', cal: 'Google Agenda', logo: 'gmail', login: 'Inloggen met Google (demo)' }
  };
  const accKey = k => ({ outlook: 'microsoft', gmail: 'google' }[k] || (ACC[k] ? k : 'microsoft')); // oude sleutels (0.4.0) blijven werken
  const acc = k => S.koppeling[k];
  const mailOn = k => !!(S.koppeling[k] && S.koppeling[k].connected && S.koppeling[k].mail);
  const agendaOn = k => !!(S.koppeling[k] && S.koppeling[k].connected && S.koppeling[k].agenda);
  const mailOffProvider = () => ACC_KEYS.find(k => acc(k).connected && !acc(k).mail) || null;
  // Eenvoudige, zelfgetekende logo's (geen officiële beeldmerken)
  const LOGO = {
    outlook: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="11" y="6" width="19" height="20" rx="2.5" fill="#28a8ea"/><path d="M11.5 11.5l9 6 9-6" fill="none" stroke="#fff" stroke-width="1.6" opacity=".9"/><rect x="2" y="8" width="16" height="16" rx="2.5" fill="#0a64c8"/><ellipse cx="10" cy="16" rx="3.8" ry="4.5" fill="none" stroke="#fff" stroke-width="2.4"/></svg>',
    gmail: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 10.5v13A2.5 2.5 0 0 0 5.5 26H9V14.2z" fill="#4285f4"/><path d="M29 10.5v13a2.5 2.5 0 0 1-2.5 2.5H23V14.2z" fill="#34a853"/><path d="M23 8.6v5.6l6-4.5V8.4c0-2.2-2.5-3.4-4.2-2.1z" fill="#fbbc04"/><path d="M9 14.2V8.6l7 5.3 7-5.3v5.6l-7 5.2z" fill="#ea4335"/><path d="M3 8.4v1.3l6 4.5V8.6L7.2 6.3C5.5 5 3 6.2 3 8.4z" fill="#c5221f"/></svg>'
  };
  const TPL_KEYS = ['offerte', 'factuur', 'herinnering', 'tikkie', 'oplevering'];
  const tplKeys = () => TPL_KEYS.filter(k => k !== 'tikkie' || tikkieOn()); // sjabloon Tikkie alleen als Tikkie aan staat
  const PLACEHOLDERS = ['{klant}', '{voornaam}', '{project}', '{portaallink}', '{documentnr}', '{bedrag}', '{vervaldatum}'];
  const TIKKIE_PH = ['{tikkielink}', '{geldigtot}'];
  const KIND_TITLE = { offerte: 'Offerte versturen', factuur: 'Factuur versturen', herinnering: 'Betaalherinnering versturen', tikkie: 'Tikkie versturen per e-mail', oplevering: 'Opleveringsmail versturen', leeg: 'Nieuwe e-mail', reply: 'Antwoorden' };
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const isoAdd = (iso, days) => { const d = pd(iso); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const firstName = c => { const w = String(c || '').split(' '); return w[0] === 'Dr.' ? c : w[0]; };
  const clientEmailsOf = p => D.clientEmails[p.id] || (p.email ? [p.email] : []);
  const clientEmail = p => clientEmailsOf(p)[0] || '';
  const portalLink = p => `https://portaal.diafragmo.voorbeeld/${p.id}-8f3k2`;
  const fillTpl = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null && vars[k] !== '' ? vars[k] : m));
  function sender() {
    const ok = ACC_KEYS.filter(mailOn), k = ok.includes(S.email.active) ? S.email.active : ok[0];
    if (k) return { k, label: ACC[k].mail, adres: acc(k).adres, logo: LOGO[ACC[k].logo] };
    return { k: 'noreply', label: 'Diafragmo (noreply)', adres: 'noreply@diafragmo.voorbeeld', logo: '' };
  }
  function fixActive() { const ok = ACC_KEYS.filter(mailOn); if (!ok.includes(S.email.active)) S.email.active = ok[0] || null; }
  function renderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  function seedThread(p) {
    const adr = clientEmail(p); if (!adr) return [];
    const idx = STATUSES.indexOf(p.status), v = firstName(p.contact), me = S.koppeling.microsoft.adres, f = S.finance[p.id];
    const done = p.status === 'Opgeleverd';
    const base = done ? p.deadline : '2026-10-01';
    const out = [];
    const inn = (datum, tijd, onderwerp, tekst, extra) => out.push(Object.assign({ dir: 'in', van: p.contact, adres: adr, datum, tijd, onderwerp, tekst }, extra || {}));
    const uit = (datum, tijd, onderwerp, tekst, bijlagen) => out.push({ dir: 'out', van: 'Sanne de Vries', adres: me, aan: adr, datum, tijd, onderwerp, tekst, bijlagen: bijlagen || [] });
    const aanvraag = p.aanvraag || `Wij zijn op zoek naar een videomaker voor “${p.titel}”. We denken aan een ${String(p.type).toLowerCase()} die we online en op social media kunnen gebruiken. Heb je binnenkort tijd voor een kennismaking?`;
    inn(idx === 0 ? (p.aanvraagDatum || '2026-10-01') : idx === 1 ? '2026-09-08' : isoAdd(base, -48), idx === 0 ? '10:24' : '09:41', `Aanvraag: ${p.titel}`, `Hoi Sanne,\n\n${aanvraag}\n\nGroet,\n${p.contact}\n${p.klant}`, idx === 0 ? { nieuw: true } : {});
    if (idx >= 1) uit(idx === 1 ? '2026-09-15' : isoAdd(base, -42), '15:10', `Offerte ${f.offerte.nr} – ${p.titel}`, `Hoi ${v},\n\nLeuk dat we kennis hebben gemaakt! In de bijlage vind je de offerte voor “${p.titel}”. Akkoord geven kan met één klik in je klantportaal:\n${portalLink(p)}\n\nHartelijke groet,\nSanne`, [{ naam: f.offerte.nr + '.pdf', grootte: '82 KB' }]);
    if (idx >= 2) inn(isoAdd(base, -39), '08:55', `Re: Offerte ${f.offerte.nr} – ${p.titel}`, `Hoi Sanne,\n\nZiet er goed uit, we gaan akkoord! Ik heb het in het portaal bevestigd.\n\nGroet,\n${v}`);
    if (idx >= 3) uit(isoAdd(base, -25), '11:45', `Planning draaidag – ${p.titel}`, `Hoi ${v},\n\nHierbij de planning en het draaiboek voor de draaidag. Laat je weten of de tijden passen?\n\nHartelijke groet,\nSanne`, [{ naam: 'Draaiboek.pdf', grootte: '180 KB' }]);
    if (idx >= 4 && p.versie !== '-') uit(done ? isoAdd(base, -8) : '2026-09-29', '16:30', `Versie ${p.versie.slice(1)} staat klaar: ${p.titel}`, `Hoi ${v},\n\nVersie ${p.versie.slice(1)} staat klaar in je klantportaal. Je kunt direct op het juiste moment in de video feedback geven:\n${portalLink(p)}\n\nHartelijke groet,\nSanne`);
    const fb = D.feedbackWaiting.find(x => x.projectId === p.id);
    if (fb) inn(done ? isoAdd(base, -6) : '2026-10-01', '16:05', `Re: Versie ${p.versie.slice(1)} staat klaar: ${p.titel}`, `Hoi Sanne,\n\nDank je wel! ${fb.quote} Verder ziet het er top uit.\n\nGroet,\n${v}`);
    if (done) {
      uit(base, '10:00', `Je video is klaar: ${p.titel}`, `Hoi ${v},\n\nDe definitieve versie staat klaar in je klantportaal. De downloadlink blijft 12 maanden geldig.\n\nHartelijke groet,\nSanne`);
      inn(isoAdd(base, 1), '08:47', `Re: Je video is klaar: ${p.titel}`, `Hoi Sanne,\n\nSuper blij mee, iedereen is enthousiast. Bedankt voor de fijne samenwerking!\n\nGroet,\n${v}`);
    }
    return out.sort((a, b) => (a.datum + a.tijd).localeCompare(b.datum + b.tijd));
  }

  function findDoc(p, nr) {
    const inv = S.invoices.find(i => i.nr === nr);
    if (inv) return { nr: inv.nr, bedrag: inv.bedrag, vervalt: inv.vervalt };
    const f = S.finance[p.id];
    const d = [f.aanbetaling, f.eindfactuur].find(x => x.nr === nr);
    return d ? { nr: d.nr, bedrag: d.bedrag, vervalt: isoAdd(todayIso(), 14) } : null;
  }
  function openInvoiceDoc(p) {
    const inv = S.invoices.find(i => i.projectId === p.id && i.status !== 'Betaald');
    if (inv) return { nr: inv.nr, bedrag: inv.bedrag, vervalt: inv.vervalt };
    const f = S.finance[p.id];
    const d = [f.aanbetaling, f.eindfactuur].find(x => x.status === 'Open' || x.status === 'Verlopen') || f.eindfactuur;
    return { nr: d.nr === '–' ? 'F2026-034' : d.nr, bedrag: d.bedrag, vervalt: isoAdd(todayIso(), 14) };
  }
  function draftFor(p, kind, opt) {
    opt = opt || {}; ensure(p);
    const adr = clientEmail(p);
    const d = { pid: p.id, kind, origKind: kind, to: adr ? `${p.contact} <${adr}>` : '', subject: '', body: '', att: [], onSent: opt.onSent || null, title: opt.title };
    d.origOnSent = d.onSent;
    const vars = { klant: p.klant, voornaam: firstName(p.contact), project: p.titel, portaallink: portalLink(p), afzender: D.studio.eigenaar, documentnr: '', bedrag: '', vervaldatum: '', tikkielink: '', geldigtot: '' };
    let doc = opt.doc || (opt.nr ? findDoc(p, opt.nr) : null);
    if (kind === 'offerte') {
      const o = S.finance[p.id].offerte;
      doc = doc || { nr: o.nr !== '–' ? o.nr : 'O2026-022', bedrag: Math.round(p.budget * 121) / 100 };
    } else if (kind === 'factuur' || kind === 'herinnering' || kind === 'tikkie') doc = doc || openInvoiceDoc(p);
    d.doc = doc;
    if (doc) { vars.documentnr = doc.nr; vars.bedrag = eur(doc.bedrag); vars.vervaldatum = doc.vervalt ? fdate(doc.vervalt) : ''; }
    const tk = doc && (doc.tikkie || S.tikkie.verzoeken[doc.nr]);
    if (tk) { vars.tikkielink = tk.link; vars.geldigtot = fdate(tk.geldig); if (kind === 'tikkie') vars.bedrag = eur(tk.bedrag); }
    if (TPL_KEYS.includes(kind)) {
      const t = S.email.templates[kind];
      d.subject = fillTpl(t.onderwerp, vars); d.body = fillTpl(t.body, vars);
      if (kind !== 'oplevering' && doc) d.att = [{ naam: doc.nr + '.pdf', grootte: kind === 'offerte' ? '84 KB' : '66 KB' }];
    } else if (kind === 'reply' && opt.msg) {
      const m = opt.msg;
      d.to = `${m.van} <${m.adres}>`;
      d.subject = /^re:/i.test(m.onderwerp) ? m.onderwerp : 'Re: ' + m.onderwerp;
      d.body = `Hoi ${firstName(m.van)},\n\n\n\nHartelijke groet,\nSanne\n\nOp ${fdate(m.datum)} om ${m.tijd} schreef ${m.van}:\n` + m.tekst.split('\n').map(l => '> ' + l).join('\n');
    } else {
      d.kind = d.origKind = 'leeg';
      d.subject = p.titel; d.body = fillTpl('Hoi {voornaam},\n\n\n\nHartelijke groet,\nSanne', vars);
    }
    return d;
  }

  function sendAsHtml(s, inCompose) {
    if (s.k !== 'noreply') return `<div class="send-as linked">${s.logo}<div class="grow small"><span class="muted">Verzonden via</span> <strong>${esc(s.label)}</strong> · ${esc(s.adres)}</div><a class="link" href="#/instellingen/email">Wijzig</a></div>`;
    const off = mailOffProvider();
    if (off) return `<div class="send-as nolink"><div class="row gap">${icon('msg')}<div class="grow"><div class="strong small">E-mail staat uit bij je ${esc(ACC[off].naam)}-koppeling</div><div class="tiny">Je account is gekoppeld, maar E-mail staat uit. Nu wordt dit verzonden via Diafragmo (noreply) namens ${esc(D.studio.naam)}. Zet E-mail aan om vanaf ${esc(acc(off).adres)} te versturen.</div></div></div>
      <div class="row gap wrap send-as-btns"><button type="button" class="btn sm" data-action="mail-enable" data-k="${off}">${LOGO[ACC[off].logo]} E-mail aanzetten</button><a class="btn sm ghost" href="#/instellingen/email">${icon('settings')} Instellingen</a></div></div>`;
    return `<div class="send-as nolink"><div class="row gap">${icon('msg')}<div class="grow"><div class="strong small">Koppel je e-mail in Instellingen</div><div class="tiny">Eén koppeling met Microsoft 365 of Google regelt e-mail én agenda. Zonder koppeling wordt dit verzonden via Diafragmo (noreply) namens ${esc(D.studio.naam)}. Antwoorden gaan naar ${esc(D.studio.email)}.</div></div></div>
      <div class="row gap wrap send-as-btns"><a class="btn sm" href="#/instellingen/email">${icon('settings')} Koppel je e-mail</a>${inCompose ? ACC_KEYS.map(k => `<button type="button" class="btn sm ghost" data-action="compose-connect" data-k="${k}">${LOGO[ACC[k].logo]} ${esc(ACC[k].naam)}</button>`).join('') : ''}</div></div>`;
  }
  const attHtml = att => att.map((a, i) => `<span class="att-chip">${icon('file')}<span class="att-name">${esc(a.naam)}</span><small>${esc(a.grootte)}</small><button type="button" class="att-x" data-action="cmp-del-att" data-i="${i}" aria-label="Bijlage ${esc(a.naam)} verwijderen">${icon('x')}</button></span>`).join('') +
    `<button type="button" class="chip" data-action="cmp-add-att">${icon('plus')} Bijlage</button>`;

  let currentDraft = null;
  function openCompose(d) {
    currentDraft = d;
    const s = sender(), e = S.email;
    const fromTxt = s.k === 'noreply' ? `${esc(D.studio.naam)} via Diafragmo &lt;${esc(s.adres)}&gt;` : `Sanne de Vries &lt;${esc(s.adres)}&gt;`;
    const bccAdr = s.k === 'noreply' ? D.studio.email : s.adres;
    modal({
      title: d.title || KIND_TITLE[d.kind] || 'Nieuwe e-mail', wide: true,
      body: `<form id="compose-form" class="compose">
        ${sendAsHtml(s, true)}
        <div class="cmp-fields">
          <div class="cmp-row"><span class="cmp-lbl">Van</span><span class="cmp-val small">${fromTxt}</span></div>
          <label class="cmp-row"><span class="cmp-lbl">Aan</span><input id="cmp-to" required pattern=".*[^@\\s]+@[^@\\s]+\\.[^@\\s]+.*" title="Vul een geldig e-mailadres in" placeholder="naam@bedrijf.nl" value="${esc(d.to)}"></label>
          ${e.bcc ? `<div class="cmp-row"><span class="cmp-lbl">Bcc</span><span class="cmp-val small muted">${esc(bccAdr)} (naar mezelf)</span></div>` : ''}
          <label class="cmp-row"><span class="cmp-lbl">Onderwerp</span><input id="cmp-subj" required value="${esc(d.subject)}"></label>
          ${d.kind !== 'reply' ? `<label class="cmp-row"><span class="cmp-lbl">Sjabloon</span><select id="cmp-tpl" aria-label="Sjabloon">${[['leeg', 'Leeg bericht']].concat(tplKeys().concat(d.kind === 'tikkie' && !tikkieOn() ? ['tikkie'] : []).map(k => [k, S.email.templates[k].naam])).map(o => `<option value="${o[0]}" ${o[0] === d.kind ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>` : ''}
        </div>
        <textarea id="cmp-body" rows="9" aria-label="Bericht">${esc(d.body)}</textarea>
        ${e.sigOn ? `<div class="cmp-sig"><div class="tiny muted">Handtekening · <a class="link" href="#/instellingen/email">aanpassen</a></div><div class="sig-text">${esc(e.sig)}</div></div>` : ''}
        <div class="att-row" id="cmp-att">${attHtml(d.att)}</div>
        <p class="tiny muted">Prototype: er wordt geen echte e-mail verstuurd. Na versturen staat het bericht in het tabblad E-mail van het project.</p>
        <button type="submit" hidden></button>
      </form>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: `${icon('send')} Verstuur`, cls: 'primary', onClick: sendCompose }]
    });
    $('#compose-form').addEventListener('submit', ev => { ev.preventDefault(); ev.stopPropagation(); sendCompose(); });
    setTimeout(() => { const b = $('#cmp-body'); if (b && !d.to) { const t = $('#cmp-to'); if (t) t.focus(); } else if (b) { b.focus(); try { const pos = b.value.indexOf('\n\n') + 2; b.setSelectionRange(pos, pos); b.scrollTop = 0; } catch (er) { /* noop */ } } }, 40);
  }
  function readCompose() {
    const d = currentDraft; if (!d) return null;
    const to = $('#cmp-to'), su = $('#cmp-subj'), bo = $('#cmp-body');
    if (to) d.to = to.value; if (su) d.subject = su.value; if (bo) d.body = bo.value;
    return d;
  }
  function sendCompose() {
    const f = $('#compose-form'); if (!f || !f.reportValidity()) return;
    const d = readCompose(), s = sender(), e = S.email;
    const m = d.to.match(/<([^>]+)>/); const aan = m ? m[1].trim() : d.to.trim();
    const toName = m ? d.to.slice(0, d.to.indexOf('<')).trim() : aan;
    const msg = { dir: 'out', van: 'Sanne de Vries', adres: s.adres, aan, datum: todayIso(), tijd: nowTime(), onderwerp: d.subject, tekst: d.body + (e.sigOn && e.sig ? '\n\n-- \n' + e.sig : ''), bijlagen: d.att.slice(), via: s.label, bcc: e.bcc };
    (S.email.threads[d.pid] = S.email.threads[d.pid] || []).push(msg);
    closeModal(); currentDraft = null; S.email.filter = 'Alle';
    if (d.onSent) d.onSent();
    toast(`Verzonden (demo) · via ${esc(s.label)} aan ${esc(toName || aan)}${e.bcc ? ' · kopie (bcc) naar jezelf' : ''}`);
    renderKeep();
  }

  // Eén toestemmingsscherm per aanbieder voor e-mail én agenda
  function openConsent(k, after) {
    k = accKey(k);
    const a = acc(k), pr = ACC[k];
    modal({
      title: pr.login,
      body: `<div class="consent">
        <div class="consent-logos"><span class="consent-app"><img src="img/app-icoon.svg" alt="Diafragmo" style="width:52px;height:52px;border-radius:14px;display:block"></span><span class="consent-dots"><i></i><i></i><i></i></span><span class="consent-prov duo" title="${esc(pr.mail)} en ${esc(pr.cal)}">${LOGO[pr.logo]}${CAL_LOGO[k]}</span></div>
        <div class="consent-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">Sanne de Vries</div><div class="tiny muted">${esc(a.adres)}</div></div><span class="tiny muted">${esc(pr.bedrijf)}-account</span></div>
        <p class="consent-q"><strong>Diafragmo</strong> wil toegang tot je e-mail én agenda:</p>
        <ul class="perm-list">
          <li>${icon('send')}<div><div class="strong">E-mail verzenden namens jou</div><div class="tiny muted">Offertes, facturen en herinneringen gaan vanaf ${esc(a.adres)} en staan ook in je eigen map Verzonden.</div></div></li>
          <li>${icon('msg')}<div><div class="strong">Berichten met klanten lezen die bij projecten horen</div><div class="tiny muted">Alleen mail van en naar adressen van je klanten. Je overige mail blijft privé.</div></div></li>
          <li>${icon('clock')}<div><div class="strong">Agenda lezen om beschikbaarheid te checken</div><div class="tiny muted">Alleen vrij/bezet, zodat je bij het plannen dubbele boekingen ziet. De inhoud van je afspraken blijft privé.</div></div></li>
          <li>${icon('calendar')}<div><div class="strong">Opnamedagen en deadlines in je agenda zetten</div><div class="tiny muted">In een aparte agenda ‘Diafragmo’ in je ${esc(pr.cal)}, met locatie en call time. Wijzigingen worden automatisch bijgewerkt.</div></div></li>
        </ul>
        <p class="tiny muted">Eén keer inloggen is genoeg: daarna werken e-mail en agenda allebei. In Instellingen zet je E-mail of Agenda los aan of uit, en je kunt de toegang altijd intrekken in Diafragmo of in je ${esc(pr.bedrijf)}-account. Demo: er wordt niet echt ingelogd.</p>
      </div>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: () => { if (after) after(false); else closeModal(); } }, {
        label: 'Toestaan', cls: 'primary', onClick: () => {
          const body = $('.modal-body'); if (body) body.innerHTML = `<div class="paying"><div class="spinner blue"></div><p>Verbinden met ${esc(pr.naam)}…</p></div>`;
          $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
          const tmo = setTimeout(() => {
            Object.assign(a, { connected: true, sinds: nowLabel(), mail: true, agenda: true });
            // Diafragmo zet je planning in één agenda tegelijk: de nieuwste koppeling neemt de agenda over
            const other = ACC_KEYS.find(x => x !== k && agendaOn(x)); if (other) acc(other).agenda = false;
            fixActive(); demoSave();
            const n = weekItems(todayIso(), isoAdd(todayIso(), 60)).filter(x => x.kind !== 'busy').length;
            toast(`${esc(pr.naam)} gekoppeld (demo): e-mail via ${esc(a.adres)} · ${n} opnamedagen en deadlines in je ${esc(pr.cal)}${other ? ` · agenda van ${esc(ACC[other].naam)} uitgezet` : ''}`);
            if (after) after(true); else { closeModal(); renderKeep(); }
          }, 900);
          cleanupFns.push(() => clearTimeout(tmo));
        }
      }]
    });
  }
  function setMail(k, on) {
    acc(k).mail = !!on; fixActive();
    if (on && !mailOn(S.email.active)) S.email.active = k;
    demoSave();
  }
  function setAgenda(k, on) {
    acc(k).agenda = !!on;
    let other = null;
    if (on) { other = ACC_KEYS.find(x => x !== k && agendaOn(x)) || null; if (other) acc(other).agenda = false; }
    demoSave(); return other;
  }

  // Projecttab E-mail
  function mailItem(p, m, open) {
    const me = m.dir === 'out';
    return `<details class="mail ${m.dir} ${m.nieuw ? 'unread' : ''}" ${open ? 'open' : ''}>
      <summary>
        <span class="avatar sm ${me ? '' : 'klant'}">${me ? 'SV' : initials(m.van)}</span>
        <div class="grow">
          <div class="row-between"><span class="strong clamp">${me ? 'Jij' : esc(m.van)}${m.nieuw ? ' <span class="pill inv-open">Nieuw</span>' : ''}</span><span class="tiny muted nowrap">${fdateShort(m.datum)} · ${esc(m.tijd)}</span></div>
          <div class="small clamp"><span class="dir-tag ${m.dir}">${me ? '↗ Verzonden' : '↙ Ontvangen'}</span> ${esc(m.onderwerp)}</div>
        </div>
      </summary>
      <div class="mail-body">
        <div class="tiny muted">${me ? `Van ${esc(m.adres)} aan ${esc(m.aan)}` : `Van ${esc(m.adres)}`}${m.via ? ` · verzonden via ${esc(m.via)}` : ''}${m.bcc ? ' · bcc naar jezelf' : ''}</div>
        <div class="mail-text">${esc(m.tekst)}</div>
        ${(m.bijlagen || []).length ? `<div class="att-row">${m.bijlagen.map(b => `<button class="att-chip" data-action="download" data-name="${esc(b.naam)}">${icon('file')}<span class="att-name">${esc(b.naam)}</span><small>${esc(b.grootte)}</small></button>`).join('')}</div>` : ''}
        ${me ? '' : `<div class="mail-actions"><button class="btn sm" data-action="reply" data-id="${p.id}" data-i="${m.i}">${icon('arrowLeft')} Antwoord</button></div>`}
      </div>
    </details>`;
  }
  function tabEmail(p) {
    const all = (S.email.threads[p.id] || []).map((m, i) => Object.assign({ i }, m)).sort((a, b) => (b.datum + b.tijd).localeCompare(a.datum + a.tijd));
    if (S.email.filterPid !== p.id) { S.email.filter = 'Alle'; S.email.filterPid = p.id; }
    const flt = S.email.filter;
    const list = all.filter(m => flt === 'Alle' || (flt === 'Ontvangen' ? m.dir === 'in' : m.dir === 'out'));
    const s = sender(), adrs = clientEmailsOf(p);
    const quick = [['offerte', 'file', 'Offerte'], ['factuur', 'euro', 'Factuur'], ['herinnering', 'clock', 'Betaalherinnering'], ['oplevering', 'check', 'Oplevering']];
    const off = s.k === 'noreply' ? mailOffProvider() : null;
    return `${off ? `<div class="banner warn">${icon('msg')}<div class="grow small">E-mail staat uit bij je ${esc(ACC[off].naam)}-koppeling. Zet het aan om berichten met ${esc(p.contact)} automatisch hier te zien en vanaf ${esc(acc(off).adres)} te versturen. <span class="muted">Hieronder zie je voorbeelddata.</span></div><button class="btn sm" data-action="mail-enable" data-k="${off}">E-mail aanzetten</button></div>`
      : s.k === 'noreply' ? `<div class="banner warn">${icon('msg')}<div class="grow small">Koppel je e-mail om berichten met ${esc(p.contact)} automatisch hier te zien en vanaf je eigen adres te versturen. <span class="muted">Hieronder zie je voorbeelddata.</span></div><a class="btn sm" href="#/instellingen/email">Koppel e-mail</a></div>` : ''}
      <div class="grid-2 wide-left">
        <section class="card">
          <div class="card-head"><h2>E-mail met ${esc(p.contact)}</h2><div class="row gap wrap"><div class="seg sm">${['Alle', 'Ontvangen', 'Verzonden'].map(x => `<button class="${flt === x ? 'active' : ''}" data-action="mail-filter" data-f="${x}">${x}</button>`).join('')}</div><button class="btn sm primary" data-action="compose" data-id="${p.id}" data-kind="leeg">${icon('plus')} Nieuwe e-mail</button></div></div>
          <p class="tiny muted mail-count">${all.length} berichten · ${all.filter(m => m.dir === 'in').length} ontvangen · ${all.filter(m => m.dir === 'out').length} verzonden · nieuwste bovenaan</p>
          ${list.length ? `<div class="mail-list">${list.map((m, k) => mailItem(p, m, k < 2)).join('')}</div>` : `<div class="empty small">${icon('msg')}<p>${all.length ? 'Geen berichten in deze weergave.' : `Nog geen e-mails met ${esc(p.contact)}.`}</p><button class="btn sm primary" data-action="compose" data-id="${p.id}" data-kind="leeg">${icon('plus')} Nieuwe e-mail</button></div>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>Automatisch gekoppeld</h2>${S.email.autoKoppel ? '<span class="pill inv-betaald">Aan</span>' : '<span class="pill">Uit</span>'}</div>
          ${adrs.length ? `<p class="small muted">Mail van en naar deze adressen verschijnt automatisch bij dit project:</p><ul class="addr-list">${adrs.map(a => `<li>${icon('link')}<span>${esc(a)}</span></li>`).join('')}</ul>` : `<p class="small muted">Nog geen e-mailadres bekend voor ${esc(p.contact)}. Zodra je mailt, koppelt Diafragmo het adres aan dit project.</p>`}
          ${sendAsHtml(s, false)}
          <div class="card-head mt"><h2>Snel versturen</h2></div>
          <div class="quick-mails">${quick.map(q => `<button class="btn sm" data-action="compose" data-id="${p.id}" data-kind="${q[0]}">${icon(q[1])} ${q[2]}</button>`).join('')}</div>
          <p class="tiny muted">Sjablonen pas je aan in <a class="link" href="#/instellingen/email">Instellingen → E-mail & agenda</a>.</p>
        </section>
      </div>`;
  }

  // Instellingen → Account koppelen: e-mail & agenda (één kaart, één login per aanbieder)
  function accCard(k) {
    const a = acc(k), pr = ACC[k], s = sender(), sending = s.k === k, cal = calProvider() === k;
    const multi = ACC_KEYS.filter(mailOn).length > 1;
    const tg = (w, ic, title, sub) => `<li class="acc-tg ${a[w] ? 'on' : 'off'}"><span class="acc-tg-ic">${icon(ic)}</span><div class="grow"><div class="strong small">${title}</div><div class="tiny muted">${sub}</div></div><label class="switch"><input type="checkbox" data-action="acc-toggle" data-k="${k}" data-w="${w}" ${a[w] ? 'checked' : ''} aria-label="${esc(title)} via ${esc(pr.naam)}"><span></span></label></li>`;
    return `<div class="provider acc ${a.connected ? 'connected' : ''} ${a.connected && (sending || cal) ? 'active' : ''}" id="koppeling-${k}">
      <div class="prov-head"><span class="prov-logo-box duo">${LOGO[pr.logo]}${CAL_LOGO[k]}</span><div class="grow"><div class="strong">${esc(pr.naam)}</div><div class="small muted">${esc(pr.sub)}</div></div>${a.connected ? '<span class="pill inv-betaald">Gekoppeld</span>' : '<span class="pill">Niet gekoppeld</span>'}</div>
      ${a.connected ? `
        <div class="prov-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">${esc(a.adres)}</div><div class="tiny muted">Gekoppeld op ${esc(a.sinds)} · één login voor e-mail en agenda</div></div></div>
        <ul class="acc-tgs">
          ${tg('mail', 'send', 'E-mail', a.mail ? `${esc(pr.mail)}: verzenden vanaf je eigen adres · mail met klanten bij je projecten` : 'Uit · mail gaat via Diafragmo (noreply)')}
          ${a.mail && multi ? `<li class="acc-sub"><label class="check radio"><input type="radio" name="email-active" data-action="email-active" data-k="${k}" ${sending ? 'checked' : ''}> ${sending ? '<strong>Actief verzendaccount</strong>' : 'Gebruik als verzendaccount'}</label></li>` : ''}
          ${tg('agenda', 'calendar', 'Agenda', a.agenda ? `${esc(pr.cal)}: opnamedagen en deadlines in je agenda · vrij/bezet bij plannen` : 'Uit · geen agenda-sync en geen vrij/bezet')}
        </ul>
        <div class="row-between wrap acc-foot"><span class="tiny muted">Ontkoppelen stopt e-mail én agenda.</span><button class="btn sm ghost" data-action="acc-disconnect" data-k="${k}">Ontkoppelen</button></div>`
        : `<p class="small muted">Log één keer in met je ${esc(pr.bedrijf)}-account: ${esc(pr.mail)} voor je e-mail en ${esc(pr.cal)} voor je planning.</p><p class="tiny muted">${esc(pr.detail)}</p><button class="btn primary" data-action="acc-connect" data-k="${k}">${icon('link')} Koppelen</button>`}
    </div>`;
  }
  function koppelingSettingsHtml() {
    const e = S.email, s = sender(), t = e.templates[e.tplSel], k = calProvider(), ag = S.agenda;
    const anyConn = ACC_KEYS.some(x => acc(x).connected), off = s.k === 'noreply' ? mailOffProvider() : null;
    const opt = (key, title, sub) => `<li class="row-item"><div class="grow"><div class="strong">${title}</div><div class="small muted">${sub}</div></div><label class="switch"><input type="checkbox" data-action="email-opt" data-k="${key}" ${e[key] ? 'checked' : ''} aria-label="${esc(title)}"><span></span></label></li>`;
    const copt = (key, title, sub) => `<li class="row-item"><div class="grow"><div class="strong">${title}</div><div class="small muted">${sub}</div></div><label class="switch ${k ? '' : 'off'}"><input type="checkbox" data-action="cal-opt" data-k="${key}" ${ag[key] ? 'checked' : ''} ${k ? '' : 'disabled'} aria-label="${esc(title)}"><span></span></label></li>`;
    const nxt = weekItems(todayIso(), isoAdd(todayIso(), 30)).filter(x => x.kind !== 'busy').slice(0, 4);
    return `<section class="card email-settings koppeling-settings" id="koppeling" aria-labelledby="koppeling-title">
      <div class="card-head"><div><div class="kop-eyebrow">Microsoft 365 & Google</div><h2 id="koppeling-title">Account koppelen: e-mail & agenda</h2><p class="small muted">Eén keer inloggen, dan werken e-mail en agenda allebei. Je verstuurt offertes en facturen vanaf je eigen adres, mail met klanten verschijnt bij het juiste project, en opnamedagen en deadlines komen in je agenda – met vrij/bezet bij het plannen.</p></div>
        <div class="kop-status">${s.k !== 'noreply' ? `<span class="send-pill">${s.logo} E-mail via ${esc(s.label)}</span>` : ''}${k ? `<span class="send-pill">${CAL_LOGO[k]} Agenda: ${esc(CAL[k].label)}</span>` : ''}${!anyConn ? '<span class="pill inv-open">Nog niet gekoppeld</span>' : ''}</div></div>
      <div class="providers">${ACC_KEYS.map(accCard).join('')}</div>
      ${!anyConn ? `<p class="small muted">Kies Microsoft 365 of Google. Zonder koppeling gaan mails via Diafragmo (noreply) en komen antwoorden binnen op ${esc(D.studio.email)}.</p>`
        : off ? `<p class="small muted">E-mail staat uit: mails gaan via Diafragmo (noreply) en antwoorden komen binnen op ${esc(D.studio.email)}.</p>`
        : `<p class="tiny muted">E-mail en Agenda staan na het koppelen allebei aan; zet ze per account los uit. Er kan één verzendaccount en één agenda tegelijk actief zijn.</p>`}
      <div class="email-opts" id="koppeling-email">
        <div>
          <h3 class="kop-h3">${icon('send')} E-mail · verzendopties</h3>
          <ul class="list">
            ${opt('sigOn', 'E-mailhandtekening', 'Onder elke mail die je vanuit Diafragmo verstuurt')}
            ${opt('bcc', 'BCC naar mezelf', 'Ontvang een kopie van elke verstuurde mail')}
            ${opt('autoKoppel', 'Automatisch koppelen aan projecten', 'Op basis van het e-mailadres van de klant')}
          </ul>
          ${e.sigOn ? `<label class="mt-s">Handtekening<textarea data-email-sig rows="4">${esc(e.sig)}</textarea></label>` : ''}
        </div>
        <div>
          <h3>Sjablonen</h3>
          <div class="seg sm tpl-seg">${tplKeys().map(x => `<button class="${x === e.tplSel ? 'active' : ''}" data-action="tpl-sel" data-k="${x}">${esc(e.templates[x].naam)}</button>`).join('')}</div>
          <div class="form-col tpl-form">
            <label>Onderwerp<input data-tpl-f="onderwerp" value="${esc(t.onderwerp)}"></label>
            <label>Bericht<textarea data-tpl-f="body" rows="9">${esc(t.body)}</textarea></label>
          </div>
          <div class="ph-chips"><span class="tiny muted">Invoegen:</span>${PLACEHOLDERS.concat(e.tplSel === 'tikkie' ? TIKKIE_PH : []).map(x => `<button class="chip ph" data-action="tpl-insert" data-ph="${x}">${x}</button>`).join('')}</div>
          <div class="row gap wrap tpl-actions"><button class="btn sm ghost" data-action="tpl-reset">Standaardtekst herstellen</button><button class="btn sm" data-action="tpl-preview">${icon('eye')} Voorbeeld met Bakkerij Van Dam</button></div>
        </div>
      </div>
      <div class="email-opts cal-opts" id="koppeling-agenda">
        <div><h3 class="kop-h3">${icon('calendar')} Agenda · opties</h3><ul class="list">
          ${copt('autoZet', 'Opnamedagen en deadlines automatisch in je agenda zetten', 'In een aparte agenda ‘Diafragmo’, inclusief locatie en call time')}
          ${copt('checkBeschikbaar', 'Beschikbaarheid checken bij plannen', 'Toont “vrij / bezet” bij het kiezen van een datum')}
        </ul>${k ? '' : `<p class="tiny muted">${anyConn ? 'Zet Agenda aan bij je gekoppelde account om deze opties te gebruiken.' : 'Koppel eerst Microsoft 365 of Google om deze opties te gebruiken.'}</p>`}</div>
        <div><h3>Komt in je agenda</h3>
          <ul class="cal-preview">${nxt.map(x => `<li><span class="wk-dot ${x.kind}"></span><span class="grow"><span class="strong small">${esc(x.titel)}</span><span class="tiny muted"> · ${fdateShort(x.datum)}${x.tijd ? ' · ' + esc(x.tijd) : ''}</span></span>${k && ag.autoZet ? `<span class="ok" title="Staat in je agenda">${icon('check')}</span>` : ''}</li>`).join('') || '<li class="muted small">Niets gepland in de komende 30 dagen.</li>'}</ul>
          <p class="tiny muted">Van je eigen afspraken ziet Diafragmo alleen of je vrij of bezet bent – niet wat erin staat.</p></div>
      </div>
    </section>`;
  }

  // ---------- Instellingen ----------
  function viewSettings() {
    const st = S.settings;
    const plans = [
      { naam: 'Basis', prijs: 24, f: ['Onbeperkt projecten & klanten', 'Klantportaal met jouw logo', 'Offertes & facturen met betaallink (iDEAL | Wero)', ['Offertes digitaal laten ondertekenen'], ['Callsheets per opnamedag'], ['Agenda-koppeling (Outlook & Google)'], 'Uren, kilometers & urencriterium', '250 GB opslag', 'Soevereine hosting in de EU · AVG-proof'] },
      { naam: 'Pro', prijs: 39, f: ['Alles uit Basis, incl. digitaal ondertekenen, callsheets & agenda-koppeling', ['Timer voor uren'], ['Ondertiteling & transcriptie (verwerkt in de EU)'], 'Review met feedback op timecode', 'Showreel-site op eigen domein', 'Boekhoudkoppelingen', 'Freelancers & projectmarge', '2 TB opslag', 'Soevereine hosting in de EU · AVG-proof'] }
    ];
    return `
      <div class="page-head"><div><h1>Instellingen</h1><p class="muted">Profiel, abonnement, betaalmethoden, hosting & privacy, e-mail, agenda en koppelingen</p></div><div class="head-actions"><button class="btn primary" data-action="save-settings">${icon('check')} Opslaan</button></div></div>
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>Bedrijfsprofiel</h2></div>
          <div class="form-grid two">
            <label>Bedrijfsnaam<input value="${esc(D.studio.naam)}"></label>
            <label>Naam<input value="${esc(D.studio.eigenaar)}"></label>
            <label>KvK-nummer<input value="${esc(D.studio.kvk)}"></label>
            <label>Btw-id<input value="${esc(D.studio.btw)}"></label>
            <label class="full">IBAN<input value="${esc(D.studio.iban)}"></label>
          </div>
          <div class="card-head mt"><h2>Standaardtarieven</h2></div>
          <div class="form-grid two">
            <label>Dagtarief<div class="input-prefix"><span>€</span><input type="number" value="750"></div></label>
            <label>Uurtarief montage<div class="input-prefix"><span>€</span><input type="number" value="85"></div></label>
            <label>Kilometertarief<div class="input-prefix"><span>€</span><input type="number" step="0.01" value="0.23"></div></label>
            <label>Doel urencriterium<div class="input-prefix"><span>uur</span><input type="number" value="1225"></div></label>
          </div>
          <div class="card-head mt"><h2>Klantportaal</h2></div>
          <p class="small muted">Je klanten zien jouw logo en accentkleur (instelbaar bij Showreel).</p>
          <a class="btn" href="#/klant/p1">${icon('eye')} Bekijk als klant</a>
          ${themeSettingsHtml()}
        </section>
        <section class="card" id="abonnement">
          <div class="card-head"><h2>Abonnement</h2><span class="small muted">per maand, excl. btw</span></div>
          <div class="plan-demo"><span class="small"><strong>Demo:</strong> bekijk als</span><div class="seg sm" role="group" aria-label="Demo: bekijk als">${['Basis', 'Pro'].map(x => `<button class="${st.plan === x ? 'active' : ''}" data-action="plan-demo" data-plan="${x}" aria-pressed="${st.plan === x}">${x}</button>`).join('')}</div><span class="tiny muted">Zo zie je welke functies alleen in Pro zitten.</span></div>
          <div class="plans">${plans.map(pl => `
            <div class="plan ${st.plan === pl.naam ? 'current' : ''}">
              <div class="row-between"><span class="strong">${pl.naam}</span>${st.plan === pl.naam ? '<span class="pill inv-betaald">Huidig plan</span>' : ''}</div>
              <div class="price">€${pl.prijs}<small> /mnd</small></div>
              <ul>${pl.f.map(x => Array.isArray(x) ? `<li>${icon('check')} <span>${esc(x[0])} <span class="new-tag">Nieuw</span></span></li>` : `<li>${icon('check')} ${esc(x)}</li>`).join('')}</ul>
              <button class="btn block ${st.plan === pl.naam ? '' : 'primary'}" data-action="set-plan" data-plan="${pl.naam}" ${st.plan === pl.naam ? 'disabled' : ''}>${st.plan === pl.naam ? 'Je huidige plan' : 'Overstappen naar ' + pl.naam}</button>
            </div>`).join('')}</div>
          <p class="tiny muted">Prototype: de verdeling van functies over de plannen is een voorstel. Er wordt niets afgeschreven.</p>
          <div class="card-head mt"><h2>Boekhoudkoppeling</h2></div>
          <ul class="list">${Object.keys(st.koppelingen).map(k => `
            <li class="row-item"><span class="icon-box logo-box">${esc(k.slice(0, 2))}</span><div class="grow"><div class="strong">${esc(k)}</div><div class="small muted">${st.koppelingen[k] ? 'Verbonden – facturen en betalingen worden gesynchroniseerd' : 'Niet verbonden'}</div></div>
              <label class="switch"><input type="checkbox" data-action="toggle-int" data-k="${esc(k)}" ${st.koppelingen[k] ? 'checked' : ''} aria-label="${esc(k)} koppelen"><span></span></label></li>`).join('')}</ul>
        </section>
      </div>
      ${payMethodsHtml()}
      <section class="card eu-card" id="hosting-privacy" aria-labelledby="eu-title">
        <div class="eu-head">
          ${euBadge()}
          <div class="grow">
            <div class="row gap wrap"><h2 id="eu-title">Hosting & privacy</h2><span class="eu-pill">100% Europese hosting · AVG-proof</span></div>
            <p class="eu-lead strong">Soevereine hosting in de EU: je data blijft in Europa.</p>
            <p class="small muted">Al je video's, bestanden, klantgegevens en facturen worden uitsluitend in de EU opgeslagen en verwerkt, door Europese aanbieders en onder Europees recht. Geen Amerikaanse cloud, dus niet onder de CLOUD Act.</p>
          </div>
        </div>
        <ul class="eu-points">
          <li>${icon('pin')}<div><strong>Opslag in datacenters in de EU</strong><span>Video's, bestanden en back-ups staan op servers binnen de Europese Unie.</span></div></li>
          <li>${icon('globe')}<div><strong>Alleen Europese aanbieders</strong><span>We werken uitsluitend met Europese partijen, onder Europees recht.</span></div></li>
          <li>${icon('lock')}<div><strong>Versleuteld opgeslagen en verstuurd</strong><span>Je bestanden gaan via een beveiligde verbinding en staan versleuteld opgeslagen.</span></div></li>
          <li>${icon('shield')}<div><strong>AVG-proof</strong><span>Klantgegevens verwerken we volgens de AVG. Een verwerkersovereenkomst is beschikbaar.</span></div></li>
        </ul>
        <div class="eu-foot">
          <button class="btn sm" data-action="download" data-name="Verwerkersovereenkomst Diafragmo.pdf">${icon('download')} Verwerkersovereenkomst (PDF)</button>
          <span class="tiny muted">Je klanten zien in hun klantportaal: “Veilig gedeeld · gehost in de EU”.</span>
        </div>
      </section>
      ${koppelingSettingsHtml()}`;
  }
  function viewNotFound() { return `<div class="empty card">${icon('search')}<h2>Pagina niet gevonden</h2><p class="muted">Deze pagina bestaat niet in het prototype.</p><a class="btn primary" href="#/dashboard">Naar dashboard</a></div>`; }

  // ---------- Info-menu, versie, nieuws & support (demo, bewaard in localStorage) ----------
  const APP_VERSIE = '0.4.4', APP_BUILD = '2026-10-03';
  const NEWS_KEY = 'diafragmo-nieuws-gelezen', TICKETS_KEY = 'diafragmo-tickets';
  const versieLabel = () => `Versie ${APP_VERSIE} (prototype)`;
  const buildLabel = () => `build ${fdate(APP_BUILD)}`;
  const p2 = n => String(n).padStart(2, '0');
  const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const fdt = s => { const d = new Date(s); return isNaN(d) ? esc(s) : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fdtShort = s => { const d = new Date(s); if (isNaN(d)) return esc(s); const n = new Date(); return d.toDateString() === n.toDateString() ? `vandaag ${p2(d.getHours())}:${p2(d.getMinutes())}` : `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const CHANGELOG = [
    { v: '0.4.4', datum: '2026-10-03', items: [
      ['check', 'Factuurstatus overal gelijk in project en overzicht', 'Kleine verbetering: de kaarten Aanbetaling en Eindfactuur in project → Financiën tonen nu precies dezelfde factuur en status als Offertes & facturen (Concept, Open, Verlopen, Betaald, ook “betaald via Tikkie” en een verstuurde Tikkie). “Tikkie sturen” staat bij elke open of verlopen factuur.']
    ] },
    { v: '0.4.3', datum: '2026-10-03', items: [
      ['send', 'Betaalverzoek sturen via Tikkie', 'Zet Tikkie (Tikkie Zakelijk, ABN AMRO) aan bij Instellingen → Betaalmethoden. Bij open facturen stuur je dan met “Tikkie sturen” een betaalverzoek met bedrag, omschrijving en geldigheid, en deel je de link via WhatsApp, e-mail of kopiëren. Betaald? Dan staat de factuur op Betaald, met “betaald via Tikkie”. iDEAL | Wero via betaallink blijft de standaard.']
    ] },
    { v: '0.4.2', datum: '2026-10-03', items: [
      ['euro', 'Betalen via iDEAL | Wero', 'Online betalen heet nu iDEAL | Wero, de officiële naam die ook Mollie gebruikt. Op facturen, in het klantportaal en in je e-mailsjablonen staat de nieuwe naam; je klanten betalen precies zoals ze gewend zijn.']
    ] },
    { v: '0.4.1', datum: '2026-10-03', items: [
      ['link', 'E-mail en agenda nu in één koppeling (Microsoft 365 of Google)', 'Eén keer inloggen en één toestemmingsscherm: daarna werken e-mail en agenda allebei. Per account zet je E-mail en Agenda los aan of uit; ontkoppelen stopt beide. Bestaande koppelingen zijn automatisch overgezet.']
    ] },
    { v: '0.4.0', datum: '2026-10-03', items: [
      ['pen', 'Offertes digitaal laten ondertekenen', 'Je klant tekent de offerte in het klantportaal met naam en handtekening. Het project gaat automatisch naar Pre-productie en de aanbetalingsfactuur (30%) staat als concept klaar.'],
      ['calendar', 'Callsheet per opnamedag', 'Locatie en parkeren, call time, tijdsplanning, crew en freelancers, contactpersoon, shotlist en notities op één blad. Deel het met crew en klant of download als PDF.'],
      ['link', 'Agenda-koppeling met Outlook en Google Agenda', 'Opnamedagen en deadlines automatisch in je agenda, vrij/bezet zien bij het plannen en een weekoverzicht op het dashboard.'],
      ['clock', 'Timer voor uren', 'Start en stop een timer per project, ook op je telefoon. De lopende timer blijft zichtbaar in de topbalk en je uren tellen direct mee voor je urencriterium.', true],
      ['msg', 'Ondertiteling en transcriptie', 'Transcript met tijdcodes, ondertitels in de speler, download als .srt of inbranden voor social. Verwerkt in de EU.', true]
    ] },
    { v: '0.3.0', datum: '2026-10-03', items: [
      ['sun', 'Licht en donker thema', 'Volgt automatisch je systeeminstelling. Wisselen kan met de knop in de topbalk of via Instellingen → Weergave.'],
      ['eye', 'Logo past zich aan per thema', 'Het diafragma-beeldmerk en het woordmerk kleuren mee met de achtergrond, ook in het klantportaal.'],
      ['msg', 'Info-menu en support', 'Versie-informatie, dit overzicht en een supportformulier met al je tickets op één plek.']
    ] },
    { v: '0.2.1', datum: '2026-10-02', items: [
      ['shield', 'Soevereine EU-hosting zichtbaar', 'Nieuwe kaart Hosting & privacy in Instellingen en een EU-label in het klantportaal: je data blijft in Europa.'],
      ['film', 'Nieuw logo en app-icoon', 'Het diafragma-beeldmerk in de zijbalk, als favicon en in het aanmeldscherm van Microsoft en Google.']
    ] },
    { v: '0.2.0', datum: '2026-10-02', items: [
      ['send', 'E-mailkoppeling met Microsoft 365 en Gmail', 'Verstuur offertes, facturen en herinneringen vanaf je eigen adres, met sjablonen en een tab E-mail per project (gesimuleerd).']
    ] }
  ];
  const newsUnread = () => { try { return localStorage.getItem(NEWS_KEY) !== APP_VERSIE; } catch (e) { return true; } };
  function markNewsRead() { try { localStorage.setItem(NEWS_KEY, APP_VERSIE); } catch (e) { /* noop */ } updateInfoBadges(); }

  // Tickets
  const TK_STATUSES = ['Open', 'In behandeling', 'Wacht op jou', 'Opgelost'];
  const TK_CATS = ['Vraag', 'Bug', 'Idee', 'Facturatie'];
  const TK_PRIOS = ['Laag', 'Normaal', 'Hoog'];
  const TK_CAT_IC = { Vraag: 'info', Bug: 'bug', Idee: 'sparkle', Facturatie: 'euro' };
  const TK_AGENTS = ['Niet toegewezen', 'Noor · Noorderwind Studio', 'Lars · Noorderwind Studio'];
  const SUPPORT_NAAM = 'Diafragmo support · Noorderwind Studio';
  const tkStatusLabel = (s, beheer) => beheer && s === 'Wacht op jou' ? 'Wacht op gebruiker' : s;
  const tkPill = (s, beheer) => `<span class="pill tk-${slug(s)}">${esc(tkStatusLabel(s, beheer))}</span>`;
  const prio = p => `<span class="prio prio-${slug(p)}">${esc(p)}</span>`;
  function seedTickets() {
    const sanne = { eigen: true, van: 'Sanne de Vries', bedrijf: D.studio.naam, email: D.studio.email };
    return [
      Object.assign({ nr: 1005, onderwerp: 'Upload 4K-master blijft hangen op 99%', categorie: 'Bug', prioriteit: 'Hoog', status: 'Open', toegewezen: TK_AGENTS[0], aangemaakt: '2026-10-02T23:41:00', bijgewerkt: '2026-10-02T23:41:00', meta: 'Diafragmo 0.2.1 (prototype) · Firefox 141 · Windows · venster 1920×1080 · licht thema' },
        { eigen: false, van: 'Mila Jansen', bedrijf: 'Studio Mila (fictief)', email: 'mila@studiomila.voorbeeld', berichten: [
          { rol: 'gebruiker', naam: 'Mila Jansen', tijd: '2026-10-02T23:41:00', tekst: 'Bij het uploaden van een 4K-master van 6,2 GB blijft de voortgangsbalk op 99% staan. Kleinere bestanden gaan wel goed. Ik gebruik Firefox op Windows.', bijlage: { naam: 'upload-99-procent.png', grootte: '288 KB' } }] }),
      Object.assign({ nr: 1004, onderwerp: 'Kan ik twee handelsnamen in één account beheren?', categorie: 'Vraag', prioriteit: 'Normaal', status: 'Open', toegewezen: TK_AGENTS[0], aangemaakt: '2026-10-02T21:14:00', bijgewerkt: '2026-10-02T21:14:00', meta: 'Diafragmo 0.2.1 (prototype) · Chrome 154 · macOS · venster 1512×945 · donker thema' },
        { eigen: false, van: 'Joris Kuiper', bedrijf: 'Kuiper Films (fictief)', email: 'joris@kuiperfilms.voorbeeld', berichten: [
          { rol: 'gebruiker', naam: 'Joris Kuiper', tijd: '2026-10-02T21:14:00', tekst: "Ik werk als zzp'er onder mijn eigen naam en sinds kort ook met een compagnon onder een tweede handelsnaam. Kan ik beide in één Diafragmo-account beheren, met aparte facturen en huisstijl?" }] }),
      Object.assign({ nr: 1003, onderwerp: 'Idee: draaiboek als PDF delen met de crew', categorie: 'Idee', prioriteit: 'Laag', status: 'In behandeling', toegewezen: TK_AGENTS[1], aangemaakt: '2026-09-29T20:31:00', bijgewerkt: '2026-09-30T10:02:00', meta: 'Diafragmo 0.2.0 (prototype) · Safari 18 · macOS · venster 1440×900 · licht thema' }, sanne, { berichten: [
          { rol: 'gebruiker', naam: 'Sanne de Vries', tijd: '2026-09-29T20:31:00', tekst: 'Zou het kunnen om het draaiboek van een draaidag als nette PDF te exporteren? Dan stuur ik die de avond ervoor naar mijn geluidsman en drone-piloot.' },
          { rol: 'support', naam: SUPPORT_NAAM, agent: 'Noor', tijd: '2026-09-30T10:02:00', tekst: 'Goed idee, dank je! We horen dit vaker. We hebben het op de planning gezet voor een van de volgende versies en houden je via dit ticket op de hoogte.' },
          { rol: 'systeem', veld: 'status', naar: 'In behandeling', tijd: '2026-09-30T10:02:00' }] }),
      Object.assign({ nr: 1002, onderwerp: 'Reviewlink opent niet op iPhone van klant', categorie: 'Bug', prioriteit: 'Hoog', status: 'Wacht op jou', toegewezen: TK_AGENTS[2], aangemaakt: '2026-10-01T16:48:00', bijgewerkt: '2026-10-02T09:20:00', meta: 'Diafragmo 0.2.1 (prototype) · Safari 18 · macOS · venster 1440×900 · licht thema' }, sanne, { berichten: [
          { rol: 'gebruiker', naam: 'Sanne de Vries', tijd: '2026-10-01T16:48:00', tekst: 'Mijn klant Ingrid (Bakkerij Van Dam) krijgt een wit scherm als ze de reviewlink voor v3 opent op haar iPhone. Op haar laptop werkt het wel. Een screenshot van haar scherm zit erbij.', bijlage: { naam: 'screenshot-iphone-ingrid.png', grootte: '612 KB' } },
          { rol: 'systeem', veld: 'status', naar: 'In behandeling', tijd: '2026-10-02T09:05:00' },
          { rol: 'support', naam: SUPPORT_NAAM, agent: 'Lars', tijd: '2026-10-02T09:20:00', tekst: 'Hoi Sanne, vervelend! We konden het nog niet nadoen op iOS 18 met Safari. Weet je welke iOS-versie Ingrid gebruikt, en of ze de link opent vanuit de Mail-app of vanuit WhatsApp? Dan testen we precies haar situatie.' },
          { rol: 'systeem', veld: 'status', naar: 'Wacht op jou', tijd: '2026-10-02T09:20:00' }] }),
      Object.assign({ nr: 1001, onderwerp: 'Factuur F2026-031 staat dubbel in Moneybird', categorie: 'Facturatie', prioriteit: 'Normaal', status: 'Opgelost', toegewezen: TK_AGENTS[1], aangemaakt: '2026-09-24T10:12:00', bijgewerkt: '2026-09-24T13:06:00', meta: 'Diafragmo 0.2.0 (prototype) · Chrome 153 · macOS · venster 1440×900 · licht thema' }, sanne, { berichten: [
          { rol: 'gebruiker', naam: 'Sanne de Vries', tijd: '2026-09-24T10:12:00', tekst: 'Hoi! Factuur F2026-031 (Gemeente Zwolle) staat sinds vanochtend twee keer in Moneybird. In Diafragmo zie ik hem maar één keer. Kunnen jullie kijken wat er misging?' },
          { rol: 'support', naam: SUPPORT_NAAM, agent: 'Noor', tijd: '2026-09-24T11:40:00', tekst: 'Hoi Sanne, dank voor je melding! De synchronisatie met Moneybird is vannacht door een time-out twee keer gestart. We hebben de dubbele factuur in Moneybird teruggezet naar concept, zodat je hem kunt verwijderen, en de koppeling aangepast zodat dit niet meer kan gebeuren. Staat het zo goed?' },
          { rol: 'gebruiker', naam: 'Sanne de Vries', tijd: '2026-09-24T13:05:00', tekst: 'Staat goed nu, top. Bedankt voor de snelle hulp!' },
          { rol: 'systeem', veld: 'status', naar: 'Opgelost', tijd: '2026-09-24T13:06:00' }] })
    ];
  }
  let TK = null;
  function tickets() {
    if (!TK) { try { TK = JSON.parse(localStorage.getItem(TICKETS_KEY)); } catch (e) { TK = null; } if (!Array.isArray(TK)) { TK = seedTickets(); saveTickets(); } }
    return TK;
  }
  function saveTickets() { try { localStorage.setItem(TICKETS_KEY, JSON.stringify(TK)); } catch (e) { /* privémodus: alleen in geheugen */ } updateInfoBadges(); }
  const ticket = nr => tickets().find(t => String(t.nr) === String(nr));
  const tkOpenCount = () => tickets().filter(t => t.status === 'Open').length;
  const tkWachtCount = () => tickets().filter(t => t.eigen && t.status === 'Wacht op jou').length;
  function browserInfo() {
    const ua = navigator.userAgent; let m, b = 'onbekende browser';
    if ((m = ua.match(/Edg\/(\d+)/))) b = 'Edge ' + m[1];
    else if ((m = ua.match(/Firefox\/(\d+)/))) b = 'Firefox ' + m[1];
    else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) b = 'Chrome ' + m[1];
    else if ((m = ua.match(/Version\/(\d+).*Safari/))) b = 'Safari ' + m[1];
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'onbekend systeem';
    return `Diafragmo ${APP_VERSIE} (prototype) · ${b} · ${os} · venster ${window.innerWidth}×${window.innerHeight} · ${themeEffective() === 'dark' ? 'donker' : 'licht'} thema`;
  }

  // Info-menu (dropdown linksboven in de topbalk)
  function infoMenuHtml() {
    const open = tkOpenCount(), wacht = tkWachtCount(), unread = newsUnread();
    return `<div class="info-dd-head"><img class="info-dd-mark" src="img/beeldmerk.svg" alt=""><div><div class="strong">Diafragmo</div><div class="tiny muted">${versieLabel()} · ${buildLabel()}</div></div></div>
      <button type="button" class="info-item" role="menuitem" data-action="info-about">${icon('info')}<span class="grow">Over Diafragmo</span></button>
      <button type="button" class="info-item" role="menuitem" data-action="info-news">${icon('sparkle')}<span class="grow">Nieuw in deze versie</span>${unread ? '<span class="info-new">Nieuw</span>' : ''}</button>
      <div class="info-sep" role="separator"></div>
      <a class="info-item" role="menuitem" href="#/support/nieuw">${icon('msg')}<span class="grow">Support</span><span class="tiny muted">ticket maken</span></a>
      <a class="info-item" role="menuitem" href="#/support">${icon('file')}<span class="grow">Mijn tickets</span>${wacht ? `<span class="info-count" title="Wacht op jouw reactie">${wacht}</span>` : ''}</a>
      <div class="info-sep" role="separator"></div>
      <a class="info-item" role="menuitem" href="#/beheer/support">${icon('inbox')}<span class="grow">Support-inbox (beheerder)<span class="tiny muted info-sub">Alleen voor beheerders · demo</span></span>${open ? `<span class="info-count ink" title="Open tickets">${open}</span>` : ''}</a>`;
  }
  const infoOpen = () => { const dd = $('#info-dropdown'); return !!dd && !dd.hidden; };
  function openInfo() {
    const dd = $('#info-dropdown'), b = $('#info-btn'); if (!dd) return;
    dd.innerHTML = infoMenuHtml(); dd.hidden = false; b.setAttribute('aria-expanded', 'true');
    const f = $('.info-item', dd); if (f) f.focus({ preventScroll: true });
  }
  function closeInfo(focusBtn) {
    const dd = $('#info-dropdown'), b = $('#info-btn'); if (!dd || dd.hidden) return;
    dd.hidden = true; b.setAttribute('aria-expanded', 'false'); if (focusBtn) b.focus();
  }
  function updateInfoBadges() {
    const dot = $('#info-btn .info-dot'); if (dot) dot.hidden = !newsUnread();
    const dd = $('#info-dropdown'); if (dd && !dd.hidden) dd.innerHTML = infoMenuHtml();
  }
  document.addEventListener('click', e => {
    if (!infoOpen() || e.target.closest('#info-btn')) return;
    if (e.target.closest('#info-dropdown') && !e.target.closest('.info-item')) return;
    closeInfo(false);
  });
  document.addEventListener('keydown', e => {
    if (!infoOpen()) return;
    if (e.key === 'Escape') { closeInfo(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); const items = $$('#info-dropdown .info-item'); const i = items.indexOf(document.activeElement);
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[n].focus();
    }
  });

  function aboutModal() {
    modal({
      title: 'Over Diafragmo', body: `<div class="about">
        <div class="about-head"><img class="about-icon" src="img/app-icoon.svg" alt=""><div><div class="about-name">diafragmo</div><div class="small muted">${versieLabel()} · ${buildLabel()}</div></div></div>
        <p>Diafragmo is projectbeheer voor zelfstandige videomakers: van aanvraag en offerte via draaidagen en review op timecode tot oplevering en factuur met iDEAL | Wero of een Tikkie – in één overzicht, met een eigen klantportaal voor je klanten.</p>
        <p class="small">Gemaakt door <a class="link" href="https://noorderwind.app" target="_blank" rel="noopener">Noorderwind Studio</a>.</p>
        <div class="about-eu">${euBadge('eu-flag')}<span><strong>Soevereine hosting in de EU</strong> – je video's, bestanden en klantgegevens blijven in Europa.</span></div>
        <ul class="about-links">
          <li>${icon('globe')}<a class="link" href="https://noorderwindstudio.github.io/diafragmo/" target="_blank" rel="noopener">Prototype openen in een nieuw tabblad</a></li>
          <li>${icon('sparkle')}<a class="link" href="#/dashboard" data-action="info-news">Nieuw in deze versie</a></li>
          <li>${icon('msg')}<a class="link" href="#/support/nieuw">Contact met support</a></li>
        </ul>
        <p class="tiny muted">Dit is een klikbaar prototype met fictieve voorbeelddata. Er wordt niets echt verstuurd, opgeslagen of afgeschreven.</p></div>`,
      actions: [{ label: 'Sluiten', cls: 'primary', onClick: closeModal }]
    });
  }
  function newsModal() {
    markNewsRead();
    modal({
      title: 'Nieuw in deze versie', body: CHANGELOG.map((c, i) => `<section class="cl-ver">
          <div class="cl-head"><span class="vtag">v${c.v}</span>${i === 0 ? `<strong>Nieuw in ${esc(c.v)}</strong>` : ''}<span class="small muted">${fdate(c.datum)}</span>${i === 0 ? '<span class="pill inv-betaald">Huidige versie</span>' : ''}</div>
          <ul class="cl-list">${c.items.map(it => `<li>${icon(it[0])}<div><strong>${esc(it[1])}${it[3] ? ' ' + proBadge() : ''}</strong><span>${esc(it[2])}</span></div></li>`).join('')}</ul></section>`).join('') +
        `<p class="tiny muted">Prototype – versienummers en data zijn indicatief.</p>`,
      actions: [{ label: 'Feedback of vraag?', cls: 'ghost', onClick: () => go('#/support/nieuw') }, { label: 'Sluiten', cls: 'primary', onClick: closeModal }]
    });
  }

  // Support – gebruikerskant
  function supportHead() {
    return `<div class="page-head"><div><h1>Support</h1><p class="muted">Een vraag, bug of idee? Het Diafragmo-team van Noorderwind Studio reageert meestal binnen één werkdag.</p></div><div class="head-actions"><a class="btn primary" href="#/support/nieuw">${icon('plus')} Nieuw ticket</a></div></div>`;
  }
  function supportTabs(active) {
    const n = tickets().filter(t => t.eigen).length, w = tkWachtCount();
    return `<nav class="tabs" aria-label="Support"><a class="tab ${active === 'lijst' ? 'active' : ''}" href="#/support">Mijn tickets <span class="muted">(${n})</span>${w ? `<span class="tab-badge" title="Wacht op jou">${w}</span>` : ''}</a><a class="tab ${active === 'nieuw' ? 'active' : ''}" href="#/support/nieuw">Nieuw ticket</a></nav>`;
  }
  function tkRow(t, beheer) {
    const last = t.berichten.filter(m => m.rol !== 'systeem').pop() || {};
    const href = beheer ? `#/beheer/support/${t.nr}` : `#/support/ticket/${t.nr}`;
    const lastTxt = last.rol === 'support' ? 'laatste reactie: support' : `laatste reactie: ${beheer ? 'gebruiker' : 'jij'}`;
    return `<li class="tk-row" data-action="go" data-href="${href}" tabindex="0" role="link" aria-label="Ticket ${t.nr}: ${esc(t.onderwerp)} – ${esc(tkStatusLabel(t.status, beheer))}">
      <span class="tk-cat tk-cat-${slug(t.categorie)}" title="${esc(t.categorie)}">${icon(TK_CAT_IC[t.categorie] || 'msg')}</span>
      <div class="grow tk-main"><div class="tk-title"><span class="tk-nr">#${t.nr}</span><span class="strong">${esc(t.onderwerp)}</span></div>
        <div class="small muted tk-sub">${beheer ? `<span class="strong">${esc(t.van)}</span> · ` : ''}${esc(t.categorie)} · ${prio(t.prioriteit)} · ${lastTxt}</div></div>
      <div class="tk-side">${tkPill(t.status, beheer)}<span class="tiny muted">${fdtShort(t.bijgewerkt)}</span></div></li>`;
  }
  function viewSupportList() {
    const mine = tickets().filter(t => t.eigen).slice().sort((a, b) => b.bijgewerkt.localeCompare(a.bijgewerkt));
    const w = tkWachtCount();
    return `${supportHead()}${supportTabs('lijst')}
      ${w ? `<div class="banner warn">${icon('msg')}<span class="grow">${w === 1 ? 'Eén ticket wacht' : w + ' tickets wachten'} op jouw reactie.</span></div>` : ''}
      ${mine.length ? `<div class="card tk-card"><ul class="tk-list">${mine.map(t => tkRow(t, false)).join('')}</ul></div>` : `<div class="empty card">${icon('msg')}<p>Je hebt nog geen tickets.</p><a class="btn primary" href="#/support/nieuw">Nieuw ticket</a></div>`}
      <p class="tiny muted mt-s">Demo: tickets worden alleen in deze browser bewaard.</p>`;
  }
  function tkAttHtml() {
    const a = S.tkAtt;
    return a ? `<span class="att-chip">${icon('paperclip')}<span class="att-name">${esc(a.naam)}</span><small>${esc(a.grootte)}</small><button type="button" class="att-x" data-action="tk-att-remove" aria-label="Screenshot verwijderen">${icon('x')}</button></span>`
      : `<label class="btn sm tk-file-btn" for="tk-file">${icon('upload')} Screenshot toevoegen</label><input type="file" id="tk-file" accept="image/*" hidden><button type="button" class="chip" data-action="tk-att-demo">Voorbeeld-screenshot</button>`;
  }
  function viewSupportNew() {
    return `${supportHead()}${supportTabs('nieuw')}
      <div class="tk-new">
        <form class="card form-col tk-form" data-form="ticket-new">
          <label>Onderwerp*<input name="onderwerp" required maxlength="120" placeholder="Bijv. Reviewlink opent niet bij mijn klant" autocomplete="off"></label>
          <div class="form-grid two tk-grid"><label>Categorie<select name="categorie">${TK_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
            <label>Prioriteit<select name="prioriteit">${TK_PRIOS.map(p => `<option ${p === 'Normaal' ? 'selected' : ''}>${p}</option>`).join('')}</select></label></div>
          <label>Beschrijving*<textarea name="beschrijving" required rows="6" placeholder="Wat gebeurde er, wat verwachtte je, en hoe kunnen we het nadoen?"></textarea></label>
          <div><div class="lbl-txt">Screenshot (optioneel)</div><div class="att-row tk-att" id="tk-att">${tkAttHtml()}</div></div>
          <div class="tk-meta">${icon('settings')}<span><span class="strong">Wordt automatisch meegestuurd:</span> ${esc(browserInfo())}</span></div>
          <div class="row gap wrap tk-actions"><a class="btn ghost" href="#/support">Annuleren</a><button class="btn primary" type="submit">${icon('send')} Ticket versturen</button></div>
        </form>
        <aside class="card tk-help"><h2>Handig om te weten</h2>
          <ul class="bullets small"><li>Bij een bug helpen een screenshot en de stappen om het na te doen.</li><li>Kies <strong>Hoog</strong> als je echt niet verder kunt, bijvoorbeeld als een klant niet kan reviewen of betalen.</li><li>Je krijgt bericht zodra we reageren; je antwoordt gewoon in het ticket.</li></ul>
          <p class="small muted">Bereikbaar op werkdagen van 9:00 tot 17:00. Je tickets en bijlagen blijven in de EU.</p></aside>
      </div>`;
  }
  function tkMsg(m, beheer) {
    if (m.rol === 'systeem') {
      if (m.intern && !beheer) return '';
      const txt = m.veld === 'status' ? `Status gewijzigd naar ${tkStatusLabel(m.naar, beheer)}` : m.veld === 'prioriteit' ? `Prioriteit gewijzigd naar ${m.naar}` : m.veld === 'toegewezen' ? `Toegewezen aan ${m.naar}` : m.tekst;
      return `<li class="tk-sys"><span>${esc(txt)}${m.door && (beheer || m.door !== 'beheer') ? ' · ' + esc(m.door) : ''}${m.intern ? ' · intern' : ''}</span><time>${fdt(m.tijd)}</time></li>`;
    }
    const sup = m.rol === 'support', ik = !beheer && m.naam === 'Sanne de Vries';
    const av = sup ? '<span class="tk-av"><img src="img/beeldmerk.svg" alt=""></span>' : `<span class="avatar sm ${m.naam === 'Sanne de Vries' ? '' : 'klant'}">${esc(initials(m.naam))}</span>`;
    const who = sup ? SUPPORT_NAAM + (beheer && m.agent ? ` (${m.agent})` : '') : ik ? 'Jij' : m.naam;
    return `<li class="tk-msg ${sup ? 'sup' : 'usr'}">${av}<div class="tk-bubble"><div class="tk-who"><span class="strong">${esc(who)}</span><time class="tiny muted">${fdt(m.tijd)}</time></div><div class="tk-text">${esc(m.tekst)}</div>${m.bijlage ? `<div class="att-row"><button type="button" class="att-chip" data-action="download" data-name="${esc(m.bijlage.naam)}">${icon('paperclip')}<span class="att-name">${esc(m.bijlage.naam)}</span><small>${esc(m.bijlage.grootte)}</small></button></div>` : ''}</div></li>`;
  }
  function beheerBanner() { return `<div class="banner info">${icon('shield')}<span class="grow small"><strong>Beheerdersweergave (demo).</strong> Alleen bedoeld voor het Diafragmo-team van Noorderwind Studio; in het echte product zit dit achter een beheerdersaccount.</span></div>`; }
  function viewTicket(t, beheer) {
    if (!t) return viewNotFound();
    const back = beheer ? `<a class="back" href="#/beheer/support">${icon('arrowLeft')} Support-inbox</a>` : `<a class="back" href="#/support">${icon('arrowLeft')} Mijn tickets</a>`;
    const opts = (list, cur, lbl) => list.map(v => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(lbl ? lbl(v) : v)}</option>`).join('');
    const reply = `<form class="tk-reply" data-form="${beheer ? 'ticket-reply-support' : 'ticket-reply'}" data-nr="${t.nr}">
        <textarea name="tekst" rows="3" required aria-label="${beheer ? 'Antwoord als support' : 'Je reactie'}" placeholder="${beheer ? 'Antwoord als Diafragmo support…' : 'Typ je reactie…'}"></textarea>
        <div class="tk-reply-foot">${beheer ? `<label class="tk-inline">Status na versturen<select name="status">${opts(TK_STATUSES, 'Wacht op jou', s => tkStatusLabel(s, true))}</select></label>` : `<span class="tiny muted">${t.status === 'Opgelost' ? 'Reageren heropent het ticket.' : 'Het supportteam krijgt direct een melding.'}</span>`}
          <div class="row gap wrap">${!beheer && t.status !== 'Opgelost' ? `<button type="button" class="btn ghost" data-action="tk-resolve" data-nr="${t.nr}">${icon('check')} Markeer als opgelost</button>` : ''}<button class="btn primary" type="submit">${icon('send')} ${beheer ? 'Verstuur antwoord' : 'Verstuur reactie'}</button></div></div>
      </form>`;
    const side = beheer ? `<aside class="card tk-aside form-col"><h2>Beheer</h2>
        <label>Status<select data-tk-set="status" data-nr="${t.nr}">${opts(TK_STATUSES, t.status, s => tkStatusLabel(s, true))}</select></label>
        <label>Prioriteit<select data-tk-set="prioriteit" data-nr="${t.nr}">${opts(TK_PRIOS, t.prioriteit)}</select></label>
        <label>Toegewezen aan<select data-tk-set="toegewezen" data-nr="${t.nr}">${opts(TK_AGENTS, t.toegewezen)}</select></label>
        <div class="tk-user"><span class="avatar sm ${t.eigen ? '' : 'klant'}">${esc(initials(t.van))}</span><div class="grow"><div class="strong small">${esc(t.van)}</div><div class="tiny muted">${esc(t.bedrijf)} · ${esc(t.email)}</div></div></div>
        <div class="tk-meta">${icon('settings')}<span>${esc(t.meta)}</span></div></aside>`
      : `<aside class="card tk-aside"><h2>Details</h2>
        <dl class="tk-dl"><dt>Status</dt><dd>${tkPill(t.status)}</dd><dt>Categorie</dt><dd>${esc(t.categorie)}</dd><dt>Prioriteit</dt><dd>${prio(t.prioriteit)}</dd><dt>Aangemaakt</dt><dd>${fdt(t.aangemaakt)}</dd><dt>Bijgewerkt</dt><dd>${fdt(t.bijgewerkt)}</dd></dl>
        ${t.status === 'Wacht op jou' ? `<div class="banner warn small">${icon('msg')}<span>Support wacht op jouw reactie.</span></div>` : ''}
        <div class="tk-meta">${icon('settings')}<span>${esc(t.meta)}</span></div></aside>`;
    return `${back}
      <div class="page-head tk-head"><div><div class="row gap wrap"><span class="tk-nr big">#${t.nr}</span>${tkPill(t.status, beheer)}${beheer ? '<span class="pill tk-beheer">Beheerder · demo</span>' : ''}</div><h1>${esc(t.onderwerp)}</h1>
        <p class="muted small">${esc(t.categorie)} · prioriteit ${prio(t.prioriteit)} · aangemaakt ${fdt(t.aangemaakt)}${beheer ? ' · door ' + esc(t.van) : ''}</p></div></div>
      ${beheer ? beheerBanner() : ''}
      <div class="tk-detail"><section class="card"><h2 class="tk-h">Gesprek</h2><ol class="tk-thread">${t.berichten.map(m => tkMsg(m, beheer)).join('')}</ol>${reply}</section>${side}</div>`;
  }
  // Support – beheerderskant
  function viewBeheer() {
    const all = tickets(), f = S.tkFilter;
    const count = s => all.filter(t => t.status === s).length;
    const list = all.filter(t => (f.status === 'Alle' || t.status === f.status) && (f.cat === 'Alle' || t.categorie === f.cat))
      .slice().sort((a, b) => (a.status === 'Opgelost') - (b.status === 'Opgelost') || b.bijgewerkt.localeCompare(a.bijgewerkt));
    return `<div class="page-head"><div><div class="row gap wrap"><h1>Support-inbox</h1><span class="pill tk-beheer">Beheerder · demo</span></div><p class="muted">Alle tickets van Diafragmo-gebruikers · <strong>${count('Open')}</strong> open</p></div>
        <div class="head-actions"><button class="btn ghost" data-action="tk-reset">Demo-tickets herstellen</button></div></div>
      ${beheerBanner()}
      <div class="toolbar"><div class="chips">${['Alle'].concat(TK_STATUSES).map(s => `<button class="chip ${f.status === s ? 'active' : ''}" data-action="tk-filter" data-v="${esc(s)}" aria-pressed="${f.status === s}">${esc(s === 'Alle' ? 'Alle' : tkStatusLabel(s, true))} <span>${s === 'Alle' ? all.length : count(s)}</span></button>`).join('')}</div>
        <div class="toolbar-right"><label class="tk-inline">Categorie<select class="select" data-tk-filter="cat">${['Alle'].concat(TK_CATS).map(c => `<option ${f.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div></div>
      ${list.length ? `<div class="card tk-card"><ul class="tk-list">${list.map(t => tkRow(t, true)).join('')}</ul></div>` : `<div class="empty card">${icon('inbox')}<p>Geen tickets met dit filter.</p></div>`}`;
  }
  function tkSystem(t, veld, naar, extra) { const now = nowLocal(); t.berichten.push(Object.assign({ rol: 'systeem', veld, naar, tijd: now }, extra || {})); t.bijgewerkt = now; }

  // ---------- 0.4.0: demo-status in localStorage (plan, agenda, timer, handtekeningen, callsheets, ondertitels) ----------
  const DEMO_KEY = 'diafragmo-demo-040';
  function demoLoad() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || {}; } catch (e) { return {}; } }
  function demoSave() {
    const signed = {}; Object.keys(S.quotes).forEach(k => { if (S.quotes[k].signed) signed[k] = S.quotes[k].signed; });
    const shots = {}; Object.keys(D.shotlist).forEach(k => { if (S.shotlist[k]) shots[k] = S.shotlist[k].map(x => !!x.klaar); });
    const kp = { active: S.email.active }; ACC_KEYS.forEach(k => { kp[k] = Object.assign({}, S.koppeling[k]); });
    const o = { plan: S.settings.plan, agenda: { autoZet: S.agenda.autoZet, checkBeschikbaar: S.agenda.checkBeschikbaar }, koppeling: kp, timer: S.timer, timerUren: S.timerUren, signed, callsheets: S.callsheets, subs: S.subs, shots, tikkie: S.tikkie };
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(o)); } catch (e) { /* privémodus: alleen in geheugen */ }
  }
  function applyDemo(o, live) {
    let migrated = false;
    if (o.plan === 'Basis' || o.plan === 'Pro') S.settings.plan = o.plan;
    if (o.agenda) ['autoZet', 'checkBeschikbaar'].forEach(k => { if (typeof o.agenda[k] === 'boolean') S.agenda[k] = o.agenda[k]; });
    if (o.koppeling && typeof o.koppeling === 'object') {
      ACC_KEYS.forEach(k => { const x = o.koppeling[k]; if (x && typeof x === 'object') ['connected', 'sinds', 'mail', 'agenda'].forEach(f => { if (x[f] !== undefined) S.koppeling[k][f] = f === 'sinds' ? x[f] : !!x[f]; }); });
      S.email.active = ACC_KEYS.includes(o.koppeling.active) ? o.koppeling.active : S.email.active; fixActive();
    } else if (migrateKoppeling(o)) { fixActive(); migrated = true; }
    S.timer = o.timer && o.timer.pid && proj(o.timer.pid) && o.timer.start ? o.timer : null;
    (o.timerUren || []).forEach(u => {
      if (S.timerUren.some(x => x.id === u.id)) return; const p = proj(u.pid); if (!p) return; ensure(p);
      S.timerUren.push(u); S.hours[u.pid].push({ datum: u.datum, activiteit: u.activiteit, uren: u.uren, km: u.km || 0, tid: u.id }); addedHours += Number(u.uren) || 0;
    });
    Object.keys(o.signed || {}).forEach(pid => { const q = S.quotes[pid]; if (q && !q.signed) { q.signed = o.signed[pid]; applySigned(pid); if (live) toast(`Melding: ${esc(q.signed.naam)} heeft offerte ${esc(q.nr)} ondertekend`); } });
    if (o.callsheets && typeof o.callsheets === 'object') S.callsheets = o.callsheets;
    if (o.subs && typeof o.subs === 'object') S.subs = o.subs;
    if (o.tikkie && typeof o.tikkie === 'object') {
      const t = o.tikkie; S.tikkie.gekoppeld = !!t.gekoppeld; S.tikkie.on = !!t.on && S.tikkie.gekoppeld; S.tikkie.sinds = t.sinds || null;
      Object.keys(t.verzoeken || {}).forEach(nr => {
        const v = t.verzoeken[nr], p = v && proj(v.pid); if (!p) return;
        S.tikkie.verzoeken[nr] = v; if (v.betaald) { ensure(p); invRefs(nr, v.pid).forEach(r => { r.status = 'Betaald'; }); }
      });
    }
    Object.keys(o.shots || {}).forEach(k => { const sl = S.shotlist[k]; if (sl && Array.isArray(o.shots[k])) sl.forEach((x, i) => { if (i < o.shots[k].length) x.klaar = !!o.shots[k][i]; }); });
    if (migrated) { demoSave(); if (!live) S.migratedKoppeling = true; } // pas opslaan als alle demo-status is ingelezen
  }

  // Migratie 0.4.0 → 0.4.1: losse e-mail- en agendakoppelingen worden één koppeling per aanbieder.
  // Was e-mail of agenda gekoppeld, dan is de aanbieder gekoppeld met precies die schakelaar(s) aan.
  function migrateKoppeling(o) {
    const cal = o.agenda || {}, mail = (o.email && o.email.accounts) || {};
    let any = false;
    [['microsoft', 'outlook', 'outlook'], ['google', 'google', 'gmail']].forEach(m => {
      const k = m[0], c = cal[m[1]], e = mail[m[2]], cOn = !!(c && c.connected), eOn = !!(e && e.connected);
      if (!cOn && !eOn) return;
      any = true;
      Object.assign(S.koppeling[k], { connected: true, sinds: (cOn && c.sinds) || (eOn && e.sinds) || nowLabel(), mail: eOn, agenda: cOn });
    });
    if (any) {
      const both = ACC_KEYS.filter(agendaOn); if (both.length > 1) acc(both[1]).agenda = false; // één agenda tegelijk
      const act = o.email && accKey(o.email.active || ''); if (act && mailOn(act)) S.email.active = act;
    }
    return any;
  }

  // ---------- 0.4.3: Betaalmethoden & Tikkie-betaalverzoek (demo – geen echte koppeling, geen echte betaling) ----------
  const tikkieOn = () => S.tikkie.on && S.tikkie.gekoppeld;
  const TIKKIE_OPEN = ['Open', 'Verlopen'];
  // Alle plekken waar een factuur staat (lijst, projectfinanciën, factuur in de bouwer), zodat de status overal gelijk blijft
  function invRefs(nr, pid) {
    if (!nr || nr === '–') return [];
    const out = S.invoices.filter(i => i.nr === nr && i.projectId === pid);
    const f = S.finance[pid]; if (f) [f.aanbetaling, f.eindfactuur].forEach(d => { if (d && d.nr === nr) out.push(d); });
    if (S.quote && S.quote.type === 'Factuur' && S.quote.nr === nr && S.quote.projectId === pid) out.push(S.quote);
    return out;
  }
  function invOpenAmount(nr, pid) {
    const i = S.invoices.find(x => x.nr === nr && x.projectId === pid); if (i) return i.bedrag;
    const f = S.finance[pid], d = f && [f.aanbetaling, f.eindfactuur].find(x => x.nr === nr); if (d) return d.bedrag;
    const q = S.quote; if (q && q.type === 'Factuur' && q.nr === nr) return Math.round(qCalc(q).tot * 100) / 100;
    return 0;
  }
  function tikkieStatusHtml(nr) {
    const t = S.tikkie.verzoeken[nr]; if (!t) return '';
    if (t.betaald) return `<div class="tikkie-status is-paid tiny">${icon('check')}<span><strong>betaald via Tikkie</strong> · ${esc(t.betaald)}</span></div>`;
    return `<div class="tikkie-status tiny"><span class="pay-pill tikkie">Tikkie</span><span>verstuurd op ${esc(t.verstuurd)} · ${esc(t.via)} · ${eur(t.bedrag)}</span></div>`;
  }
  // Knoppen alleen als Tikkie aan staat (anders verborgen; de hint staat in Instellingen)
  function tikkieActionsHtml(nr, pid, status, mode) {
    if (!tikkieOn() || !nr || nr === '–') return '';
    const t = S.tikkie.verzoeken[nr];
    if (status === 'Betaald' || (t && t.betaald)) return '';
    if (mode !== 'paid-only' && !TIKKIE_OPEN.includes(status)) return '';
    const send = mode === 'paid-only' ? '' : `<button class="btn sm" data-action="tikkie-open" data-id="${pid}" data-nr="${esc(nr)}">${icon('send')} Tikkie sturen</button>`;
    const paid = t ? `<button class="btn sm ghost" data-action="tikkie-paid" data-id="${pid}" data-nr="${esc(nr)}">${icon('check')} Demo: markeer als betaald via Tikkie</button>` : '';
    return send || paid ? `<div class="tikkie-actions">${send}${paid}</div>` : '';
  }
  function payMethodsHtml() {
    const t = S.tikkie, on = tikkieOn();
    return `<section class="card pay-methods" id="betaalmethoden" aria-labelledby="pm-title">
      <div class="card-head"><h2 id="pm-title">Betaalmethoden</h2><span class="small muted">voor facturen en betaalverzoeken</span></div>
      <ul class="list pm-list">
        <li class="row-item">
          <div class="grow"><div class="pm-title"><span class="pay-pill on-card">iDEAL | Wero</span><span class="strong">iDEAL | Wero via betaallink</span><span class="tag">Standaard</span></div>
            <div class="small muted">Op elke factuur, in je e-mails en in het klantportaal. Altijd aan.</div></div>
          <label class="switch" title="Standaard betaalmethode – altijd aan"><input type="checkbox" checked disabled aria-label="iDEAL | Wero via betaallink (standaard, altijd aan)"><span></span></label>
        </li>
        <li class="row-item">
          <div class="grow"><div class="pm-title"><span class="pay-pill tikkie">Tikkie</span><span class="strong">Tikkie (Tikkie Zakelijk, ABN AMRO)</span></div>
            <div class="small muted">Nederlandse dienst · geschikt voor snelle betaalverzoeken</div>
            <div class="pm-status tiny ${t.gekoppeld ? 'ok' : 'muted'}">${t.gekoppeld ? `${icon('check')} Gekoppeld met Tikkie Zakelijk · ${esc(D.studio.naam)} · sinds ${esc(t.sinds)}` : 'Niet gekoppeld'}</div>
            <div class="row gap wrap pm-actions">${t.gekoppeld ? `<button class="btn sm ghost" data-action="tikkie-disconnect">Ontkoppelen</button>` : `<button class="btn sm" data-action="tikkie-connect">${icon('link')} Koppelen</button>`}</div></div>
          <label class="switch"><input type="checkbox" data-action="tikkie-toggle" ${on ? 'checked' : ''} aria-label="Tikkie-betaalverzoeken aan of uit"><span></span></label>
        </li>
      </ul>
      ${on ? `<div class="banner ok small">${icon('check')}<span class="grow">Tikkie staat aan: bij open facturen zie je nu de knop <strong>Tikkie sturen</strong> (Offertes & facturen en project → Financiën).</span></div>`
        : `<div class="banner info small">${icon('info')}<span class="grow">Zet Tikkie aan om bij open facturen een knop <strong>Tikkie sturen</strong> te tonen (Offertes & facturen en project → Financiën). Zolang Tikkie uit staat, is de knop verborgen.</span></div>`}
      <p class="tiny muted">Prototype: er wordt niet echt gekoppeld met ABN AMRO en er worden geen echte betaalverzoeken gemaakt. Geen officiële logo's.</p>
    </section>`;
  }
  function tikkieConsent(after) {
    modal({
      title: 'Tikkie Zakelijk koppelen (demo)',
      body: `<div class="consent">
        <div class="consent-logos"><span class="consent-app"><img src="img/app-icoon.svg" alt="Diafragmo" style="width:52px;height:52px;border-radius:14px;display:block"></span><span class="consent-dots"><i></i><i></i><i></i></span><span class="consent-prov tikkie-prov"><span class="pay-pill tikkie">Tikkie</span></span></div>
        <div class="consent-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">${esc(D.studio.naam)}</div><div class="tiny muted">Zakelijke rekening ${esc(D.studio.iban)}</div></div><span class="tiny muted">ABN AMRO</span></div>
        <p class="consent-q"><strong>Diafragmo</strong> wil met Tikkie Zakelijk:</p>
        <ul class="perm-list">
          <li>${icon('euro')}<div><div class="strong">Betaalverzoeken aanmaken namens jou</div><div class="tiny muted">Alleen voor je eigen facturen, met bedrag, omschrijving en geldigheid die jij kiest.</div></div></li>
          <li>${icon('check')}<div><div class="strong">De betaalstatus van die verzoeken zien</div><div class="tiny muted">Zodat de factuur in Diafragmo op Betaald gaat zodra je klant heeft betaald.</div></div></li>
        </ul>
        <p class="tiny muted">Demo: er wordt niet echt ingelogd bij ABN AMRO en er gaat geen geld over. Ontkoppelen kan altijd in Instellingen → Betaalmethoden.</p></div>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: () => { closeModal(); if (after) after(false); } }, { label: 'Toestaan en koppelen', cls: 'primary', onClick: () => {
        Object.assign(S.tikkie, { gekoppeld: true, on: true, sinds: nowLabel() }); demoSave(); closeModal();
        toast('Tikkie Zakelijk gekoppeld (demo) · “Tikkie sturen” staat nu bij open facturen'); if (after) after(true);
      } }]
    });
  }
  let TIK = null; // betaalverzoek dat in het venster open staat
  const tikkieCode = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let x = ''; for (let i = 0; i < 6; i++) x += c[Math.floor(Math.random() * c.length)]; return x; };
  const tikkieMsg = (t, p) => `Hoi ${firstName(p.contact)}, hierbij het betaalverzoek van ${eur(t.bedrag)} voor “${t.omschrijving}”. Betalen kan via Tikkie, geldig tot ${fdate(t.geldig)}: ${t.link} Bedankt! Groet, ${firstName(D.studio.eigenaar)}`;
  const waUrl = (t, p) => 'https://wa.me/?text=' + encodeURIComponent(tikkieMsg(t, p));
  function tikkieModal(pid, nr) {
    const p = proj(pid); if (!p || !tikkieOn()) return; ensure(p);
    const open = invOpenAmount(nr, pid), prev = S.tikkie.verzoeken[nr];
    TIK = prev ? Object.assign({}, prev) : { nr, pid, bedrag: Math.round(open * 100) / 100, omschrijving: `${nr} – ${p.titel}`, geldig: isoAdd(todayIso(), 14), link: `https://tikkie.me/pay/demo-${slug(nr)}-${tikkieCode()}` };
    modal({
      title: 'Tikkie sturen', wide: true,
      body: `<form id="tikkie-form" class="tikkie-form" novalidate>
        <div class="tikkie-head"><span class="pay-pill tikkie">Tikkie</span><div class="grow"><div class="strong small">Betaalverzoek voor factuur ${esc(nr)}</div><div class="tiny muted">${esc(p.klant)} · t.a.v. ${esc(p.contact)} · via Tikkie Zakelijk (ABN AMRO)</div></div></div>
        <div class="form-grid two">
          <label>Bedrag<div class="input-prefix"><span>€</span><input type="number" id="tikkie-bedrag" min="0.01" step="0.01" required value="${TIK.bedrag.toFixed(2)}"></div><span class="tiny muted">Openstaand op deze factuur: ${eur(open)}</span></label>
          <label>Geldig tot<input type="date" id="tikkie-geldig" required min="${todayIso()}" value="${TIK.geldig}"><span class="tiny muted">Standaard 14 dagen</span></label>
          <label class="full">Omschrijving<input id="tikkie-oms" required maxlength="80" value="${esc(TIK.omschrijving)}"></label>
        </div>
        <div class="tikkie-link">
          <div class="row-between"><span class="tiny strong">Betaallink</span><span class="demo-tag">Demo-link</span></div>
          <input readonly id="tikkie-link" value="${esc(TIK.link)}" aria-label="Tikkie-betaallink (demo)">
          <div class="tiny muted">Nagemaakte link voor dit prototype – hij werkt niet. In het echte product maakt Tikkie Zakelijk de link aan.</div>
        </div>
        <div class="tikkie-share">
          <a class="btn primary" id="tikkie-wa" href="${esc(waUrl(TIK, p))}" target="_blank" rel="noopener" data-action="tikkie-share" data-via="whatsapp">${icon('msg')} Deel via WhatsApp</a>
          <button type="button" class="btn" data-action="tikkie-share" data-via="kopie">${icon('link')} Kopieer link</button>
          <button type="button" class="btn" data-action="tikkie-share" data-via="email">${icon('send')} Verstuur per e-mail</button>
        </div>
        ${prev ? `<p class="tiny muted">Eerder verstuurd op ${esc(prev.verstuurd)} (${esc(prev.via)}). Je deelt dezelfde link opnieuw.</p>` : ''}
        <p class="tiny muted">WhatsApp opent met een kant-en-klaar bericht; jij kiest het contact en verstuurt zelf. Na delen staat bij de factuur “Tikkie verstuurd op …”.</p>
      </form>`,
      actions: [{ label: 'Sluiten', cls: 'ghost', onClick: closeModal }]
    });
    $('#tikkie-form').addEventListener('submit', ev => { ev.preventDefault(); ev.stopPropagation(); });
  }
  function tikkieRead() {
    if (!TIK) return null;
    const b = $('#tikkie-bedrag'), g = $('#tikkie-geldig'), o = $('#tikkie-oms');
    if (b) TIK.bedrag = Math.round((Number(b.value) || 0) * 100) / 100;
    if (g) TIK.geldig = g.value;
    if (o) TIK.omschrijving = o.value.trim();
    const wa = $('#tikkie-wa'); if (wa && TIK.geldig) wa.href = waUrl(TIK, proj(TIK.pid));
    return TIK;
  }
  function tikkieValid() {
    const f = $('#tikkie-form'); if (!f) return false;
    const b = $('#tikkie-bedrag'), g = $('#tikkie-geldig'), o = $('#tikkie-oms');
    b.setCustomValidity(Number(b.value) > 0 ? '' : 'Vul een bedrag groter dan € 0 in');
    g.setCustomValidity(g.value && g.value >= todayIso() ? '' : 'Kies een datum vanaf vandaag');
    o.setCustomValidity(o.value.trim() ? '' : 'Vul een omschrijving in');
    return f.reportValidity();
  }
  function tikkieSent(t, via) { S.tikkie.verzoeken[t.nr] = Object.assign({}, t, { verstuurd: nowLabel(), via, betaald: null }); demoSave(); }

  // ---------- Pro-functies (timer, ondertiteling) ----------
  const isPro = () => S.settings.plan === 'Pro';
  const proBadge = lock => `<span class="pro-badge" title="Onderdeel van Pro">${lock ? icon('lock') : ''}Pro</span>`;
  const PRO_INFO = {
    timer: { titel: 'Timer voor uren', tekst: 'Start en stop een timer per project, ook op je telefoon. Je uren tellen direct mee voor je urencriterium.' },
    subs: { titel: 'Ondertiteling & transcriptie', tekst: 'Automatisch een transcript met tijdcodes, ondertitels in de speler, download als .srt of inbranden voor social. Verwerkt in de EU.' }
  };
  function lockedHtml(f) {
    const i = PRO_INFO[f];
    return `<div class="pro-locked"><span class="pl-ic">${icon('lock')}</span><div class="grow"><div class="strong">${esc(i.titel)} ${proBadge()}</div><div class="small muted"><strong class="pl-avail">Beschikbaar in Pro.</strong> ${esc(i.tekst)}</div></div><button class="btn primary sm" data-action="upgrade" data-f="${f}">${icon('sparkle')} Upgrade naar Pro</button></div>`;
  }
  function setPlan(plan, how) {
    if (plan !== 'Basis' && plan !== 'Pro') return;
    S.settings.plan = plan; demoSave();
    toast(how === 'demo' ? `Demo: je bekijkt Diafragmo nu als ${esc(plan)}` : `Plan gewijzigd naar ${esc(plan)} (demo – er wordt niets afgeschreven)`);
    renderKeep();
  }
  function upgradeModal(f) {
    const rows = [
      ['Projecten, klantportaal, offertes & facturen met iDEAL | Wero', 1, 1],
      ['Offertes digitaal laten ondertekenen', 1, 1, 1],
      ['Callsheets per opnamedag', 1, 1, 1],
      ['Agenda-koppeling (Outlook & Google Agenda)', 1, 1, 1],
      ['Review met feedback op timecode', 0, 1],
      ['Showreel-site, boekhoudkoppelingen, projectmarge', 0, 1],
      ['Timer voor uren', 0, 1, 1],
      ['Ondertiteling & transcriptie (verwerkt in de EU)', 0, 1, 1],
      ['Opslag', '250 GB', '2 TB']
    ];
    const cell = v => v === 1 ? `<span class="ok">${icon('check')}</span>` : v === 0 ? '<span class="muted">–</span>' : esc(v);
    modal({
      title: f && PRO_INFO[f] ? `${PRO_INFO[f].titel} is onderdeel van Pro` : 'Basis en Pro vergelijken', wide: true,
      body: `${f && PRO_INFO[f] ? `<p class="small muted">${esc(PRO_INFO[f].tekst)}</p>` : ''}
        <div class="table-wrap"><table class="table cmp-table">
          <thead><tr><th>Functie</th><th class="c">Basis<div class="cmp-price">€24<small>/mnd</small></div></th><th class="c pro-col">Pro<div class="cmp-price">€39<small>/mnd</small></div></th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(r[0])}${r[3] ? ' <span class="new-tag">Nieuw</span>' : ''}</td><td class="c">${cell(r[1])}</td><td class="c pro-col">${cell(r[2])}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="tiny muted">Prijzen per maand, excl. btw. Prototype: er wordt niets afgeschreven – de overstap is direct zichtbaar.</p>`,
      actions: [{ label: 'Niet nu', cls: 'ghost', onClick: closeModal }, { label: `${icon('sparkle')} Upgrade naar Pro`, cls: 'primary', onClick: () => { closeModal(); setPlan('Pro'); } }]
    });
  }

  // ---------- Timer voor uren (Pro) ----------
  const ACTS = ['Opname', 'Montage', 'Overleg', 'Reistijd'];
  const ACT_IC = { Opname: 'camera', Montage: 'film', Overleg: 'users', Reistijd: 'pin' };
  const elapsed = () => S.timer ? Math.max(0, (Date.now() - S.timer.start) / 1000) : 0;
  const hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function timerBtnHtml(p, sm) {
    const c = sm ? 'sm' : '';
    if (!isPro()) return `<button class="btn ${c} ghost locked-btn" data-action="upgrade" data-f="timer" title="Beschikbaar in Pro">${icon('clock')} Timer ${proBadge(true)}</button>`;
    if (S.timer && S.timer.pid === p.id) return `<button class="btn ${c} timer-run" data-action="timer-stop" title="Stoppen en uren opslaan"><span class="timer-dot"></span> Stop <span class="mono" data-timer-val>${hms(elapsed())}</span></button>`;
    return `<button class="btn ${c}" data-action="timer-start" data-id="${p.id}">${icon('clock')} Start timer ${proBadge()}</button>`;
  }
  function timerPillHtml() {
    if (!S.timer || !isPro()) return '';
    const p = proj(S.timer.pid); if (!p) return '';
    return `<div class="timer-pill"><button class="tp-main" data-action="go" data-href="#/project/${p.id}/uren" title="Timer loopt voor ${esc(p.titel)} – naar uren"><span class="timer-dot"></span><span class="tp-time mono" data-timer-val>${hms(elapsed())}</span><span class="tp-name">${esc(p.titel)}</span></button><button class="tp-stop" data-action="timer-stop" aria-label="Timer stoppen en uren opslaan" title="Stoppen en uren opslaan"><span class="stop-sq"></span></button></div>`;
  }
  function renderTimerPill() {
    let el = $('#timer-pill');
    if (!el) { const ta = $('.topbar .top-actions'); if (!ta) return; el = document.createElement('div'); el.id = 'timer-pill'; ta.parentNode.insertBefore(el, ta); }
    const h = timerPillHtml(); el.innerHTML = h; el.hidden = !h; document.body.classList.toggle('timer-on', !!h);
  }
  setInterval(() => { if (!S.timer) return; const v = hms(elapsed()); $$('[data-timer-val]').forEach(x => { x.textContent = v; }); }, 1000);
  function timerStart(pid) {
    if (!isPro()) { upgradeModal('timer'); return; }
    const p = proj(pid); if (!p) return;
    if (S.timer && S.timer.pid !== pid) {
      const cur = proj(S.timer.pid);
      modal({ title: 'Er loopt al een timer', body: `<p>De timer loopt nog voor <strong>${esc(cur.titel)}</strong> (${hms(elapsed())}). Stop die eerst en sla de uren op; daarna kun je een nieuwe timer starten.</p>`,
        actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: 'Lopende timer stoppen', cls: 'primary', onClick: timerStopModal }] });
      return;
    }
    if (S.timer) return;
    ensure(p); S.timer = { pid, start: Date.now() }; demoSave();
    toast(`Timer gestart voor “${esc(p.titel)}”`); renderKeep();
  }
  function timerStopModal() {
    const t = S.timer; if (!t) return; const p = proj(t.pid); ensure(p);
    const secs = elapsed(); const uren = Math.max(0.25, Math.ceil(secs / 900) * 0.25);
    const defAct = p.status === 'Opname' ? 'Opname' : (p.status === 'Montage' || p.status === 'Feedback') ? 'Montage' : 'Overleg';
    const st = new Date(t.start);
    modal({
      title: 'Timer stoppen',
      body: `<form id="timer-form" class="form-col">
        <div class="timer-sum"><span class="timer-dot"></span><div class="grow"><div class="strong">${esc(p.titel)}</div><div class="tiny muted">${esc(p.klant)} · gestart ${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')} · gemeten ${hms(secs)}</div></div></div>
        <div><div class="lbl-txt">Activiteit</div><div class="act-chips" role="radiogroup" aria-label="Activiteit">${ACTS.map(a => `<label class="act-chip"><input type="radio" name="act" value="${a}" ${a === defAct ? 'checked' : ''}><span>${icon(ACT_IC[a])} ${a}</span></label>`).join('')}</div></div>
        <label>Omschrijving (optioneel)<input name="omschrijving" placeholder="Bijv. montage v4 – logo langer in beeld" autocomplete="off"></label>
        <div class="form-grid two tight"><label>Datum<input type="date" name="datum" value="${todayIso()}" required></label><label>Uren<input type="number" name="uren" min="0.25" step="0.25" value="${uren}" required></label></div>
        <label>Kilometers (optioneel)<input type="number" name="km" min="0" step="1" placeholder="0"></label>
        <p class="tiny muted">Afgerond op hele kwartieren, aan te passen. Telt mee voor je urencriterium (nu ${num(urenTotaal(), 2)} / ${num(S.urenDoel, 0)} uur).</p>
        <button type="submit" hidden></button></form>`,
      actions: [
        { label: 'Verwerpen', cls: 'ghost', onClick: () => { S.timer = null; demoSave(); closeModal(); toast('Timer verworpen – er is niets opgeslagen'); renderKeep(); } },
        { label: 'Laat lopen', cls: '', onClick: closeModal },
        { label: `${icon('check')} Uren opslaan`, cls: 'primary', onClick: timerSave }
      ]
    });
    $('#timer-form').addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); timerSave(); });
  }
  function timerSave() {
    const f = $('#timer-form'); if (!f || !f.reportValidity() || !S.timer) return;
    const d = Object.fromEntries(new FormData(f).entries()); const pid = S.timer.pid, p = proj(pid);
    const u = Math.round((Number(d.uren) || 0) * 100) / 100; const oms = (d.omschrijving || '').trim();
    const entry = { id: 't' + Date.now(), pid, datum: d.datum, act: d.act, oms, activiteit: d.act + (oms ? ' – ' + oms : ''), uren: u, km: Number(d.km) || 0 };
    S.timerUren.push(entry); S.hours[pid].push({ datum: entry.datum, activiteit: entry.activiteit, uren: u, km: entry.km, tid: entry.id }); addedHours += u;
    S.timer = null; demoSave(); closeModal();
    toast(`${num(u, 2)} uur ${esc(d.act.toLowerCase())} opgeslagen bij “${esc(p.titel)}” · urencriterium nu ${num(urenTotaal(), 2)} / ${num(S.urenDoel, 0)}`);
    renderKeep();
  }
  function timerEditModal(pid, tid) {
    const e = S.timerUren.find(x => x.id === tid), row = (S.hours[pid] || []).find(x => x.tid === tid); if (!e || !row) return;
    modal({
      title: 'Urenregel bewerken',
      body: `<form id="tedit-form" class="form-col">
        <div><div class="lbl-txt">Activiteit</div><div class="act-chips">${ACTS.map(a => `<label class="act-chip"><input type="radio" name="act" value="${a}" ${a === e.act ? 'checked' : ''}><span>${icon(ACT_IC[a])} ${a}</span></label>`).join('')}</div></div>
        <label>Omschrijving<input name="omschrijving" value="${esc(e.oms || '')}" autocomplete="off"></label>
        <div class="form-grid two tight"><label>Datum<input type="date" name="datum" value="${esc(e.datum)}" required></label><label>Uren<input type="number" name="uren" min="0.25" step="0.25" value="${e.uren}" required></label></div>
        <label>Kilometers<input type="number" name="km" min="0" step="1" value="${e.km || 0}"></label><button type="submit" hidden></button></form>`,
      actions: [{ label: 'Verwijderen', cls: 'ghost', onClick: () => {
        addedHours -= Number(e.uren) || 0; S.timerUren = S.timerUren.filter(x => x.id !== tid); S.hours[pid] = S.hours[pid].filter(x => x.tid !== tid); demoSave(); closeModal(); toast('Urenregel verwijderd'); renderKeep();
      } }, { label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: 'Opslaan', cls: 'primary', onClick: () => {
        const f = $('#tedit-form'); if (!f.reportValidity()) return; const d = Object.fromEntries(new FormData(f).entries());
        const u = Math.round((Number(d.uren) || 0) * 100) / 100; addedHours += u - (Number(e.uren) || 0);
        e.act = d.act; e.oms = d.omschrijving.trim(); e.activiteit = e.act + (e.oms ? ' – ' + e.oms : ''); e.datum = d.datum; e.uren = u; e.km = Number(d.km) || 0;
        Object.assign(row, { datum: e.datum, activiteit: e.activiteit, uren: u, km: e.km }); demoSave(); closeModal(); toast('Urenregel bijgewerkt'); renderKeep();
      } }]
    });
    $('#tedit-form').addEventListener('submit', ev => { ev.preventDefault(); ev.stopPropagation(); modalHandlers[2].onClick(); });
  }

  // ---------- Offerte digitaal laten ondertekenen ----------
  const quoteCalc = q => { const sub = q.lines.reduce((a, l) => a + l.aantal * l.prijs, 0); const btw = Math.round(sub * 21) / 100; return { sub, btw, tot: sub + btw, aanb: Math.round((sub + btw) * q.aanbetalingPct) / 100 }; };
  const signLink = pid => location.href.split('#')[0] + '#/klant/' + pid + '/offerte';
  function nextInvNr() { const n = Math.max(0, ...S.invoices.map(i => parseInt(String(i.nr).split('-')[1], 10) || 0)); return 'F2026-' + String(n + 1).padStart(3, '0'); }
  function applySigned(pid) {
    const p = proj(pid), q = S.quotes[pid]; if (!p || !q || !q.signed) return; ensure(p);
    const c = quoteCalc(q), sg = q.signed, d = sg.datum.slice(0, 10);
    q.status = 'Geaccepteerd';
    const f = S.finance[pid]; f.offerte.status = 'Geaccepteerd'; f.offerte.datum = fdateShort(d).replace(/^\S+ /, '');
    if (STATUSES.indexOf(p.status) < STATUSES.indexOf('Pre-productie')) p.status = 'Pre-productie';
    if (!S.invoices.some(i => i.nr === sg.invNr)) S.invoices.push({ nr: sg.invNr, projectId: pid, klant: p.klant, omschrijving: `Aanbetaling ${q.aanbetalingPct}%`, bedrag: c.aanb, vervalt: isoAdd(d, 14), status: 'Concept', auto: true });
    f.aanbetaling = { nr: sg.invNr, bedrag: c.aanb, status: 'Concept', datum: f.offerte.datum };
  }
  function unsign(pid) {
    const q = S.quotes[pid], p = proj(pid); if (!q || !q.signed) return;
    S.invoices = S.invoices.filter(i => i.nr !== q.signed.invNr);
    q.signed = null; q.status = 'Verstuurd';
    const base = D.finance[pid]; if (base) { S.finance[pid].offerte = Object.assign({}, base.offerte); S.finance[pid].aanbetaling = Object.assign({}, base.aanbetaling); }
    const orig = D.projects.find(x => x.id === pid); if (orig) p.status = orig.status;
  }
  function signQuote(pid, naam, img) {
    const q = S.quotes[pid]; if (!q || q.signed) return;
    q.signed = { naam, datum: nowLocal(), img, invNr: nextInvNr() };
    applySigned(pid); S.signOpen = false; demoSave(); renderKeep();
    toast(`Melding voor Sanne: ${esc(naam)} heeft offerte ${esc(q.nr)} ondertekend · project naar Pre-productie · aanbetalingsfactuur ${esc(q.signed.invNr)} (concept) klaargezet`);
  }
  function quoteDocHtml(p, q) {
    const c = quoteCalc(q), sg = q.signed;
    return `<div class="doc quote-doc">
      <div class="doc-top"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${esc(D.studio.email)}<br>KvK ${esc(D.studio.kvk)}<br>Btw ${esc(D.studio.btw)}</div></div></div><div class="doc-title">OFFERTE<div class="tiny muted">${esc(q.nr)}</div></div></div>
      <div class="doc-meta"><div><div class="tiny muted">Aan</div><div class="strong">${esc(q.aan || p.klant)}</div><div class="small">t.a.v. ${esc(q.tav || p.contact)}</div></div><div><div class="tiny muted">Datum</div><div class="small">${fdate(q.datum)}</div><div class="tiny muted">Geldig tot</div><div class="small">${fdate(q.geldig)}</div></div></div>
      <div class="small"><span class="muted">Betreft:</span> ${esc(p.titel)}</div>
      ${q.intro ? `<div class="small">${esc(q.intro)}</div>` : ''}
      <table class="doc-lines"><thead><tr><th>Omschrijving</th><th class="num">Aantal</th><th class="num">Totaal</th></tr></thead>
        <tbody>${q.lines.map(l => `<tr><td>${esc(l.omschrijving)}</td><td class="num">${num(l.aantal, 2)} ${esc(l.eenheid)}</td><td class="num">${eur(l.aantal * l.prijs)}</td></tr>`).join('')}</tbody></table>
      <dl class="sum doc-sum"><dt>Subtotaal</dt><dd>${eur(c.sub)}</dd><dt>Btw 21%</dt><dd>${eur(c.btw)}</dd><dt class="strong">Totaal</dt><dd class="strong">${eur(c.tot)}</dd><dt class="muted">Aanbetaling ${q.aanbetalingPct}% bij akkoord</dt><dd class="muted">${eur(c.aanb)}</dd></dl>
      <div class="doc-terms"><div class="tiny strong">Voorwaarden</div><div class="tiny muted">${esc(q.voorwaarden || '')}</div></div>
      <div class="doc-sign ${sg ? 'signed' : ''}">
        <div class="doc-sign-box">${sg ? `<img src="${esc(sg.img)}" alt="Handtekening van ${esc(sg.naam)}">` : '<span class="tiny muted">Handtekening klant</span>'}</div>
        <div class="tiny">${sg ? `Voor akkoord: <strong>${esc(sg.naam)}</strong><br>Digitaal ondertekend op ${fdt(sg.datum)}` : '<span class="muted">Voor akkoord: nog niet ondertekend</span>'}</div>
        ${sg ? '<span class="doc-stamp">Geaccepteerd</span>' : ''}
      </div>
      <div class="tiny muted doc-foot">Voorbeelddocument – fictieve gegevens</div>
    </div>`;
  }
  function signStatusHtml(q) {
    return q.signed
      ? `<div class="sign-status done">${icon('check')}<span>Ondertekend door <strong>${esc(q.signed.naam)}</strong> op ${fdt(q.signed.datum)}</span></div>`
      : `<div class="sign-status pending">${icon('clock')}<span><strong>Verstuurd</strong> · wacht op handtekening <span class="muted">(sinds ${fdate(q.verstuurd)})</span></span></div>`;
  }
  function quoteSignCard(p) {
    const q = S.quotes[p.id]; if (!q) return '';
    const c = quoteCalc(q), inv = q.signed ? S.invoices.find(i => i.nr === q.signed.invNr) : null;
    return `<section class="card sign-card">
      <div class="card-head"><h2>Offerte ${esc(q.nr)} · digitaal ondertekenen</h2>${statusPillInv(q.status)}</div>
      <div class="sign-card-body">
        <div class="grow">
          ${signStatusHtml(q)}
          <p class="small muted">${eur(c.tot)} incl. btw · aan ${esc(q.tav || p.contact)}. ${q.signed ? `Project staat op <strong>${esc(p.status)}</strong>.` : `Bij ondertekening gaat het project automatisch naar Pre-productie en staat de aanbetalingsfactuur (${q.aanbetalingPct}%) als concept klaar.`}</p>
          ${inv ? `<div class="sign-inv">${icon('euro')}<span class="grow small">Aanbetalingsfactuur <strong>${esc(inv.nr)}</strong> · ${eur(inv.bedrag)} · ${statusPillInv(inv.status)}</span>${inv.status === 'Concept' ? `<button class="btn sm" data-action="send-invoice" data-nr="${esc(inv.nr)}">${icon('send')} Versturen</button>` : ''}</div>` : ''}
          <div class="row gap wrap sign-actions">
            ${q.signed ? '' : `<button class="btn sm primary" data-action="sign-copy" data-id="${p.id}">${icon('link')} Link voor ondertekening kopiëren</button>`}
            <button class="btn sm" data-action="quote-view" data-id="${p.id}">${icon('file')} Bekijk offerte</button>
            <a class="btn sm ghost" href="#/klant/${p.id}/offerte">${icon('eye')} Bekijk als klant</a>
            ${q.signed ? `<button class="btn sm ghost" data-action="sign-reset" data-id="${p.id}">Demo: handtekening resetten</button>` : `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="offerte">${icon('send')} Herinnering sturen</button>`}
          </div>
        </div>
        ${q.signed ? `<div class="sig-paper" title="Handtekening van ${esc(q.signed.naam)}"><img src="${esc(q.signed.img)}" alt="Handtekening van ${esc(q.signed.naam)}"></div>` : ''}
      </div>
    </section>`;
  }
  function portalQuoteCard(p, q) {
    const c = quoteCalc(q);
    return `<section class="pcard span-2 pq-card">
      <h2>${icon('file')} Offerte ${esc(q.nr)} ${q.signed ? statusPillInv('Geaccepteerd') : '<span class="pill inv-verstuurd">Wacht op jouw akkoord</span>'}</h2>
      <p class="small muted">${esc(q.intro || '')}</p>
      <ul class="pq-lines">${q.lines.map(l => `<li><span>${esc(l.omschrijving)}</span><strong>${eur(l.aantal * l.prijs)}</strong></li>`).join('')}</ul>
      <dl class="sum"><dt>Totaal excl. btw</dt><dd>${eur(c.sub)}</dd><dt class="strong">Totaal incl. 21% btw</dt><dd class="strong">${eur(c.tot)}</dd></dl>
      ${q.signed ? `<div class="pq-signed"><div class="sig-paper sm"><img src="${esc(q.signed.img)}" alt="Handtekening van ${esc(q.signed.naam)}"></div><div class="grow small">${icon('check')} Ondertekend door <strong>${esc(q.signed.naam)}</strong> op ${fdt(q.signed.datum)}</div><a class="btn sm" href="#/klant/${p.id}/offerte">Bekijk offerte</a></div>`
        : `<div class="pq-cta"><div class="grow"><div class="strong">Akkoord met de offerte?</div><div class="small muted">Onderteken digitaal – het duurt minder dan een minuut. Geldig tot ${fdate(q.geldig)}.</div></div><a class="btn brand-btn" href="#/klant/${p.id}/offerte">${icon('pen')} Akkoord en ondertekenen</a></div>`}
    </section>`;
  }
  function signPanelHtml(p, q) {
    const c = quoteCalc(q), fn = firstName(q.tav || p.contact);
    if (q.signed) return `<div class="sign-done"><div class="paid-check">${icon('check')}</div><h2>Offerte ondertekend</h2>
      <p class="small muted">Bedankt, ${esc(firstName(q.signed.naam))}! ${esc(D.studio.eigenaar)} heeft automatisch bericht gekregen. Je ontvangt de aanbetalingsfactuur van ${q.aanbetalingPct}% (${eur(c.aanb)}) per e-mail.</p>
      <div class="sig-paper"><img src="${esc(q.signed.img)}" alt="Handtekening van ${esc(q.signed.naam)}"></div>
      <div class="tiny muted">Ondertekend door ${esc(q.signed.naam)} · ${fdt(q.signed.datum)}</div>
      <a class="btn brand-btn block" href="#/klant/${p.id}">Terug naar je project</a>
      <button class="btn ghost block sm" data-action="download" data-name="${esc(q.nr)}-ondertekend.pdf">${icon('download')} Ondertekende offerte (PDF)</button></div>`;
    if (!S.signOpen) return `<h2>${icon('file')} Jouw offerte</h2>
      <div class="invoice-mini"><div class="small muted">${esc(q.nr)} · ${esc(p.titel)}</div><div class="amount">${eur(c.tot)}</div><div class="small muted">incl. 21% btw · geldig tot ${fdate(q.geldig)}</div></div>
      <p class="small muted">Hoi ${esc(fn)}, lees de offerte rustig door. Akkoord? Dan onderteken je hier digitaal met je naam en handtekening.</p>
      <button class="btn brand-btn block" data-action="sign-open">${icon('pen')} Akkoord en ondertekenen</button>
      <button class="btn ghost block sm" data-action="download" data-name="${esc(q.nr)}.pdf">${icon('download')} Offerte als PDF</button>`;
    return `<h2>${icon('pen')} Akkoord en ondertekenen</h2>
      <form id="sign-form" class="sign-form" data-form="sign-quote" data-id="${p.id}" novalidate>
        <label>Je volledige naam<input name="naam" id="sign-name" required autocomplete="name" placeholder="Bijv. ${esc(q.tav || p.contact)}"></label>
        <div><div class="lbl-txt">Je handtekening</div>
          <div class="sig-pad" id="sig-pad"><canvas id="sig-canvas" aria-label="Teken hier je handtekening" role="img"></canvas><span class="sig-hint">Teken hier met je muis, vinger of pen</span><span class="sig-line"></span></div>
          <div class="row-between sig-tools"><span class="tiny muted">Alleen gebruikt voor deze offerte.</span><button type="button" class="btn sm ghost" data-action="sig-clear">Wissen</button></div></div>
        <label class="check"><input type="checkbox" name="akkoord" id="sign-akkoord"> Ik ga akkoord met de voorwaarden</label>
        <button class="btn brand-btn block" type="submit" id="sign-submit" disabled>Ondertekenen</button>
        <p class="tiny muted">Je naam, handtekening, datum en tijd worden bij de offerte opgeslagen, in de EU. Demo: er wordt niets echt verstuurd.</p>
      </form>`;
  }
  function viewPortalQuote(p) {
    const q = S.quotes[p.id];
    if (!q) return `${portalBar(p, 'Klantweergave – offerte')}<div class="portal"><div class="empty card">${icon('file')}<p>Voor dit project staat geen offerte klaar om te ondertekenen.</p><a class="btn" href="#/klant/${p.id}">Naar het project</a></div></div>`;
    return `${portalBar(p, `Je bekijkt de offerte zoals <strong>${esc(q.tav || p.contact)}</strong> die ziet`, '#/project/' + p.id + '/financien')}
    <div class="portal" style="--brand:${S.showreel.kleur}">
      <header class="portal-head"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">Videoproductie · Zwolle</div></div></div><a class="btn sm ghost" href="#/klant/${p.id}">${icon('arrowLeft')} <span class="hide-sm">Naar je project</span></a></header>
      <div class="pq-head"><div class="small muted">Offerte ${esc(q.nr)}</div><h1>${esc(p.titel)}</h1></div>
      <div class="pq-wrap">
        <div class="doc-preview pq-doc">${quoteDocHtml(p, q)}</div>
        <aside class="pcard pq-sign" id="sign-panel">${signPanelHtml(p, q)}</aside>
      </div>
      <div class="eu-trust"><span class="eu-trust-badge">${euBadge('eu-flag')}${icon('lock')} Veilig ondertekenen · gehost in de EU</span></div>
      <footer class="portal-foot">Klantportaal van ${esc(D.studio.naam)} · aangedreven door <span class="pf-brand"><img class="pf-mark" src="img/beeldmerk.svg" alt=""><strong>Diafragmo</strong></span> · Prototype – voorbeelddata</footer>
    </div>`;
  }
  function updateSignBtn() {
    const b = $('#sign-submit'); if (!b) return;
    const n = $('#sign-name'), a = $('#sign-akkoord');
    b.disabled = !(n && n.value.trim().length >= 2 && S.sigInk && a && a.checked);
  }
  function initSigPad() {
    const c = $('#sig-canvas'), pad = $('#sig-pad'); if (!c || !pad) return;
    const ctx = c.getContext('2d'); let drawing = false, last = null, w = 0;
    S.sigInk = false;
    const setup = () => {
      const r = c.getBoundingClientRect(); if (!r.width || Math.round(r.width) === w) return; w = Math.round(r.width);
      const dpr = window.devicePixelRatio || 1; c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = '#1b2a4a'; ctx.fillStyle = '#1b2a4a';
      S.sigInk = false; pad.classList.remove('inked'); updateSignBtn();
    };
    setup();
    const pos = e => { const r = c.getBoundingClientRect(); const pt = e.touches ? e.touches[0] : e; return { x: pt.clientX - r.left, y: pt.clientY - r.top }; };
    const start = e => { e.preventDefault(); drawing = true; last = pos(e); ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, Math.PI * 2); ctx.fill(); if (!S.sigInk) { S.sigInk = true; pad.classList.add('inked'); updateSignBtn(); } };
    const move = e => { if (!drawing) return; e.preventDefault(); const pt = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(pt.x, pt.y); ctx.stroke(); last = pt; };
    const end = () => { drawing = false; };
    if (window.PointerEvent) {
      c.addEventListener('pointerdown', e => { try { c.setPointerCapture(e.pointerId); } catch (er) { /* noop */ } start(e); });
      c.addEventListener('pointermove', move); c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    } else {
      c.addEventListener('mousedown', start); c.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
      c.addEventListener('touchstart', start, { passive: false }); c.addEventListener('touchmove', move, { passive: false }); c.addEventListener('touchend', end);
    }
    const onResize = () => setup(); window.addEventListener('resize', onResize); cleanupFns.push(() => window.removeEventListener('resize', onResize));
    S.sigClear = () => { ctx.clearRect(0, 0, c.width, c.height); S.sigInk = false; pad.classList.remove('inked'); updateSignBtn(); };
  }
  function copyText(txt, msg) {
    const fallback = () => { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* noop */ } t.remove(); };
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(() => toast(msg), () => { fallback(); toast(msg); }); return; } } catch (e) { /* noop */ }
    fallback(); toast(msg);
  }

  // ---------- Callsheet / draaiboek per opnamedag ----------
  function csFromDay(p, d) {
    const m = String(d.tijd || '').match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    const start = m ? m[1].padStart(5, '0') : '09:00', eind = m ? m[2].padStart(5, '0') : '17:00';
    const loc = (S.planning[p.id].locaties || [])[0] || {};
    const fl = (S.finance[p.id] || { freelancers: [] }).freelancers;
    const first = S.planning[p.id].draaidagen.indexOf(d) === 0;
    return {
      titel: d.titel || 'Opnamedag', datum: d.datum, calltime: start, eind,
      locatie: { naam: loc.naam || '', adres: d.locatie || loc.adres || '', parkeren: loc.notitie || '' },
      blokken: p.id === 'p1' && first ? D.draaiboek.map(x => ({ tijd: x.tijd, wat: x.item })) : [{ tijd: start, wat: 'Call time crew · opbouw' }, { tijd: '12:30', wat: 'Lunch' }, { tijd: eind, wat: 'Afbouw en wrap' }],
      crew: [{ naam: 'Sanne de Vries', rol: 'Regie & camera', tel: '06 0000 0001', freelancer: false }].concat(fl.map((f, i) => ({ naam: f.naam, rol: f.rol, tel: '06 0000 00' + String(12 + i * 11).padStart(2, '0'), freelancer: true }))),
      klant: { naam: p.contact, rol: p.klant, tel: '06 0000 0090', email: clientEmail(p) },
      notities: ''
    };
  }
  function csList(p) {
    if (!S.callsheets[p.id]) S.callsheets[p.id] = (S.planning[p.id].draaidagen || []).map(d => csFromDay(p, d));
    return S.callsheets[p.id];
  }
  const csIn = (path, val, attrs, cls) => `<input class="cs-in ${cls || ''}" data-cs="${path}" value="${esc(val)}" ${attrs || ''}>`;
  function weatherHtml(cs) {
    const days = cs.datum ? Math.round((pd(cs.datum) - pd(todayIso())) / 864e5) : null;
    const sub = days == null ? 'Kies eerst een opnamedatum.' : days > 5 ? `Beschikbaar vanaf ${fdateShort(isoAdd(cs.datum, -5))}, voor ${esc(cs.locatie.naam || 'de locatie')}.` : days < 0 ? 'Deze opnamedag is al geweest.' : 'In dit prototype wordt geen echte verwachting opgehaald.';
    return `<div class="cs-weather"><span class="cs-w-ic">${icon('cloud')}</span><div><div class="strong">Weersverwachting verschijnt 5 dagen vooraf</div><div class="small muted">${sub}</div></div></div>`;
  }
  function tabCallsheet(p) {
    const list = csList(p);
    if (!list.length) return `<section class="card"><div class="empty">${icon('calendar')}<p>Nog geen opnamedag voor dit project. Maak een callsheet met locatie, call time, crew en shotlist.</p><button class="btn primary" data-action="cs-add" data-id="${p.id}">${icon('plus')} Callsheet aanmaken</button></div></section>`;
    const i = Math.min(S.csSel[p.id] || 0, list.length - 1), cs = list[i], sl = S.shotlist[p.id] || [], done = sl.filter(s => s.klaar).length;
    const prov = calProvider();
    return `<div class="callsheet" data-pid="${p.id}" data-i="${i}">
      <div class="cs-toolbar">
        <div class="seg sm cs-days" role="group" aria-label="Opnamedag">${list.map((c, k) => `<button class="${k === i ? 'active' : ''}" data-action="cs-day" data-id="${p.id}" data-i="${k}">Dag ${k + 1}<span class="hide-sm"> · ${c.datum ? fdateShort(c.datum) : '–'}</span></button>`).join('')}<button data-action="cs-add" data-id="${p.id}" title="Opnamedag toevoegen" aria-label="Opnamedag toevoegen">${icon('plus')}</button></div>
        <div class="row gap wrap cs-actions">${cs.gedeeld ? `<span class="tiny muted">Gedeeld ${esc(cs.gedeeld)}</span>` : ''}<button class="btn sm" data-action="cs-share" data-id="${p.id}">${icon('send')} Delen met crew & klant</button><button class="btn sm" data-action="cs-print">${icon('download')} PDF downloaden</button></div>
      </div>
      <section class="card cs-head">
        <div class="cs-title-row"><span class="doc-type">Callsheet</span><span class="small muted">${esc(p.titel)} · ${esc(p.klant)}</span></div>
        ${csIn('titel', cs.titel, 'aria-label="Titel opnamedag"', 'cs-title')}
        <div class="cs-meta">
          <label class="cs-f">Opnamedatum<input type="date" class="cs-in" data-cs="datum" data-cal-date data-cal-skip="${p.id}" value="${esc(cs.datum)}"><span class="cs-print-only strong">${cs.datum ? `${DAYS[pd(cs.datum).getDay()]} ${fdate(cs.datum)}` : '–'}</span>${calHintHtml(cs.datum, p.id)}</label>
          <label class="cs-f">Call time<input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="uu:mm" class="cs-in cs-big" data-cs="calltime" value="${esc(cs.calltime)}"></label>
          <label class="cs-f">Wrap<input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="uu:mm" class="cs-in" data-cs="eind" value="${esc(cs.eind)}"></label>
          <div class="cs-f cs-sync">${prov && S.agenda.autoZet ? `<span class="cal-tag">${icon('calendar')} In je ${esc(CAL[prov].label)}</span>` : `<a class="tiny link" href="#/instellingen/agenda">${icon('calendar')} Agenda koppelen</a>`}</div>
        </div>
      </section>
      <div class="cs-grid">
        <section class="card">
          <div class="card-head"><h2>${icon('pin')} Locatie</h2><button class="btn sm ghost cs-noprint" data-action="route">Route</button></div>
          <label class="cs-f">Naam${csIn('locatie.naam', cs.locatie.naam, 'placeholder="Bijv. Werkplaats"')}</label>
          <label class="cs-f">Adres${csIn('locatie.adres', cs.locatie.adres, 'placeholder="Straat, plaats"')}</label>
          <label class="cs-f">Parkeren & laden/lossen<textarea class="cs-in" data-cs="locatie.parkeren" rows="3" placeholder="Waar kan de crew parkeren?">${esc(cs.locatie.parkeren)}</textarea></label>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('cloud')} Weer</h2></div>
          ${weatherHtml(cs)}
          <div class="card-head mt"><h2>${icon('users')} Contactpersoon klant</h2></div>
          <div class="cs-contact">
            <label class="cs-f">Naam${csIn('klant.naam', cs.klant.naam)}</label>
            <label class="cs-f">Telefoon${csIn('klant.tel', cs.klant.tel, 'type="tel"')}</label>
            <label class="cs-f full">E-mail${csIn('klant.email', cs.klant.email, 'type="email"')}</label>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('clock')} Tijdsplanning</h2><button class="btn sm cs-noprint" data-action="cs-add-blok">${icon('plus')} Blok</button></div>
          <ol class="cs-blocks">${cs.blokken.map((b, k) => `<li><input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="uu:mm" class="cs-in cs-time" data-cs="blokken.${k}.tijd" value="${esc(b.tijd)}" aria-label="Tijd"><input class="cs-in" data-cs="blokken.${k}.wat" value="${esc(b.wat)}" aria-label="Onderdeel" placeholder="Wat gebeurt er?"><button class="icon-btn cs-noprint" data-action="cs-del" data-list="blokken" data-k="${k}" aria-label="Blok verwijderen">${icon('x')}</button></li>`).join('') || '<li class="muted small">Nog geen blokken.</li>'}</ol>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('users')} Crew</h2><button class="btn sm cs-noprint" data-action="cs-add-crew">${icon('plus')} Crewlid</button></div>
          <ul class="cs-crew">${cs.crew.map((c, k) => `<li>
            <div class="cs-crew-main">${csIn(`crew.${k}.naam`, c.naam, 'aria-label="Naam" placeholder="Naam"', 'strong')}${csIn(`crew.${k}.rol`, c.rol, 'aria-label="Rol" placeholder="Rol"')}</div>
            <div class="cs-crew-side"><span class="cs-tel">${icon('phone')}${csIn(`crew.${k}.tel`, c.tel, 'type="tel" aria-label="Telefoon" placeholder="06 …"')}</span>
            <button class="tag cs-fl ${c.freelancer ? 'on' : ''}" data-action="cs-fl" data-k="${k}" title="Wissel tussen eigen crew en ingehuurde freelancer">${c.freelancer ? 'Freelancer' : 'Eigen'}</button>
            <button class="icon-btn cs-noprint" data-action="cs-del" data-list="crew" data-k="${k}" aria-label="Crewlid verwijderen">${icon('x')}</button></div></li>`).join('')}</ul>
          <p class="tiny muted">${cs.crew.filter(c => c.freelancer).length} ingehuurde freelancer(s) · kosten staan bij Financiën.</p>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('camera')} Shotlist</h2><span class="small muted">${done}/${sl.length} klaar</span></div>
          <div class="progress"><div style="width:${sl.length ? done / sl.length * 100 : 0}%"></div></div>
          <ul class="cs-shots">${sl.map((s, k) => `<li class="${s.klaar ? 'done' : ''}"><label><input type="checkbox" data-action="toggle-shot" data-id="${p.id}" data-i="${k}" ${s.klaar ? 'checked' : ''}><span class="grow">${esc(s.shot)}</span><span class="tag">${esc(s.type)}</span></label></li>`).join('') || '<li class="muted small">Nog geen shots – voeg ze toe bij Shotlist & draaiboek.</li>'}</ul>
          <a class="tiny link cs-noprint" href="#/project/${p.id}/shotlist">Shotlist bewerken →</a>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('file')} Notities</h2></div>
          <textarea class="cs-in cs-notes" data-cs="notities" rows="5" placeholder="Bijv. dresscode, stroom, back-upplan bij regen…">${esc(cs.notities)}</textarea>
        </section>
      </div>
      <p class="tiny muted cs-noprint">Klik op een veld om het te wijzigen – alles wordt automatisch bewaard (op dit apparaat, demo).</p>
    </div>`;
  }
  function csCur() { const el = $('.callsheet'); if (!el) return null; const l = S.callsheets[el.dataset.pid]; return l ? { pid: el.dataset.pid, i: Number(el.dataset.i), cs: l[Number(el.dataset.i)] } : null; }
  function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) { t = t[k[i]]; if (t == null) return; } t[k[k.length - 1]] = v; }
  function csShare(pid) {
    const c = csCur(); if (!c) return; const p = proj(pid), cs = c.cs;
    const recips = cs.crew.filter(x => x.naam).map(x => ({ naam: x.naam, sub: x.rol + (x.tel ? ' · ' + x.tel : '') })).concat(cs.klant.naam ? [{ naam: cs.klant.naam, sub: 'Klant · ' + (cs.klant.email || cs.klant.tel) }] : []);
    modal({
      title: 'Callsheet delen met crew & klant',
      body: `<p class="small muted">Iedereen met de link ziet altijd de actuele callsheet – ook op de telefoon, zonder account.</p>
        <div class="copy-field"><input readonly value="https://callsheet.diafragmo.voorbeeld/${esc(pid)}-${esc(cs.datum || 'dag')}-7h2q" aria-label="Link naar callsheet"><button class="btn sm" data-action="copy-link">Kopieer</button></div>
        <div class="lbl-txt">Versturen naar</div>
        <ul class="cs-recips">${recips.map((r, k) => `<li><label class="check"><input type="checkbox" checked data-recip="${k}"><span><strong>${esc(r.naam)}</strong><span class="tiny muted"> · ${esc(r.sub)}</span></span></label></li>`).join('')}</ul>
        <p class="tiny muted">Demo: er wordt niets echt verstuurd.</p>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: `${icon('send')} Versturen`, cls: 'primary', onClick: () => {
        const n = $$('#modal-root [data-recip]').filter(x => x.checked).length; if (!n) { toast('Kies minimaal één ontvanger'); return; }
        cs.gedeeld = nowLabel(); demoSave(); closeModal(); toast(`Callsheet “${esc(cs.titel)}” gedeeld met ${n} ${n === 1 ? 'persoon' : 'personen'} (demo)`); renderKeep();
      } }]
    });
  }

  // ---------- Agenda-koppeling (Outlook / Google Agenda, gesimuleerd) ----------
  const CAL = {
    microsoft: { label: 'Outlook-agenda', full: 'Outlook-agenda', sub: 'Microsoft 365, Outlook.com en Exchange', bedrijf: 'Microsoft' },
    google: { label: 'Google Agenda', full: 'Google Agenda', sub: 'Google Agenda en Google Workspace', bedrijf: 'Google' }
  };
  const CAL_LOGO = {
    microsoft: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="3" fill="#0a64c8"/><path d="M3 9a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v3H3z" fill="#28a8ea"/><g fill="#fff"><rect x="7.5" y="15" width="4" height="3.2" rx=".7"/><rect x="14" y="15" width="4" height="3.2" rx=".7"/><rect x="20.5" y="15" width="4" height="3.2" rx=".7"/><rect x="7.5" y="21" width="4" height="3.2" rx=".7"/><rect x="14" y="21" width="4" height="3.2" rx=".7"/></g><rect x="9" y="3" width="2.6" height="6" rx="1.3" fill="#0a3f80"/><rect x="20.4" y="3" width="2.6" height="6" rx="1.3" fill="#0a3f80"/></svg>',
    google: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="4" fill="#fff"/><path d="M8 4h16a4 4 0 0 1 4 4v3H4V8a4 4 0 0 1 4-4z" fill="#4285f4"/><path d="M28 11v13a4 4 0 0 1-4 4h-2V11z" fill="#fbbc04"/><path d="M4 24V11h3v17a4 4 0 0 1-3-4z" fill="#34a853"/><path d="M7 28h15v-3H7z" fill="#34a853"/><text x="15" y="23.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="700" fill="#1a73e8">31</text></svg>'
  };
  // Agenda volgt de gecombineerde koppeling: alleen een gekoppeld account met Agenda aan telt
  const calProvider = () => ACC_KEYS.find(agendaOn) || null;
  function calBusy(iso, skipPid) {
    const r = [];
    if (!iso) return r;
    D.agendaDemo.forEach(a => { if (a.datum === iso) r.push(a.titel + (a.tijd ? ' (' + a.tijd + ')' : '')); });
    S.projects.forEach(p => { const pl = S.planning[p.id]; if (!pl || p.id === skipPid) return; pl.draaidagen.forEach(d => { if (d.datum === iso) r.push((d.titel.split(' – ')[0]) + ' – ' + p.klant); }); });
    return r;
  }
  function calHintHtml(iso, skipPid) {
    const k = calProvider(); if (!k || !S.agenda.checkBeschikbaar) return '<span data-cal-hint hidden></span>';
    if (!iso) return `<span class="cal-hint" data-cal-hint>${icon('calendar')} Kies een datum om je agenda te checken</span>`;
    const b = calBusy(iso, skipPid);
    return `<span class="cal-hint ${b.length ? 'busy' : 'free'}" data-cal-hint title="${esc(b.join(' · '))}"><i></i>Je agenda: <strong>${b.length ? 'bezet' : 'vrij'}</strong> op ${fdateShort(iso)}${b.length ? ' · ' + esc(b[0]) : ''} <em>(demo)</em></span>`;
  }
  function weekItems(from, to) {
    const items = [];
    S.projects.forEach(p => {
      ensure(p);
      S.planning[p.id].draaidagen.forEach(d => { if (d.datum >= from && d.datum <= to) items.push({ datum: d.datum, kind: 'shoot', titel: d.titel.split(' – ')[0], sub: p.klant, tijd: d.tijd, href: `#/project/${p.id}/callsheet`, pid: p.id }); });
      if (p.status !== 'Opgeleverd' && p.deadline >= from && p.deadline <= to) items.push({ datum: p.deadline, kind: 'deadline', titel: 'Deadline ' + p.titel, sub: p.klant, href: `#/project/${p.id}/planning`, pid: p.id });
    });
    D.mijlpalen.forEach(m => { const p = proj(m.projectId); if (p && m.datum >= from && m.datum <= to) items.push({ datum: m.datum, kind: 'deadline', titel: m.titel, sub: p.klant, href: `#/project/${p.id}/planning`, pid: p.id }); });
    if (calProvider()) D.agendaDemo.forEach(a => { if (a.datum >= from && a.datum <= to) items.push({ datum: a.datum, kind: 'busy', titel: 'Bezet', sub: 'uit je agenda', tijd: a.tijd }); });
    const order = { shoot: 0, deadline: 1, busy: 2 };
    return items.sort((a, b) => a.datum.localeCompare(b.datum) || order[a.kind] - order[b.kind]);
  }
  function weekCardHtml() {
    const t = todayIso(), end = isoAdd(t, 6), items = weekItems(t, end), k = calProvider();
    const days = []; for (let i = 0; i < 7; i++) days.push(isoAdd(t, i));
    const ic = { shoot: 'camera', deadline: 'clock', busy: 'lock' };
    const synced = k && S.agenda.autoZet;
    return `<section class="card week-card">
      <div class="card-head"><h2 class="wk-title">${icon('calendar')} Deze week <span class="small muted">${fdateShort(t)} – ${fdateShort(end)}</span></h2>
        ${k ? `<span class="send-pill">${CAL_LOGO[k]} <span class="hide-sm">Gesynchroniseerd met </span>${esc(CAL[k].label)}</span>` : `<a class="btn sm" href="#/instellingen/agenda">${icon('calendar')} Koppel je agenda</a>`}</div>
      <div class="week">${days.map(d => { const its = items.filter(x => x.datum === d); return `<div class="wk-day ${d === t ? 'today' : ''} ${its.length ? '' : 'empty'}">
        <div class="wk-head"><span>${d === t ? 'vandaag' : DAYS[pd(d).getDay()]}</span><strong>${pd(d).getDate()}</strong><small>${MONTHS[pd(d).getMonth()]}</small></div>
        <div class="wk-items">${its.map(x => x.href ? `<button class="wk-item ${x.kind}" data-action="go" data-href="${x.href}" title="${esc(x.titel)} · ${esc(x.sub)}"><span class="wk-ic">${icon(ic[x.kind])}</span><span class="wk-txt"><span class="wk-t">${esc(x.titel)}</span><span class="wk-s">${esc(x.sub)}${x.tijd ? ' · ' + esc(x.tijd) : ''}</span></span>${synced ? `<span class="wk-cal" title="Staat in je agenda">${icon('calendar')}</span>` : ''}</button>`
          : `<div class="wk-item busy"><span class="wk-ic">${icon(ic[x.kind])}</span><span class="wk-txt"><span class="wk-t">${esc(x.titel)}</span><span class="wk-s">${esc(x.sub)}${x.tijd ? ' · ' + esc(x.tijd) : ''}</span></span></div>`).join('') || '<span class="wk-none">–</span>'}</div></div>`; }).join('')}</div>
      <div class="wk-legend tiny muted"><span><i class="wk-dot shoot"></i>Opnamedag</span><span><i class="wk-dot deadline"></i>Deadline</span>${k ? '<span><i class="wk-dot busy"></i>Bezet in je agenda</span>' : '<span>Koppel je agenda om ook je eigen afspraken als vrij/bezet te zien.</span>'}</div>
    </section>`;
  }

  // ---------- Ondertiteling & transcriptie (Pro, verwerkt in de EU) ----------
  const LANG = { nl: 'Nederlands', en: 'Engels' };
  function transcriptFor(p, lang) {
    const t = D.transcripts[p.id] && D.transcripts[p.id][lang];
    if (t) return JSON.parse(JSON.stringify(t));
    const v = firstName(p.contact);
    return lang === 'en' ? [
      { s: 0.0, e: 2.2, t: `Welcome to ${p.klant}.` }, { s: 2.2, e: 4.6, t: `${v}: “We love what we do, every single day.”` },
      { s: 4.6, e: 7.0, t: 'Craftsmanship is all in the small details.' }, { s: 7.0, e: 10.0, t: `${p.titel} – made by ${D.studio.naam}.` }
    ] : [
      { s: 0.0, e: 2.2, t: `Welkom bij ${p.klant}.` }, { s: 2.2, e: 4.6, t: `${v}: “Wij doen dit werk elke dag met plezier.”` },
      { s: 4.6, e: 7.0, t: 'Vakmanschap zit in de kleine details.' }, { s: 7.0, e: 10.0, t: `${p.titel} – gemaakt door ${D.studio.naam}.` }
    ];
  }
  const srtTime = s => { const ms = Math.round(s * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  const toSrt = segs => segs.map((g, i) => `${i + 1}\r\n${srtTime(g.s)} --> ${srtTime(g.e)}\r\n${String(g.t).trim()}\r\n`).join('\r\n');
  const segT = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  function downloadText(name, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function subsPanelHtml(p, v) {
    const key = p.id + ':' + v, s = S.subs[key], job = S.subsJob && S.subsJob.key === key ? S.subsJob : null;
    const head = `<div class="subs-head"><h2>${icon('msg')} Ondertitels & transcriptie ${proBadge(!isPro())}</h2><span class="eu-mini">${euBadge('eu-flag')} Verwerkt in de EU</span></div>`;
    if (!isPro()) return `<section class="subs-panel" id="subs-panel">${head}${lockedHtml('subs')}</section>`;
    if (job) return `<section class="subs-panel" id="subs-panel">${head}<div class="subs-job"><div class="row-between"><span class="strong small" id="subs-step">${esc(job.step)}</span><span class="small muted mono" id="subs-pct">${Math.round(job.pct)}%</span></div><div class="progress"><div id="subs-bar" style="width:${job.pct}%"></div></div><p class="tiny muted">${LANG[job.lang]} · spraakherkenning op Europese servers – je beelden verlaten de EU niet.</p></div></section>`;
    if (!s) return `<section class="subs-panel" id="subs-panel">${head}<p class="small muted">Laat automatisch een transcript met tijdcodes maken. Controleer de tekst, bekijk de ondertitels in de speler en download een .srt-bestand of brand ze in voor social media.</p><button class="btn primary" data-action="subs-start" data-id="${p.id}" data-v="${v}">${icon('sparkle')} Ondertitels maken</button></section>`;
    return `<section class="subs-panel" id="subs-panel">${head}
      <div class="subs-bar"><div class="row gap wrap"><span class="tag">${LANG[s.lang]}</span><span class="small muted">${s.segs.length} regels · klik op de tekst om te verbeteren</span></div>
        <label class="check cc-toggle"><input type="checkbox" data-subs-show ${S.subsShow ? 'checked' : ''}> Tonen in speler</label></div>
      <ol class="subs-list">${s.segs.map((g, i) => `<li class="sub-seg" data-s="${g.s}" data-e="${g.e}"><button class="tc" data-action="seek" data-t="${g.s + 0.05}" title="Spring naar ${segT(g.s)}">${segT(g.s)} → ${segT(g.e)}</button><textarea class="sub-txt" rows="2" data-sub-i="${i}" data-key="${key}" aria-label="Ondertitel ${i + 1}">${esc(g.t)}</textarea></li>`).join('')}</ol>
      <div class="row gap wrap subs-actions"><button class="btn sm primary" data-action="subs-srt" data-key="${key}">${icon('download')} Download .srt</button><button class="btn sm" data-action="subs-burn" data-key="${key}">${icon('film')} Inbranden voor social (demo)</button><button class="btn sm ghost" data-action="subs-start" data-id="${p.id}" data-v="${v}">Opnieuw / andere taal</button></div>
    </section>`;
  }
  function subOverlay(t) {
    const el = $('#sub-overlay'); if (!el) return;
    const s = Player.subKey && S.subs[Player.subKey];
    const g = s && isPro() && S.subsShow ? s.segs.find(x => t >= x.s && t < x.e) : null;
    if (g) { if (el.textContent !== g.t) el.textContent = g.t; el.hidden = false; } else el.hidden = true;
    $$('.sub-seg').forEach(li => li.classList.toggle('now', !!g && Number(li.dataset.s) === g.s));
  }
  function subsStartModal(pid, v) {
    if (!isPro()) { upgradeModal('subs'); return; }
    const p = proj(pid), key = pid + ':' + v, cur = S.subs[key];
    modal({
      title: 'Ondertitels maken',
      body: `<div class="form-col">
        <p class="small muted">${esc(p.titel)} · versie ${esc(v)}</p>
        <div><div class="lbl-txt">Gesproken taal</div><div class="act-chips">${Object.keys(LANG).map(k => `<label class="act-chip"><input type="radio" name="sublang" value="${k}" ${(cur ? cur.lang !== k : k === 'nl') ? 'checked' : ''}><span>${LANG[k]}</span></label>`).join('')}</div></div>
        <div class="about-eu">${euBadge('eu-flag')}<span><strong>Verwerkt in de EU</strong> – spraakherkenning draait op Europese servers, net als de rest van je soevereine EU-hosting. Je beelden worden niet gebruikt om AI-modellen te trainen.</span></div>
        ${cur ? '<p class="tiny muted">Let op: het huidige transcript wordt vervangen.</p>' : ''}
        <p class="tiny muted">Demo: het transcript is fictieve voorbeeldtekst; er wordt niets geüpload.</p></div>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: `${icon('sparkle')} Start`, cls: 'primary', onClick: () => {
        const r = $('#modal-root input[name="sublang"]:checked'); const lang = r ? r.value : 'nl';
        closeModal(); subsRun(p, v, lang);
      } }]
    });
  }
  function subsRun(p, v, lang) {
    const key = p.id + ':' + v;
    S.subsJob = { key, lang, pct: 0, step: 'Audio uploaden naar EU-server…' }; renderKeep();
    const iv = setInterval(() => {
      const j = S.subsJob; if (!j || j.key !== key) { clearInterval(iv); return; }
      j.pct = Math.min(100, j.pct + 4 + Math.random() * 7);
      j.step = j.pct < 22 ? 'Audio uploaden naar EU-server…' : j.pct < 72 ? `Spraak herkennen (${LANG[lang]})…` : j.pct < 100 ? 'Tijdcodes uitlijnen en regels opdelen…' : 'Klaar';
      const b = $('#subs-bar'), pc = $('#subs-pct'), st = $('#subs-step');
      if (b) b.style.width = j.pct + '%'; if (pc) pc.textContent = Math.round(j.pct) + '%'; if (st) st.textContent = j.step;
      if (j.pct >= 100) {
        clearInterval(iv); S.subsJob = null; S.subsShow = true;
        S.subs[key] = { lang, segs: transcriptFor(p, lang), gemaakt: nowLabel() }; demoSave();
        toast(`Ondertitels (${LANG[lang]}) klaar – controleer de tekst en speel de video af`); renderKeep();
      }
    }, 260);
    cleanupFns.push(() => { clearInterval(iv); if (S.subsJob && S.subsJob.key === key) S.subsJob = null; });
  }
  function subsBurnModal(key) {
    const s = S.subs[key]; if (!s) return; const [pid, v] = key.split(':'); const p = proj(pid);
    const g = s.segs[1] || s.segs[0];
    const fmts = [['9x16', '9:16', 'Reels, TikTok, Shorts'], ['1x1', '1:1', 'Feed-post'], ['16x9', '16:9', 'YouTube, LinkedIn']];
    modal({
      title: 'Inbranden voor social (demo)',
      body: `<div class="form-col">
        <div class="burn-grid"><div><div class="lbl-txt">Formaat</div><div class="act-chips col">${fmts.map((f, i) => `<label class="act-chip"><input type="radio" name="burnfmt" value="${f[0]}" ${i === 0 ? 'checked' : ''}><span><strong>${f[1]}</strong> <span class="tiny muted">${f[2]}</span></span></label>`).join('')}</div>
          <div class="lbl-txt mt-s">Stijl</div><div class="act-chips">${['Wit met schaduw', 'Geel', 'Zwarte balk'].map((x, i) => `<label class="act-chip"><input type="radio" name="burnstyle" value="${i}" ${i === 0 ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
          <div class="burn-prev-wrap"><div class="burn-prev r9x16 s0" id="burn-prev" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><span class="burn-sub">${esc(g.t)}</span></div></div></div>
        <div id="burn-progress"></div>
        <p class="tiny muted">Demo: er wordt geen echt videobestand gemaakt. Verwerkt in de EU.</p></div>`,
      actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: `${icon('film')} Exporteren`, cls: 'primary', onClick: () => {
        const fmt = ($('#modal-root input[name="burnfmt"]:checked') || {}).value || '9x16';
        const box = $('#burn-progress'); if (!box || box.dataset.busy) return; box.dataset.busy = '1';
        $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
        box.innerHTML = `<div class="small strong">Exporteren met ingebrande ondertitels…</div><div class="progress"><div id="burn-bar" style="width:0%"></div></div>`;
        let pct = 0; const iv = setInterval(() => {
          pct += 14; const b = $('#burn-bar'); if (b) b.style.width = Math.min(100, pct) + '%';
          if (pct >= 100) { clearInterval(iv); closeModal(); toast(`Klaar: ${esc(slug(p.titel))}_${esc(v)}_${fmt}_ondertiteld.mp4 staat bij Bestanden → Exports (demo)`); }
        }, 200);
        cleanupFns.push(() => clearInterval(iv));
      } }]
    });
  }

  // ---------- Acties ----------
  function newProject(data) {
    const id = 'n' + (Date.now() % 1000000);
    const grads = [['#ff9a5a', '#c2410c'], ['#60a5fa', '#1e3a8a'], ['#a78bfa', '#4c1d95'], ['#34d399', '#065f46']];
    const p = { id, titel: data.titel, klant: data.klant, contact: data.contact || data.klant, status: 'Aanvraag', deadline: data.deadline || '2026-12-15', budget: Number(data.budget) || 0, type: data.type || 'Bedrijfsfilm', grad: grads[S.projects.length % grads.length], versie: '-', email: data.email || '', aanvraag: data.aanvraag || '', aanvraagDatum: todayIso() };
    S.projects.unshift(p); return p;
  }
  const A = {
    'go': el => go(el.dataset.href),
    'modal-close': closeModal,
    'modal-act': el => { const h = modalHandlers[Number(el.dataset.i)]; if (h && h.onClick) h.onClick(); },
    'toggle-nav': () => document.body.classList.toggle('nav-open'),
    'toggle-theme': () => setTheme(themeEffective() === 'dark' ? 'light' : 'dark'),
    'set-theme': el => setTheme(el.dataset.v),
    // Info-menu & support
    'info-toggle': () => { if (infoOpen()) closeInfo(true); else openInfo(); },
    'info-about': () => aboutModal(),
    'info-news': (el, e) => { if (e) e.preventDefault(); newsModal(); },
    'tk-att-demo': () => { const d = new Date(); S.tkAtt = { naam: `screenshot-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.png`, grootte: '412 KB' }; const b = $('#tk-att'); if (b) b.innerHTML = tkAttHtml(); },
    'tk-att-remove': () => { S.tkAtt = null; const b = $('#tk-att'); if (b) b.innerHTML = tkAttHtml(); },
    'tk-resolve': el => { const t = ticket(el.dataset.nr); if (!t) return; t.status = 'Opgelost'; tkSystem(t, 'status', 'Opgelost', { door: 'Sanne de Vries' }); saveTickets(); toast(`Ticket #${t.nr} gemarkeerd als opgelost`); renderKeep(); },
    'tk-filter': el => { S.tkFilter.status = el.dataset.v; renderKeep(); },
    'tk-reset': () => { TK = seedTickets(); saveTickets(); S.tkFilter = { status: 'Alle', cat: 'Alle' }; toast('Demo-tickets hersteld'); renderKeep(); },
    'new-project': () => formModal('Nieuw project', `
        <label>Projectnaam*<input name="titel" required placeholder="Bijv. Bedrijfsfilm 2027"></label>
        <label>Klant*<input name="klant" required placeholder="Bijv. Bakkerij Van Dam"></label>
        <div class="form-grid two"><label>Contactpersoon<input name="contact" placeholder="Naam"></label><label>E-mail contactpersoon<input type="email" name="email" placeholder="naam@bedrijf.nl"></label></div>
        <div class="form-grid two"><label>Soort<select name="type"><option>Bedrijfsfilm</option><option>Aftermovie</option><option>Social content</option><option>Productvideo</option><option>Trouwfilm</option></select></label>
        <label>Deadline<input type="date" name="deadline" value="2026-12-15"></label></div>`, 'Project aanmaken', d => {
        const p = newProject(d); toast(`Project “${esc(p.titel)}” aangemaakt`); go('#/project/' + p.id + '/planning');
      }),
    'filter-status': el => { S.projectFilter = el.dataset.status; S.search = ''; go('#/projecten'); },
    'clear-filters': () => { S.projectFilter = 'Alle'; S.search = ''; render(); },
    'proj-view': el => { S.projectView = el.dataset.v; render(); },
    'set-status': el => { const p = proj(el.dataset.id); if (p.status === el.dataset.status) return; p.status = el.dataset.status; toast(`Status gewijzigd naar ${esc(p.status)}`); render(); },
    'quote-for': el => { const p = proj(el.dataset.id); S.quote = defaultQuote(p.status === 'Opgeleverd' ? 'p6' : p.id); go('#/financien'); },
    'remind': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); openCompose(draftFor(proj(i.projectId), 'herinnering', { doc: { nr: i.nr, bedrag: i.bedrag, vervalt: i.vervalt } })); },
    'remind-generic': el => toast(`Herinnering verstuurd aan ${esc(el.dataset.who)} (demo)`),
    'send-invoice': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); openCompose(draftFor(proj(i.projectId), 'factuur', { doc: { nr: i.nr, bedrag: i.bedrag, vervalt: i.vervalt }, onSent: () => { i.status = 'Open'; i.datum = dayMonth(todayIso()); } })); },
    // E-mail
    'compose': el => { const p = proj(el.dataset.id); if (p) openCompose(draftFor(p, el.dataset.kind || 'leeg', { nr: el.dataset.nr })); },
    'reply': el => { const p = proj(el.dataset.id); const m = (S.email.threads[p.id] || [])[Number(el.dataset.i)]; if (m) openCompose(draftFor(p, 'reply', { msg: m })); },
    'compose-connect': el => { const d = readCompose(); openConsent(el.dataset.k, ok => { if (ok) renderKeep(); openCompose(d); }); },
    'mail-enable': el => {
      const k = accKey(el.dataset.k), inCompose = !!$('#compose-form'), d = inCompose ? readCompose() : null;
      setMail(k, true); toast(`E-mail aan · verzenden via ${esc(ACC[k].mail)} (${esc(acc(k).adres)})`); renderKeep();
      if (d) openCompose(d);
    },
    'cmp-del-att': el => { const d = readCompose(); d.att.splice(Number(el.dataset.i), 1); $('#cmp-att').innerHTML = attHtml(d.att); },
    'cmp-add-att': () => {
      const d = readCompose(); const opts = [{ naam: 'Algemene_voorwaarden.pdf', grootte: '120 KB' }, { naam: 'Callsheet.pdf', grootte: '96 KB' }, { naam: 'Moodboard.pdf', grootte: '2,4 MB' }];
      const next = opts.find(o => !d.att.some(a => a.naam === o.naam));
      if (!next) { toast('Alle voorbeeldbijlagen zijn al toegevoegd'); return; }
      d.att.push(next); $('#cmp-att').innerHTML = attHtml(d.att); toast(`Bijlage “${esc(next.naam)}” toegevoegd (demo)`);
    },
    'mail-filter': el => { S.email.filter = el.dataset.f; renderKeep(); },
    'acc-connect': el => openConsent(el.dataset.k),
    'email-connect': el => openConsent(el.dataset.k),
    'cal-connect': el => openConsent(el.dataset.k),
    'acc-disconnect': el => {
      const k = accKey(el.dataset.k); Object.assign(acc(k), { connected: false, sinds: null, mail: true, agenda: true }); fixActive(); demoSave();
      const s = sender();
      toast(`${esc(ACC[k].naam)} ontkoppeld (demo) · e-mail en agenda gestopt${s.k !== 'noreply' ? ' · verzenden gaat nu via ' + esc(s.label) : ''}`); renderKeep();
    },
    'acc-toggle': el => {
      const k = accKey(el.dataset.k), on = el.checked, pr = ACC[k];
      if (el.dataset.w === 'mail') { setMail(k, on); toast(on ? `E-mail aan · verzenden via ${esc(pr.mail)}` : `E-mail uit voor ${esc(pr.naam)}${sender().k !== 'noreply' ? ' · verzenden gaat nu via ' + esc(sender().label) : ' · mail gaat via Diafragmo (noreply)'}`); }
      else { const other = setAgenda(k, on); toast(on ? `Agenda aan · ${esc(pr.cal)}${other ? ` (agenda van ${esc(ACC[other].naam)} uitgezet)` : ''}` : `Agenda uit voor ${esc(pr.naam)} · geen agenda-sync en geen vrij/bezet`); }
      renderKeep();
    },
    'email-active': el => { const k = accKey(el.dataset.k); S.email.active = k; demoSave(); toast(`Actief verzendaccount: ${esc(ACC[k].mail)} · ${esc(acc(k).adres)}`); renderKeep(); },
    'email-opt': el => {
      const labels = { sigOn: 'E-mailhandtekening', bcc: 'BCC naar mezelf', autoKoppel: 'Automatisch koppelen' };
      S.email[el.dataset.k] = el.checked; toast(`${labels[el.dataset.k]} ${el.checked ? 'aan' : 'uit'}`); renderKeep();
    },
    'tpl-sel': el => { S.email.tplSel = el.dataset.k; renderKeep(); },
    'tpl-reset': () => { const k = S.email.tplSel; S.email.templates[k] = JSON.parse(JSON.stringify(DEFAULT_TPL[k])); toast(`Sjabloon “${DEFAULT_TPL[k].naam}” hersteld`); renderKeep(); },
    'tpl-preview': () => openCompose(draftFor(proj('p1'), S.email.tplSel)),
    'tpl-insert': el => {
      const t = (lastTplField && document.body.contains(lastTplField)) ? lastTplField : $('[data-tpl-f="body"]'); if (!t) return;
      const a = t.selectionStart == null ? t.value.length : t.selectionStart, b = t.selectionEnd == null ? a : t.selectionEnd;
      t.value = t.value.slice(0, a) + el.dataset.ph + t.value.slice(b);
      S.email.templates[S.email.tplSel][t.dataset.tplF] = t.value;
      t.focus(); try { t.setSelectionRange(a + el.dataset.ph.length, a + el.dataset.ph.length); } catch (er) { /* noop */ }
    },
    'add-shootday': el => formModal('Draaidag toevoegen', `
        <label>Titel*<input name="titel" required value="Draaidag ${S.planning[el.dataset.id].draaidagen.length + 1}"></label>
        <div class="form-grid two"><label>Datum*<input type="date" name="datum" required value="2026-10-20" data-cal-date>${calHintHtml('2026-10-20')}</label><label>Tijd<input name="tijd" value="09:00 – 17:00"></label></div>
        <label>Locatie<input name="locatie" placeholder="Adres of plek"></label><label>Crew<input name="crew" value="Sanne"></label>`, 'Toevoegen', d => {
        const pl = S.planning[el.dataset.id]; pl.draaidagen.push(d); pl.draaidagen.sort((a, b) => a.datum.localeCompare(b.datum));
        if (S.callsheets[el.dataset.id]) { S.callsheets[el.dataset.id].push(csFromDay(proj(el.dataset.id), d)); demoSave(); }
        const k = calProvider(); toast(`Draaidag toegevoegd${k && S.agenda.autoZet ? ` · ook in je ${esc(CAL[k].label)} gezet (demo)` : ''}`); render();
      }),
    'add-location': el => formModal('Locatie toevoegen', `<label>Naam*<input name="naam" required></label><label>Adres<input name="adres"></label><label>Notitie<textarea name="notitie" rows="3" placeholder="Parkeren, stroom, toegang…"></textarea></label>`, 'Toevoegen', d => { S.planning[el.dataset.id].locaties.push(d); toast('Locatie toegevoegd'); render(); }),
    'open-callsheet': el => { const p = proj(el.dataset.id); ensure(p); const l = csList(p); const i = l.findIndex(c => c.datum === el.dataset.datum); S.csSel[p.id] = i < 0 ? 0 : i; go('#/project/' + p.id + '/callsheet'); },
    'cs-day': el => { S.csSel[el.dataset.id] = Number(el.dataset.i); renderKeep(); },
    'cs-add': el => {
      const p = proj(el.dataset.id), l = csList(p), last = l[l.length - 1];
      const datum = last && last.datum ? isoAdd(last.datum, 1) : isoAdd(todayIso(), 7);
      const cs = last ? JSON.parse(JSON.stringify(last)) : csFromDay(p, { datum, tijd: '09:00 – 17:00', titel: 'Opnamedag 1', locatie: '' });
      cs.datum = datum; cs.titel = 'Opnamedag ' + (l.length + 1); cs.gedeeld = null; l.push(cs); S.csSel[p.id] = l.length - 1; demoSave();
      toast(`Opnamedag ${l.length} toegevoegd (${fdateShort(datum)}) – pas de gegevens aan`); renderKeep();
    },
    'cs-add-blok': () => { const c = csCur(); if (!c) return; const b = c.cs.blokken, lt = b.length ? b[b.length - 1].tijd : c.cs.calltime; const m = /^(\d{1,2}):(\d{2})$/.exec(lt || ''); const nt = m ? `${String(Math.min(23, Number(m[1]) + 1)).padStart(2, '0')}:${m[2]}` : '12:00'; b.push({ tijd: nt, wat: '' }); demoSave(); renderKeep(); const ins = $$('.cs-blocks input[data-cs$=".wat"]'); if (ins.length) ins[ins.length - 1].focus(); },
    'cs-add-crew': () => { const c = csCur(); if (!c) return; c.cs.crew.push({ naam: '', rol: '', tel: '', freelancer: true }); demoSave(); renderKeep(); const ins = $$('.cs-crew input[data-cs$=".naam"]'); if (ins.length) ins[ins.length - 1].focus(); },
    'cs-del': el => { const c = csCur(); if (!c) return; c.cs[el.dataset.list].splice(Number(el.dataset.k), 1); demoSave(); renderKeep(); },
    'cs-fl': el => { const c = csCur(); if (!c) return; const m = c.cs.crew[Number(el.dataset.k)]; m.freelancer = !m.freelancer; demoSave(); renderKeep(); },
    'cs-share': el => csShare(el.dataset.id),
    'cs-print': () => {
      // Invoervelden tijdelijk als gewone tekst tonen, zodat lange regels in de PDF netjes afbreken
      $$('.callsheet .cs-static').forEach(x => x.remove());
      $$('.callsheet .cs-in:not([type="date"])').forEach(inp => { const sp = document.createElement('span'); sp.className = 'cs-static' + (inp.classList.contains('cs-big') ? ' cs-big' : '') + (inp.classList.contains('cs-title') ? ' cs-title' : ''); sp.textContent = inp.value.trim() || '–'; inp.after(sp); });
      document.body.classList.add('print-cs');
      const done = () => { document.body.classList.remove('print-cs'); $$('.callsheet .cs-static').forEach(x => x.remove()); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      toast('Kies “Opslaan als PDF” in het printvenster');
      setTimeout(() => { try { window.print(); } catch (e) { /* noop */ } }, 60);
    },
    // Offerte ondertekenen
    'sign-open': () => { S.signOpen = true; const p = proj(route().a); const box = $('#sign-panel'); if (!box || !p) return; box.innerHTML = signPanelHtml(p, S.quotes[p.id]); initSigPad(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); const n = $('#sign-name'); if (n) setTimeout(() => n.focus({ preventScroll: true }), 300); },
    'sig-clear': () => { if (S.sigClear) S.sigClear(); },
    'sign-copy': el => copyText(signLink(el.dataset.id), `Link voor ondertekening van ${esc(S.quotes[el.dataset.id].nr)} gekopieerd – stuur hem naar ${esc(S.quotes[el.dataset.id].tav || proj(el.dataset.id).contact)}`),
    'quote-view': el => { const p = proj(el.dataset.id), q = S.quotes[p.id]; modal({ title: `Offerte ${q.nr}`, wide: true, body: `${signStatusHtml(q)}<div class="doc-preview pq-doc in-modal">${quoteDocHtml(p, q)}</div>`, actions: [{ label: 'Sluiten', cls: 'ghost', onClick: closeModal }].concat(q.signed ? [] : [{ label: `${icon('link')} Link voor ondertekening kopiëren`, cls: 'primary', onClick: () => copyText(signLink(p.id), 'Link voor ondertekening gekopieerd') }]) }); },
    'sign-reset': el => { unsign(el.dataset.id); demoSave(); toast('Demo: handtekening verwijderd – de offerte wacht weer op ondertekening'); renderKeep(); },
    // Agenda
    'cal-opt': el => { S.agenda[el.dataset.k] = el.checked; demoSave(); toast(`${el.dataset.k === 'autoZet' ? 'Automatisch in je agenda zetten' : 'Beschikbaarheid checken'} ${el.checked ? 'aan' : 'uit'}`); renderKeep(); },
    // Pro
    'upgrade': el => upgradeModal(el.dataset.f),
    'plan-demo': el => { if (S.settings.plan !== el.dataset.plan) setPlan(el.dataset.plan, 'demo'); },
    'timer-start': el => timerStart(el.dataset.id),
    'timer-stop': () => timerStopModal(),
    'hours-edit': el => timerEditModal(el.dataset.id, el.dataset.tid),
    'subs-start': el => subsStartModal(el.dataset.id, el.dataset.v),
    'subs-srt': el => { const s = S.subs[el.dataset.key]; if (!s) return; const [pid, v] = el.dataset.key.split(':'); const name = `${slug(proj(pid).titel).replace(/^-|-$/g, '')}_${v}_${s.lang}.srt`; downloadText(name, toSrt(s.segs), 'application/x-subrip;charset=utf-8'); toast(`${esc(name)} gedownload (${s.segs.length} ondertitels)`); },
    'subs-burn': el => subsBurnModal(el.dataset.key),
    'route': () => toast('Route wordt geopend in je kaarten-app (demo)'),
    'print-draaiboek': () => toast('Draaiboek gedeeld met de crew (demo)'),
    'toggle-shot': el => { S.shotlist[el.dataset.id][Number(el.dataset.i)].klaar = el.checked; demoSave(); renderKeep(); },
    'upload-file': el => {
      const box = $('#upload-progress'); if (!box || box.dataset.busy) return;
      box.dataset.busy = '1';
      const id = el.dataset.id; const name = 'Drone_reveal_' + (S.files[id].length + 1) + '.mov';
      box.innerHTML = `<div class="upload-row"><span class="small">${icon('upload')} ${name} · 3,4 GB</span><div class="progress thin"><div id="upbar" style="width:0%"></div></div></div>`;
      let pct = 0; const iv = setInterval(() => {
        pct += 18; const b = $('#upbar'); if (b) b.style.width = Math.min(100, pct) + '%';
        if (pct >= 100) { clearInterval(iv); S.files[id].push({ map: 'Ruw materiaal', naam: name, grootte: '3,4 GB', datum: 'do 1 okt' }); toast(`${name} geüpload (demo)`); render(); }
      }, 220);
      cleanupFns.push(() => clearInterval(iv));
    },
    'share-folder': () => toast('Map “Exports” gedeeld via het klantportaal (demo)'),
    'download': el => toast(`Download “${esc(el.dataset.name)}” gestart (demo – geen echt bestand)`),
    'copy-link': el => { const inp = el.previousElementSibling; if (inp && inp.select) inp.select(); toast('Link gekopieerd (demo)'); },
    'add-freelancer': el => formModal('Freelancer toevoegen', `
        <label>Naam*<input name="naam" required placeholder="Naam freelancer"></label>
        <label>Rol<select name="rol"><option>Tweede camera</option><option>Drone-piloot</option><option>Geluid</option><option>Editor</option><option>Gaffer / licht</option><option>Visagie</option></select></label>
        <div class="form-grid two"><label>Dagen<input type="number" name="dagen" min="0" step="0.5" value="1"></label><label>Kosten (€)*<input type="number" name="kosten" min="0" step="1" required value="450"></label></div>`, 'Toevoegen', d => {
        S.finance[el.dataset.id].freelancers.push({ naam: d.naam, rol: d.rol, dagen: Number(d.dagen) || 0, kosten: Number(d.kosten) || 0 }); toast('Freelancer toegevoegd – marge bijgewerkt'); render();
      }),
    // Review
    'seek': (el, e) => { if (e.target.closest('[data-stop]')) return; seek(Number(el.dataset.t)); },
    'scrub': (el, e) => { if (e.target.closest('.marker')) return; const r = el.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * Player.dur); },
    'fb-toggle': el => {
      if (Player.iv) { clearInterval(Player.iv); Player.iv = null; el.innerHTML = icon('play'); return; }
      el.textContent = '❚❚';
      Player.iv = setInterval(() => { Player.t += 0.1; if (Player.t >= Player.dur) Player.t = 0; if (Player.update) Player.update(); }, 100);
    },
    'comment-filter': el => { S.commentFilter = el.dataset.f; render(); },
    'resolve': el => { const c = S.comments[el.dataset.id][el.dataset.v].find(x => x.t === Number(el.dataset.t) && x.tekst === el.dataset.txt); if (c) c.opgelost = el.checked; toast(el.checked ? 'Opmerking gemarkeerd als opgelost' : 'Opmerking heropend'); render(); },
    'approve': el => {
      const p = proj(el.dataset.id), v = el.dataset.v;
      modal({
        title: `Versie ${v} goedkeuren?`,
        body: `<p>Je markeert <strong>${esc(p.titel)} – ${v}</strong> als definitieve versie.</p><ul class="small muted bullets"><li>${esc(p.contact)} krijgt bericht dat de video klaarstaat.</li><li>De download wordt vrijgegeven in het klantportaal.</li><li>Daarna kun je de eindfactuur versturen.</li></ul>`,
        actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: 'Ja, goedkeuren', cls: 'primary', onClick: () => { S.approved[p.id + ':' + v] = nowLabel(); if (v === p.versie || v === 'v3') { p.versie = v; } closeModal(); toast(`Versie ${v} goedgekeurd`); render(); } }]
      });
    },
    'share-review': el => modal({ title: 'Reviewlink delen', body: `<p class="small muted">Iedereen met deze link kan de video bekijken en feedback geven – zonder account.</p><div class="copy-field"><input readonly value="https://frame.voorbeeld/r/${esc(el.dataset.id)}-8f3k2" aria-label="Reviewlink"><button class="btn sm" data-action="copy-link">Kopieer</button></div><label class="check"><input type="checkbox" checked> Downloaden toestaan na goedkeuring</label>`, actions: [{ label: 'Klaar', cls: 'primary', onClick: closeModal }] }),
    'upload-v1': el => { proj(el.dataset.id).versie = 'v1'; toast('v1 geüpload (demo)'); go('#/review/' + el.dataset.id + '/v1'); },
    // Klantportaal
    'portal-demo-upload': () => fakeUpload('Teksten_voice-over_' + (S.portal.uploads.length + 1) + '.docx', '86 KB'),
    'portal-approve': el => {
      const p = proj(el.dataset.id); const v = p.versie !== '-' ? p.versie : 'v1';
      modal({
        title: 'Video goedkeuren', body: `<p>Weet je zeker dat je versie ${v} wilt goedkeuren? Daarna maakt ${esc(D.studio.naam)} de definitieve export en kun je de video downloaden.</p>`,
        actions: [{ label: 'Nog niet', cls: 'ghost', onClick: closeModal }, { label: 'Ja, ik keur goed', cls: 'brand-btn', onClick: () => { S.approved[p.id + ':' + v] = nowLabel(); closeModal(); toast('Bedankt! De video is goedgekeurd.'); render(); } }]
      });
    },
    'portal-download': el => toast(`Download gestart: ${esc(el.dataset.f)} (demo – geen echt bestand)`),
    'ideal': el => {
      const banks = ['ABN AMRO', 'ING', 'Rabobank', 'SNS', 'ASN Bank', 'Triodos Bank', 'bunq', 'Knab', 'RegioBank'];
      const id = el.dataset.id;
      modal({
        title: 'Betalen met iDEAL | Wero (demo)',
        body: `<p class="small muted">Kies je bank. Dit is een nagebootste betaalstap – er wordt niets afgeschreven.</p><div class="banks">${banks.map((b, i) => `<label class="bank"><input type="radio" name="bank" value="${b}" ${i === 1 ? 'checked' : ''}><span>${b}</span></label>`).join('')}</div>`,
        actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, {
          label: 'Naar mijn bank', cls: 'ideal', onClick: () => {
            const body = $('.modal-body'); if (body) body.innerHTML = `<div class="paying"><div class="spinner"></div><p>Je wordt doorgestuurd naar je bank…</p></div>`;
            $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
            const tmo = setTimeout(() => { S.portal.paidIds[id] = true; const inv = portalInvoice(proj(id)); if (inv && !inv.virtual) inv.status = 'Betaald'; go('#/klant/' + id + '/betaald'); }, 1300);
            cleanupFns.push(() => clearTimeout(tmo));
          }
        }]
      });
    },
    // Offertebouwer
    'add-line': el => { S.quote.lines.push(Object.assign({}, PRESETS[el.dataset.k])); render(); },
    'del-line': el => { S.quote.lines.splice(Number(el.dataset.i), 1); render(); },
    'new-quote': () => { S.quote = defaultQuote('p6'); S.quote.lines = [Object.assign({}, PRESETS.Draaidag)]; S.quote.nr = 'O2026-023'; toast('Nieuwe offerte gestart'); render(); },
    'pdf': () => toast(`${esc(S.quote.nr)}.pdf gedownload (demo)`),
    'to-invoice': () => { const q = S.quote; q.type = 'Factuur'; q.nr = 'F2026-034'; q.status = (S.tikkie.verzoeken[q.nr] || {}).betaald ? 'Betaald' : 'Concept'; q.geldig = '2026-10-15'; toast('Offerte omgezet naar factuur F2026-034'); render(); },
    'back-to-quote': () => { const q = S.quote; q.type = 'Offerte'; q.nr = 'O2026-022'; q.status = 'Concept'; q.geldig = '2026-10-31'; render(); },
    'send-quote': () => {
      const q = S.quote, p = proj(q.projectId), c = qCalc(q);
      openCompose(draftFor(p, q.type === 'Offerte' ? 'offerte' : 'factuur', { title: `${q.type} versturen`, doc: { nr: q.nr, bedrag: c.tot, vervalt: q.geldig }, onSent: () => { q.status = 'Verstuurd'; } }));
    },
    // Showreel
    'sr-toggle': el => { S.showreel.items[Number(el.dataset.i)].on = el.checked; render(); },
    'sr-move': el => { const i = Number(el.dataset.i), j = i + Number(el.dataset.d); const a = S.showreel.items; if (j < 0 || j >= a.length) return; const tmp = a[i]; a[i] = a[j]; a[j] = tmp; render(); },
    'sr-color': el => { S.showreel.kleur = el.dataset.c; render(); },
    'publish': () => toast(`Showreel gepubliceerd op https://${esc(S.showreel.domein || 'jouwnaam.nl')} (demo)`),
    'scroll': (el, e) => { e.preventDefault(); const t = document.getElementById(el.dataset.target); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'play-reel': el => { const p = proj(el.dataset.id); modal({ title: p.titel, wide: true, body: `<div class="player"><video controls autoplay muted playsinline>${D.videos.v3.map(s => `<source src="${s}" type="video/mp4">`).join('')}</video></div><p class="small muted">${esc(p.klant)} · voorbeeldbeelden</p>`, actions: [{ label: 'Sluiten', cls: 'primary', onClick: closeModal }] }); },
    'reset-form': () => { S.showreelSent = null; render(); setTimeout(() => { const f = document.getElementById('site-form'); if (f) f.scrollIntoView(); }, 50); },
    // Instellingen
    'set-plan': el => setPlan(el.dataset.plan),
    'toggle-int': el => { S.settings.koppelingen[el.dataset.k] = el.checked; toast(`Koppeling met ${esc(el.dataset.k)} ${el.checked ? 'ingeschakeld' : 'uitgeschakeld'} (demo)`); render(); },
    'save-settings': () => toast('Instellingen opgeslagen (demo)'),
    // Betaalmethoden & Tikkie (demo)
    'tikkie-connect': () => tikkieConsent(ok => { if (ok) renderKeep(); }),
    'tikkie-disconnect': () => { Object.assign(S.tikkie, { gekoppeld: false, on: false, sinds: null }); if (S.email.tplSel === 'tikkie') S.email.tplSel = 'factuur'; demoSave(); toast('Tikkie ontkoppeld (demo) · “Tikkie sturen” is verborgen'); renderKeep(); },
    'tikkie-toggle': el => {
      if (el.checked && !S.tikkie.gekoppeld) { el.checked = false; tikkieConsent(ok => { if (ok) renderKeep(); }); return; }
      S.tikkie.on = el.checked; if (!el.checked && S.email.tplSel === 'tikkie') S.email.tplSel = 'factuur'; demoSave();
      toast(el.checked ? 'Tikkie aan · “Tikkie sturen” staat bij open facturen' : 'Tikkie uit · de knop “Tikkie sturen” is verborgen'); renderKeep();
    },
    'tikkie-open': el => tikkieModal(el.dataset.id, el.dataset.nr),
    'tikkie-share': (el, e) => {
      if (!TIK || !tikkieValid()) { if (e) e.preventDefault(); return; }
      const t = Object.assign({}, tikkieRead()), p = proj(t.pid), via = el.dataset.via;
      if (via === 'email') { openCompose(draftFor(p, 'tikkie', { title: 'Tikkie versturen per e-mail', doc: { nr: t.nr, bedrag: t.bedrag, vervalt: t.geldig, tikkie: t }, onSent: () => tikkieSent(t, 'per e-mail') })); return; }
      if (via === 'kopie') { copyText(t.link, `Tikkie-link gekopieerd (demo) – plak hem in je bericht aan ${esc(firstName(p.contact))}`); tikkieSent(t, 'link gekopieerd'); }
      else { el.href = waUrl(t, p); tikkieSent(t, 'via WhatsApp'); toast(`WhatsApp geopend met je bericht aan ${esc(p.contact)} · Tikkie verstuurd (demo-link)`); }
      setTimeout(renderKeep, 0); // na het openen van de link: venster sluiten en factuur bijwerken
    },
    'tikkie-paid': el => {
      const nr = el.dataset.nr, pid = el.dataset.id, t = S.tikkie.verzoeken[nr]; if (!t) return;
      invRefs(nr, pid).forEach(r => { r.status = 'Betaald'; }); t.betaald = nowLabel(); demoSave();
      toast(`Demo: factuur ${esc(nr)} staat op Betaald · ${eur(t.bedrag)} betaald via Tikkie`); renderKeep();
    }
  };

  // Formulieren
  const F = {
    'sign-quote': (f, d) => {
      updateSignBtn(); const b = $('#sign-submit'); if (!b || b.disabled) { toast('Vul je naam in, zet je handtekening en vink de voorwaarden aan'); return; }
      const c = $('#sig-canvas'); signQuote(f.dataset.id, d.naam.trim(), c.toDataURL('image/png'));
    },
    'add-shot': (f, d) => { const sl = S.shotlist[f.dataset.id]; sl.push({ scene: String(sl.length + 1), shot: d.shot, type: d.type, lens: '–', locatie: '–', klaar: false }); toast('Shot toegevoegd'); render(); },
    'add-hours': (f, d) => { const u = Number(d.uren) || 0; S.hours[f.dataset.id].push({ datum: d.datum, activiteit: d.activiteit, uren: u, km: Number(d.km) || 0 }); addedHours += u; toast(`${num(u, 2)} uur toegevoegd – urencriterium nu ${num(urenTotaal(), 2)} / ${num(S.urenDoel, 0)}`); render(); },
    'add-comment': (f, d) => {
      const vid = $('#vid'); const t = Player.mode === 'video' && vid ? vid.currentTime : Player.t;
      S.comments[f.dataset.id][f.dataset.v].push({ t: Math.round(t * 10) / 10, van: 'Sanne de Vries', rol: 'maker', tekst: d.tekst, opgelost: false });
      S.commentFilter = 'Alle'; toast(`Opmerking geplaatst op ${tc(t)}`); render();
      const v2 = $('#vid'); if (v2) v2.addEventListener('loadedmetadata', () => seek(t), { once: true });
    },
    'portal-comment': (f, d) => {
      const vid = $('#vid'); const t = vid && !vid.hidden ? vid.currentTime : 0;
      S.portal.comments.push({ t, tekst: d.tekst }); f.reset();
      const ul = $('#portal-comments'); if (ul) ul.innerHTML = S.portal.comments.map(c => `<li><span class="tc">${tc(c.t)}</span><div>${esc(c.tekst)}</div></li>`).join('');
      toast('Feedback verstuurd naar Sanne (demo)');
    },
    'ticket-new': (f, d) => {
      const list = tickets(), now = nowLocal();
      const nr = Math.max(1000, ...list.map(t => t.nr)) + 1;
      const t = { nr, onderwerp: d.onderwerp.trim(), categorie: d.categorie, prioriteit: d.prioriteit, status: 'Open', eigen: true, van: 'Sanne de Vries', bedrijf: D.studio.naam, email: D.studio.email, toegewezen: TK_AGENTS[0], aangemaakt: now, bijgewerkt: now, meta: browserInfo(),
        berichten: [{ rol: 'gebruiker', naam: 'Sanne de Vries', tijd: now, tekst: d.beschrijving.trim(), bijlage: S.tkAtt }, { rol: 'systeem', tijd: now, tekst: 'Automatisch bericht: we hebben je ticket ontvangen. Je hoort meestal binnen één werkdag van ons.' }] };
      list.unshift(t); S.tkAtt = null; saveTickets();
      toast('Ticket verstuurd naar het Diafragmo-team'); go('#/support/ticket/' + nr);
    },
    'ticket-reply': (f, d) => {
      const t = ticket(f.dataset.nr); if (!t || !d.tekst.trim()) return;
      t.berichten.push({ rol: 'gebruiker', naam: 'Sanne de Vries', tijd: nowLocal(), tekst: d.tekst.trim() }); t.bijgewerkt = nowLocal();
      if (t.status === 'Wacht op jou' || t.status === 'Opgelost') { t.status = 'Open'; tkSystem(t, 'status', 'Open'); }
      saveTickets(); toast('Reactie verstuurd naar het Diafragmo-team'); renderKeep();
    },
    'ticket-reply-support': (f, d) => {
      const t = ticket(f.dataset.nr); if (!t || !d.tekst.trim()) return;
      const agent = t.toegewezen.indexOf(' · ') > 0 ? t.toegewezen.split(' · ')[0] : 'Noor';
      t.berichten.push({ rol: 'support', naam: SUPPORT_NAAM, agent, tijd: nowLocal(), tekst: d.tekst.trim() }); t.bijgewerkt = nowLocal();
      if (d.status && d.status !== t.status) { t.status = d.status; tkSystem(t, 'status', d.status); }
      saveTickets(); toast(`Antwoord verstuurd aan ${esc(t.van)} als Diafragmo support`); renderKeep();
    },
    'public-request': (f, d) => {
      const klant = d.bedrijf || d.naam;
      const p = newProject({ titel: d.type + ' – aanvraag via website', klant, contact: d.naam, type: d.type, deadline: d.datum || '2026-12-15', email: d.email, aanvraag: d.bericht });
      S.showreelSent = { naam: d.naam, id: p.id, titel: p.titel, klant };
      render(); setTimeout(() => { const s = document.getElementById('site-form'); if (s) s.scrollIntoView(); }, 30);
    }
  };

  // ---------- Event-delegatie ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT') return; // checkboxes lopen via 'change'
    const fn = A[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); document.body.classList.remove('nav-open'); }
    if (e.key === 'Enter' && e.target.id === 'global-search') { S.search = e.target.value; S.projectFilter = 'Alle'; e.target.value = ''; go('#/projecten'); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('li[data-action], div[role="button"][data-action]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('input[data-action]')) { const fn = A[el.dataset.action]; if (fn) fn(el, e); return; }
    if (el.matches('[data-action-change="review-project"]')) { go('#/review/' + el.value); return; }
    if (el.matches('[data-cal-date]')) { const h = el.parentElement.querySelector('[data-cal-hint]'); if (h) h.outerHTML = calHintHtml(el.value, el.dataset.calSkip); }
    if (el.closest && el.closest('#sign-form')) { updateSignBtn(); return; }
    if (el.matches('[data-subs-show]')) { S.subsShow = el.checked; const vid = $('#vid'); subOverlay(Player.mode === 'video' && vid ? vid.currentTime : Player.t); return; }
    if (el.name === 'burnfmt') { const b = $('#burn-prev'); if (b) b.className = b.className.replace(/r\w+x\w+/, 'r' + el.value); return; }
    if (el.name === 'burnstyle') { const b = $('#burn-prev'); if (b) b.className = b.className.replace(/\bs\d\b/, 's' + el.value); return; }
    if (el.matches('[data-cs="datum"]')) { const c = csCur(); if (c) { c.cs.datum = el.value; demoSave(); renderKeep(); } return; }
    if (el.matches('[data-q]')) { S.quote[el.dataset.q] = el.type === 'checkbox' ? el.checked : el.value; renderQuoteLive(); return; }
    if (el.id === 'tk-file') { const fl = el.files && el.files[0]; if (fl) { S.tkAtt = { naam: fl.name, grootte: mb(fl) }; const b = $('#tk-att'); if (b) b.innerHTML = tkAttHtml(); } return; }
    if (el.matches('[data-tk-set]')) {
      const t = ticket(el.dataset.nr), k = el.dataset.tkSet; if (!t || t[k] === el.value) return;
      t[k] = el.value; tkSystem(t, k, el.value, { door: 'beheer', intern: k === 'toegewezen' }); saveTickets();
      toast(k === 'status' ? `Status van #${t.nr}: ${esc(tkStatusLabel(el.value, true))}` : k === 'prioriteit' ? `Prioriteit van #${t.nr}: ${esc(el.value)}` : `#${t.nr} toegewezen aan ${esc(el.value)}`); renderKeep(); return;
    }
    if (el.matches('[data-tk-filter]')) { S.tkFilter[el.dataset.tkFilter] = el.value; renderKeep(); return; }
    if (el.matches('[data-sr="formulier"]')) { S.showreel.formulier = el.checked; refreshReelPreview(); return; }
    if (el.id === 'cmp-tpl' && currentDraft) {
      const d = readCompose(); const nd = draftFor(proj(d.pid), el.value, { doc: d.origKind === el.value ? d.doc : null });
      d.kind = el.value; d.subject = nd.subject; d.body = nd.body; d.att = nd.att; d.onSent = el.value === d.origKind ? d.origOnSent : null;
      $('#cmp-subj').value = d.subject; $('#cmp-body').value = d.body; $('#cmp-att').innerHTML = attHtml(d.att);
      return;
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.closest && el.closest('#tikkie-form')) { el.setCustomValidity(''); tikkieRead(); return; }
    if (el.matches('[data-line]')) { const l = S.quote.lines[Number(el.dataset.line)]; const f = el.dataset.f; l[f] = f === 'omschrijving' ? el.value : (el.value === '' ? 0 : Number(el.value)); renderQuoteLive(); return; }
    if (el.matches('input[data-q]') && el.type !== 'checkbox') { S.quote[el.dataset.q] = el.value; renderQuoteLive(); return; }
    if (el.matches('[data-sr]') && el.type !== 'checkbox') { S.showreel[el.dataset.sr] = el.value; refreshReelPreview(); return; }
    if (el.matches('[data-tpl-f]')) { S.email.templates[S.email.tplSel][el.dataset.tplF] = el.value; return; }
    if (el.matches('[data-email-sig]')) { S.email.sig = el.value; return; }
    if (el.matches('[data-cs]') && el.dataset.cs !== 'datum') { const c = csCur(); if (c) { setPath(c.cs, el.dataset.cs, el.value); demoSave(); } return; }
    if (el.matches('[data-sub-i]')) { const s = S.subs[el.dataset.key]; if (s) { s.segs[Number(el.dataset.subI)].t = el.value; demoSave(); const vid = $('#vid'); subOverlay(Player.mode === 'video' && vid ? vid.currentTime : Player.t); } return; }
    if (el.closest && el.closest('#sign-form')) { updateSignBtn(); return; }
    if (el.id === 'proj-search') { S.search = el.value; const pos = el.selectionStart; render(); const n = $('#proj-search'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* noop */ } } }
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.dataset || !f.dataset.form) return;
    e.preventDefault(); const fn = F[f.dataset.form];
    if (fn) fn(f, Object.fromEntries(new FormData(f).entries()));
  });
  let lastTplField = null;
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('[data-tpl-f]')) lastTplField = e.target; });
  window.addEventListener('hashchange', render);
  // Wijzigingen uit een ander tabblad (bijv. klant ondertekent via de gekopieerde link)
  window.addEventListener('storage', e => {
    if (e.key !== DEMO_KEY) return;
    applyDemo(demoLoad(), true);
    if ($('#modal-root').classList.contains('open') || (document.activeElement && document.activeElement.matches('input, textarea, select'))) renderTimerPill(); else renderKeep();
  });
  function boot() {
    $$('[data-ic]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic)); });
    applyTheme(false);
    tickets(); updateInfoBadges();
    S.projects.forEach(ensure); // 0.4.4: alle facturen staan in S.invoices (één bron voor overzicht en projecten)
    applyDemo(demoLoad(), false);
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    render();
    if (S.migratedKoppeling) { S.migratedKoppeling = false; toast('Je bestaande koppeling is overgezet: e-mail en agenda zitten nu in één koppeling per account'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FRAME_STATE = S; // handig bij debuggen in de console
})();
