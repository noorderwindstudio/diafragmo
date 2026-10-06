/* Diafragmo – klikbaar prototype (front-end only). Geen backend, alle data is fictief. */
(function () {
  'use strict';
  const D = window.FRAME_DATA;
  const STATUSES = D.STATUSES;
  // 0.5.0: meertalig (nl/de/en), zie js/i18n.js. L = I18N.t (UI-tekst; `t` is hier vaak een lokale variabele),
  // Ln = enkelvoud/meervoud, dc = vaste demo-inhoud en waarden (statussen e.d.) vertalen, Fx = Intl-opmaak.
  const I = window.I18N, L = I.t, Ln = I.Ln, dc = I.dc, Fx = I.F;

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
      intro: null, // null = standaardtekst in de gekozen taal (sr.introDefault); eigen tekst blijft zoals getypt
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
      sig: null, // null = standaardhandtekening in de gekozen taal (mail.sigDefault)
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
  // E-mailsjablonen: de standaardteksten per taal staan in i18n.js (tpl.<soort>.name/subj/body).
  // S.email.templates bewaart alleen eigen aanpassingen (onderwerp/body); zonder aanpassing volgt het sjabloon de gekozen taal.
  S.email.templates = {};
  const tplDefault = k => ({ naam: L('tpl.' + k + '.name'), onderwerp: L('tpl.' + k + '.subj'), body: L('tpl.' + k + '.body') });
  const tpl = k => Object.assign(tplDefault(k), S.email.templates[k] || {}, { naam: L('tpl.' + k + '.name') });
  const tplSet = (k, f, v) => { S.email.templates[k] = Object.assign(S.email.templates[k] || {}, { [f]: v }); };
  const srIntro = () => S.showreel.intro == null ? L('sr.introDefault') : S.showreel.intro;
  const mailSig = () => S.email.sig == null ? L('mail.sigDefault') : S.email.sig;
  let addedHours = 0;
  let cleanupFns = [];

  // ---------- Helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Bedragen, getallen en datums via Intl in de gekozen taal (nl-NL, de-DE, en-GB); € blijft overal de valuta
  const eur = n => Fx.eur(n);
  const num = (n, d) => Fx.num(n, d);
  const pd = iso => new Date(iso + 'T12:00:00');
  const fdate = iso => { const d = pd(iso); return isNaN(d) ? esc(iso) : Fx.date(d); };
  const fdateShort = iso => { const d = pd(iso); return isNaN(d) ? esc(iso) : Fx.dateShort(d); };
  // Tijdstempels worden vanaf 0.5.0 als ISO (lokale tijd) bewaard en pas bij weergave opgemaakt (stamp),
  // zodat ze na een taalwissel meevertalen; oude Nederlandse tekst uit localStorage wordt herkend.
  const nowLabel = () => nowLocal().slice(0, 16);
  const stamp = s => esc(Fx.stamp(s));
  const size = s => esc(dc(s)); // bestandsgrootte: “1,2 GB” → “1.2 GB” in het Engels
  const tc = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 25); return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
  const initials = n => { const w = String(n).split(/\s+/).filter(x => /^[A-Za-zÀ-ÿ]/.test(x) && !/\.$/.test(x)); const caps = w.filter(x => /^[A-ZÀ-Þ]/.test(x)); const use = caps.length >= 2 ? caps : w; return use.slice(0, 2).map(x => x[0].toUpperCase()).join(''); };
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const proj = id => S.projects.find(p => p.id === id);
  // Statussen blijven intern Nederlandse waarden (logica, CSS-klassen); alleen de weergave wordt vertaald
  const statusPill = s => `<span class="pill st-${slug(s)}">${esc(dc(s))}</span>`;
  const statusPillInv = s => `<span class="pill inv-${slug(s)}">${esc(dc(s))}</span>`;
  const thumb = (p, extra) => `<div class="thumb ${extra || ''}" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><span class="thumb-play">${icon('play')}</span><span class="thumb-type">${esc(dc(p.type))}</span></div>`;
  const dateChip = iso => `<div class="date-chip"><span>${pd(iso).getDate()}</span><small>${esc(Fx.month(pd(iso).getMonth()))}</small></div>`;
  // Projecttitels van de voorbeeldprojecten worden vertaald; eigen projecten blijven zoals ingevoerd
  const ptitle = p => dc(p.titel);

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
  function themeNote(pref, t) { return pref === 'system' ? L('theme.note.system', { mode: L(t === 'dark' ? 'theme.dark.lc' : 'theme.light.lc') }) : L('theme.note.saved'); }
  let themeAnimTimer = null;
  function applyTheme(animate) {
    const pref = themePref(), t = themeEffective(pref), root = document.documentElement;
    if (animate) { root.classList.add('theme-anim'); clearTimeout(themeAnimTimer); themeAnimTimer = setTimeout(() => root.classList.remove('theme-anim'), 400); }
    root.setAttribute('data-theme', t);
    const b = $('#theme-toggle');
    if (b) { const l = t === 'dark' ? L('theme.toLight') : L('theme.toDark'); b.setAttribute('aria-label', l); b.setAttribute('title', l); }
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
    const opts = [['light', L('theme.light'), 'sun'], ['dark', L('theme.dark'), 'moon'], ['system', L('theme.system'), 'monitor']];
    const lg = I.lang(), auto = I.isAuto();
    return `<div class="card-head mt"><h2>${L('set.appearance')}</h2></div>
          <div class="seg theme-seg" role="group" aria-label="${esc(L('set.appearance'))}">${opts.map(o => `<button type="button" class="${pref === o[0] ? 'active' : ''}" data-action="set-theme" data-v="${o[0]}" aria-pressed="${pref === o[0]}">${icon(o[2])}${o[1]}</button>`).join('')}</div>
          <p class="tiny muted theme-note" id="theme-note">${themeNote(pref, themeEffective(pref))}</p>
          <div class="lang-setting" id="taal">
            <div class="lbl-txt">${icon('globe')}<span>${L('lang.label')}</span></div>
            <div class="seg lang-seg" role="group" aria-label="${esc(L('lang.label'))}"><button type="button" class="lang-auto${auto ? ' active' : ''}" data-action="set-lang" data-v="auto" aria-pressed="${auto}">${icon('sparkle')}${esc(L('lang.auto'))}</button>${I.langs.map(l => { const on = !auto && lg === l; return `<button type="button" class="${on ? 'active' : ''}" data-action="set-lang" data-v="${l}" lang="${l}" aria-pressed="${on}"><span class="lang-code">${l.toUpperCase()}</span>${esc(I.names[l])}</button>`; }).join('')}</div>
            <p class="small lang-detected" id="lang-detected">${auto ? langDetectedHtml() : esc(L('lang.manual'))}</p>
            <p class="tiny muted">${L('lang.note')}</p>
          </div>`;
  }
  // 0.5.1: “Gedetecteerd: Nederland → Nederlands” in de huidige UI-taal (landnaam via Intl.DisplayNames)
  function countryName(cc) {
    if (!cc) return L('lang.otherCountry');
    try { if (Intl.DisplayNames) return new Intl.DisplayNames([I.locale()], { type: 'region' }).of(cc) || cc; } catch (e) { /* onbekende code */ }
    return cc;
  }
  function langDetectedHtml() {
    const d = I.detectInfo(true);
    return `${icon('check')}<span>${esc(L('lang.detected', { c: countryName(d.country), l: I.names[d.lang] }))}${d.simulated ? ` <span class="tiny muted">(${esc(L('lang.simulated', { cc: d.country }))})</span>` : ''}</span>`;
  }
  // ---------- Taal (0.5.0; automatisch op basis van land vanaf 0.5.1, zie js/land.js) ----------
  // Wisselen vertaalt de vaste HTML (i18n.js) en tekent de huidige weergave opnieuw; alle demo-status blijft in het geheugen.
  // 0.5.1: data-v="auto" = Automatisch (op basis van land): wist de handmatige keuze; NL/DE/EN zet een handmatige keuze vast.
  function setLang(l) { if (l === 'auto') I.setAuto(); else I.setLang(l); }
  document.addEventListener('diafragmo:lang', e => {
    const d = (e && e.detail) || {};
    applyTheme(false); updateInfoBadges();
    renderKeep();
    toast(d.auto ? L('lang.autoOn', { l: I.names[I.lang()] }) : L('lang.switched'));
  });

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
        { map: 'Ruw materiaal', naam: 'A-cam (96 clips)', grootte: '184 GB', datum: shift(-21) },
        { map: 'Aangeleverd door klant', naam: 'Logo.svg', grootte: '36 KB', datum: shift(-30) }
      ].concat(idx >= 5 ? [{ map: 'Exports', naam: slug(p.titel) + '_' + p.versie + '.mp4', grootte: '1,4 GB', datum: shift(-5) }] : [])
        : [{ map: 'Aangeleverd door klant', naam: 'Briefing_' + slug(p.klant).slice(0, 18) + '.pdf', grootte: '420 KB', datum: '2026-09-28' }];
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
  // Factuurdatums: vanaf 0.5.0 als ISO bewaard; weergave (ook oude tekst als “2 sep”) via Fx.dm in de gekozen taal
  const dayMonth = iso => { const d = pd(iso); return isNaN(d) ? '–' : iso; };
  const invSlot = i => /^eind/i.test(String(i.omschrijving || '')) ? 'eindfactuur' : 'aanbetaling';
  const slotInvoice = (pid, w) => S.invoices.find(i => i.projectId === pid && invSlot(i) === w) || null;
  const invDatum = d => d.datum ? Fx.dm(d.datum) : (d.status === 'Concept' || !d.vervalt ? '–' : Fx.dm(isoAdd(d.vervalt, -14)));
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
        <div class="modal-head"><h3>${esc(opts.title)}</h3><button class="icon-btn" data-action="modal-close" aria-label="${esc(L('common.close'))}">${icon('x')}</button></div>
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
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, {
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
    const me = $('.side-foot .me .tiny'); if (me) me.textContent = `${D.studio.naam} · ${dc(S.settings.plan)}`;
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
    const h = now.getHours(); const groet = L(h < 6 ? 'dash.night' : h < 12 ? 'dash.morning' : h < 18 ? 'dash.afternoon' : 'dash.evening');
    const maanden = [72, 88, 95, 81, 102, 97, 64, 98, 115];
    const upcoming = [];
    S.projects.forEach(p => { ensure(p); (S.planning[p.id].draaidagen || []).forEach(d => { if (d.datum >= '2026-10-01') upcoming.push({ p, d }); }); });
    upcoming.sort((a, b) => a.d.datum.localeCompare(b.d.datum));
    const verlopen = S.invoices.filter(i => i.status === 'Verlopen').length;
    const mon = i => Fx.month(i);
    return `
      <div class="page-head">
        <div><h1>${L('dash.hello', { g: groet })}</h1><p class="muted">${L('dash.intro', { a: lopend.length, b: D.feedbackWaiting.length, c: open.length })}</p></div>
        <div class="head-actions"><button class="btn" data-action="new-project">${icon('plus')} ${L('top.newProject')}</button><a class="btn primary" href="#/financien">${icon('file')} ${L('dash.newQuote')}</a></div>
      </div>
      <div class="kpis">
        <a class="kpi" href="#/projecten"><span class="kpi-label">${L('dash.running')}</span><strong>${lopend.length}</strong><span class="muted small">${L('dash.deliveredYear', { n: S.projects.length - lopend.length })}</span></a>
        <a class="kpi" href="#/financien"><span class="kpi-label">${L('dash.outstanding')}</span><strong>${eur(openSum)}</strong><span class="small ${verlopen ? 'danger' : 'muted'}">${verlopen ? Ln('dash.overdue', verlopen) : L('dash.noneOverdue')}</span></a>
        <a class="kpi" href="#/financien"><span class="kpi-label">${L('dash.revenue')}</span><strong>${eur(41320)}</strong><span class="small ok">${L('dash.growth')}</span></a>
        <button class="kpi" data-action="scroll" data-target="urenteller"><span class="kpi-label">${L('dash.hoursYear')}</span><strong>${num(uren, 2)} ${L('common.hoursShort')}</strong><span class="muted small">${L('dash.pctCriterion', { p: Fx.pct(Math.round(pct)) })}</span></button>
      </div>
      <div class="pipeline card">
        ${STATUSES.map(s => { const c = S.projects.filter(p => p.status === s).length; return `<button class="pipe st-bg-${slug(s)}" data-action="filter-status" data-status="${esc(s)}"><span>${esc(dc(s))}</span><strong>${c}</strong></button>`; }).join('')}
      </div>
      ${weekCardHtml()}
      <div class="grid-dash">
        <section class="card span-2">
          <div class="card-head"><h2>${L('dash.running')}</h2><a class="link" href="#/projecten">${L('dash.allProjects')}</a></div>
          <div class="proj-cards">${lopend.map(projectCard).join('')}</div>
        </section>
        <section class="card" id="urenteller">
          <div class="card-head"><h2>${L('dash.criterion')}</h2><span class="muted small">${L('dash.goal', { n: num(S.urenDoel, 0) })}</span></div>
          <div class="uren-big"><strong>${num(uren, 2)}</strong><span> / ${num(S.urenDoel, 0)} ${L('common.hours')}</span></div>
          <div class="progress big"><div style="width:${pct}%"></div></div>
          <p class="small muted">${L('dash.togo', { a: num(rest, 1), b: num(rest / weeks, 1) })}</p>
          <div class="bars">${maanden.map((m, i) => `<div class="bar" title="${esc(mon(i))}: ${m} ${L('common.hours')}"><div style="height:${m / 1.3}%"></div><span>${esc(mon(i).charAt(0).toUpperCase())}</span></div>`).join('')}<div class="bar now" title="${esc(mon(9))}: ${num(addedHours, 2)} ${L('common.hours')}"><div style="height:${Math.max(2, addedHours / 1.3)}%"></div><span>${esc(mon(9).charAt(0).toUpperCase())}</span></div></div>
          <p class="tiny muted">${L('dash.disclaimer')}</p>
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('dash.openInvoices')}</h2><span class="muted small">${eur(openSum)}</span></div>
          <ul class="list">${S.invoices.filter(i => i.status !== 'Betaald').map(i => `
            <li class="row-item">
              <div class="grow"><div class="strong">${esc(dc(i.klant))}</div><div class="small muted">${esc(i.nr)} · ${esc(dc(i.omschrijving))} · ${L('dash.due', { d: fdateShort(i.vervalt) })}</div></div>
              <div class="right"><div class="strong">${eur(i.bedrag)}</div>${statusPillInv(i.status)}</div>
              ${i.status === 'Concept' ? `<button class="btn sm" data-action="send-invoice" data-nr="${i.nr}">${L('common.send')}</button>` : `<button class="btn sm ghost" data-action="remind" data-nr="${i.nr}">${L('dash.remind')}</button>`}
            </li>`).join('') || `<li class="muted small">${L('dash.allPaid')}</li>`}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('dash.feedbackWaiting')}</h2><a class="link" href="#/review/p1/v3">${L('dash.toReview')}</a></div>
          <ul class="list">${D.feedbackWaiting.map(f => { const p = proj(f.projectId); return `
            <li class="row-item click" data-action="go" data-href="#/review/${p.id}/${f.versie}">
              <span class="avatar">${initials(f.van)}</span>
              <div class="grow"><div class="strong">${esc(dc(p.klant))} <span class="muted">· ${esc(f.versie)}</span></div><div class="small muted">“${esc(dc(f.quote))}”</div><div class="tiny muted">${esc(f.van)} · ${esc(dc(f.wanneer))}</div></div>
              <span class="badge" title="${esc(Ln('rev.comments', f.aantal))}">${f.aantal}</span>
            </li>`; }).join('')}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('dash.upcoming')}</h2></div>
          <ul class="list">${upcoming.slice(0, 4).map(u => `
            <li class="row-item click" data-action="go" data-href="#/project/${u.p.id}/callsheet">
              ${dateChip(u.d.datum)}
              <div class="grow"><div class="strong">${esc(ptitle(u.p))}</div><div class="small muted">${esc(dc(u.d.tijd))} · ${esc(dc(u.d.locatie))}</div></div>
            </li>`).join('') || `<li class="muted small">${L('dash.noShoots')}</li>`}</ul>
        </section>
      </div>`;
  }
  function steps(p) { const i = STATUSES.indexOf(p.status); return `<div class="steps" title="${esc(dc(p.status))}">${STATUSES.map((s, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>`; }
  function projectCard(p) {
    return `<a class="proj-card" href="#/project/${p.id}/planning">
      ${thumb(p)}
      <div class="proj-card-body">
        <div class="row-between">${statusPill(p.status)}<span class="tiny muted">${icon('calendar')} ${fdateShort(p.deadline)}</span></div>
        <div class="strong clamp">${esc(ptitle(p))}</div>
        <div class="small muted">${esc(dc(p.klant))}</div>
        ${steps(p)}
      </div></a>`;
  }

  // ---------- Projecten ----------
  function viewProjects() {
    const q = S.search.trim().toLowerCase();
    const list = S.projects.filter(p => (S.projectFilter === 'Alle' || p.status === S.projectFilter) && (!q || (p.titel + ' ' + ptitle(p) + ' ' + p.klant + ' ' + p.type + ' ' + dc(p.type)).toLowerCase().includes(q)));
    return `
      <div class="page-head">
        <div><h1>${L('nav.projects')}</h1><p class="muted">${L('proj.sub', { n: S.projects.length })}</p></div>
        <div class="head-actions"><button class="btn primary" data-action="new-project">${icon('plus')} ${L('top.newProject')}</button></div>
      </div>
      <div class="toolbar">
        <div class="chips">${['Alle'].concat(STATUSES).map(s => `<button class="chip ${S.projectFilter === s ? 'active' : ''}" data-action="filter-status" data-status="${esc(s)}">${esc(s === 'Alle' ? L('common.all') : dc(s))} <span>${s === 'Alle' ? S.projects.length : S.projects.filter(p => p.status === s).length}</span></button>`).join('')}</div>
        <div class="toolbar-right">
          <label class="search-inline">${icon('search')}<input id="proj-search" type="search" placeholder="${esc(L('proj.searchPh'))}" value="${esc(S.search)}" aria-label="${esc(L('proj.searchLabel'))}"></label>
          <div class="seg"><button class="${S.projectView === 'kaarten' ? 'active' : ''}" data-action="proj-view" data-v="kaarten">${L('proj.cards')}</button><button class="${S.projectView === 'lijst' ? 'active' : ''}" data-action="proj-view" data-v="lijst">${L('proj.list')}</button></div>
        </div>
      </div>
      ${!list.length ? `<div class="empty card">${icon('folder')}<p>${q ? L('proj.noneFor', { q: esc(S.search) }) : L('proj.none')}</p><button class="btn" data-action="clear-filters">${L('proj.clear')}</button></div>` :
        S.projectView === 'kaarten' ? `<div class="proj-cards wide">${list.map(projectCard).join('')}</div>` : `
      <div class="card table-wrap"><table class="table">
        <thead><tr><th>${L('proj.th.project')}</th><th>${L('proj.th.client')}</th><th>${L('proj.th.status')}</th><th>${L('proj.th.deadline')}</th><th class="num">${L('proj.th.budget')}</th><th></th></tr></thead>
        <tbody>${list.map(p => `<tr class="click" data-action="go" data-href="#/project/${p.id}/planning">
          <td><div class="cell-proj">${thumb(p, 'mini')}<span class="strong">${esc(ptitle(p))}</span></div></td><td>${esc(dc(p.klant))}</td><td>${statusPill(p.status)}</td><td>${fdate(p.deadline)}</td><td class="num">${eur(p.budget)}</td><td class="num"><span class="link">${L('proj.open')}</span></td></tr>`).join('')}</tbody>
      </table></div>`}`;
  }

  // ---------- Projectpagina ----------
  const TABS = ['planning', 'callsheet', 'shotlist', 'bestanden', 'feedback', 'email', 'uren', 'financien'].map(k => [k, 'pj.tab.' + k]);
  function viewProject(p, tab) {
    if (!TABS.find(t => t[0] === tab)) tab = 'planning';
    const body = { planning: tabPlanning, callsheet: tabCallsheet, shotlist: tabShotlist, bestanden: tabFiles, feedback: tabFeedback, email: tabEmail, uren: tabHours, financien: tabFinance }[tab](p);
    const unread = (S.email.threads[p.id] || []).filter(m => m.nieuw).length;
    const si = STATUSES.indexOf(p.status);
    return `
      <a class="back" href="#/projecten">${icon('arrowLeft')} ${L('nav.projects')}</a>
      <div class="proj-hero card">
        ${thumb(p, 'hero-thumb')}
        <div class="grow">
          <div class="row gap wrap">${statusPill(p.status)}<span class="small muted">${L('pj.meta', { type: esc(dc(p.type)), d: fdate(p.deadline), b: eur(p.budget) })}</span></div>
          <h1>${esc(ptitle(p))}</h1>
          <p class="muted">${L('pj.contact', { k: esc(dc(p.klant)), c: esc(p.contact) })}</p>
          <div class="stepper">${STATUSES.map((s, k) => `<button class="step ${k < si ? 'done' : ''} ${k === si ? 'current' : ''}" data-action="set-status" data-id="${p.id}" data-status="${esc(s)}" title="${esc(L('pj.setStatus', { s: dc(s) }))}"><span class="dot">${k < si ? icon('check') : k + 1}</span><span class="lbl">${esc(dc(s))}</span></button>`).join('')}</div>
        </div>
        <div class="hero-actions">
          <a class="btn primary" href="#/review/${p.id}">${icon('play')} ${L('pj.openReview')}</a>
          <a class="btn" href="#/klant/${p.id}">${icon('eye')} ${L('top.client')}</a>
          <button class="btn ghost" data-action="quote-for" data-id="${p.id}">${icon('file')} ${L('pj.makeQuote')}</button>
          ${timerBtnHtml(p)}
        </div>
      </div>
      <nav class="tabs">${TABS.map(t => `<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/project/${p.id}/${t[0]}">${L(t[1])}${t[0] === 'email' && unread ? ` <span class="tab-badge" title="${esc(L('pj.newCount', { n: unread }))}">${unread}</span>` : ''}</a>`).join('')}</nav>
      <div class="tab-body">${body}</div>`;
  }
  function tabPlanning(p) {
    const pl = S.planning[p.id];
    return `<div class="grid-2">
      <section class="card">
        <div class="card-head"><h2>${L('pj.shootDays')}</h2><button class="btn sm" data-action="add-shootday" data-id="${p.id}">${icon('plus')} ${L('pj.shootDay')}</button></div>
        ${pl.draaidagen.length ? `<ul class="list">${pl.draaidagen.map(d => `
          <li class="row-item">
            ${dateChip(d.datum)}
            <div class="grow"><div class="strong">${esc(dc(d.titel))}</div><div class="small muted">${icon('clock')} ${esc(dc(d.tijd))} · ${icon('pin')} ${esc(dc(d.locatie))}</div><div class="small muted">${icon('users')} ${esc(dc(d.crew))}</div>${calProvider() && S.agenda.autoZet ? `<span class="cal-tag">${icon('calendar')} ${L('pj.inCal', { c: esc(calLabel(calProvider())) })}</span>` : ''}</div>
            <button class="btn sm ghost" data-action="open-callsheet" data-id="${p.id}" data-datum="${esc(d.datum)}">${L('pj.tab.callsheet')}</button>
          </li>`).join('')}</ul>` : `<div class="empty small">${icon('calendar')}<p>${L('pj.noShootDays')}</p></div>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>${L('pj.locations')}</h2><button class="btn sm" data-action="add-location" data-id="${p.id}">${icon('plus')} ${L('pj.location')}</button></div>
        ${pl.locaties.length ? `<ul class="list">${pl.locaties.map(l => `
          <li class="row-item"><span class="icon-box">${icon('pin')}</span><div class="grow"><div class="strong">${esc(dc(l.naam))}</div><div class="small muted">${esc(dc(l.adres))}</div><div class="small">${esc(dc(l.notitie))}</div></div><button class="btn sm ghost" data-action="route">${L('common.route')}</button></li>`).join('')}</ul>` : `<div class="empty small">${icon('pin')}<p>${L('pj.noLocations')}</p></div>`}
      </section>
    </div>`;
  }
  function tabShotlist(p) {
    const sl = S.shotlist[p.id]; const done = sl.filter(s => s.klaar).length;
    return `<div class="grid-2 wide-left">
      <section class="card">
        <div class="card-head"><h2>${L('pj.shotlist')}</h2><span class="small muted">${L('pj.shotsDone', { d: done, n: sl.length })}</span></div>
        <div class="progress"><div style="width:${sl.length ? done / sl.length * 100 : 0}%"></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th></th><th>${L('pj.th.sc')}</th><th>${L('pj.th.shot')}</th><th>${L('pj.th.type')}</th><th>${L('pj.th.lens')}</th><th>${L('pj.th.loc')}</th></tr></thead>
          <tbody>${sl.map((s, i) => `<tr class="${s.klaar ? 'done-row' : ''}"><td><input type="checkbox" data-action="toggle-shot" data-id="${p.id}" data-i="${i}" ${s.klaar ? 'checked' : ''} aria-label="${esc(L('pj.shotDone'))}"></td><td>${esc(s.scene)}</td><td>${esc(dc(s.shot))}</td><td><span class="tag">${esc(s.type)}</span></td><td class="small">${esc(dc(s.lens))}</td><td class="small">${esc(dc(s.locatie))}</td></tr>`).join('') || `<tr><td colspan="6" class="muted">${L('pj.noShots')}</td></tr>`}</tbody>
        </table></div>
        <form class="inline-form" data-form="add-shot" data-id="${p.id}">
          <input name="shot" placeholder="${esc(L('pj.shotPh'))}" required aria-label="${esc(L('pj.newShot'))}">
          <select name="type" aria-label="${esc(L('pj.shotType'))}"><option>Wide</option><option>Medium</option><option>Close-up</option><option>Insert</option><option>Aerial</option></select>
          <button class="btn sm primary" type="submit">${icon('plus')} ${L('pj.th.shot')}</button>
        </form>
      </section>
      <section class="card">
        <div class="card-head"><h2>${L('pj.runningOrder')}</h2><a class="btn sm ghost" href="#/project/${p.id}/callsheet">${icon('calendar')} ${L('pj.openCallsheet')}</a></div>
        <ol class="timeline">${D.draaiboek.map(d => `<li><span class="t">${d.tijd}</span><span>${esc(dc(d.item))}</span></li>`).join('')}</ol>
      </section>
    </div>`;
  }
  function tabFiles(p) {
    const fl = S.files[p.id]; const maps = [...new Set(fl.map(f => f.map))];
    return `<section class="card">
      <div class="card-head"><h2>${L('pj.tab.bestanden')}</h2><div class="row gap"><button class="btn sm ghost" data-action="share-folder">${icon('link')} ${L('pj.shareClient')}</button><button class="btn sm primary" data-action="upload-file" data-id="${p.id}">${icon('upload')} ${L('pj.upload')}</button></div></div>
      <div class="storage"><div class="small muted">${L('pj.storage', { u: num(1.24, 2) })}</div><div class="progress"><div style="width:62%"></div></div></div>
      <div id="upload-progress"></div>
      ${maps.map(m => `<h3 class="folder-h">${icon('folder')} ${esc(dc(m))}</h3><ul class="list files">${fl.filter(f => f.map === m).map(f => `
        <li class="row-item"><span class="icon-box">${icon(/\.(mp4|mov)$/.test(f.naam) ? 'film' : 'file')}</span><div class="grow"><div class="strong">${esc(f.naam)}</div><div class="small muted">${size(f.grootte)} · ${esc(Fx.dm(f.datum))}</div></div><button class="icon-btn" data-action="download" data-name="${esc(f.naam)}" aria-label="${esc(L('common.download'))}">${icon('download')}</button></li>`).join('')}</ul>`).join('')}
    </section>`;
  }
  function tabFeedback(p) {
    const c = S.comments[p.id];
    return `<div class="grid-2 wide-left">
      <section class="card">
        <div class="card-head"><h2>${L('pj.fbPerVersion')}</h2><a class="btn sm primary" href="#/review/${p.id}">${icon('play')} ${L('pj.openReview')}</a></div>
        ${['v3', 'v2', 'v1'].map(v => { const list = (c[v] || []).slice().sort((a, b) => a.t - b.t); const open = list.filter(x => !x.opgelost).length; return `
          <div class="version-block">
            <div class="row-between"><div class="row gap wrap"><span class="vtag">${v}</span><span class="strong">${Ln('rev.comments', list.length)}</span>${open ? `<span class="pill inv-open">${L('pj.nOpen', { n: open })}</span>` : `<span class="pill inv-betaald">${L('pj.allResolved')}</span>`}${S.approved[p.id + ':' + v] ? `<span class="pill inv-betaald">${L('pj.approved')}</span>` : ''}</div><a class="link" href="#/review/${p.id}/${v}">${L('pj.viewVersion', { v })}</a></div>
            <ul class="comments mini">${list.map(x => `<li class="${x.opgelost ? 'resolved' : ''}"><a class="tc" href="#/review/${p.id}/${v}">${tc(x.t)}</a><div><span class="strong">${esc(x.van)}</span> <span>${esc(dc(x.tekst))}</span></div></li>`).join('')}</ul>
          </div>`; }).join('')}
      </section>
      <section class="card">
        <div class="card-head"><h2>${L('pj.reviewLink')}</h2></div>
        <p class="small muted">${L('pj.reviewLinkSub')}</p>
        <div class="copy-field"><input readonly value="https://frame.voorbeeld/r/${p.id}-8f3k2" aria-label="${esc(L('pj.reviewLink'))}"><button class="btn sm" data-action="copy-link">${L('common.copy')}</button></div>
        <a class="btn block" href="#/klant/${p.id}">${icon('eye')} ${L('top.client')}</a>
      </section>
    </div>`;
  }
  function tabHours(p) {
    const h = S.hours[p.id]; const tu = projectHours(p.id), tk = projectKm(p.id);
    return `${isPro() ? '' : lockedHtml('timer')}<div class="kpis three">
        <div class="kpi"><span class="kpi-label">${L('pj.hoursProject')}</span><strong>${num(tu, 2)} ${L('common.hoursShort')}</strong><span class="small muted">${L('pj.countsCriterion')}</span></div>
        <div class="kpi"><span class="kpi-label">${L('pj.km')}</span><strong>${num(tk, 0)} km</strong><span class="small muted">${L('pj.kmRate', { a: eur(tk * 0.23), r: eur(0.23) })}</span></div>
        <div class="kpi"><span class="kpi-label">${L('pj.effRate')}</span><strong>${tu ? eur((p.budget - financeCosts(p.id)) / tu) : '–'}</strong><span class="small muted">${L('pj.effRateSub')}</span></div>
      </div>
      <section class="card">
        <div class="card-head"><h2>${L('pj.hoursKm')}</h2>${timerBtnHtml(p, true)}</div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>${L('common.date')}</th><th>${L('pj.activity')}</th><th class="num">${L('pj.hoursCol')}</th><th class="num">${L('pj.kmCol')}</th></tr></thead>
          <tbody>${h.map(x => `<tr><td>${fdateShort(x.datum)}</td><td>${esc(hourAct(x))}${x.tid ? ` <button class="tag timer-tag" data-action="hours-edit" data-id="${p.id}" data-tid="${esc(x.tid)}" title="${esc(L('pj.timerTitle'))}">${icon('clock')} ${L('pj.timerEdit')}</button>` : ''}</td><td class="num">${num(x.uren, 2)}</td><td class="num">${num(x.km, 0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">${L('pj.total')}</td><td class="num">${num(tu, 2)}</td><td class="num">${num(tk, 0)}</td></tr></tfoot>
        </table></div>
        <form class="inline-form" data-form="add-hours" data-id="${p.id}">
          <input type="date" name="datum" value="2026-10-01" required aria-label="${esc(L('common.date'))}">
          <input name="activiteit" placeholder="${esc(L('pj.activityPh'))}" required aria-label="${esc(L('pj.activity'))}">
          <input type="number" name="uren" min="0" step="0.25" placeholder="${esc(L('pj.hoursCol'))}" required aria-label="${esc(L('pj.hoursCol'))}">
          <input type="number" name="km" min="0" step="1" placeholder="${esc(L('pj.kmCol'))}" aria-label="${esc(L('pj.km'))}">
          <button class="btn sm primary" type="submit">${icon('plus')} ${L('common.add')}</button>
        </form>
      </section>`;
  }
  // Activiteit in de urentabel: timerregels opnieuw opbouwen (activiteit vertaald + eigen omschrijving), demo-regels via dc
  function hourAct(x) { const e = x.tid && S.timerUren.find(u => u.id === x.tid); return e ? dc(e.act) + (e.oms ? ' – ' + e.oms : '') : dc(x.activiteit); }
  function tabFinance(p) {
    const f = S.finance[p.id]; const kosten = financeCosts(p.id); const tu = projectHours(p.id);
    const act = d => d.projectId && d.status === 'Concept' ? `<button class="btn sm ghost" data-action="send-invoice" data-nr="${esc(d.nr)}">${icon('send')} ${L('common.send')}</button>` : d.status === 'Open' || d.status === 'Verlopen' ? `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="herinnering" data-nr="${esc(d.nr)}">${icon('send')} ${L('dash.remind')}</button>` : d.status === 'Verstuurd' ? `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="offerte">${icon('send')} ${L('pj.resend')}</button>` : d.status === 'Betaald' || d.status === 'Geaccepteerd' ? '' : `<button class="btn sm ghost" data-action="quote-for" data-id="${p.id}">${L('pj.make')}</button>`;
    const q = S.quotes[p.id];
    const doc = (label, d, extra, inv) => `<div class="fin-doc card"><div class="small muted">${label}</div><div class="strong big">${eur(d.bedrag)}</div><div class="small muted">${esc(d.nr)} · ${esc(invDatum(d))}</div>${extra || ''}<div class="row-between">${statusPillInv(d.status)}${act(d)}</div>${inv ? tikkieStatusHtml(d.nr) + tikkieActionsHtml(d.nr, p.id, d.status) : ''}</div>`;
    return `${quoteSignCard(p)}<div class="fin-docs">
        ${doc(L('pj.quoteExcl'), f.offerte, q ? `<div class="tiny ${q.signed ? 'ok' : 'muted'}">${icon(q.signed ? 'check' : 'pen')} ${q.signed ? L('pj.signedDigital') : L('pj.awaitingSig')}</div>` : '')}
        ${doc(L('pj.inclVat', { x: esc(dc(f.aanbetaling.omschrijving || 'Aanbetaling')) }), f.aanbetaling, '', true)}
        ${doc(L('pj.inclVat', { x: esc(dc('Eindfactuur')) }), f.eindfactuur, '', true)}
      </div>
      <div class="grid-2 wide-left">
        <section class="card">
          <div class="card-head"><h2>${L('pj.freelancers')}</h2><button class="btn sm" data-action="add-freelancer" data-id="${p.id}">${icon('plus')} ${L('pj.freelancer')}</button></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>${L('common.name')}</th><th>${L('pj.role')}</th><th class="num">${L('pj.days')}</th><th class="num">${L('pj.costs')}</th></tr></thead>
            <tbody>${f.freelancers.map(x => `<tr><td>${esc(dc(x.naam))}</td><td><span class="tag">${esc(dc(x.rol))}</span></td><td class="num">${num(x.dagen, 1)}</td><td class="num">${eur(x.kosten)}</td></tr>`).join('')}
            ${f.overig.map(x => `<tr><td colspan="3">${esc(dc(x.omschrijving))}</td><td class="num">${eur(x.kosten)}</td></tr>`).join('')}
            ${!f.freelancers.length && !f.overig.length ? `<tr><td colspan="4" class="muted">${L('pj.noCosts')}</td></tr>` : ''}</tbody>
          </table></div>
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('pj.result')}</h2></div>
          <dl class="sum">
            <dt>${L('pj.revenueExcl')}</dt><dd>${eur(p.budget)}</dd>
            <dt>${L('pj.costsExtras')}</dt><dd>− ${eur(kosten)}</dd>
            <dt class="strong">${L('pj.margin')}</dt><dd class="strong">${eur(p.budget - kosten)}</dd>
            <dt>${L('pj.hoursWorked')}</dt><dd>${num(tu, 2)} ${L('common.hoursShort')}</dd>
            <dt>${L('pj.effRate')}</dt><dd>${tu ? eur((p.budget - kosten) / tu) : '–'}</dd>
          </dl>
          <p class="tiny muted">${L('pj.syncNote')}</p>
        </section>
      </div>`;
  }
  function mountProject(p, tab) {
    if (tab === 'email') (S.email.threads[p.id] || []).forEach(m => { m.nieuw = false; });
  }

  // ---------- Review ----------
  function videoTag(v, extra) { return `<video id="vid" controls playsinline preload="metadata" ${extra || ''}>${D.videos[v].map(src => `<source src="${src}" type="video/mp4">`).join('')}${L('rev.noVideo')}</video>`; }
  function reviewProjectSelect(p) {
    const list = S.projects.filter(x => x.versie !== '-' || x.id === p.id);
    return `<select class="select" data-action-change="review-project" aria-label="${esc(L('rev.pickProject'))}">${list.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(dc(x.klant))} – ${esc(ptitle(x))}</option>`).join('')}</select>`;
  }
  function viewReview(p, v) {
    if (p.versie === '-') {
      return `<div class="page-head"><div><h1>${L('nav.review')}</h1><p class="muted">${esc(ptitle(p))} · ${esc(dc(p.klant))}</p></div><div class="head-actions">${reviewProjectSelect(p)}</div></div>
        <div class="empty card">${icon('film')}<p>${L('rev.noVersion')}</p><button class="btn primary" data-action="upload-v1" data-id="${p.id}">${icon('upload')} ${L('rev.uploadV1')}</button></div>`;
    }
    const list = (S.comments[p.id][v] || []).slice().sort((a, b) => a.t - b.t);
    const filtered = list.filter(c => S.commentFilter === 'Alle' || (S.commentFilter === 'Open' ? !c.opgelost : c.opgelost));
    const appr = S.approved[p.id + ':' + v];
    const fl = { Alle: L('common.all'), Open: L('rev.fOpen'), Opgelost: L('rev.fResolved') };
    return `
      <div class="page-head">
        <div><a class="back" href="#/project/${p.id}/feedback">${icon('arrowLeft')} ${esc(ptitle(p))}</a><h1>${L('nav.review')}</h1><p class="muted">${L('rev.sub', { k: esc(dc(p.klant)) })}</p></div>
        <div class="head-actions">${reviewProjectSelect(p)}<button class="btn" data-action="share-review" data-id="${p.id}">${icon('link')} ${L('rev.share')}</button><button class="btn primary" data-action="approve" data-id="${p.id}" data-v="${v}" ${appr ? 'disabled' : ''}>${icon('check')} ${appr ? L('rev.approvedBtn') : L('rev.approve')}</button></div>
      </div>
      ${appr ? `<div class="banner ok">${icon('check')}<span class="grow">${L('rev.approvedBanner', { v, d: stamp(appr) })}</span><button class="btn sm" data-action="compose" data-id="${p.id}" data-kind="oplevering">${icon('send')} ${L('rev.mailClient')}</button></div>` : ''}
      <div class="review">
        <div class="review-main card">
          <div class="vswitch" role="tablist">${['v1', 'v2', 'v3'].map(x => `<a role="tab" class="${x === v ? 'active' : ''}" href="#/review/${p.id}/${x}">${x}${x === p.versie ? ` <small>${L('rev.latest')}</small>` : ''}</a>`).join('')}<span class="tiny muted vs-note">${L('rev.sampleNote')}</span></div>
          <div class="player" id="player">
            ${videoTag(v)}
            <div class="sub-overlay" id="sub-overlay" hidden></div>
            <div class="player-fallback" id="fallback" hidden>
              <div class="fb-inner" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><button class="fb-play" data-action="fb-toggle" aria-label="${esc(L('rev.play'))}">${icon('play')}</button><div class="small">${L('rev.fallback')}</div></div>
            </div>
          </div>
          <div class="scrub" id="scrub" data-action="scrub" title="${esc(L('rev.scrub'))}">
            <div class="scrub-fill" id="scrub-fill"></div>
            ${list.map(c => `<button class="marker ${c.rol} ${c.opgelost ? 'resolved' : ''}" data-action="seek" data-t="${c.t}" style="left:${Math.min(99, c.t / 10 * 100)}%" title="${tc(c.t)} – ${esc(c.van)}" aria-label="${esc(L('rev.jumpTo', { t: tc(c.t) }))}"></button>`).join('')}
          </div>
          <div class="row-between player-meta"><span class="tc-now" id="tc-now">${tc(0)}</span><span class="small muted">${Ln('rev.comments', list.length)} · ${L('pj.nOpen', { n: list.filter(c => !c.opgelost).length })}</span></div>
          <form class="comment-form" data-form="add-comment" data-id="${p.id}" data-v="${v}">
            <span class="avatar sm">SV</span>
            <input name="tekst" placeholder="${esc(L('rev.commentPh'))}" required autocomplete="off" aria-label="${esc(L('rev.newComment'))}">
            <button class="btn primary sm" type="submit">${icon('msg')} ${L('rev.post')}</button>
          </form>
          ${subsPanelHtml(p, v)}
        </div>
        <aside class="review-side card">
          <div class="card-head"><h2>${L('rev.commentsV', { v })}</h2><div class="seg sm">${['Alle', 'Open', 'Opgelost'].map(f => `<button class="${S.commentFilter === f ? 'active' : ''}" data-action="comment-filter" data-f="${f}">${fl[f]}</button>`).join('')}</div></div>
          <ul class="comments" id="comments">${filtered.map(c => `
            <li class="comment ${c.opgelost ? 'resolved' : ''}" data-action="seek" data-t="${c.t}" tabindex="0">
              <div class="row-between"><span class="row gap"><span class="avatar sm ${c.rol}">${initials(c.van)}</span><span class="strong">${esc(c.van)}</span></span><span class="tc">${tc(c.t)}</span></div>
              <p>${esc(dc(c.tekst))}</p>
              <label class="resolve" data-stop="1"><input type="checkbox" data-action="resolve" data-id="${p.id}" data-v="${v}" data-t="${c.t}" data-txt="${esc(c.tekst)}" ${c.opgelost ? 'checked' : ''}> ${L('rev.fResolved')}</label>
            </li>`).join('') || `<li class="muted small">${L('rev.noComments')}</li>`}</ul>
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
  const CLIENT_STEPS = ['enquiry', 'quote', 'prep', 'shoot', 'edit', 'feedback', 'delivered'].map(k => 'por.step.' + k);
  function portalBar(p, label, backHref, backLabel) {
    return `<div class="preview-bar">${icon('eye')}<span>${label}</span><a class="btn sm" href="${backHref || '#/project/' + p.id + '/planning'}">${icon('arrowLeft')} ${backLabel || L('por.back')}</a></div>`;
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
    return S.portal.uploads.map((u, i) => `<li class="row-item"><span class="icon-box">${icon('file')}</span><div class="grow"><div class="strong small">${esc(u.naam)}</div>${u.klaar ? `<div class="tiny muted">${L('por.received', { s: size(u.grootte) })}</div>` : `<div class="progress thin"><div style="width:${u.pct || 0}%"></div></div>`}</div>${u.klaar ? `<span class="ok">${icon('check')}</span>` : ''}</li>`).join('');
  }
  const portalFoot = () => `<footer class="portal-foot">${L('por.foot', { s: esc(D.studio.naam), brand: '<span class="pf-brand"><img class="pf-mark" src="img/beeldmerk.svg" alt=""><strong>Diafragmo</strong></span>' })}</footer>`;
  function viewPortal(p) {
    const idx = STATUSES.indexOf(p.status);
    const inv = portalInvoice(p);
    const paid = !!S.portal.paidIds[p.id] || inv.status === 'Betaald';
    const approved = p.status === 'Opgeleverd' || !!S.approved[p.id + ':' + p.versie];
    const v = p.versie !== '-' ? p.versie : 'v1';
    const cur = approved ? 6 : idx;
    const q = S.quotes[p.id], qMain = !!q && p.versie === '-', qPending = !!q && !q.signed;
    const hint = L('por.idealHint');
    return `${portalBar(p, L('por.bar', { c: esc(p.contact), k: esc(dc(p.klant)) }))}
    <div class="portal" style="--brand:${S.showreel.kleur}">
      <header class="portal-head">
        <div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${L('por.tagline')}</div></div></div>
        <div class="small muted">${L('por.welcome', { n: esc(p.contact.split(' ')[0] === 'Dr.' ? p.contact : p.contact.split(' ')[0]) })}</div>
      </header>
      <section class="portal-hero">
        <div><div class="small muted">${L('por.yourProject')}</div><h1>${esc(ptitle(p))}</h1><p class="muted">${L('por.expected', { d: fdate(p.deadline) })}</p></div>
        ${qPending ? `<div class="callout">${icon('pen')}<div class="grow"><div class="strong">${L('por.nextSign')}</div><div class="small">${L('por.nextSignSub', { nr: esc(q.nr) })}</div></div><a class="btn sm brand-btn" href="#/klant/${p.id}/offerte">${L('por.view')}</a></div>` : approved ? `<div class="callout ok">${icon('check')}<div><div class="strong">${L('por.approvedTitle')}</div><div class="small">${L('por.approvedSub')}</div></div></div>` : idx >= 5 ? `<div class="callout">${icon('play')}<div><div class="strong">${L('por.nextWatch', { v })}</div><div class="small">${L('por.nextWatchSub')}</div></div></div>` : ''}
      </section>
      <ol class="ctimeline">${CLIENT_STEPS.map((s, k) => `<li class="${k < cur ? 'done' : ''} ${k === cur ? 'current' : ''}"><span class="dot">${k < cur ? icon('check') : ''}</span><span>${L(s)}</span></li>`).join('')}</ol>
      <div class="portal-grid">
        ${qMain ? portalQuoteCard(p, q) : `<section class="pcard span-2">
          <h2>${icon('play')} ${L('por.watch')} <span class="vtag">${v}</span></h2>
          <div class="player small-player">${videoTag(v)}
            <div class="player-fallback" id="fallback" hidden><div class="fb-inner" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><div class="small">${L('por.fallback')}</div></div></div></div>
          <form class="comment-form" data-form="portal-comment">
            <input name="tekst" placeholder="${esc(L('por.fbPh'))}" required autocomplete="off" aria-label="${esc(L('pj.tab.feedback'))}">
            <button class="btn sm brand-btn" type="submit">${L('por.send')}</button>
          </form>
          <ul class="comments mini" id="portal-comments">${S.portal.comments.map(c => `<li><span class="tc">${tc(c.t)}</span><div>${esc(c.tekst)}</div></li>`).join('')}</ul>
          <div class="row-between approve-row">
            <span class="small muted">${approved ? L('por.approvedThanks') : L('por.approveHint')}</span>
            <button class="btn brand-btn" data-action="portal-approve" data-id="${p.id}" ${approved ? 'disabled' : ''}>${icon('check')} ${approved ? L('rev.approvedBtn') : L('rev.approve')}</button>
          </div>
        </section>`}
        <section class="pcard">
          <h2>${icon('upload')} ${L('por.supply')}</h2>
          <label class="dropzone" id="dropzone"><input type="file" id="portal-file" multiple hidden>${icon('upload')}<span class="strong">${L('por.drop')}</span><span class="small muted">${L('por.dropSub')}</span><span class="tiny muted">${L('por.dropNote')}</span></label>
          <button class="btn sm ghost block" data-action="portal-demo-upload">${L('por.addSample')}</button>
          <ul class="list files" id="portal-uploads">${portalUploadsHtml()}</ul>
          <div class="eu-note">${icon('lock')} ${L('por.encrypted')}</div>
        </section>
        <section class="pcard">
          <h2>${icon('download')} ${L('por.final')}</h2>
          ${approved ? `<p class="small muted">${L('por.finalReady')}</p>
            <button class="btn brand-btn block" data-action="portal-download" data-f="${esc(L('por.f.master', { s: dc('2,1 GB') }))}">${icon('download')} ${L('por.dlMaster')}</button>
            <button class="btn block" data-action="portal-download" data-f="${esc(L('por.f.social'))}">${icon('download')} ${L('por.dlSocial')}</button>
            <button class="btn block ghost" data-action="portal-download" data-f="${esc(L('por.f.srt'))}">${L('por.dlSrt')}</button>`
            : `<div class="locked">${icon('lock')}<span>${L('por.afterApproval')}</span></div>`}
        </section>
        <section class="pcard">
          <h2>${icon('euro')} ${L('por.invoice')}</h2>
          ${q && !S.invoices.some(i => i.projectId === p.id && i.status !== 'Concept') ? `<div class="invoice-mini"><div class="small muted">${L('por.deposit', { p: q.aanbetalingPct })}</div><div class="amount">${eur(quoteCalc(q).aanb)}</div><div class="small muted">${q.signed ? L('por.depositSigned') : L('por.depositUnsigned')}</div></div>` : `<div class="invoice-mini">
            <div class="row-between"><span class="small muted">${esc(inv.nr)} · ${esc(dc(inv.omschrijving))}</span>${statusPillInv(paid ? 'Betaald' : 'Open')}</div>
            <div class="amount">${eur(inv.bedrag)}</div>
            <div class="small muted">${L('por.inclDue', { d: fdate(inv.vervalt) })}</div>
          </div>
          ${paid ? `<div class="banner ok small">${icon('check')} ${L('por.paidThanks')}</div>` : `<button class="btn ideal block" data-action="ideal" data-id="${p.id}" aria-label="${esc(L('por.payWith'))} iDEAL | Wero">${L('por.payWith')} <span class="pay-pill">iDEAL | Wero</span></button>${hint ? `<div class="tiny muted pay-hint">${hint}</div>` : ''}`}
          <button class="btn ghost block sm" data-action="download" data-name="${esc(inv.nr)}.pdf">${icon('file')} ${L('por.invoicePdf')}</button>`}
        </section>
      </div>
      <div class="eu-trust"><span class="eu-trust-badge">${euBadge('eu-flag')}${icon('lock')} ${L('por.trust')}</span><span class="eu-trust-sub">${L('por.trustSub')}</span></div>
      ${portalFoot()}
    </div>`;
  }
  function fakeUpload(name, size) {
    const u = { naam: name, grootte: size, klaar: false, pct: 0 }; S.portal.uploads.push(u);
    const redraw = () => { const ul = $('#portal-uploads'); if (ul) ul.innerHTML = portalUploadsHtml(); };
    redraw();
    const iv = setInterval(() => {
      u.pct += 20 + Math.random() * 25;
      if (u.pct >= 100) { u.pct = 100; u.klaar = true; clearInterval(iv); toast(L('por.toastReceived', { n: esc(name) })); }
      redraw();
    }, 300);
    cleanupFns.push(() => { clearInterval(iv); u.klaar = true; });
  }
  const mb = f => num(f.size / 1048576, 1) + ' MB';
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
    return `${portalBar(p, L('por.paidBar'))}
      <div class="portal paid-wrap" style="--brand:${S.showreel.kleur}">
        <div class="paid card">
          <div class="paid-check">${icon('check')}</div>
          <h1>${L('por.paidTitle')}</h1>
          <p class="muted">${L('por.paidText', { a: eur(inv.bedrag), nr: esc(inv.nr) })}</p>
          <p class="small muted">${L('por.paidNotify', { s: esc(D.studio.naam) })}</p>
          <div class="tiny muted">${L('por.paidDemo', { t: stamp(nowLabel()) })}</div>
          <a class="btn brand-btn" href="#/klant/${p.id}">${L('por.backProject')}</a>
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
  // KvK- en btw-nummer op documenten (in DE/EN met uitleg: Handelsregister (KvK) / USt-IdNr.)
  const studioIds = () => `${esc(D.studio.email)}<br>${L('qb.kvk')} ${esc(dc(D.studio.kvk))}<br>${L('qb.vatId')} ${esc(dc(D.studio.btw))}`;
  const qCalc = q => { const sub = q.lines.reduce((a, l) => a + lineTotal(l), 0); const btw = sub * 0.21; return { sub, btw, tot: sub + btw }; };
  function viewBuilder() {
    if (!S.quote) S.quote = defaultQuote('p6');
    const q = S.quote, isInv = q.type === 'Factuur';
    const docs = [
      { nr: 'O2026-021', soort: 'Offerte', klant: proj('p5').klant, bedrag: 2450, status: S.quotes.p5 ? S.quotes.p5.status : 'Verstuurd', pid: 'p5' },
      { nr: 'O2026-018', soort: 'Offerte', klant: proj('p1').klant, bedrag: 4850, status: 'Geaccepteerd', pid: 'p1' }
    ].concat(S.invoices.slice().sort((a, b) => String(b.nr).localeCompare(String(a.nr))).map(i => ({ nr: i.nr, soort: 'Factuur', klant: i.klant, bedrag: i.bedrag, status: i.status, pid: i.projectId })));
    return `
      <div class="page-head">
        <div><h1>${L('nav.finance')}</h1><p class="muted">${L('qb.sub')}</p></div>
        <div class="head-actions"><button class="btn" data-action="new-quote">${icon('plus')} ${L('dash.newQuote')}</button></div>
      </div>
      <div class="builder">
        <section class="card builder-edit">
          <div class="row gap wrap"><span class="doc-type ${isInv ? 'inv' : ''}">${esc(dc(q.type))}</span><span class="strong">${esc(q.nr)}</span>${statusPillInv(q.status)}</div>
          <div class="form-grid three">
            <label>${L('qb.projectClient')}<select data-q="projectId">${S.projects.filter(x => x.status !== 'Opgeleverd').map(x => `<option value="${x.id}" ${x.id === q.projectId ? 'selected' : ''}>${esc(dc(x.klant))} – ${esc(ptitle(x))}</option>`).join('')}</select></label>
            <label>${L('common.date')}<input type="date" data-q="datum" value="${q.datum}"></label>
            <label>${isInv ? L('qb.dueDate') : L('qb.validUntil')}<input type="date" data-q="geldig" value="${q.geldig}"></label>
          </div>
          <div class="table-wrap"><table class="table lines">
            <thead><tr><th class="desc-col">${L('qb.desc')}</th><th class="num">${L('qb.qty')}</th><th class="num">${L('qb.priceEur')}</th><th class="num">${L('pj.total')}</th><th></th></tr></thead>
            <tbody>${q.lines.map((l, i) => `<tr>
              <td><span class="tag soort">${esc(dc(l.soort))}</span><input data-line="${i}" data-f="omschrijving" value="${esc(dc(l.omschrijving))}" placeholder="${esc(L('qb.desc'))}" aria-label="${esc(L('qb.desc'))}"></td>
              <td class="num"><div class="qty"><input type="number" step="any" min="0" data-line="${i}" data-f="aantal" value="${l.aantal}" class="n" aria-label="${esc(L('qb.qty'))}"><span class="tiny muted">${esc(dc(l.eenheid))}</span></div></td>
              <td class="num"><input type="number" step="0.01" min="0" data-line="${i}" data-f="prijs" value="${l.prijs}" class="n" aria-label="${esc(L('qb.price'))}"></td>
              <td class="num strong" id="lt-${i}">${eur(lineTotal(l))}</td>
              <td><button class="icon-btn" data-action="del-line" data-i="${i}" aria-label="${esc(L('qb.delLine'))}">${icon('trash')}</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted">${L('qb.addBelow')}</td></tr>`}</tbody>
          </table></div>
          <div class="add-lines"><span class="small muted">${L('qb.addLine')}</span>
            <button class="chip" data-action="add-line" data-k="Draaidag">+ ${L('qb.p.day')}</button>
            <button class="chip" data-action="add-line" data-k="Halvedag">+ ${L('qb.p.half')}</button>
            <button class="chip" data-action="add-line" data-k="Montage">+ ${L('qb.p.edit')}</button>
            <button class="chip" data-action="add-line" data-k="Kilometers">+ ${L('qb.p.km', { r: eur(0.23) })}</button>
            <button class="chip" data-action="add-line" data-k="Extra">+ ${L('qb.p.extra')}</button>
            <button class="chip" data-action="add-line" data-k="Vrij">+ ${L('qb.p.free')}</button>
          </div>
          <label class="check"><input type="checkbox" data-q="aanbetaling" ${q.aanbetaling ? 'checked' : ''}> ${L('qb.askDeposit')}</label>
          <div class="totals" id="totals"></div>
          ${isInv ? tikkieStatusHtml(q.nr) + (S.tikkie.verzoeken[q.nr] && !S.tikkie.verzoeken[q.nr].betaald && q.status !== 'Betaald' ? tikkieActionsHtml(q.nr, q.projectId, q.status, 'paid-only') : '') : ''}
          <div class="builder-actions">
            <button class="btn ghost" data-action="pdf">${icon('download')} PDF</button>
            ${!isInv ? `<button class="btn" data-action="to-invoice">${icon('euro')} ${L('qb.toInvoice')}</button><button class="btn primary" data-action="send-quote">${icon('send')} ${L('qb.sendQuote')}</button>`
              : `<button class="btn" data-action="back-to-quote">${L('qb.backQuote')}</button>${tikkieOn() && q.status !== 'Betaald' ? `<button class="btn" data-action="tikkie-open" data-id="${q.projectId}" data-nr="${esc(q.nr)}">${icon('send')} ${L('tk2.send')}</button>` : ''}<button class="btn primary" data-action="send-quote">${icon('send')} ${L('qb.sendInvoice')}</button>`}
          </div>
        </section>
        <section class="doc-preview card" id="quote-preview" aria-label="${esc(L('qb.preview'))}"></section>
      </div>
      <section class="card sign-overview">
        <div class="card-head"><h2>${icon('pen')} ${L('qb.signTitle')}</h2><span class="small muted">${L('qb.waitingSig', { n: Object.keys(S.quotes).filter(k => !S.quotes[k].signed).length })}</span></div>
        <ul class="list">${Object.keys(S.quotes).map(k => { const qq = S.quotes[k], pp = proj(k); return `<li class="row-item sign-row">
          <span class="icon-box">${icon('file')}</span>
          <div class="grow"><div class="strong">${esc(qq.nr)} · ${esc(dc(pp.klant))}</div>${signStatusHtml(qq)}</div>
          <div class="row gap wrap sign-row-actions">${qq.signed ? '' : `<button class="btn sm" data-action="sign-copy" data-id="${k}">${icon('link')} ${L('qb.copySignLink')}</button>`}<button class="btn sm ghost" data-action="quote-view" data-id="${k}">${L('common.view')}</button></div>
        </li>`; }).join('') || `<li class="muted small">${L('qb.noneWaiting')}</li>`}</ul>
      </section>
      <section class="card">
        <div class="card-head"><h2>${L('qb.recent')}</h2></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>${L('qb.th.nr')}</th><th>${L('qb.th.kind')}</th><th>${L('proj.th.client')}</th><th class="num">${L('qb.th.amount')}</th><th>${L('proj.th.status')}</th><th></th></tr></thead>
          <tbody>${docs.map(d => `<tr class="click" data-action="go" data-href="#/project/${d.pid}/financien"><td class="strong nr-cell">${esc(d.nr)}</td><td>${esc(dc(d.soort))}</td><td>${esc(dc(d.klant))}</td><td class="num">${eur(d.bedrag)}${d.soort === 'Offerte' ? ` <span class="tiny muted">${L('qb.excl')}</span>` : ''}</td><td>${statusPillInv(d.status)}${d.soort === 'Factuur' ? tikkieStatusHtml(d.nr) : ''}</td><td class="num"><div class="doc-row-actions">${d.soort === 'Factuur' ? tikkieActionsHtml(d.nr, d.pid, d.status) : ''}<span class="link">${L('qb.toProject')}</span></div></td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }
  function renderQuoteLive() {
    const q = S.quote; if (!q) return; const p = proj(q.projectId) || proj('p6'); const c = qCalc(q);
    q.lines.forEach((l, i) => { const el = $('#lt-' + i); if (el) el.textContent = eur(lineTotal(l)); });
    const t = $('#totals'), isInv = q.type === 'Factuur';
    if (t) t.innerHTML = `<dl class="sum"><dt>${L('qb.subtotal')}</dt><dd>${eur(c.sub)}</dd><dt>${L('qb.vat21')}</dt><dd>${eur(c.btw)}</dd><dt class="strong total">${L('qb.totalIncl')}</dt><dd class="strong total" id="grand-total">${eur(c.tot)}</dd>${q.aanbetaling && !isInv ? `<dt class="muted">${L('qb.deposit50')}</dt><dd class="muted">${eur(c.tot / 2)}</dd>` : ''}</dl>`;
    const pv = $('#quote-preview');
    if (pv) pv.innerHTML = `
      <div class="doc">
        <div class="doc-top"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${studioIds()}</div></div></div><div class="doc-title">${esc(dc(q.type).toUpperCase())}<div class="tiny muted">${esc(q.nr)}</div></div></div>
        <div class="doc-meta"><div><div class="tiny muted">${L('qb.to')}</div><div class="strong">${esc(dc(p.klant))}</div><div class="small">${L('qb.attn', { c: esc(p.contact) })}</div></div><div><div class="tiny muted">${L('common.date')}</div><div class="small">${fdate(q.datum)}</div><div class="tiny muted">${isInv ? L('qb.dueDate') : L('qb.validUntil')}</div><div class="small">${fdate(q.geldig)}</div></div></div>
        <div class="small"><span class="muted">${L('qb.re')}</span> ${esc(ptitle(p))}</div>
        <table class="doc-lines"><thead><tr><th>${L('qb.desc')}</th><th class="num">${L('qb.qty')}</th><th class="num">${L('qb.price')}</th><th class="num">${L('pj.total')}</th></tr></thead>
          <tbody>${q.lines.map(l => `<tr><td>${esc(dc(l.omschrijving) || '—')}</td><td class="num">${num(l.aantal, 2)} ${esc(dc(l.eenheid))}</td><td class="num">${eur(l.prijs)}</td><td class="num">${eur(lineTotal(l))}</td></tr>`).join('')}</tbody></table>
        <dl class="sum doc-sum"><dt>${L('qb.subtotal')}</dt><dd>${eur(c.sub)}</dd><dt>${L('qb.vat21')}</dt><dd>${eur(c.btw)}</dd><dt class="strong">${L('pj.total')}</dt><dd class="strong">${eur(c.tot)}</dd></dl>
        ${isInv ? `<div class="doc-pay"><span class="pay-pill">iDEAL | Wero</span><div class="small">${L('qb.payText', { iban: esc(dc(D.studio.iban)), nr: esc(q.nr) })}</div></div>`
          : `<div class="small muted">${q.aanbetaling ? L('qb.depositText', { a: eur(c.tot / 2) }) + ' ' : ''}${L('qb.approveOnline')}</div>`}
        <div class="tiny muted doc-foot">${L('qb.sampleDoc')}</div>
      </div>`;
  }

  // ---------- Showreel ----------
  const orderedReel = () => S.showreel.items.map(it => Object.assign({ p: proj(it.id) }, it)).filter(x => x.p);
  function viewShowreelEditor() {
    const sr = S.showreel;
    const items = orderedReel();
    return `
      <div class="page-head">
        <div><h1>${L('nav.showreel')}</h1><p class="muted">${L('sr.sub')}</p></div>
        <div class="head-actions"><a class="btn" href="#/showreel/live">${icon('ext')} ${L('sr.viewPublic')}</a><button class="btn primary" data-action="publish">${icon('globe')} ${L('sr.publish')}</button></div>
      </div>
      <div class="reel-grid">
        <div class="reel-left">
        <section class="card">
          <div class="card-head"><h2>${L('sr.projects')}</h2><span class="small muted">${L('sr.selected', { a: sr.items.filter(i => i.on).length, b: sr.items.length })}</span></div>
          <p class="tiny muted">${L('sr.dragHint')}</p>
          <ul class="reel-list" id="reel-list">${items.map((it, i) => `
            <li class="reel-item ${it.on ? '' : 'off'}" draggable="true" data-i="${i}">
              <span class="grip" title="${esc(L('sr.drag'))}">${icon('grip')}</span>
              <input type="checkbox" data-action="sr-toggle" data-i="${i}" ${it.on ? 'checked' : ''} aria-label="${esc(L('sr.showIn', { t: ptitle(it.p) }))}">
              ${thumb(it.p, 'mini')}
              <div class="grow"><div class="strong small">${esc(ptitle(it.p))}</div><div class="tiny muted">${esc(dc(it.p.klant))}</div></div>
              <button class="icon-btn" data-action="sr-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(L('sr.up'))}">${icon('up')}</button>
              <button class="icon-btn" data-action="sr-move" data-i="${i}" data-d="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="${esc(L('sr.down'))}">${icon('down')}</button>
            </li>`).join('')}</ul>
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('sr.pageSettings')}</h2></div>
          <div class="form-col">
            <label>${L('sr.domain')}<div class="input-prefix"><span>https://</span><input data-sr="domein" value="${esc(sr.domein)}" placeholder="${esc(L('sr.domainPh'))}"></div><span class="tiny muted">${L('sr.domainHint')}</span></label>
            <label>${L('sr.pageTitle')}<input data-sr="titel" value="${esc(sr.titel)}"></label>
            <label>${L('sr.intro')}<textarea data-sr="intro" rows="4">${esc(srIntro())}</textarea></label>
            <div><div class="lbl-txt">${L('sr.accent')}</div><div class="swatches">${['#ff6a3d', '#6366f1', '#10b981', '#e11d48', '#0ea5e9', '#f5b301'].map(c => `<button class="swatch ${c === sr.kleur ? 'active' : ''}" style="background:${c}" data-action="sr-color" data-c="${c}" aria-label="${esc(L('sr.colour', { c }))}"></button>`).join('')}</div></div>
            <label class="check"><input type="checkbox" data-sr="formulier" ${sr.formulier ? 'checked' : ''}> ${L('sr.showForm')}</label>
          </div>
        </section>
        </div>
        <section class="card reel-preview-card">
          <div class="card-head"><h2>${L('sr.livePreview')}</h2><a class="link" href="#/showreel/live">${L('sr.fullscreen')}</a></div>
          <div class="browser"><div class="browser-bar"><span></span><span></span><span></span><div class="url">${icon('lock')} ${esc(sr.domein || L('sr.domainPh'))}</div></div>
            <div class="browser-body"><div class="mini-site" style="--brand:${sr.kleur}">${publicSiteInner(true)}</div></div></div>
        </section>
      </div>`;
  }
  function publicSiteInner(mini) {
    const sr = S.showreel; const items = orderedReel().filter(i => i.on); const feat = items[0];
    const nav = (t, label, cls) => mini ? `<span class="${cls || ''}">${label}</span>` : `<a href="#/showreel/live" class="${cls || ''}" data-action="scroll" data-target="${t}">${label}</a>`;
    return `
      <header class="site-head"><span class="site-logo">${esc(initials(sr.titel || 'S V') || 'SV')}</span><span class="strong">${esc(sr.titel)}</span><nav class="site-nav">${nav('site-werk', L('site.work'))}${mini ? '' : nav('site-over', L('site.about'))}${sr.formulier ? nav('site-form', L('site.request'), 'site-cta') : ''}</nav></header>
      <section class="site-hero">
        <div><h1>${esc(sr.titel)}</h1><p>${esc(srIntro())}</p>${sr.formulier ? (mini ? `<span class="site-btn">${L('site.askQuote')}</span>` : `<a href="#/showreel/live" class="site-btn" data-action="scroll" data-target="site-form">${L('site.askQuote')}</a>`) : ''}</div>
        ${feat ? `<div class="site-feature" ${mini ? '' : `data-action="play-reel" data-id="${feat.p.id}" role="button" tabindex="0"`} style="background:linear-gradient(135deg,${feat.p.grad[0]},${feat.p.grad[1]})"><span class="thumb-play">${icon('play')}</span><span class="tiny">Showreel 2026</span></div>` : ''}
      </section>
      <section class="site-work" id="${mini ? '' : 'site-werk'}"><h2>${L('site.recent')}</h2>
        <div class="site-grid">${items.map(it => `<div class="site-item" ${mini ? '' : `data-action="play-reel" data-id="${it.p.id}" role="button" tabindex="0"`}>${thumb(it.p)}<div class="strong small">${esc(ptitle(it.p))}</div><div class="tiny muted">${esc(dc(it.p.klant))}</div></div>`).join('') || `<p class="muted small">${L('site.selectHint')}</p>`}</div>
      </section>
      ${mini ? '' : `<section class="site-about" id="site-over"><h2>${L('site.aboutMe')}</h2><p>${L('site.aboutText')}</p></section>`}
      ${sr.formulier ? (mini ? `<section class="site-form-mini"><div class="strong small">${L('site.request')}</div><div class="fake-input"></div><div class="fake-input"></div><div class="fake-btn"></div></section>` : publicForm()) : ''}
      <footer class="site-foot">© 2026 ${esc(sr.titel)} · ${esc(sr.domein)} · ${L('site.madeWith')} <span class="pf-brand"><img class="pf-mark" src="img/beeldmerk.svg" alt="">Diafragmo</span></footer>`;
  }
  function publicForm() {
    const sent = S.showreelSent;
    if (sent) {
      return `<section class="site-form" id="site-form"><div class="sent">
        <div class="paid-check">${icon('check')}</div>
        <h2>${L('site.thanks', { n: esc(sent.naam) })}</h2><p>${L('site.sentText', { s: esc(S.showreel.titel) })}</p>
        <div class="maker-note"><div class="tiny muted">${L('site.meanwhile')}</div><div class="strong ok-text">${icon('check')} ${L('site.newProject')}</div><div class="small">${L('site.newProjectSub', { t: esc(dc(sent.titel)), k: esc(sent.klant), s: esc(dc('Aanvraag')) })}</div>
          <div class="row gap"><a class="btn sm primary" href="#/project/${sent.id}/planning">${L('site.openIn')}</a><button class="btn sm ghost" data-action="reset-form">${L('site.another')}</button></div></div>
      </div></section>`;
    }
    const opt = v => `<option value="${esc(v)}">${esc(dc(v))}</option>`;
    const budgets = [['€ 1.000 – 2.500', 'site.b1'], ['€ 2.500 – 5.000', 'site.b2'], ['€ 5.000 – 10.000', 'site.b3'], ['Weet ik nog niet', 'site.b4']];
    return `<section class="site-form" id="site-form"><h2>${L('site.request')}</h2><p class="muted small">${L('site.formIntro')}</p>
      <form data-form="public-request" class="form-grid two">
        <label>${L('site.f.name')}<input name="naam" required placeholder="${esc(L('site.f.namePh'))}"></label>
        <label>${L('site.f.email')}<input name="email" type="email" required placeholder="${esc(L('common.emailPh'))}"></label>
        <label>${L('site.f.company')}<input name="bedrijf" placeholder="${esc(L('site.f.optional'))}"></label>
        <label>${L('site.f.type')}<select name="type">${['Bedrijfsfilm', 'Aftermovie', 'Social content', 'Productvideo', 'Trouwfilm', 'Anders'].map(opt).join('')}</select></label>
        <label>${L('site.f.date')}<input name="datum" type="date"></label>
        <label>${L('site.f.budget')}<select name="budget">${budgets.map(([v, k]) => `<option value="${esc(v)}">${esc(L(k))}</option>`).join('')}</select></label>
        <label class="full">${L('site.f.msg')}<textarea name="bericht" rows="4" required placeholder="${esc(L('site.f.msgPh'))}"></textarea></label>
        <div class="full row-between wrap"><span class="tiny muted">${L('site.f.note')}</span><button class="site-btn" type="submit">${L('site.f.submit')}</button></div>
      </form></section>`;
  }
  function viewPublicShowreel() {
    return `<div class="preview-bar">${icon('eye')}<span>${L('site.previewBar', { d: esc(S.showreel.domein || L('sr.domainPh')) })}</span><a class="btn sm" href="#/showreel">${icon('arrowLeft')} ${L('site.backEditor')}</a></div>
      <div class="public-site" style="--brand:${S.showreel.kleur}">${publicSiteInner(false)}</div>`;
  }
  function mountShowreelEditor() {
    const ul = $('#reel-list'); if (!ul) return; let from = null;
    $$('.reel-item', ul).forEach(li => {
      li.addEventListener('dragstart', e => { from = Number(li.dataset.i); li.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(from)); } catch (er) { /* noop */ } });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('drop-target'); });
      li.addEventListener('dragleave', () => li.classList.remove('drop-target'));
      li.addEventListener('drop', e => { e.preventDefault(); const to = Number(li.dataset.i); if (from !== null && from !== to) { const it = S.showreel.items.splice(from, 1)[0]; S.showreel.items.splice(to, 0, it); render(); toast(L('sr.reordered')); } from = null; });
    });
  }
  function refreshReelPreview() {
    const b = $('.browser-body'); if (b) b.innerHTML = `<div class="mini-site" style="--brand:${S.showreel.kleur}">${publicSiteInner(true)}</div>`;
    const u = $('.browser .url'); if (u) u.innerHTML = `${icon('lock')} ${esc(S.showreel.domein || L('sr.domainPh'))}`;
  }

  // ---------- Koppeling e-mail & agenda (gesimuleerd): één login per aanbieder, Microsoft 365 of Google ----------
  const ACC_KEYS = ['microsoft', 'google'];
  // Vertaalde velden als getters, zodat bestaande code (ACC[k].cal enz.) altijd de gekozen taal toont
  const ACC = {
    microsoft: { naam: 'Microsoft 365', get sub() { return L('acc.microsoft.sub'); }, get detail() { return L('acc.microsoft.detail'); }, bedrijf: 'Microsoft', mail: 'Outlook', get cal() { return L('cal.microsoft'); }, logo: 'outlook', get login() { return L('acc.microsoft.login'); } },
    google: { naam: 'Google', get sub() { return L('acc.google.sub'); }, get detail() { return L('acc.google.detail'); }, bedrijf: 'Google', mail: 'Gmail', get cal() { return L('cal.google'); }, logo: 'gmail', get login() { return L('acc.google.login'); } }
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
  // Placeholders: intern Nederlandse sleutels, per taal een eigen naam ({vorname}, {firstname} …); alle namen werken in elke taal
  const PH_KEYS = ['klant', 'voornaam', 'project', 'portaallink', 'documentnr', 'bedrag', 'vervaldatum'];
  const TIKKIE_PH_KEYS = ['tikkielink', 'geldigtot'];
  const PH_LOC = {
    de: { klant: 'kunde', voornaam: 'vorname', project: 'projekt', portaallink: 'portallink', documentnr: 'dokumentnr', bedrag: 'betrag', vervaldatum: 'fälligam', tikkielink: 'tikkielink', geldigtot: 'gültigbis', afzender: 'absender' },
    en: { klant: 'client', voornaam: 'firstname', project: 'project', portaallink: 'portallink', documentnr: 'docnumber', bedrag: 'amount', vervaldatum: 'duedate', tikkielink: 'tikkielink', geldigtot: 'validuntil', afzender: 'sender' }
  };
  const PH_ALIAS = {}; Object.keys(PH_LOC).forEach(l => Object.keys(PH_LOC[l]).forEach(k => { PH_ALIAS[PH_LOC[l][k]] = k; }));
  const phName = k => '{' + ((PH_LOC[I.lang()] || {})[k] || k) + '}';
  const kindTitle = k => I.has('mail.kind.' + k) ? L('mail.kind.' + k) : L('mail.kind.leeg');
  // Gezaaide demo-mails bewaren een sleutel + variabelen en worden in de gekozen taal getoond
  const mailVars = v => { const o = Object.assign({}, v, { t: dc(v.t || ''), k: dc(v.k || ''), q: v.q ? dc(v.q) : '' }); const ty = dc(v.ty || ''); o.ty = I.lang() === 'de' ? ty : ty.toLowerCase(); o.a = v.a || L('mt.aanvraagDefault', o); return o; };
  const mailSubj = m => m.mk ? L('mt.' + m.mk + '.s', mailVars(m.mv)) : dc(m.onderwerp);
  const mailText = m => m.mk ? L('mt.' + m.mk + '.b', mailVars(m.mv)) : dc(m.tekst);
  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const nowTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const isoAdd = (iso, days) => { const d = pd(iso); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const firstName = c => { const w = String(c || '').split(' '); return w[0] === 'Dr.' ? c : w[0]; };
  const clientEmailsOf = p => D.clientEmails[p.id] || (p.email ? [p.email] : []);
  const clientEmail = p => clientEmailsOf(p)[0] || '';
  const portalLink = p => `https://portaal.diafragmo.voorbeeld/${p.id}-8f3k2`;
  const fillTpl = (str, vars) => String(str).replace(/\{([\wÀ-ÿ]+)\}/g, (m, k) => { const key = PH_ALIAS[k.toLowerCase()] || k; return vars[key] != null && vars[key] !== '' ? vars[key] : m; });
  function sender() {
    const ok = ACC_KEYS.filter(mailOn), k = ok.includes(S.email.active) ? S.email.active : ok[0];
    if (k) return { k, label: ACC[k].mail, adres: acc(k).adres, logo: LOGO[ACC[k].logo] };
    return { k: 'noreply', label: L('mail.noreply'), adres: 'noreply@diafragmo.voorbeeld', logo: '' };
  }
  function fixActive() { const ok = ACC_KEYS.filter(mailOn); if (!ok.includes(S.email.active)) S.email.active = ok[0] || null; }
  function renderKeep() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  function seedThread(p) {
    const adr = clientEmail(p); if (!adr) return [];
    const idx = STATUSES.indexOf(p.status), v = firstName(p.contact), me = S.koppeling.microsoft.adres, f = S.finance[p.id];
    const done = p.status === 'Opgeleverd';
    const base = done ? p.deadline : '2026-10-01';
    const out = [];
    const inn = (datum, tijd, mk, mv, extra) => out.push(Object.assign({ dir: 'in', van: p.contact, adres: adr, datum, tijd, mk, mv }, extra || {}));
    const uit = (datum, tijd, mk, mv, bijlagen) => out.push({ dir: 'out', van: 'Sanne de Vries', adres: me, aan: adr, datum, tijd, mk, mv, bijlagen: bijlagen || [] });
    const mv = x => Object.assign({ t: p.titel, k: p.klant, c: p.contact, ty: p.type, v, link: portalLink(p) }, x || {});
    inn(idx === 0 ? (p.aanvraagDatum || '2026-10-01') : idx === 1 ? '2026-09-08' : isoAdd(base, -48), idx === 0 ? '10:24' : '09:41', 'aanvraag', mv({ a: p.aanvraag || null }), idx === 0 ? { nieuw: true } : {});
    if (idx >= 1) uit(idx === 1 ? '2026-09-15' : isoAdd(base, -42), '15:10', 'offerte', mv({ nr: f.offerte.nr }), [{ naam: f.offerte.nr + '.pdf', grootte: '82 KB' }]);
    if (idx >= 2) inn(isoAdd(base, -39), '08:55', 'akkoord', mv({ nr: f.offerte.nr }));
    if (idx >= 3) uit(isoAdd(base, -25), '11:45', 'planning', mv(), [{ naam: 'Draaiboek.pdf', grootte: '180 KB' }]);
    if (idx >= 4 && p.versie !== '-') uit(done ? isoAdd(base, -8) : '2026-09-29', '16:30', 'versie', mv({ n: p.versie.slice(1) }));
    const fb = D.feedbackWaiting.find(x => x.projectId === p.id);
    if (fb) inn(done ? isoAdd(base, -6) : '2026-10-01', '16:05', 'fb', mv({ n: p.versie.slice(1), q: fb.quote }));
    if (done) {
      uit(base, '10:00', 'klaar', mv());
      inn(isoAdd(base, 1), '08:47', 'dank', mv());
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
    const vars = { klant: dc(p.klant), voornaam: firstName(p.contact), project: ptitle(p), portaallink: portalLink(p), afzender: D.studio.eigenaar, documentnr: '', bedrag: '', vervaldatum: '', tikkielink: '', geldigtot: '' };
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
      const t = tpl(kind);
      d.subject = fillTpl(t.onderwerp, vars); d.body = fillTpl(t.body, vars);
      if (kind !== 'oplevering' && doc) d.att = [{ naam: doc.nr + '.pdf', grootte: kind === 'offerte' ? '84 KB' : '66 KB' }];
    } else if (kind === 'reply' && opt.msg) {
      const m = opt.msg;
      d.to = `${m.van} <${m.adres}>`;
      const ms = mailSubj(m);
      d.subject = /^re:/i.test(ms) ? ms : 'Re: ' + ms;
      d.body = L('mail.replyBody', { n: firstName(m.van), d: fdate(m.datum), t: m.tijd, w: m.van }) + '\n' + mailText(m).split('\n').map(l => '> ' + l).join('\n');
    } else {
      d.kind = d.origKind = 'leeg';
      d.subject = ptitle(p); d.body = fillTpl(L('mail.blankBody'), vars);
    }
    return d;
  }

  function sendAsHtml(s, inCompose) {
    if (s.k !== 'noreply') return `<div class="send-as linked">${s.logo}<div class="grow small"><span class="muted">${L('mail.sentVia')}</span> <strong>${esc(s.label)}</strong> · ${esc(s.adres)}</div><a class="link" href="#/instellingen/email">${L('mail.change')}</a></div>`;
    const off = mailOffProvider();
    if (off) return `<div class="send-as nolink"><div class="row gap">${icon('msg')}<div class="grow"><div class="strong small">${L('mail.offTitle', { p: esc(ACC[off].naam) })}</div><div class="tiny">${L('mail.offText', { s: esc(D.studio.naam), a: esc(acc(off).adres) })}</div></div></div>
      <div class="row gap wrap send-as-btns"><button type="button" class="btn sm" data-action="mail-enable" data-k="${off}">${LOGO[ACC[off].logo]} ${L('mail.enable')}</button><a class="btn sm ghost" href="#/instellingen/email">${icon('settings')} ${L('nav.settings')}</a></div></div>`;
    return `<div class="send-as nolink"><div class="row gap">${icon('msg')}<div class="grow"><div class="strong small">${L('mail.connectTitle')}</div><div class="tiny">${L('mail.connectText', { s: esc(D.studio.naam), e: esc(D.studio.email) })}</div></div></div>
      <div class="row gap wrap send-as-btns"><a class="btn sm" href="#/instellingen/email">${icon('settings')} ${L('mail.connectBtn')}</a>${inCompose ? ACC_KEYS.map(k => `<button type="button" class="btn sm ghost" data-action="compose-connect" data-k="${k}">${LOGO[ACC[k].logo]} ${esc(ACC[k].naam)}</button>`).join('') : ''}</div></div>`;
  }
  const attHtml = att => att.map((a, i) => `<span class="att-chip">${icon('file')}<span class="att-name">${esc(dc(a.naam))}</span><small>${esc(size(a.grootte))}</small><button type="button" class="att-x" data-action="cmp-del-att" data-i="${i}" aria-label="${esc(L('mail.delAtt', { n: a.naam }))}">${icon('x')}</button></span>`).join('') +
    `<button type="button" class="chip" data-action="cmp-add-att">${icon('plus')} ${L('mail.att')}</button>`;

  let currentDraft = null;
  function openCompose(d) {
    currentDraft = d;
    const s = sender(), e = S.email;
    const fromTxt = s.k === 'noreply' ? `${esc(D.studio.naam)} via Diafragmo &lt;${esc(s.adres)}&gt;` : `Sanne de Vries &lt;${esc(s.adres)}&gt;`;
    const bccAdr = s.k === 'noreply' ? D.studio.email : s.adres;
    modal({
      title: d.title || kindTitle(d.kind), wide: true,
      body: `<form id="compose-form" class="compose">
        ${sendAsHtml(s, true)}
        <div class="cmp-fields">
          <div class="cmp-row"><span class="cmp-lbl">${L('mail.from')}</span><span class="cmp-val small">${fromTxt}</span></div>
          <label class="cmp-row"><span class="cmp-lbl">${L('mail.to')}</span><input id="cmp-to" required pattern=".*[^@\\s]+@[^@\\s]+\\.[^@\\s]+.*" title="${esc(L('mail.validEmail'))}" placeholder="${esc(L('common.emailPh'))}" value="${esc(d.to)}"></label>
          ${e.bcc ? `<div class="cmp-row"><span class="cmp-lbl">Bcc</span><span class="cmp-val small muted">${esc(bccAdr)} ${L('mail.toSelf')}</span></div>` : ''}
          <label class="cmp-row"><span class="cmp-lbl">${L('mail.subject')}</span><input id="cmp-subj" required value="${esc(d.subject)}"></label>
          ${d.kind !== 'reply' ? `<label class="cmp-row"><span class="cmp-lbl">${L('mail.template')}</span><select id="cmp-tpl" aria-label="${esc(L('mail.template'))}">${[['leeg', L('mail.blank')]].concat(tplKeys().concat(d.kind === 'tikkie' && !tikkieOn() ? ['tikkie'] : []).map(k => [k, tpl(k).naam])).map(o => `<option value="${o[0]}" ${o[0] === d.kind ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>` : ''}
        </div>
        <textarea id="cmp-body" rows="9" aria-label="${esc(L('mail.message'))}">${esc(d.body)}</textarea>
        ${e.sigOn ? `<div class="cmp-sig"><div class="tiny muted">${L('mail.sig')} · <a class="link" href="#/instellingen/email">${L('mail.edit')}</a></div><div class="sig-text">${esc(mailSig())}</div></div>` : ''}
        <div class="att-row" id="cmp-att">${attHtml(d.att)}</div>
        <p class="tiny muted">${L('mail.protoNote')}</p>
        <button type="submit" hidden></button>
      </form>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: `${icon('send')} ${L('por.send')}`, cls: 'primary', onClick: sendCompose }]
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
    const msg = { dir: 'out', van: 'Sanne de Vries', adres: s.adres, aan, datum: todayIso(), tijd: nowTime(), onderwerp: d.subject, tekst: d.body + (e.sigOn && mailSig() ? '\n\n-- \n' + mailSig() : ''), bijlagen: d.att.slice(), via: s.label, bcc: e.bcc };
    (S.email.threads[d.pid] = S.email.threads[d.pid] || []).push(msg);
    closeModal(); currentDraft = null; S.email.filter = 'Alle';
    if (d.onSent) d.onSent();
    toast(L('mail.sentToast', { v: esc(s.label), a: esc(toName || aan) }) + (e.bcc ? L('mail.sentBcc') : ''));
    renderKeep();
  }

  // Eén toestemmingsscherm per aanbieder voor e-mail én agenda
  function openConsent(k, after) {
    k = accKey(k);
    const a = acc(k), pr = ACC[k];
    modal({
      title: pr.login,
      body: `<div class="consent">
        <div class="consent-logos"><span class="consent-app"><img src="img/app-icoon.svg" alt="Diafragmo" style="width:52px;height:52px;border-radius:14px;display:block"></span><span class="consent-dots"><i></i><i></i><i></i></span><span class="consent-prov duo" title="${esc(L('con.and', { a: pr.mail, b: pr.cal }))}">${LOGO[pr.logo]}${CAL_LOGO[k]}</span></div>
        <div class="consent-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">Sanne de Vries</div><div class="tiny muted">${esc(a.adres)}</div></div><span class="tiny muted">${L('con.account', { b: esc(pr.bedrijf) })}</span></div>
        <p class="consent-q">${L('con.q')}</p>
        <ul class="perm-list">
          <li>${icon('send')}<div><div class="strong">${L('con.p1')}</div><div class="tiny muted">${L('con.p1s', { a: esc(a.adres) })}</div></div></li>
          <li>${icon('msg')}<div><div class="strong">${L('con.p2')}</div><div class="tiny muted">${L('con.p2s')}</div></div></li>
          <li>${icon('clock')}<div><div class="strong">${L('con.p3')}</div><div class="tiny muted">${L('con.p3s')}</div></div></li>
          <li>${icon('calendar')}<div><div class="strong">${L('con.p4')}</div><div class="tiny muted">${L('con.p4s', { c: esc(pr.cal) })}</div></div></li>
        </ul>
        <p class="tiny muted">${L('con.foot', { b: esc(pr.bedrijf) })}</p>
      </div>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: () => { if (after) after(false); else closeModal(); } }, {
        label: L('con.allow'), cls: 'primary', onClick: () => {
          const body = $('.modal-body'); if (body) body.innerHTML = `<div class="paying"><div class="spinner blue"></div><p>${L('con.connecting', { p: esc(pr.naam) })}</p></div>`;
          $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
          const tmo = setTimeout(() => {
            Object.assign(a, { connected: true, sinds: nowLabel(), mail: true, agenda: true });
            // Diafragmo zet je planning in één agenda tegelijk: de nieuwste koppeling neemt de agenda over
            const other = ACC_KEYS.find(x => x !== k && agendaOn(x)); if (other) acc(other).agenda = false;
            fixActive(); demoSave();
            const n = weekItems(todayIso(), isoAdd(todayIso(), 60)).filter(x => x.kind !== 'busy').length;
            toast(L('con.done', { p: esc(pr.naam), a: esc(a.adres), n, c: esc(pr.cal) }) + (other ? L('con.otherOff', { p: esc(ACC[other].naam) }) : ''));
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
          <div class="row-between"><span class="strong clamp">${me ? L('mail.you') : esc(m.van)}${m.nieuw ? ` <span class="pill inv-open">${L('common.new')}</span>` : ''}</span><span class="tiny muted nowrap">${fdateShort(m.datum)} · ${esc(m.tijd)}</span></div>
          <div class="small clamp"><span class="dir-tag ${m.dir}">${me ? '↗ ' + L('mail.sent') : '↙ ' + L('mail.received')}</span> ${esc(mailSubj(m))}</div>
        </div>
      </summary>
      <div class="mail-body">
        <div class="tiny muted">${me ? L('mail.fromTo', { a: esc(m.adres), b: esc(m.aan) }) : L('mail.fromOnly', { a: esc(m.adres) })}${m.via ? L('mail.via', { v: esc(m.via) }) : ''}${m.bcc ? L('mail.bccSelf') : ''}</div>
        <div class="mail-text">${esc(mailText(m))}</div>
        ${(m.bijlagen || []).length ? `<div class="att-row">${m.bijlagen.map(b => `<button class="att-chip" data-action="download" data-name="${esc(b.naam)}">${icon('file')}<span class="att-name">${esc(dc(b.naam))}</span><small>${esc(size(b.grootte))}</small></button>`).join('')}</div>` : ''}
        ${me ? '' : `<div class="mail-actions"><button class="btn sm" data-action="reply" data-id="${p.id}" data-i="${m.i}">${icon('arrowLeft')} ${L('mail.reply')}</button></div>`}
      </div>
    </details>`;
  }
  function tabEmail(p) {
    const all = (S.email.threads[p.id] || []).map((m, i) => Object.assign({ i }, m)).sort((a, b) => (b.datum + b.tijd).localeCompare(a.datum + a.tijd));
    if (S.email.filterPid !== p.id) { S.email.filter = 'Alle'; S.email.filterPid = p.id; }
    const flt = S.email.filter;
    const list = all.filter(m => flt === 'Alle' || (flt === 'Ontvangen' ? m.dir === 'in' : m.dir === 'out'));
    const s = sender(), adrs = clientEmailsOf(p);
    const quick = [['offerte', 'file', L('por.step.quote')], ['factuur', 'euro', L('por.invoice')], ['herinnering', 'clock', L('mail.q.reminder')], ['oplevering', 'check', L('mail.q.delivery')]];
    const off = s.k === 'noreply' ? mailOffProvider() : null;
    const fl = { Alle: L('common.all'), Ontvangen: L('mail.received'), Verzonden: L('mail.sent') };
    return `${off ? `<div class="banner warn">${icon('msg')}<div class="grow small">${L('mail.bannerOff', { p: esc(ACC[off].naam), c: esc(p.contact), a: esc(acc(off).adres) })} <span class="muted">${L('mail.sampleBelow')}</span></div><button class="btn sm" data-action="mail-enable" data-k="${off}">${L('mail.enable')}</button></div>`
      : s.k === 'noreply' ? `<div class="banner warn">${icon('msg')}<div class="grow small">${L('mail.bannerConnect', { c: esc(p.contact) })} <span class="muted">${L('mail.sampleBelow')}</span></div><a class="btn sm" href="#/instellingen/email">${L('mail.connectShort')}</a></div>` : ''}
      <div class="grid-2 wide-left">
        <section class="card">
          <div class="card-head"><h2>${L('mail.with', { c: esc(p.contact) })}</h2><div class="row gap wrap"><div class="seg sm">${['Alle', 'Ontvangen', 'Verzonden'].map(x => `<button class="${flt === x ? 'active' : ''}" data-action="mail-filter" data-f="${x}">${fl[x]}</button>`).join('')}</div><button class="btn sm primary" data-action="compose" data-id="${p.id}" data-kind="leeg">${icon('plus')} ${L('mail.kind.leeg')}</button></div></div>
          <p class="tiny muted mail-count">${L('mail.count', { n: all.length, i: all.filter(m => m.dir === 'in').length, o: all.filter(m => m.dir === 'out').length })}</p>
          ${list.length ? `<div class="mail-list">${list.map((m, k) => mailItem(p, m, k < 2)).join('')}</div>` : `<div class="empty small">${icon('msg')}<p>${all.length ? L('mail.noneView') : L('mail.noneYet', { c: esc(p.contact) })}</p><button class="btn sm primary" data-action="compose" data-id="${p.id}" data-kind="leeg">${icon('plus')} ${L('mail.kind.leeg')}</button></div>`}
        </section>
        <section class="card">
          <div class="card-head"><h2>${L('mail.autoLinked')}</h2>${S.email.autoKoppel ? `<span class="pill inv-betaald">${L('common.On')}</span>` : `<span class="pill">${L('common.Off')}</span>`}</div>
          ${adrs.length ? `<p class="small muted">${L('mail.autoText')}</p><ul class="addr-list">${adrs.map(a => `<li>${icon('link')}<span>${esc(a)}</span></li>`).join('')}</ul>` : `<p class="small muted">${L('mail.noAddr', { c: esc(p.contact) })}</p>`}
          ${sendAsHtml(s, false)}
          <div class="card-head mt"><h2>${L('mail.quick')}</h2></div>
          <div class="quick-mails">${quick.map(q => `<button class="btn sm" data-action="compose" data-id="${p.id}" data-kind="${q[0]}">${icon(q[1])} ${q[2]}</button>`).join('')}</div>
          <p class="tiny muted">${L('mail.tplHint')}</p>
        </section>
      </div>`;
  }

  // Instellingen → Account koppelen: e-mail & agenda (één kaart, één login per aanbieder)
  function accCard(k) {
    const a = acc(k), pr = ACC[k], s = sender(), sending = s.k === k, cal = calProvider() === k;
    const multi = ACC_KEYS.filter(mailOn).length > 1;
    const tg = (w, ic, title, sub) => `<li class="acc-tg ${a[w] ? 'on' : 'off'}"><span class="acc-tg-ic">${icon(ic)}</span><div class="grow"><div class="strong small">${title}</div><div class="tiny muted">${sub}</div></div><label class="switch"><input type="checkbox" data-action="acc-toggle" data-k="${k}" data-w="${w}" ${a[w] ? 'checked' : ''} aria-label="${esc(L('acc.via', { t: title, p: pr.naam }))}"><span></span></label></li>`;
    return `<div class="provider acc ${a.connected ? 'connected' : ''} ${a.connected && (sending || cal) ? 'active' : ''}" id="koppeling-${k}">
      <div class="prov-head"><span class="prov-logo-box duo">${LOGO[pr.logo]}${CAL_LOGO[k]}</span><div class="grow"><div class="strong">${esc(pr.naam)}</div><div class="small muted">${esc(pr.sub)}</div></div>${a.connected ? `<span class="pill inv-betaald">${L('acc.connected')}</span>` : `<span class="pill">${L('acc.notConnected')}</span>`}</div>
      ${a.connected ? `
        <div class="prov-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">${esc(a.adres)}</div><div class="tiny muted">${L('acc.since', { d: esc(stamp(a.sinds)) })}</div></div></div>
        <ul class="acc-tgs">
          ${tg('mail', 'send', L('acc.email'), a.mail ? L('acc.mailOn', { m: esc(pr.mail) }) : L('acc.mailOff'))}
          ${a.mail && multi ? `<li class="acc-sub"><label class="check radio"><input type="radio" name="email-active" data-action="email-active" data-k="${k}" ${sending ? 'checked' : ''}> ${sending ? `<strong>${L('acc.activeSender')}</strong>` : L('acc.useSender')}</label></li>` : ''}
          ${tg('agenda', 'calendar', L('acc.calendar'), a.agenda ? L('acc.calOn', { c: esc(pr.cal) }) : L('acc.calOff'))}
        </ul>
        <div class="row-between wrap acc-foot"><span class="tiny muted">${L('acc.disconnectNote')}</span><button class="btn sm ghost" data-action="acc-disconnect" data-k="${k}">${L('acc.disconnect')}</button></div>`
        : `<p class="small muted">${L('acc.loginOnce', { b: esc(pr.bedrijf), m: esc(pr.mail), c: esc(pr.cal) })}</p><p class="tiny muted">${esc(pr.detail)}</p><button class="btn primary" data-action="acc-connect" data-k="${k}">${icon('link')} ${L('acc.connect')}</button>`}
    </div>`;
  }
  function koppelingSettingsHtml() {
    const e = S.email, s = sender(), t = tpl(e.tplSel), k = calProvider(), ag = S.agenda;
    const anyConn = ACC_KEYS.some(x => acc(x).connected), off = s.k === 'noreply' ? mailOffProvider() : null;
    const opt = (key, title, sub) => `<li class="row-item"><div class="grow"><div class="strong">${title}</div><div class="small muted">${sub}</div></div><label class="switch"><input type="checkbox" data-action="email-opt" data-k="${key}" ${e[key] ? 'checked' : ''} aria-label="${esc(title)}"><span></span></label></li>`;
    const copt = (key, title, sub) => `<li class="row-item"><div class="grow"><div class="strong">${title}</div><div class="small muted">${sub}</div></div><label class="switch ${k ? '' : 'off'}"><input type="checkbox" data-action="cal-opt" data-k="${key}" ${ag[key] ? 'checked' : ''} ${k ? '' : 'disabled'} aria-label="${esc(title)}"><span></span></label></li>`;
    const nxt = weekItems(todayIso(), isoAdd(todayIso(), 30)).filter(x => x.kind !== 'busy').slice(0, 4);
    return `<section class="card email-settings koppeling-settings" id="koppeling" aria-labelledby="koppeling-title">
      <div class="card-head"><div><div class="kop-eyebrow">Microsoft 365 & Google</div><h2 id="koppeling-title">${L('kop.title')}</h2><p class="small muted">${L('kop.intro')}</p></div>
        <div class="kop-status">${s.k !== 'noreply' ? `<span class="send-pill">${s.logo} ${L('kop.mailVia', { v: esc(s.label) })}</span>` : ''}${k ? `<span class="send-pill">${CAL_LOGO[k]} ${L('kop.calendar', { c: esc(CAL[k].label) })}</span>` : ''}${!anyConn ? `<span class="pill inv-open">${L('kop.notYet')}</span>` : ''}</div></div>
      <div class="providers">${ACC_KEYS.map(accCard).join('')}</div>
      ${!anyConn ? `<p class="small muted">${L('kop.choose', { e: esc(D.studio.email) })}</p>`
        : off ? `<p class="small muted">${L('kop.mailOff', { e: esc(D.studio.email) })}</p>`
        : `<p class="tiny muted">${L('kop.bothOn')}</p>`}
      <div class="email-opts" id="koppeling-email">
        <div>
          <h3 class="kop-h3">${icon('send')} ${L('kop.sendOpts')}</h3>
          <ul class="list">
            ${opt('sigOn', L('kop.sig'), L('kop.sigSub'))}
            ${opt('bcc', L('kop.bcc'), L('kop.bccSub'))}
            ${opt('autoKoppel', L('kop.auto'), L('kop.autoSub'))}
          </ul>
          ${e.sigOn ? `<label class="mt-s">${L('mail.sig')}<textarea data-email-sig rows="4">${esc(mailSig())}</textarea></label>` : ''}
        </div>
        <div>
          <h3>${L('kop.templates')}</h3>
          <div class="seg sm tpl-seg">${tplKeys().map(x => `<button class="${x === e.tplSel ? 'active' : ''}" data-action="tpl-sel" data-k="${x}">${esc(tpl(x).naam)}</button>`).join('')}</div>
          <div class="form-col tpl-form">
            <label>${L('mail.subject')}<input data-tpl-f="onderwerp" value="${esc(t.onderwerp)}"></label>
            <label>${L('mail.message')}<textarea data-tpl-f="body" rows="9">${esc(t.body)}</textarea></label>
          </div>
          <div class="ph-chips"><span class="tiny muted">${L('kop.insert')}</span>${PH_KEYS.concat(e.tplSel === 'tikkie' ? TIKKIE_PH_KEYS : []).map(phName).map(x => `<button class="chip ph" data-action="tpl-insert" data-ph="${esc(x)}">${esc(x)}</button>`).join('')}</div>
          <div class="row gap wrap tpl-actions"><button class="btn sm ghost" data-action="tpl-reset">${L('kop.reset')}</button><button class="btn sm" data-action="tpl-preview">${icon('eye')} ${L('kop.preview', { k: 'Bakkerij Van Dam' })}</button></div>
          <p class="tiny muted">${L('kop.tplLangNote')}</p>
        </div>
      </div>
      <div class="email-opts cal-opts" id="koppeling-agenda">
        <div><h3 class="kop-h3">${icon('calendar')} ${L('kop.calOpts')}</h3><ul class="list">
          ${copt('autoZet', L('kop.autoZet'), L('kop.autoZetSub'))}
          ${copt('checkBeschikbaar', L('kop.check'), L('kop.checkSub'))}
        </ul>${k ? '' : `<p class="tiny muted">${anyConn ? L('kop.calHintOn') : L('kop.calHintConnect')}</p>`}</div>
        <div><h3>${L('kop.inCal')}</h3>
          <ul class="cal-preview">${nxt.map(x => `<li><span class="wk-dot ${x.kind}"></span><span class="grow"><span class="strong small">${esc(x.titel)}</span><span class="tiny muted"> · ${fdateShort(x.datum)}${x.tijd ? ' · ' + esc(dc(x.tijd)) : ''}</span></span>${k && ag.autoZet ? `<span class="ok" title="${esc(L('kop.inYourCal'))}">${icon('check')}</span>` : ''}</li>`).join('') || `<li class="muted small">${L('kop.nothing')}</li>`}</ul>
          <p class="tiny muted">${L('kop.privacy')}</p></div>
      </div>
    </section>`;
  }

  // ---------- Instellingen ----------
  function viewSettings() {
    const st = S.settings;
    const plans = [
      { naam: 'Basis', prijs: 24, f: ['plan.f.unlimited', 'plan.f.portal', 'plan.f.invoices', ['plan.f.sign'], ['plan.f.callsheets'], ['plan.f.calendar'], 'plan.f.hours', 'plan.f.storage250', 'plan.f.eu'] },
      { naam: 'Pro', prijs: 39, f: ['plan.f.allBasic', ['plan.f.timer'], ['plan.f.subs'], 'plan.f.review', 'plan.f.showreel', 'plan.f.accounting', 'plan.f.freelancers', 'plan.f.storage2', 'plan.f.eu'] }
    ];
    return `
      <div class="page-head"><div><h1>${L('nav.settings')}</h1><p class="muted">${L('set.sub')}</p></div><div class="head-actions"><button class="btn primary" data-action="save-settings">${icon('check')} ${L('common.save')}</button></div></div>
      <div class="grid-2">
        <section class="card">
          <div class="card-head"><h2>${L('set.profile')}</h2></div>
          <div class="form-grid two">
            <label>${L('set.company')}<input value="${esc(D.studio.naam)}"></label>
            <label>${L('common.name')}<input value="${esc(D.studio.eigenaar)}"></label>
            <label>${L('set.kvk')}<input value="${esc(dc(D.studio.kvk))}"></label>
            <label>${L('set.vatId')}<input value="${esc(dc(D.studio.btw))}"></label>
            <label class="full">IBAN<input value="${esc(dc(D.studio.iban))}"></label>
          </div>
          <div class="card-head mt"><h2>${L('set.rates')}</h2></div>
          <div class="form-grid two">
            <label>${L('qb.p.day')}<div class="input-prefix"><span>€</span><input type="number" value="750"></div></label>
            <label>${L('set.hourly')}<div class="input-prefix"><span>€</span><input type="number" value="85"></div></label>
            <label>${L('set.kmRate')}<div class="input-prefix"><span>€</span><input type="number" step="0.01" value="0.23"></div></label>
            <label>${L('set.criterionGoal')}<div class="input-prefix"><span>${L('common.hours')}</span><input type="number" value="1225"></div></label>
          </div>
          <div class="card-head mt"><h2>${L('set.portal')}</h2></div>
          <p class="small muted">${L('set.portalSub')}</p>
          <a class="btn" href="#/klant/p1">${icon('eye')} ${L('set.viewAsClient')}</a>
          ${themeSettingsHtml()}
        </section>
        <section class="card" id="abonnement">
          <div class="card-head"><h2>${L('set.plan')}</h2><span class="small muted">${L('set.perMonth')}</span></div>
          <div class="plan-demo"><span class="small">${L('set.demoView')}</span><div class="seg sm" role="group" aria-label="${esc(L('set.demoViewAria'))}">${['Basis', 'Pro'].map(x => `<button class="${st.plan === x ? 'active' : ''}" data-action="plan-demo" data-plan="${x}" aria-pressed="${st.plan === x}">${esc(dc(x))}</button>`).join('')}</div><span class="tiny muted">${L('set.demoViewSub')}</span></div>
          <div class="plans">${plans.map(pl => `
            <div class="plan ${st.plan === pl.naam ? 'current' : ''}">
              <div class="row-between"><span class="strong">${esc(dc(pl.naam))}</span>${st.plan === pl.naam ? `<span class="pill inv-betaald">${L('set.currentPlan')}</span>` : ''}</div>
              <div class="price">${eur(pl.prijs).replace(/[.,]00(?=\D*$)/, '')}<small> ${L('set.perMo')}</small></div>
              <ul>${pl.f.map(x => Array.isArray(x) ? `<li>${icon('check')} <span>${esc(L(x[0]))} <span class="new-tag">${L('common.new')}</span></span></li>` : `<li>${icon('check')} ${esc(L(x))}</li>`).join('')}</ul>
              <button class="btn block ${st.plan === pl.naam ? '' : 'primary'}" data-action="set-plan" data-plan="${pl.naam}" ${st.plan === pl.naam ? 'disabled' : ''}>${st.plan === pl.naam ? L('set.yourPlan') : L('set.switchTo', { p: esc(dc(pl.naam)) })}</button>
            </div>`).join('')}</div>
          <p class="tiny muted">${L('set.planNote')}</p>
          <div class="card-head mt"><h2>${L('set.accounting')}</h2></div>
          <ul class="list">${Object.keys(st.koppelingen).map(k => `
            <li class="row-item"><span class="icon-box logo-box">${esc(k.slice(0, 2))}</span><div class="grow"><div class="strong">${esc(k)}</div><div class="small muted">${st.koppelingen[k] ? L('set.accOn') : L('set.accOff')}</div></div>
              <label class="switch"><input type="checkbox" data-action="toggle-int" data-k="${esc(k)}" ${st.koppelingen[k] ? 'checked' : ''} aria-label="${esc(L('set.connectX', { k }))}"><span></span></label></li>`).join('')}</ul>
        </section>
      </div>
      ${payMethodsHtml()}
      <section class="card eu-card" id="hosting-privacy" aria-labelledby="eu-title">
        <div class="eu-head">
          ${euBadge()}
          <div class="grow">
            <div class="row gap wrap"><h2 id="eu-title">${L('eu.title')}</h2><span class="eu-pill">${L('eu.pill')}</span></div>
            <p class="eu-lead strong">${L('eu.lead')}</p>
            <p class="small muted">${L('eu.text')}</p>
          </div>
        </div>
        <ul class="eu-points">
          <li>${icon('pin')}<div><strong>${L('eu.p1')}</strong><span>${L('eu.p1s')}</span></div></li>
          <li>${icon('globe')}<div><strong>${L('eu.p2')}</strong><span>${L('eu.p2s')}</span></div></li>
          <li>${icon('lock')}<div><strong>${L('eu.p3')}</strong><span>${L('eu.p3s')}</span></div></li>
          <li>${icon('shield')}<div><strong>${L('eu.p4')}</strong><span>${L('eu.p4s')}</span></div></li>
        </ul>
        <div class="eu-foot">
          <button class="btn sm" data-action="download" data-name="${esc(L('eu.dpaFile'))}">${icon('download')} ${L('eu.dpa')}</button>
          <span class="tiny muted">${L('eu.clientsSee', { t: L('por.trust') })}</span>
        </div>
      </section>
      ${koppelingSettingsHtml()}`;
  }
  function viewNotFound() { return `<div class="empty card">${icon('search')}<h2>${L('nf.title')}</h2><p class="muted">${L('nf.text')}</p><a class="btn primary" href="#/dashboard">${L('nf.back')}</a></div>`; }

  // ---------- Info-menu, versie, nieuws & support (demo, bewaard in localStorage) ----------
  const APP_VERSIE = '0.5.1', APP_BUILD = '2026-10-06';
  const NEWS_KEY = 'diafragmo-nieuws-gelezen', TICKETS_KEY = 'diafragmo-tickets';
  const versieLabel = () => L('info.version', { v: APP_VERSIE });
  const buildLabel = () => L('info.build', { d: fdate(APP_BUILD) });
  const p2 = n => String(n).padStart(2, '0');
  const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const fdt = s => { const d = new Date(s); return isNaN(d) ? esc(s) : Fx.dateTime(d); };
  const fdtShort = s => { const d = new Date(s); if (isNaN(d)) return esc(s); const n = new Date(); return d.toDateString() === n.toDateString() ? L('info.todayAt', { t: Fx.time(d) }) : Fx.dayMonth(d); };
  // Changelog: teksten in het woordenboek (cl.<versie>.<n>.t / .d); [icoon, sleutel, pro]
  const CHANGELOG = [
    { v: '0.5.1', datum: '2026-10-06', items: [['globe', 'cl.051.1']] },
    { v: '0.5.0', datum: '2026-10-06', items: [['globe', 'cl.050.1']] },
    { v: '0.4.4', datum: '2026-10-03', items: [['check', 'cl.044.1']] },
    { v: '0.4.3', datum: '2026-10-03', items: [['send', 'cl.043.1']] },
    { v: '0.4.2', datum: '2026-10-03', items: [['euro', 'cl.042.1']] },
    { v: '0.4.1', datum: '2026-10-03', items: [['link', 'cl.041.1']] },
    { v: '0.4.0', datum: '2026-10-03', items: [['pen', 'cl.040.1'], ['calendar', 'cl.040.2'], ['link', 'cl.040.3'], ['clock', 'cl.040.4', true], ['msg', 'cl.040.5', true]] },
    { v: '0.3.0', datum: '2026-10-03', items: [['sun', 'cl.030.1'], ['eye', 'cl.030.2'], ['msg', 'cl.030.3']] },
    { v: '0.2.1', datum: '2026-10-02', items: [['shield', 'cl.021.1'], ['film', 'cl.021.2']] },
    { v: '0.2.0', datum: '2026-10-02', items: [['send', 'cl.020.1']] }
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
  const tkStatusLabel = (s, beheer) => dc(beheer && s === 'Wacht op jou' ? 'Wacht op gebruiker' : s);
  const tkPill = (s, beheer) => `<span class="pill tk-${slug(s)}">${esc(tkStatusLabel(s, beheer))}</span>`;
  const prio = p => `<span class="prio prio-${slug(p)}">${esc(dc(p))}</span>`;
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
    const ua = navigator.userAgent; let m, b = L('tk.unknownBrowser');
    if ((m = ua.match(/Edg\/(\d+)/))) b = 'Edge ' + m[1];
    else if ((m = ua.match(/Firefox\/(\d+)/))) b = 'Firefox ' + m[1];
    else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) b = 'Chrome ' + m[1];
    else if ((m = ua.match(/Version\/(\d+).*Safari/))) b = 'Safari ' + m[1];
    const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : L('tk.unknownOs');
    return L('tk.meta', { v: APP_VERSIE, b, os, w: window.innerWidth + '×' + window.innerHeight, th: themeEffective() === 'dark' ? L('theme.dark.lc') : L('theme.light.lc') });
  }

  // Info-menu (dropdown linksboven in de topbalk)
  function infoMenuHtml() {
    const open = tkOpenCount(), wacht = tkWachtCount(), unread = newsUnread();
    return `<div class="info-dd-head"><img class="info-dd-mark" src="img/beeldmerk.svg" alt=""><div><div class="strong">Diafragmo</div><div class="tiny muted">${versieLabel()} · ${buildLabel()}</div></div></div>
      <button type="button" class="info-item" role="menuitem" data-action="info-about">${icon('info')}<span class="grow">${L('info.about')}</span></button>
      <button type="button" class="info-item" role="menuitem" data-action="info-news">${icon('sparkle')}<span class="grow">${L('info.news')}</span>${unread ? `<span class="info-new">${L('common.new')}</span>` : ''}</button>
      <div class="info-sep" role="separator"></div>
      <a class="info-item" role="menuitem" href="#/support/nieuw">${icon('msg')}<span class="grow">${L('info.support')}</span><span class="tiny muted">${L('info.makeTicket')}</span></a>
      <a class="info-item" role="menuitem" href="#/support">${icon('file')}<span class="grow">${L('tk.mine')}</span>${wacht ? `<span class="info-count" title="${esc(L('tk.waitingYou'))}">${wacht}</span>` : ''}</a>
      <div class="info-sep" role="separator"></div>
      <a class="info-item" role="menuitem" href="#/beheer/support">${icon('inbox')}<span class="grow">${L('info.inbox')}<span class="tiny muted info-sub">${L('info.adminOnly')}</span></span>${open ? `<span class="info-count ink" title="${esc(L('info.openTickets'))}">${open}</span>` : ''}</a>`;
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
      title: L('info.about'), body: `<div class="about">
        <div class="about-head"><img class="about-icon" src="img/app-icoon.svg" alt=""><div><div class="about-name">diafragmo</div><div class="small muted">${versieLabel()} · ${buildLabel()}</div></div></div>
        <p>${L('about.text')}</p>
        <p class="small">${L('about.madeBy', { l: '<a class="link" href="https://noorderwind.app" target="_blank" rel="noopener">Noorderwind Studio</a>' })}</p>
        <div class="about-eu">${euBadge('eu-flag')}<span>${L('about.eu')}</span></div>
        <ul class="about-links">
          <li>${icon('globe')}<a class="link" href="https://noorderwindstudio.github.io/diafragmo/" target="_blank" rel="noopener">${L('about.openTab')}</a></li>
          <li>${icon('sparkle')}<a class="link" href="#/dashboard" data-action="info-news">${L('info.news')}</a></li>
          <li>${icon('msg')}<a class="link" href="#/support/nieuw">${L('about.contact')}</a></li>
        </ul>
        <p class="tiny muted">${L('about.proto')}</p></div>`,
      actions: [{ label: L('common.close'), cls: 'primary', onClick: closeModal }]
    });
  }
  function newsModal() {
    markNewsRead();
    modal({
      title: L('info.news'), body: CHANGELOG.map((c, i) => `<section class="cl-ver">
          <div class="cl-head"><span class="vtag">v${c.v}</span>${i === 0 ? `<strong>${L('news.newIn', { v: esc(c.v) })}</strong>` : ''}<span class="small muted">${fdate(c.datum)}</span>${i === 0 ? `<span class="pill inv-betaald">${L('news.current')}</span>` : ''}</div>
          <ul class="cl-list">${c.items.map(it => `<li>${icon(it[0])}<div><strong>${esc(L(it[1] + '.t'))}${it[2] ? ' ' + proBadge() : ''}</strong><span>${esc(L(it[1] + '.d'))}</span></div></li>`).join('')}</ul></section>`).join('') +
        `<p class="tiny muted">${L('news.note')}</p>`,
      actions: [{ label: L('news.feedback'), cls: 'ghost', onClick: () => go('#/support/nieuw') }, { label: L('common.close'), cls: 'primary', onClick: closeModal }]
    });
  }

  // Support – gebruikerskant
  function supportHead() {
    return `<div class="page-head"><div><h1>${L('info.support')}</h1><p class="muted">${L('tk.headSub')}</p></div><div class="head-actions"><a class="btn primary" href="#/support/nieuw">${icon('plus')} ${L('tk.new')}</a></div></div>`;
  }
  function supportTabs(active) {
    const n = tickets().filter(t => t.eigen).length, w = tkWachtCount();
    return `<nav class="tabs" aria-label="${esc(L('info.support'))}"><a class="tab ${active === 'lijst' ? 'active' : ''}" href="#/support">${L('tk.mine')} <span class="muted">(${n})</span>${w ? `<span class="tab-badge" title="${esc(dc('Wacht op jou'))}">${w}</span>` : ''}</a><a class="tab ${active === 'nieuw' ? 'active' : ''}" href="#/support/nieuw">${L('tk.new')}</a></nav>`;
  }
  function tkRow(t, beheer) {
    const last = t.berichten.filter(m => m.rol !== 'systeem').pop() || {};
    const href = beheer ? `#/beheer/support/${t.nr}` : `#/support/ticket/${t.nr}`;
    const lastTxt = last.rol === 'support' ? L('tk.lastSupport') : beheer ? L('tk.lastUser') : L('tk.lastYou');
    return `<li class="tk-row" data-action="go" data-href="${href}" tabindex="0" role="link" aria-label="${esc(L('tk.aria', { n: t.nr, s: dc(t.onderwerp), st: tkStatusLabel(t.status, beheer) }))}">
      <span class="tk-cat tk-cat-${slug(t.categorie)}" title="${esc(dc(t.categorie))}">${icon(TK_CAT_IC[t.categorie] || 'msg')}</span>
      <div class="grow tk-main"><div class="tk-title"><span class="tk-nr">#${t.nr}</span><span class="strong">${esc(dc(t.onderwerp))}</span></div>
        <div class="small muted tk-sub">${beheer ? `<span class="strong">${esc(t.van)}</span> · ` : ''}${esc(dc(t.categorie))} · ${prio(t.prioriteit)} · ${lastTxt}</div></div>
      <div class="tk-side">${tkPill(t.status, beheer)}<span class="tiny muted">${fdtShort(t.bijgewerkt)}</span></div></li>`;
  }
  function viewSupportList() {
    const mine = tickets().filter(t => t.eigen).slice().sort((a, b) => b.bijgewerkt.localeCompare(a.bijgewerkt));
    const w = tkWachtCount();
    return `${supportHead()}${supportTabs('lijst')}
      ${w ? `<div class="banner warn">${icon('msg')}<span class="grow">${Ln('tk.waitingN', w)}</span></div>` : ''}
      ${mine.length ? `<div class="card tk-card"><ul class="tk-list">${mine.map(t => tkRow(t, false)).join('')}</ul></div>` : `<div class="empty card">${icon('msg')}<p>${L('tk.none')}</p><a class="btn primary" href="#/support/nieuw">${L('tk.new')}</a></div>`}
      <p class="tiny muted mt-s">${L('tk.demoNote')}</p>`;
  }
  function tkAttHtml() {
    const a = S.tkAtt;
    return a ? `<span class="att-chip">${icon('paperclip')}<span class="att-name">${esc(a.naam)}</span><small>${esc(size(a.grootte))}</small><button type="button" class="att-x" data-action="tk-att-remove" aria-label="${esc(L('tk.removeShot'))}">${icon('x')}</button></span>`
      : `<label class="btn sm tk-file-btn" for="tk-file">${icon('upload')} ${L('tk.addShot')}</label><input type="file" id="tk-file" accept="image/*" hidden><button type="button" class="chip" data-action="tk-att-demo">${L('tk.sampleShot')}</button>`;
  }
  function viewSupportNew() {
    return `${supportHead()}${supportTabs('nieuw')}
      <div class="tk-new">
        <form class="card form-col tk-form" data-form="ticket-new">
          <label>${L('tk.f.subject')}<input name="onderwerp" required maxlength="120" placeholder="${esc(L('tk.f.subjectPh'))}" autocomplete="off"></label>
          <div class="form-grid two tk-grid"><label>${L('tk.f.cat')}<select name="categorie">${TK_CATS.map(c => `<option value="${c}">${esc(dc(c))}</option>`).join('')}</select></label>
            <label>${L('tk.f.prio')}<select name="prioriteit">${TK_PRIOS.map(p => `<option value="${p}" ${p === 'Normaal' ? 'selected' : ''}>${esc(dc(p))}</option>`).join('')}</select></label></div>
          <label>${L('tk.f.desc')}<textarea name="beschrijving" required rows="6" placeholder="${esc(L('tk.f.descPh'))}"></textarea></label>
          <div><div class="lbl-txt">${L('tk.f.shot')}</div><div class="att-row tk-att" id="tk-att">${tkAttHtml()}</div></div>
          <div class="tk-meta">${icon('settings')}<span><span class="strong">${L('tk.f.auto')}</span> ${esc(browserInfo())}</span></div>
          <div class="row gap wrap tk-actions"><a class="btn ghost" href="#/support">${L('common.cancel')}</a><button class="btn primary" type="submit">${icon('send')} ${L('tk.f.submit')}</button></div>
        </form>
        <aside class="card tk-help"><h2>${L('tk.help')}</h2>
          <ul class="bullets small"><li>${L('tk.help1')}</li><li>${L('tk.help2', { h: esc(dc('Hoog')) })}</li><li>${L('tk.help3')}</li></ul>
          <p class="small muted">${L('tk.hours')}</p></aside>
      </div>`;
  }
  function tkMsg(m, beheer) {
    if (m.rol === 'systeem') {
      if (m.intern && !beheer) return '';
      const txt = m.veld === 'status' ? L('tk.sys.status', { s: tkStatusLabel(m.naar, beheer) }) : m.veld === 'prioriteit' ? L('tk.sys.prio', { p: dc(m.naar) }) : m.veld === 'toegewezen' ? L('tk.sys.assigned', { a: dc(m.naar) }) : dc(m.tekst);
      return `<li class="tk-sys"><span>${esc(txt)}${m.door && (beheer || m.door !== 'beheer') ? ' · ' + esc(dc(m.door)) : ''}${m.intern ? ' · ' + L('tk.internal') : ''}</span><time>${fdt(m.tijd)}</time></li>`;
    }
    const sup = m.rol === 'support', ik = !beheer && m.naam === 'Sanne de Vries';
    const av = sup ? '<span class="tk-av"><img src="img/beeldmerk.svg" alt=""></span>' : `<span class="avatar sm ${m.naam === 'Sanne de Vries' ? '' : 'klant'}">${esc(initials(m.naam))}</span>`;
    const who = sup ? L('tk.supportName') + (beheer && m.agent ? ` (${m.agent})` : '') : ik ? L('mail.you') : m.naam;
    return `<li class="tk-msg ${sup ? 'sup' : 'usr'}">${av}<div class="tk-bubble"><div class="tk-who"><span class="strong">${esc(who)}</span><time class="tiny muted">${fdt(m.tijd)}</time></div><div class="tk-text">${esc(dc(m.tekst))}</div>${m.bijlage ? `<div class="att-row"><button type="button" class="att-chip" data-action="download" data-name="${esc(m.bijlage.naam)}">${icon('paperclip')}<span class="att-name">${esc(m.bijlage.naam)}</span><small>${esc(size(m.bijlage.grootte))}</small></button></div>` : ''}</div></li>`;
  }
  function beheerBanner() { return `<div class="banner info">${icon('shield')}<span class="grow small">${L('tk.adminBanner')}</span></div>`; }
  function viewTicket(t, beheer) {
    if (!t) return viewNotFound();
    const back = beheer ? `<a class="back" href="#/beheer/support">${icon('arrowLeft')} ${L('tk.inbox')}</a>` : `<a class="back" href="#/support">${icon('arrowLeft')} ${L('tk.mine')}</a>`;
    const opts = (list, cur, lbl) => list.map(v => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(lbl ? lbl(v) : dc(v))}</option>`).join('');
    const reply = `<form class="tk-reply" data-form="${beheer ? 'ticket-reply-support' : 'ticket-reply'}" data-nr="${t.nr}">
        <textarea name="tekst" rows="3" required aria-label="${esc(beheer ? L('tk.replyAsSupport') : L('tk.yourReply'))}" placeholder="${esc(beheer ? L('tk.replyAsSupportPh') : L('tk.yourReplyPh'))}"></textarea>
        <div class="tk-reply-foot">${beheer ? `<label class="tk-inline">${L('tk.statusAfter')}<select name="status">${opts(TK_STATUSES, 'Wacht op jou', s => tkStatusLabel(s, true))}</select></label>` : `<span class="tiny muted">${t.status === 'Opgelost' ? L('tk.reopens') : L('tk.notified')}</span>`}
          <div class="row gap wrap">${!beheer && t.status !== 'Opgelost' ? `<button type="button" class="btn ghost" data-action="tk-resolve" data-nr="${t.nr}">${icon('check')} ${L('tk.markResolved')}</button>` : ''}<button class="btn primary" type="submit">${icon('send')} ${beheer ? L('tk.sendAnswer') : L('tk.sendReply')}</button></div></div>
      </form>`;
    const side = beheer ? `<aside class="card tk-aside form-col"><h2>${L('tk.admin')}</h2>
        <label>${L('proj.th.status')}<select data-tk-set="status" data-nr="${t.nr}">${opts(TK_STATUSES, t.status, s => tkStatusLabel(s, true))}</select></label>
        <label>${L('tk.f.prioPlain')}<select data-tk-set="prioriteit" data-nr="${t.nr}">${opts(TK_PRIOS, t.prioriteit)}</select></label>
        <label>${L('tk.assignedTo')}<select data-tk-set="toegewezen" data-nr="${t.nr}">${opts(TK_AGENTS, t.toegewezen)}</select></label>
        <div class="tk-user"><span class="avatar sm ${t.eigen ? '' : 'klant'}">${esc(initials(t.van))}</span><div class="grow"><div class="strong small">${esc(t.van)}</div><div class="tiny muted">${esc(dc(t.bedrijf))} · ${esc(t.email)}</div></div></div>
        <div class="tk-meta">${icon('settings')}<span>${esc(dc(t.meta))}</span></div></aside>`
      : `<aside class="card tk-aside"><h2>${L('tk.details')}</h2>
        <dl class="tk-dl"><dt>${L('proj.th.status')}</dt><dd>${tkPill(t.status)}</dd><dt>${L('tk.f.catPlain')}</dt><dd>${esc(dc(t.categorie))}</dd><dt>${L('tk.f.prioPlain')}</dt><dd>${prio(t.prioriteit)}</dd><dt>${L('tk.created')}</dt><dd>${fdt(t.aangemaakt)}</dd><dt>${L('tk.updated')}</dt><dd>${fdt(t.bijgewerkt)}</dd></dl>
        ${t.status === 'Wacht op jou' ? `<div class="banner warn small">${icon('msg')}<span>${L('tk.supportWaits')}</span></div>` : ''}
        <div class="tk-meta">${icon('settings')}<span>${esc(dc(t.meta))}</span></div></aside>`;
    return `${back}
      <div class="page-head tk-head"><div><div class="row gap wrap"><span class="tk-nr big">#${t.nr}</span>${tkPill(t.status, beheer)}${beheer ? `<span class="pill tk-beheer">${L('tk.adminDemo')}</span>` : ''}</div><h1>${esc(dc(t.onderwerp))}</h1>
        <p class="muted small">${esc(dc(t.categorie))} · ${L('tk.prioLc')} ${prio(t.prioriteit)} · ${L('tk.createdLc', { d: fdt(t.aangemaakt) })}${beheer ? ' · ' + L('tk.by', { n: esc(t.van) }) : ''}</p></div></div>
      ${beheer ? beheerBanner() : ''}
      <div class="tk-detail"><section class="card"><h2 class="tk-h">${L('tk.conversation')}</h2><ol class="tk-thread">${t.berichten.map(m => tkMsg(m, beheer)).join('')}</ol>${reply}</section>${side}</div>`;
  }
  // Support – beheerderskant
  function viewBeheer() {
    const all = tickets(), f = S.tkFilter;
    const count = s => all.filter(t => t.status === s).length;
    const list = all.filter(t => (f.status === 'Alle' || t.status === f.status) && (f.cat === 'Alle' || t.categorie === f.cat))
      .slice().sort((a, b) => (a.status === 'Opgelost') - (b.status === 'Opgelost') || b.bijgewerkt.localeCompare(a.bijgewerkt));
    return `<div class="page-head"><div><div class="row gap wrap"><h1>${L('tk.inbox')}</h1><span class="pill tk-beheer">${L('tk.adminDemo')}</span></div><p class="muted">${L('tk.inboxSub', { n: count('Open') })}</p></div>
        <div class="head-actions"><button class="btn ghost" data-action="tk-reset">${L('tk.resetDemo')}</button></div></div>
      ${beheerBanner()}
      <div class="toolbar"><div class="chips">${['Alle'].concat(TK_STATUSES).map(s => `<button class="chip ${f.status === s ? 'active' : ''}" data-action="tk-filter" data-v="${esc(s)}" aria-pressed="${f.status === s}">${esc(s === 'Alle' ? L('common.all') : tkStatusLabel(s, true))} <span>${s === 'Alle' ? all.length : count(s)}</span></button>`).join('')}</div>
        <div class="toolbar-right"><label class="tk-inline">${L('tk.f.catPlain')}<select class="select" data-tk-filter="cat">${['Alle'].concat(TK_CATS).map(c => `<option value="${c}" ${f.cat === c ? 'selected' : ''}>${esc(c === 'Alle' ? L('common.all') : dc(c))}</option>`).join('')}</select></label></div></div>
      ${list.length ? `<div class="card tk-card"><ul class="tk-list">${list.map(t => tkRow(t, true)).join('')}</ul></div>` : `<div class="empty card">${icon('inbox')}<p>${L('tk.noneFilter')}</p></div>`}`;
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
    Object.keys(o.signed || {}).forEach(pid => { const q = S.quotes[pid]; if (q && !q.signed) { q.signed = o.signed[pid]; applySigned(pid); if (live) toast(L('sign.notify', { n: esc(q.signed.naam), nr: esc(q.nr) })); } });
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
    if (t.betaald) return `<div class="tikkie-status is-paid tiny">${icon('check')}<span><strong>${L('tk2.paidVia')}</strong> · ${esc(stamp(t.betaald))}</span></div>`;
    return `<div class="tikkie-status tiny"><span class="pay-pill tikkie">Tikkie</span><span>${L('tk2.sentOn', { d: esc(stamp(t.verstuurd)), v: esc(dc(t.via)), a: eur(t.bedrag) })}</span></div>`;
  }
  // Knoppen alleen als Tikkie aan staat (anders verborgen; de hint staat in Instellingen)
  function tikkieActionsHtml(nr, pid, status, mode) {
    if (!tikkieOn() || !nr || nr === '–') return '';
    const t = S.tikkie.verzoeken[nr];
    if (status === 'Betaald' || (t && t.betaald)) return '';
    if (mode !== 'paid-only' && !TIKKIE_OPEN.includes(status)) return '';
    const send = mode === 'paid-only' ? '' : `<button class="btn sm" data-action="tikkie-open" data-id="${pid}" data-nr="${esc(nr)}">${icon('send')} ${L('tk2.send')}</button>`;
    const paid = t ? `<button class="btn sm ghost" data-action="tikkie-paid" data-id="${pid}" data-nr="${esc(nr)}">${icon('check')} ${L('tk2.demoPaid')}</button>` : '';
    return send || paid ? `<div class="tikkie-actions">${send}${paid}</div>` : '';
  }
  function payMethodsHtml() {
    const t = S.tikkie, on = tikkieOn();
    return `<section class="card pay-methods" id="betaalmethoden" aria-labelledby="pm-title">
      <div class="card-head"><h2 id="pm-title">${L('pm.title')}</h2><span class="small muted">${L('pm.sub')}</span></div>
      <ul class="list pm-list">
        <li class="row-item">
          <div class="grow"><div class="pm-title"><span class="pay-pill on-card">iDEAL | Wero</span><span class="strong">${L('pm.ideal')}</span><span class="tag">${L('pm.default')}</span></div>
            <div class="small muted">${L('pm.idealSub')}</div></div>
          <label class="switch" title="${esc(L('pm.idealTitle'))}"><input type="checkbox" checked disabled aria-label="${esc(L('pm.idealAria'))}"><span></span></label>
        </li>
        <li class="row-item">
          <div class="grow"><div class="pm-title"><span class="pay-pill tikkie">Tikkie</span><span class="strong">Tikkie (Tikkie Zakelijk, ABN AMRO)</span></div>
            <div class="small muted">${L('pm.tikkieSub')}</div>
            <div class="pm-status tiny ${t.gekoppeld ? 'ok' : 'muted'}">${t.gekoppeld ? `${icon('check')} ${L('pm.tikkieLinked', { s: esc(D.studio.naam), d: esc(stamp(t.sinds)) })}` : L('acc.notConnected')}</div>
            <div class="row gap wrap pm-actions">${t.gekoppeld ? `<button class="btn sm ghost" data-action="tikkie-disconnect">${L('acc.disconnect')}</button>` : `<button class="btn sm" data-action="tikkie-connect">${icon('link')} ${L('acc.connect')}</button>`}</div></div>
          <label class="switch"><input type="checkbox" data-action="tikkie-toggle" ${on ? 'checked' : ''} aria-label="${esc(L('pm.tikkieAria'))}"><span></span></label>
        </li>
      </ul>
      ${on ? `<div class="banner ok small">${icon('check')}<span class="grow">${L('pm.on')}</span></div>`
        : `<div class="banner info small">${icon('info')}<span class="grow">${L('pm.off')}</span></div>`}
      <p class="tiny muted">${L('pm.proto')}</p>
    </section>`;
  }
  function tikkieConsent(after) {
    modal({
      title: L('tc.title'),
      body: `<div class="consent">
        <div class="consent-logos"><span class="consent-app"><img src="img/app-icoon.svg" alt="Diafragmo" style="width:52px;height:52px;border-radius:14px;display:block"></span><span class="consent-dots"><i></i><i></i><i></i></span><span class="consent-prov tikkie-prov"><span class="pay-pill tikkie">Tikkie</span></span></div>
        <div class="consent-acct"><span class="avatar sm">SV</span><div class="grow"><div class="strong small">${esc(D.studio.naam)}</div><div class="tiny muted">${L('tc.account', { i: esc(dc(D.studio.iban)) })}</div></div><span class="tiny muted">ABN AMRO</span></div>
        <p class="consent-q">${L('tc.q')}</p>
        <p class="tiny muted pay-hint">${L('tc.hint')}</p>
        <ul class="perm-list">
          <li>${icon('euro')}<div><div class="strong">${L('tc.p1')}</div><div class="tiny muted">${L('tc.p1s')}</div></div></li>
          <li>${icon('check')}<div><div class="strong">${L('tc.p2')}</div><div class="tiny muted">${L('tc.p2s')}</div></div></li>
        </ul>
        <p class="tiny muted">${L('tc.foot')}</p></div>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: () => { closeModal(); if (after) after(false); } }, { label: L('tc.allow'), cls: 'primary', onClick: () => {
        Object.assign(S.tikkie, { gekoppeld: true, on: true, sinds: nowLabel() }); demoSave(); closeModal();
        toast(L('tc.done')); if (after) after(true);
      } }]
    });
  }
  let TIK = null; // betaalverzoek dat in het venster open staat
  const tikkieCode = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let x = ''; for (let i = 0; i < 6; i++) x += c[Math.floor(Math.random() * c.length)]; return x; };
  const tikkieMsg = (t, p) => L('tk2.waMsg', { n: firstName(p.contact), a: eur(t.bedrag), o: t.omschrijving, d: fdate(t.geldig), l: t.link, s: firstName(D.studio.eigenaar) });
  const waUrl = (t, p) => 'https://wa.me/?text=' + encodeURIComponent(tikkieMsg(t, p));
  function tikkieModal(pid, nr) {
    const p = proj(pid); if (!p || !tikkieOn()) return; ensure(p);
    const open = invOpenAmount(nr, pid), prev = S.tikkie.verzoeken[nr];
    TIK = prev ? Object.assign({}, prev) : { nr, pid, bedrag: Math.round(open * 100) / 100, omschrijving: `${nr} – ${ptitle(p)}`, geldig: isoAdd(todayIso(), 14), link: `https://tikkie.me/pay/demo-${slug(nr)}-${tikkieCode()}` };
    modal({
      title: L('tk2.send'), wide: true,
      body: `<form id="tikkie-form" class="tikkie-form" novalidate>
        <div class="tikkie-head"><span class="pay-pill tikkie">Tikkie</span><div class="grow"><div class="strong small">${L('tk2.forInvoice', { nr: esc(nr) })}</div><div class="tiny muted">${esc(dc(p.klant))} · ${L('qb.attn', { c: esc(p.contact) })} · ${L('tk2.viaZakelijk')}</div></div></div>
        <p class="tiny muted pay-hint">${L('tk2.hint')}</p>
        <div class="form-grid two">
          <label>${L('qb.th.amount')}<div class="input-prefix"><span>€</span><input type="number" id="tikkie-bedrag" min="0.01" step="0.01" required value="${TIK.bedrag.toFixed(2)}"></div><span class="tiny muted">${L('tk2.outstanding', { a: eur(open) })}</span></label>
          <label>${L('qb.validUntil')}<input type="date" id="tikkie-geldig" required min="${todayIso()}" value="${TIK.geldig}"><span class="tiny muted">${L('tk2.default14')}</span></label>
          <label class="full">${L('qb.desc')}<input id="tikkie-oms" required maxlength="80" value="${esc(TIK.omschrijving)}"></label>
        </div>
        <div class="tikkie-link">
          <div class="row-between"><span class="tiny strong">${L('tk2.payLink')}</span><span class="demo-tag">${L('tk2.demoLink')}</span></div>
          <input readonly id="tikkie-link" value="${esc(TIK.link)}" aria-label="${esc(L('tk2.linkAria'))}">
          <div class="tiny muted">${L('tk2.fakeLink')}</div>
        </div>
        <div class="tikkie-share">
          <a class="btn primary" id="tikkie-wa" href="${esc(waUrl(TIK, p))}" target="_blank" rel="noopener" data-action="tikkie-share" data-via="whatsapp">${icon('msg')} ${L('tk2.wa')}</a>
          <button type="button" class="btn" data-action="tikkie-share" data-via="kopie">${icon('link')} ${L('tk2.copy')}</button>
          <button type="button" class="btn" data-action="tikkie-share" data-via="email">${icon('send')} ${L('tk2.email')}</button>
        </div>
        ${prev ? `<p class="tiny muted">${L('tk2.prev', { d: esc(stamp(prev.verstuurd)), v: esc(dc(prev.via)) })}</p>` : ''}
        <p class="tiny muted">${L('tk2.waNote')}</p>
      </form>`,
      actions: [{ label: L('common.close'), cls: 'ghost', onClick: closeModal }]
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
    b.setCustomValidity(Number(b.value) > 0 ? '' : L('tk2.vAmount', { a: eur(0) }));
    g.setCustomValidity(g.value && g.value >= todayIso() ? '' : L('tk2.vDate'));
    o.setCustomValidity(o.value.trim() ? '' : L('tk2.vDesc'));
    return f.reportValidity();
  }
  function tikkieSent(t, via) { S.tikkie.verzoeken[t.nr] = Object.assign({}, t, { verstuurd: nowLabel(), via, betaald: null }); demoSave(); }

  // ---------- Pro-functies (timer, ondertiteling) ----------
  const isPro = () => S.settings.plan === 'Pro';
  const proBadge = lock => `<span class="pro-badge" title="${esc(L('pro.partOf'))}">${lock ? icon('lock') : ''}Pro</span>`;
  const PRO_INFO = {
    timer: { get titel() { return L('plan.f.timer'); }, get tekst() { return L('pro.timerText'); } },
    subs: { get titel() { return L('pro.subsTitle'); }, get tekst() { return L('pro.subsText'); } }
  };
  function lockedHtml(f) {
    const i = PRO_INFO[f];
    return `<div class="pro-locked"><span class="pl-ic">${icon('lock')}</span><div class="grow"><div class="strong">${esc(i.titel)} ${proBadge()}</div><div class="small muted"><strong class="pl-avail">${L('pro.avail')}</strong> ${esc(i.tekst)}</div></div><button class="btn primary sm" data-action="upgrade" data-f="${f}">${icon('sparkle')} ${L('pro.upgrade')}</button></div>`;
  }
  function setPlan(plan, how) {
    if (plan !== 'Basis' && plan !== 'Pro') return;
    S.settings.plan = plan; demoSave();
    toast(how === 'demo' ? L('pro.demoAs', { p: esc(dc(plan)) }) : L('pro.changed', { p: esc(dc(plan)) }));
    renderKeep();
  }
  function upgradeModal(f) {
    const rows = [
      ['cmp.r1', 1, 1],
      ['plan.f.sign', 1, 1, 1],
      ['plan.f.callsheets', 1, 1, 1],
      ['cmp.r4', 1, 1, 1],
      ['plan.f.review', 0, 1],
      ['cmp.r6', 0, 1],
      ['plan.f.timer', 0, 1, 1],
      ['plan.f.subs', 0, 1, 1],
      ['cmp.storage', '250 GB', '2 TB']
    ];
    const cell = v => v === 1 ? `<span class="ok">${icon('check')}</span>` : v === 0 ? '<span class="muted">–</span>' : esc(v);
    const price = n => `${eur(n).replace(/[.,]00(?=\D*$)/, '')}<small>${L('set.perMo')}</small>`;
    modal({
      title: f && PRO_INFO[f] ? L('cmp.partOfPro', { f: PRO_INFO[f].titel }) : L('cmp.title', { b: dc('Basis') }), wide: true,
      body: `${f && PRO_INFO[f] ? `<p class="small muted">${esc(PRO_INFO[f].tekst)}</p>` : ''}
        <div class="table-wrap"><table class="table cmp-table">
          <thead><tr><th>${L('cmp.feature')}</th><th class="c">${esc(dc('Basis'))}<div class="cmp-price">${price(24)}</div></th><th class="c pro-col">Pro<div class="cmp-price">${price(39)}</div></th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(L(r[0]))}${r[3] ? ` <span class="new-tag">${L('common.new')}</span>` : ''}</td><td class="c">${cell(r[1])}</td><td class="c pro-col">${cell(r[2])}</td></tr>`).join('')}</tbody>
        </table></div>
        <p class="tiny muted">${L('cmp.note')}</p>`,
      actions: [{ label: L('cmp.notNow'), cls: 'ghost', onClick: closeModal }, { label: `${icon('sparkle')} ${L('pro.upgrade')}`, cls: 'primary', onClick: () => { closeModal(); setPlan('Pro'); } }]
    });
  }

  // ---------- Timer voor uren (Pro) ----------
  const ACTS = ['Opname', 'Montage', 'Overleg', 'Reistijd'];
  const ACT_IC = { Opname: 'camera', Montage: 'film', Overleg: 'users', Reistijd: 'pin' };
  const elapsed = () => S.timer ? Math.max(0, (Date.now() - S.timer.start) / 1000) : 0;
  const hms = s => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function timerBtnHtml(p, sm) {
    const c = sm ? 'sm' : '';
    if (!isPro()) return `<button class="btn ${c} ghost locked-btn" data-action="upgrade" data-f="timer" title="${esc(L('pro.availShort'))}">${icon('clock')} Timer ${proBadge(true)}</button>`;
    if (S.timer && S.timer.pid === p.id) return `<button class="btn ${c} timer-run" data-action="timer-stop" title="${esc(L('tm.stopSave'))}"><span class="timer-dot"></span> ${L('tm.stop')} <span class="mono" data-timer-val>${hms(elapsed())}</span></button>`;
    return `<button class="btn ${c}" data-action="timer-start" data-id="${p.id}">${icon('clock')} ${L('tm.start')} ${proBadge()}</button>`;
  }
  function timerPillHtml() {
    if (!S.timer || !isPro()) return '';
    const p = proj(S.timer.pid); if (!p) return '';
    return `<div class="timer-pill"><button class="tp-main" data-action="go" data-href="#/project/${p.id}/uren" title="${esc(L('tm.runningFor', { t: ptitle(p) }))}"><span class="timer-dot"></span><span class="tp-time mono" data-timer-val>${hms(elapsed())}</span><span class="tp-name">${esc(ptitle(p))}</span></button><button class="tp-stop" data-action="timer-stop" aria-label="${esc(L('tm.stopSaveAria'))}" title="${esc(L('tm.stopSave'))}"><span class="stop-sq"></span></button></div>`;
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
      modal({ title: L('tm.already'), body: `<p>${L('tm.alreadyText', { t: esc(ptitle(cur)), e: hms(elapsed()) })}</p>`,
        actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: L('tm.stopRunning'), cls: 'primary', onClick: timerStopModal }] });
      return;
    }
    if (S.timer) return;
    ensure(p); S.timer = { pid, start: Date.now() }; demoSave();
    toast(L('tm.started', { t: esc(ptitle(p)) })); renderKeep();
  }
  function timerStopModal() {
    const t = S.timer; if (!t) return; const p = proj(t.pid); ensure(p);
    const secs = elapsed(); const uren = Math.max(0.25, Math.ceil(secs / 900) * 0.25);
    const defAct = p.status === 'Opname' ? 'Opname' : (p.status === 'Montage' || p.status === 'Feedback') ? 'Montage' : 'Overleg';
    const st = new Date(t.start);
    modal({
      title: L('tm.stopTitle'),
      body: `<form id="timer-form" class="form-col">
        <div class="timer-sum"><span class="timer-dot"></span><div class="grow"><div class="strong">${esc(ptitle(p))}</div><div class="tiny muted">${esc(dc(p.klant))} · ${L('tm.startedAt', { t: Fx.time(st) })} · ${L('tm.measured', { t: hms(secs) })}</div></div></div>
        <div><div class="lbl-txt">${L('tm.activity')}</div><div class="act-chips" role="radiogroup" aria-label="${esc(L('tm.activity'))}">${ACTS.map(a => `<label class="act-chip"><input type="radio" name="act" value="${a}" ${a === defAct ? 'checked' : ''}><span>${icon(ACT_IC[a])} ${esc(dc(a))}</span></label>`).join('')}</div></div>
        <label>${L('tm.descOpt')}<input name="omschrijving" placeholder="${esc(L('tm.descPh'))}" autocomplete="off"></label>
        <div class="form-grid two tight"><label>${L('common.date')}<input type="date" name="datum" value="${todayIso()}" required></label><label>${L('pj.hoursCol')}<input type="number" name="uren" min="0.25" step="0.25" value="${uren}" required></label></div>
        <label>${L('tm.kmOpt')}<input type="number" name="km" min="0" step="1" placeholder="0"></label>
        <p class="tiny muted">${L('tm.rounded', { a: num(urenTotaal(), 2), b: num(S.urenDoel, 0) })}</p>
        <button type="submit" hidden></button></form>`,
      actions: [
        { label: L('tm.discard'), cls: 'ghost', onClick: () => { S.timer = null; demoSave(); closeModal(); toast(L('tm.discarded')); renderKeep(); } },
        { label: L('tm.keepRunning'), cls: '', onClick: closeModal },
        { label: `${icon('check')} ${L('tm.saveHours')}`, cls: 'primary', onClick: timerSave }
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
    toast(L('tm.saved', { u: num(u, 2), a: esc(I.lang() === 'de' ? dc(d.act) : dc(d.act).toLowerCase()), t: esc(ptitle(p)), x: num(urenTotaal(), 2), y: num(S.urenDoel, 0) }));
    renderKeep();
  }
  function timerEditModal(pid, tid) {
    const e = S.timerUren.find(x => x.id === tid), row = (S.hours[pid] || []).find(x => x.tid === tid); if (!e || !row) return;
    modal({
      title: L('tm.editTitle'),
      body: `<form id="tedit-form" class="form-col">
        <div><div class="lbl-txt">${L('tm.activity')}</div><div class="act-chips">${ACTS.map(a => `<label class="act-chip"><input type="radio" name="act" value="${a}" ${a === e.act ? 'checked' : ''}><span>${icon(ACT_IC[a])} ${esc(dc(a))}</span></label>`).join('')}</div></div>
        <label>${L('qb.desc')}<input name="omschrijving" value="${esc(e.oms || '')}" autocomplete="off"></label>
        <div class="form-grid two tight"><label>${L('common.date')}<input type="date" name="datum" value="${esc(e.datum)}" required></label><label>${L('pj.hoursCol')}<input type="number" name="uren" min="0.25" step="0.25" value="${e.uren}" required></label></div>
        <label>${L('pj.kmCol')}<input type="number" name="km" min="0" step="1" value="${e.km || 0}"></label><button type="submit" hidden></button></form>`,
      actions: [{ label: L('common.delete'), cls: 'ghost', onClick: () => {
        addedHours -= Number(e.uren) || 0; S.timerUren = S.timerUren.filter(x => x.id !== tid); S.hours[pid] = S.hours[pid].filter(x => x.tid !== tid); demoSave(); closeModal(); toast(L('tm.deleted')); renderKeep();
      } }, { label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: L('common.save'), cls: 'primary', onClick: () => {
        const f = $('#tedit-form'); if (!f.reportValidity()) return; const d = Object.fromEntries(new FormData(f).entries());
        const u = Math.round((Number(d.uren) || 0) * 100) / 100; addedHours += u - (Number(e.uren) || 0);
        e.act = d.act; e.oms = d.omschrijving.trim(); e.activiteit = e.act + (e.oms ? ' – ' + e.oms : ''); e.datum = d.datum; e.uren = u; e.km = Number(d.km) || 0;
        Object.assign(row, { datum: e.datum, activiteit: e.activiteit, uren: u, km: e.km }); demoSave(); closeModal(); toast(L('tm.updated')); renderKeep();
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
    const f = S.finance[pid]; f.offerte.status = 'Geaccepteerd'; f.offerte.datum = d; // ISO; weergave via Fx.dm
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
    toast(L('sign.toast', { n: esc(naam), nr: esc(q.nr), s: esc(dc('Pre-productie')), inv: esc(q.signed.invNr) }));
  }
  function quoteDocHtml(p, q) {
    const c = quoteCalc(q), sg = q.signed;
    return `<div class="doc quote-doc">
      <div class="doc-top"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${studioIds()}</div></div></div><div class="doc-title">${esc(dc('Offerte').toUpperCase())}<div class="tiny muted">${esc(q.nr)}</div></div></div>
      <div class="doc-meta"><div><div class="tiny muted">${L('qb.to')}</div><div class="strong">${esc(dc(q.aan || p.klant))}</div><div class="small">${L('qb.attn', { c: esc(q.tav || p.contact) })}</div></div><div><div class="tiny muted">${L('common.date')}</div><div class="small">${fdate(q.datum)}</div><div class="tiny muted">${L('qb.validUntil')}</div><div class="small">${fdate(q.geldig)}</div></div></div>
      <div class="small"><span class="muted">${L('qb.re')}</span> ${esc(ptitle(p))}</div>
      ${q.intro ? `<div class="small">${esc(dc(q.intro))}</div>` : ''}
      <table class="doc-lines"><thead><tr><th>${L('qb.desc')}</th><th class="num">${L('qb.qty')}</th><th class="num">${L('pj.total')}</th></tr></thead>
        <tbody>${q.lines.map(l => `<tr><td>${esc(dc(l.omschrijving))}</td><td class="num">${num(l.aantal, 2)} ${esc(dc(l.eenheid))}</td><td class="num">${eur(l.aantal * l.prijs)}</td></tr>`).join('')}</tbody></table>
      <dl class="sum doc-sum"><dt>${L('qb.subtotal')}</dt><dd>${eur(c.sub)}</dd><dt>${L('qb.vat21')}</dt><dd>${eur(c.btw)}</dd><dt class="strong">${L('pj.total')}</dt><dd class="strong">${eur(c.tot)}</dd><dt class="muted">${L('sign.depositOnApproval', { p: q.aanbetalingPct })}</dt><dd class="muted">${eur(c.aanb)}</dd></dl>
      <div class="doc-terms"><div class="tiny strong">${L('sign.terms')}</div><div class="tiny muted">${esc(dc(q.voorwaarden || ''))}</div></div>
      <div class="doc-sign ${sg ? 'signed' : ''}">
        <div class="doc-sign-box">${sg ? `<img src="${esc(sg.img)}" alt="${esc(L('sign.sigOf', { n: sg.naam }))}">` : `<span class="tiny muted">${L('sign.clientSig')}</span>`}</div>
        <div class="tiny">${sg ? L('sign.agreed', { n: esc(sg.naam), d: fdt(sg.datum) }) : `<span class="muted">${L('sign.notYet')}</span>`}</div>
        ${sg ? `<span class="doc-stamp">${esc(dc('Geaccepteerd'))}</span>` : ''}
      </div>
      <div class="tiny muted doc-foot">${L('qb.sampleDoc')}</div>
    </div>`;
  }
  function signStatusHtml(q) {
    return q.signed
      ? `<div class="sign-status done">${icon('check')}<span>${L('sign.signedBy', { n: esc(q.signed.naam), d: fdt(q.signed.datum) })}</span></div>`
      : `<div class="sign-status pending">${icon('clock')}<span>${L('sign.pending', { s: esc(dc('Verstuurd')), d: fdate(q.verstuurd) })}</span></div>`;
  }
  function quoteSignCard(p) {
    const q = S.quotes[p.id]; if (!q) return '';
    const c = quoteCalc(q), inv = q.signed ? S.invoices.find(i => i.nr === q.signed.invNr) : null;
    return `<section class="card sign-card">
      <div class="card-head"><h2>${L('sign.cardTitle', { nr: esc(q.nr) })}</h2>${statusPillInv(q.status)}</div>
      <div class="sign-card-body">
        <div class="grow">
          ${signStatusHtml(q)}
          <p class="small muted">${L('sign.cardSum', { a: eur(c.tot), c: esc(q.tav || p.contact) })} ${q.signed ? L('sign.projectIs', { s: esc(dc(p.status)) }) : L('sign.onSign', { s: esc(dc('Pre-productie')), p: q.aanbetalingPct })}</p>
          ${inv ? `<div class="sign-inv">${icon('euro')}<span class="grow small">${L('sign.depInv', { nr: esc(inv.nr), a: eur(inv.bedrag) })} · ${statusPillInv(inv.status)}</span>${inv.status === 'Concept' ? `<button class="btn sm" data-action="send-invoice" data-nr="${esc(inv.nr)}">${icon('send')} ${L('sign.send')}</button>` : ''}</div>` : ''}
          <div class="row gap wrap sign-actions">
            ${q.signed ? '' : `<button class="btn sm primary" data-action="sign-copy" data-id="${p.id}">${icon('link')} ${L('qb.copySignLink')}</button>`}
            <button class="btn sm" data-action="quote-view" data-id="${p.id}">${icon('file')} ${L('sign.viewQuote')}</button>
            <a class="btn sm ghost" href="#/klant/${p.id}/offerte">${icon('eye')} ${L('set.viewAsClient')}</a>
            ${q.signed ? `<button class="btn sm ghost" data-action="sign-reset" data-id="${p.id}">${L('sign.reset')}</button>` : `<button class="btn sm ghost" data-action="compose" data-id="${p.id}" data-kind="offerte">${icon('send')} ${L('sign.remind')}</button>`}
          </div>
        </div>
        ${q.signed ? `<div class="sig-paper" title="${esc(L('sign.sigOf', { n: q.signed.naam }))}"><img src="${esc(q.signed.img)}" alt="${esc(L('sign.sigOf', { n: q.signed.naam }))}"></div>` : ''}
      </div>
    </section>`;
  }
  function portalQuoteCard(p, q) {
    const c = quoteCalc(q);
    return `<section class="pcard span-2 pq-card">
      <h2>${icon('file')} ${esc(dc('Offerte'))} ${esc(q.nr)} ${q.signed ? statusPillInv('Geaccepteerd') : `<span class="pill inv-verstuurd">${L('sign.awaitYou')}</span>`}</h2>
      <p class="small muted">${esc(dc(q.intro || ''))}</p>
      <ul class="pq-lines">${q.lines.map(l => `<li><span>${esc(dc(l.omschrijving))}</span><strong>${eur(l.aantal * l.prijs)}</strong></li>`).join('')}</ul>
      <dl class="sum"><dt>${L('sign.totalExcl')}</dt><dd>${eur(c.sub)}</dd><dt class="strong">${L('sign.totalIncl')}</dt><dd class="strong">${eur(c.tot)}</dd></dl>
      ${q.signed ? `<div class="pq-signed"><div class="sig-paper sm"><img src="${esc(q.signed.img)}" alt="${esc(L('sign.sigOf', { n: q.signed.naam }))}"></div><div class="grow small">${icon('check')} ${L('sign.signedBy', { n: esc(q.signed.naam), d: fdt(q.signed.datum) })}</div><a class="btn sm" href="#/klant/${p.id}/offerte">${L('sign.viewQuote')}</a></div>`
        : `<div class="pq-cta"><div class="grow"><div class="strong">${L('sign.agreeQ')}</div><div class="small muted">${L('sign.agreeSub', { d: fdate(q.geldig) })}</div></div><a class="btn brand-btn" href="#/klant/${p.id}/offerte">${icon('pen')} ${L('sign.agreeSign')}</a></div>`}
    </section>`;
  }
  function signPanelHtml(p, q) {
    const c = quoteCalc(q), fn = firstName(q.tav || p.contact);
    if (q.signed) return `<div class="sign-done"><div class="paid-check">${icon('check')}</div><h2>${L('sign.doneTitle')}</h2>
      <p class="small muted">${L('sign.doneText', { n: esc(firstName(q.signed.naam)), s: esc(D.studio.eigenaar), p: q.aanbetalingPct, a: eur(c.aanb) })}</p>
      <div class="sig-paper"><img src="${esc(q.signed.img)}" alt="${esc(L('sign.sigOf', { n: q.signed.naam }))}"></div>
      <div class="tiny muted">${L('sign.signedByShort', { n: esc(q.signed.naam), d: fdt(q.signed.datum) })}</div>
      <a class="btn brand-btn block" href="#/klant/${p.id}">${L('por.backProject')}</a>
      <button class="btn ghost block sm" data-action="download" data-name="${esc(q.nr)}-${esc(L('sign.signedFile'))}.pdf">${icon('download')} ${L('sign.signedPdf')}</button></div>`;
    if (!S.signOpen) return `<h2>${icon('file')} ${L('sign.yourQuote')}</h2>
      <div class="invoice-mini"><div class="small muted">${esc(q.nr)} · ${esc(ptitle(p))}</div><div class="amount">${eur(c.tot)}</div><div class="small muted">${L('sign.inclValid', { d: fdate(q.geldig) })}</div></div>
      <p class="small muted">${L('sign.readIntro', { n: esc(fn) })}</p>
      <button class="btn brand-btn block" data-action="sign-open">${icon('pen')} ${L('sign.agreeSign')}</button>
      <button class="btn ghost block sm" data-action="download" data-name="${esc(q.nr)}.pdf">${icon('download')} ${L('sign.quotePdf')}</button>`;
    return `<h2>${icon('pen')} ${L('sign.agreeSign')}</h2>
      <form id="sign-form" class="sign-form" data-form="sign-quote" data-id="${p.id}" novalidate>
        <label>${L('sign.fullName')}<input name="naam" id="sign-name" required autocomplete="name" placeholder="${esc(L('sign.namePh', { n: q.tav || p.contact }))}"></label>
        <div><div class="lbl-txt">${L('sign.yourSig')}</div>
          <div class="sig-pad" id="sig-pad"><canvas id="sig-canvas" aria-label="${esc(L('sign.drawAria'))}" role="img"></canvas><span class="sig-hint">${L('sign.drawHint')}</span><span class="sig-line"></span></div>
          <div class="row-between sig-tools"><span class="tiny muted">${L('sign.onlyThis')}</span><button type="button" class="btn sm ghost" data-action="sig-clear">${L('sign.clear')}</button></div></div>
        <label class="check"><input type="checkbox" name="akkoord" id="sign-akkoord"> ${L('sign.agreeTerms')}</label>
        <button class="btn brand-btn block" type="submit" id="sign-submit" disabled>${L('sign.submit')}</button>
        <p class="tiny muted">${L('sign.storedNote')}</p>
      </form>`;
  }
  function viewPortalQuote(p) {
    const q = S.quotes[p.id];
    if (!q) return `${portalBar(p, L('sign.barNone'))}<div class="portal"><div class="empty card">${icon('file')}<p>${L('sign.noneReady')}</p><a class="btn" href="#/klant/${p.id}">${L('sign.toProject')}</a></div></div>`;
    return `${portalBar(p, L('sign.bar', { c: esc(q.tav || p.contact) }), '#/project/' + p.id + '/financien')}
    <div class="portal" style="--brand:${S.showreel.kleur}">
      <header class="portal-head"><div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">${L('por.tagline')}</div></div></div><a class="btn sm ghost" href="#/klant/${p.id}">${icon('arrowLeft')} <span class="hide-sm">${L('sign.toYourProject')}</span></a></header>
      <div class="pq-head"><div class="small muted">${esc(dc('Offerte'))} ${esc(q.nr)}</div><h1>${esc(ptitle(p))}</h1></div>
      <div class="pq-wrap">
        <div class="doc-preview pq-doc">${quoteDocHtml(p, q)}</div>
        <aside class="pcard pq-sign" id="sign-panel">${signPanelHtml(p, q)}</aside>
      </div>
      <div class="eu-trust"><span class="eu-trust-badge">${euBadge('eu-flag')}${icon('lock')} ${L('sign.trust')}</span></div>
      ${portalFoot()}
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
  // Velden tonen voorbeeldwaarden vertaald (dc); wat je zelf typt wordt letterlijk bewaard
  const csIn = (path, val, attrs, cls) => `<input class="cs-in ${cls || ''}" data-cs="${path}" value="${esc(dc(val))}" ${attrs || ''}>`;
  function weatherHtml(cs) {
    const days = cs.datum ? Math.round((pd(cs.datum) - pd(todayIso())) / 864e5) : null;
    const sub = days == null ? L('cs.w.pick') : days > 5 ? L('cs.w.from', { d: fdateShort(isoAdd(cs.datum, -5)), l: esc(dc(cs.locatie.naam) || L('cs.w.theLoc')) }) : days < 0 ? L('cs.w.past') : L('cs.w.proto');
    return `<div class="cs-weather"><span class="cs-w-ic">${icon('cloud')}</span><div><div class="strong">${L('cs.w.title')}</div><div class="small muted">${sub}</div></div></div>`;
  }
  function tabCallsheet(p) {
    const list = csList(p);
    if (!list.length) return `<section class="card"><div class="empty">${icon('calendar')}<p>${L('cs.none')}</p><button class="btn primary" data-action="cs-add" data-id="${p.id}">${icon('plus')} ${L('cs.create')}</button></div></section>`;
    const i = Math.min(S.csSel[p.id] || 0, list.length - 1), cs = list[i], sl = S.shotlist[p.id] || [], done = sl.filter(s => s.klaar).length;
    const prov = calProvider(), hm = L('cs.hhmm');
    return `<div class="callsheet" data-pid="${p.id}" data-i="${i}">
      <div class="cs-toolbar">
        <div class="seg sm cs-days" role="group" aria-label="${esc(L('pj.shootDay'))}">${list.map((c, k) => `<button class="${k === i ? 'active' : ''}" data-action="cs-day" data-id="${p.id}" data-i="${k}">${L('cs.day', { n: k + 1 })}<span class="hide-sm"> · ${c.datum ? fdateShort(c.datum) : '–'}</span></button>`).join('')}<button data-action="cs-add" data-id="${p.id}" title="${esc(L('cs.addDay'))}" aria-label="${esc(L('cs.addDay'))}">${icon('plus')}</button></div>
        <div class="row gap wrap cs-actions">${cs.gedeeld ? `<span class="tiny muted">${L('cs.shared', { d: esc(stamp(cs.gedeeld)) })}</span>` : ''}<button class="btn sm" data-action="cs-share" data-id="${p.id}">${icon('send')} ${L('cs.share')}</button><button class="btn sm" data-action="cs-print">${icon('download')} ${L('cs.pdf')}</button></div>
      </div>
      <section class="card cs-head">
        <div class="cs-title-row"><span class="doc-type">Callsheet</span><span class="small muted">${esc(ptitle(p))} · ${esc(dc(p.klant))}</span></div>
        ${csIn('titel', cs.titel, `aria-label="${esc(L('cs.titleAria'))}"`, 'cs-title')}
        <div class="cs-meta">
          <label class="cs-f">${L('cs.date')}<input type="date" class="cs-in" data-cs="datum" data-cal-date data-cal-skip="${p.id}" value="${esc(cs.datum)}"><span class="cs-print-only strong">${cs.datum ? Fx.dateLong(cs.datum) : '–'}</span>${calHintHtml(cs.datum, p.id)}</label>
          <label class="cs-f">Call time<input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="${hm}" class="cs-in cs-big" data-cs="calltime" value="${esc(cs.calltime)}"></label>
          <label class="cs-f">Wrap<input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="${hm}" class="cs-in" data-cs="eind" value="${esc(cs.eind)}"></label>
          <div class="cs-f cs-sync">${prov && S.agenda.autoZet ? `<span class="cal-tag">${icon('calendar')} ${L('pj.inCal', { c: esc(CAL[prov].label) })}</span>` : `<a class="tiny link" href="#/instellingen/agenda">${icon('calendar')} ${L('cs.connectCal')}</a>`}</div>
        </div>
      </section>
      <div class="cs-grid">
        <section class="card">
          <div class="card-head"><h2>${icon('pin')} ${L('pj.location')}</h2><button class="btn sm ghost cs-noprint" data-action="route">${L('common.route')}</button></div>
          <label class="cs-f">${L('common.name')}${csIn('locatie.naam', cs.locatie.naam, `placeholder="${esc(L('cs.locNamePh'))}"`)}</label>
          <label class="cs-f">${L('cs.address')}${csIn('locatie.adres', cs.locatie.adres, `placeholder="${esc(L('cs.addressPh'))}"`)}</label>
          <label class="cs-f">${L('cs.parking')}<textarea class="cs-in" data-cs="locatie.parkeren" rows="3" placeholder="${esc(L('cs.parkingPh'))}">${esc(dc(cs.locatie.parkeren))}</textarea></label>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('cloud')} ${L('cs.weather')}</h2></div>
          ${weatherHtml(cs)}
          <div class="card-head mt"><h2>${icon('users')} ${L('cs.clientContact')}</h2></div>
          <div class="cs-contact">
            <label class="cs-f">${L('common.name')}${csIn('klant.naam', cs.klant.naam)}</label>
            <label class="cs-f">${L('cs.phone')}${csIn('klant.tel', cs.klant.tel, 'type="tel"')}</label>
            <label class="cs-f full">${L('acc.email')}${csIn('klant.email', cs.klant.email, 'type="email"')}</label>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('clock')} ${L('cs.schedule')}</h2><button class="btn sm cs-noprint" data-action="cs-add-blok">${icon('plus')} ${L('cs.block')}</button></div>
          <ol class="cs-blocks">${cs.blokken.map((b, k) => `<li><input type="text" inputmode="numeric" maxlength="5" pattern="[0-2]?[0-9]:[0-5][0-9]" placeholder="${hm}" class="cs-in cs-time" data-cs="blokken.${k}.tijd" value="${esc(b.tijd)}" aria-label="${esc(L('cs.time'))}"><input class="cs-in" data-cs="blokken.${k}.wat" value="${esc(dc(b.wat))}" aria-label="${esc(L('cs.part'))}" placeholder="${esc(L('cs.partPh'))}"><button class="icon-btn cs-noprint" data-action="cs-del" data-list="blokken" data-k="${k}" aria-label="${esc(L('cs.delBlock'))}">${icon('x')}</button></li>`).join('') || `<li class="muted small">${L('cs.noBlocks')}</li>`}</ol>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('users')} Crew</h2><button class="btn sm cs-noprint" data-action="cs-add-crew">${icon('plus')} ${L('cs.crewMember')}</button></div>
          <ul class="cs-crew">${cs.crew.map((c, k) => `<li>
            <div class="cs-crew-main">${csIn(`crew.${k}.naam`, c.naam, `aria-label="${esc(L('common.name'))}" placeholder="${esc(L('common.name'))}"`, 'strong')}${csIn(`crew.${k}.rol`, c.rol, `aria-label="${esc(L('pj.role'))}" placeholder="${esc(L('pj.role'))}"`)}</div>
            <div class="cs-crew-side"><span class="cs-tel">${icon('phone')}${csIn(`crew.${k}.tel`, c.tel, `type="tel" aria-label="${esc(L('cs.phone'))}" placeholder="06 …"`)}</span>
            <button class="tag cs-fl ${c.freelancer ? 'on' : ''}" data-action="cs-fl" data-k="${k}" title="${esc(L('cs.flToggle'))}">${c.freelancer ? L('pj.freelancer') : L('cs.own')}</button>
            <button class="icon-btn cs-noprint" data-action="cs-del" data-list="crew" data-k="${k}" aria-label="${esc(L('cs.delCrew'))}">${icon('x')}</button></div></li>`).join('')}</ul>
          <p class="tiny muted">${L('cs.flCount', { n: cs.crew.filter(c => c.freelancer).length })}</p>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('camera')} ${L('pj.shotlist')}</h2><span class="small muted">${L('cs.shotsDone', { a: done, b: sl.length })}</span></div>
          <div class="progress"><div style="width:${sl.length ? done / sl.length * 100 : 0}%"></div></div>
          <ul class="cs-shots">${sl.map((s, k) => `<li class="${s.klaar ? 'done' : ''}"><label><input type="checkbox" data-action="toggle-shot" data-id="${p.id}" data-i="${k}" ${s.klaar ? 'checked' : ''}><span class="grow">${esc(dc(s.shot))}</span><span class="tag">${esc(dc(s.type))}</span></label></li>`).join('') || `<li class="muted small">${L('cs.noShots')}</li>`}</ul>
          <a class="tiny link cs-noprint" href="#/project/${p.id}/shotlist">${L('cs.editShots')}</a>
        </section>
        <section class="card">
          <div class="card-head"><h2>${icon('file')} ${L('cs.notes')}</h2></div>
          <textarea class="cs-in cs-notes" data-cs="notities" rows="5" placeholder="${esc(L('cs.notesPh'))}">${esc(dc(cs.notities))}</textarea>
        </section>
      </div>
      <p class="tiny muted cs-noprint">${L('cs.autosave')}</p>
    </div>`;
  }
  function csCur() { const el = $('.callsheet'); if (!el) return null; const l = S.callsheets[el.dataset.pid]; return l ? { pid: el.dataset.pid, i: Number(el.dataset.i), cs: l[Number(el.dataset.i)] } : null; }
  function setPath(o, path, v) { const k = path.split('.'); let t = o; for (let i = 0; i < k.length - 1; i++) { t = t[k[i]]; if (t == null) return; } t[k[k.length - 1]] = v; }
  function csShare(pid) {
    const c = csCur(); if (!c) return; const p = proj(pid), cs = c.cs;
    const recips = cs.crew.filter(x => x.naam).map(x => ({ naam: x.naam, sub: dc(x.rol) + (x.tel ? ' · ' + x.tel : '') })).concat(cs.klant.naam ? [{ naam: cs.klant.naam, sub: L('cs.clientSub', { c: cs.klant.email || cs.klant.tel }) }] : []);
    modal({
      title: L('cs.shareTitle'),
      body: `<p class="small muted">${L('cs.shareText')}</p>
        <div class="copy-field"><input readonly value="https://callsheet.diafragmo.voorbeeld/${esc(pid)}-${esc(cs.datum || 'dag')}-7h2q" aria-label="${esc(L('cs.linkAria'))}"><button class="btn sm" data-action="copy-link">${L('common.copy')}</button></div>
        <div class="lbl-txt">${L('cs.sendTo')}</div>
        <ul class="cs-recips">${recips.map((r, k) => `<li><label class="check"><input type="checkbox" checked data-recip="${k}"><span><strong>${esc(r.naam)}</strong><span class="tiny muted"> · ${esc(r.sub)}</span></span></label></li>`).join('')}</ul>
        <p class="tiny muted">${L('cs.demoNote')}</p>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: `${icon('send')} ${L('common.send')}`, cls: 'primary', onClick: () => {
        const n = $$('#modal-root [data-recip]').filter(x => x.checked).length; if (!n) { toast(L('cs.pickOne')); return; }
        cs.gedeeld = nowLabel(); demoSave(); closeModal(); toast(Ln('cs.sharedToast', n, { t: esc(dc(cs.titel)) })); renderKeep();
      } }]
    });
  }

  // ---------- Agenda-koppeling (Outlook / Google Agenda, gesimuleerd) ----------
  const CAL = {
    microsoft: { get label() { return L('cal.microsoft'); }, get full() { return L('cal.microsoft'); }, get sub() { return L('cal.microsoft.sub'); }, bedrijf: 'Microsoft' },
    google: { get label() { return L('cal.google'); }, get full() { return L('cal.google'); }, get sub() { return L('cal.google.sub'); }, bedrijf: 'Google' }
  };
  const calLabel = k => (CAL[k] ? CAL[k].label : '');
  const CAL_LOGO = {
    microsoft: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="3" fill="#0a64c8"/><path d="M3 9a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v3H3z" fill="#28a8ea"/><g fill="#fff"><rect x="7.5" y="15" width="4" height="3.2" rx=".7"/><rect x="14" y="15" width="4" height="3.2" rx=".7"/><rect x="20.5" y="15" width="4" height="3.2" rx=".7"/><rect x="7.5" y="21" width="4" height="3.2" rx=".7"/><rect x="14" y="21" width="4" height="3.2" rx=".7"/></g><rect x="9" y="3" width="2.6" height="6" rx="1.3" fill="#0a3f80"/><rect x="20.4" y="3" width="2.6" height="6" rx="1.3" fill="#0a3f80"/></svg>',
    google: '<svg class="prov-logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="4" fill="#fff"/><path d="M8 4h16a4 4 0 0 1 4 4v3H4V8a4 4 0 0 1 4-4z" fill="#4285f4"/><path d="M28 11v13a4 4 0 0 1-4 4h-2V11z" fill="#fbbc04"/><path d="M4 24V11h3v17a4 4 0 0 1-3-4z" fill="#34a853"/><path d="M7 28h15v-3H7z" fill="#34a853"/><text x="15" y="23.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="700" fill="#1a73e8">31</text></svg>'
  };
  // Agenda volgt de gecombineerde koppeling: alleen een gekoppeld account met Agenda aan telt
  const calProvider = () => ACC_KEYS.find(agendaOn) || null;
  function calBusy(iso, skipPid) {
    const r = [];
    if (!iso) return r;
    D.agendaDemo.forEach(a => { if (a.datum === iso) r.push(dc(a.titel) + (a.tijd ? ' (' + a.tijd + ')' : '')); });
    S.projects.forEach(p => { const pl = S.planning[p.id]; if (!pl || p.id === skipPid) return; pl.draaidagen.forEach(d => { if (d.datum === iso) r.push((dc(d.titel).split(' – ')[0]) + ' – ' + dc(p.klant)); }); });
    return r;
  }
  function calHintHtml(iso, skipPid) {
    const k = calProvider(); if (!k || !S.agenda.checkBeschikbaar) return '<span data-cal-hint hidden></span>';
    if (!iso) return `<span class="cal-hint" data-cal-hint>${icon('calendar')} ${L('cal.pickDate')}</span>`;
    const b = calBusy(iso, skipPid);
    return `<span class="cal-hint ${b.length ? 'busy' : 'free'}" data-cal-hint title="${esc(b.join(' · '))}"><i></i>${L('cal.hint', { s: b.length ? L('cal.busy') : L('cal.free'), d: fdateShort(iso) })}${b.length ? ' · ' + esc(b[0]) : ''} <em>(demo)</em></span>`;
  }
  function weekItems(from, to) {
    const items = [];
    S.projects.forEach(p => {
      ensure(p);
      S.planning[p.id].draaidagen.forEach(d => { if (d.datum >= from && d.datum <= to) items.push({ datum: d.datum, kind: 'shoot', titel: dc(d.titel).split(' – ')[0], sub: dc(p.klant), tijd: dc(d.tijd), href: `#/project/${p.id}/callsheet`, pid: p.id }); });
      if (p.status !== 'Opgeleverd' && p.deadline >= from && p.deadline <= to) items.push({ datum: p.deadline, kind: 'deadline', titel: L('wk.deadlineFor', { t: ptitle(p) }), sub: dc(p.klant), href: `#/project/${p.id}/planning`, pid: p.id });
    });
    D.mijlpalen.forEach(m => { const p = proj(m.projectId); if (p && m.datum >= from && m.datum <= to) items.push({ datum: m.datum, kind: 'deadline', titel: dc(m.titel), sub: dc(p.klant), href: `#/project/${p.id}/planning`, pid: p.id }); });
    if (calProvider()) D.agendaDemo.forEach(a => { if (a.datum >= from && a.datum <= to) items.push({ datum: a.datum, kind: 'busy', titel: L('wk.busy'), sub: L('wk.fromCal'), tijd: a.tijd }); });
    const order = { shoot: 0, deadline: 1, busy: 2 };
    return items.sort((a, b) => a.datum.localeCompare(b.datum) || order[a.kind] - order[b.kind]);
  }
  function weekCardHtml() {
    const t = todayIso(), end = isoAdd(t, 6), items = weekItems(t, end), k = calProvider();
    const days = []; for (let i = 0; i < 7; i++) days.push(isoAdd(t, i));
    const ic = { shoot: 'camera', deadline: 'clock', busy: 'lock' };
    const synced = k && S.agenda.autoZet;
    return `<section class="card week-card">
      <div class="card-head"><h2 class="wk-title">${icon('calendar')} ${L('wk.title')} <span class="small muted">${fdateShort(t)} – ${fdateShort(end)}</span></h2>
        ${k ? `<span class="send-pill">${CAL_LOGO[k]} <span class="hide-sm">${L('wk.syncedWith')} </span>${esc(CAL[k].label)}</span>` : `<a class="btn sm" href="#/instellingen/agenda">${icon('calendar')} ${L('wk.connect')}</a>`}</div>
      <div class="week">${days.map(d => { const its = items.filter(x => x.datum === d); return `<div class="wk-day ${d === t ? 'today' : ''} ${its.length ? '' : 'empty'}">
        <div class="wk-head"><span>${d === t ? L('wk.today') : Fx.weekday(d)}</span><strong>${pd(d).getDate()}</strong><small>${Fx.month(pd(d).getMonth())}</small></div>
        <div class="wk-items">${its.map(x => x.href ? `<button class="wk-item ${x.kind}" data-action="go" data-href="${x.href}" title="${esc(x.titel)} · ${esc(x.sub)}"><span class="wk-ic">${icon(ic[x.kind])}</span><span class="wk-txt"><span class="wk-t">${esc(x.titel)}</span><span class="wk-s">${esc(x.sub)}${x.tijd ? ' · ' + esc(x.tijd) : ''}</span></span>${synced ? `<span class="wk-cal" title="${esc(L('kop.inYourCal'))}">${icon('calendar')}</span>` : ''}</button>`
          : `<div class="wk-item busy"><span class="wk-ic">${icon(ic[x.kind])}</span><span class="wk-txt"><span class="wk-t">${esc(x.titel)}</span><span class="wk-s">${esc(x.sub)}${x.tijd ? ' · ' + esc(x.tijd) : ''}</span></span></div>`).join('') || '<span class="wk-none">–</span>'}</div></div>`; }).join('')}</div>
      <div class="wk-legend tiny muted"><span><i class="wk-dot shoot"></i>${L('pj.shootDay')}</span><span><i class="wk-dot deadline"></i>Deadline</span>${k ? `<span><i class="wk-dot busy"></i>${L('wk.busyInCal')}</span>` : `<span>${L('wk.connectHint')}</span>`}</div>
    </section>`;
  }

  // ---------- Ondertiteling & transcriptie (Pro, verwerkt in de EU) ----------
  const LANG = { get nl() { return L('sub.lang.nl'); }, get en() { return L('sub.lang.en'); } };
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
    const head = `<div class="subs-head"><h2>${icon('msg')} ${L('pro.subsTitle')} ${proBadge(!isPro())}</h2><span class="eu-mini">${euBadge('eu-flag')} ${L('sub.inEu')}</span></div>`;
    if (!isPro()) return `<section class="subs-panel" id="subs-panel">${head}${lockedHtml('subs')}</section>`;
    if (job) return `<section class="subs-panel" id="subs-panel">${head}<div class="subs-job"><div class="row-between"><span class="strong small" id="subs-step">${esc(L(job.step, { l: LANG[job.lang] }))}</span><span class="small muted mono" id="subs-pct">${Math.round(job.pct)}%</span></div><div class="progress"><div id="subs-bar" style="width:${job.pct}%"></div></div><p class="tiny muted">${L('sub.jobNote', { l: LANG[job.lang] })}</p></div></section>`;
    if (!s) return `<section class="subs-panel" id="subs-panel">${head}<p class="small muted">${L('sub.intro')}</p><button class="btn primary" data-action="subs-start" data-id="${p.id}" data-v="${v}">${icon('sparkle')} ${L('sub.make')}</button></section>`;
    return `<section class="subs-panel" id="subs-panel">${head}
      <div class="subs-bar"><div class="row gap wrap"><span class="tag">${LANG[s.lang]}</span><span class="small muted">${L('sub.lines', { n: s.segs.length })}</span></div>
        <label class="check cc-toggle"><input type="checkbox" data-subs-show ${S.subsShow ? 'checked' : ''}> ${L('sub.show')}</label></div>
      <ol class="subs-list">${s.segs.map((g, i) => `<li class="sub-seg" data-s="${g.s}" data-e="${g.e}"><button class="tc" data-action="seek" data-t="${g.s + 0.05}" title="${esc(L('rev.jumpTo', { t: segT(g.s) }))}">${segT(g.s)} → ${segT(g.e)}</button><textarea class="sub-txt" rows="2" data-sub-i="${i}" data-key="${key}" aria-label="${esc(L('sub.seg', { n: i + 1 }))}">${esc(g.t)}</textarea></li>`).join('')}</ol>
      <div class="row gap wrap subs-actions"><button class="btn sm primary" data-action="subs-srt" data-key="${key}">${icon('download')} ${L('sub.srt')}</button><button class="btn sm" data-action="subs-burn" data-key="${key}">${icon('film')} ${L('sub.burn')}</button><button class="btn sm ghost" data-action="subs-start" data-id="${p.id}" data-v="${v}">${L('sub.again')}</button></div>
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
      title: L('sub.make'),
      body: `<div class="form-col">
        <p class="small muted">${esc(ptitle(p))} · ${L('sub.version', { v: esc(v) })}</p>
        <div><div class="lbl-txt">${L('sub.spoken')}</div><div class="act-chips">${Object.keys(LANG).map(k => `<label class="act-chip"><input type="radio" name="sublang" value="${k}" ${(cur ? cur.lang !== k : k === 'nl') ? 'checked' : ''}><span>${LANG[k]}</span></label>`).join('')}</div></div>
        <div class="about-eu">${euBadge('eu-flag')}<span>${L('sub.euText')}</span></div>
        ${cur ? `<p class="tiny muted">${L('sub.replace')}</p>` : ''}
        <p class="tiny muted">${L('sub.demo')}</p></div>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: `${icon('sparkle')} ${L('sub.start')}`, cls: 'primary', onClick: () => {
        const r = $('#modal-root input[name="sublang"]:checked'); const lang = r ? r.value : 'nl';
        closeModal(); subsRun(p, v, lang);
      } }]
    });
  }
  function subsRun(p, v, lang) {
    const key = p.id + ':' + v;
    S.subsJob = { key, lang, pct: 0, step: 'sub.step.upload' }; renderKeep();
    const iv = setInterval(() => {
      const j = S.subsJob; if (!j || j.key !== key) { clearInterval(iv); return; }
      j.pct = Math.min(100, j.pct + 4 + Math.random() * 7);
      j.step = j.pct < 22 ? 'sub.step.upload' : j.pct < 72 ? 'sub.step.recog' : j.pct < 100 ? 'sub.step.align' : 'sub.step.done';
      const b = $('#subs-bar'), pc = $('#subs-pct'), st = $('#subs-step');
      if (b) b.style.width = j.pct + '%'; if (pc) pc.textContent = Math.round(j.pct) + '%'; if (st) st.textContent = L(j.step, { l: LANG[lang] });
      if (j.pct >= 100) {
        clearInterval(iv); S.subsJob = null; S.subsShow = true;
        S.subs[key] = { lang, segs: transcriptFor(p, lang), gemaakt: nowLabel() }; demoSave();
        toast(L('sub.ready', { l: LANG[lang] })); renderKeep();
      }
    }, 260);
    cleanupFns.push(() => { clearInterval(iv); if (S.subsJob && S.subsJob.key === key) S.subsJob = null; });
  }
  function subsBurnModal(key) {
    const s = S.subs[key]; if (!s) return; const [pid, v] = key.split(':'); const p = proj(pid);
    const g = s.segs[1] || s.segs[0];
    const fmts = [['9x16', '9:16', 'Reels, TikTok, Shorts'], ['1x1', '1:1', L('sub.feed')], ['16x9', '16:9', 'YouTube, LinkedIn']];
    modal({
      title: L('sub.burn'),
      body: `<div class="form-col">
        <div class="burn-grid"><div><div class="lbl-txt">${L('sub.format')}</div><div class="act-chips col">${fmts.map((f, i) => `<label class="act-chip"><input type="radio" name="burnfmt" value="${f[0]}" ${i === 0 ? 'checked' : ''}><span><strong>${f[1]}</strong> <span class="tiny muted">${f[2]}</span></span></label>`).join('')}</div>
          <div class="lbl-txt mt-s">${L('sub.style')}</div><div class="act-chips">${[L('sub.st0'), L('sub.st1'), L('sub.st2')].map((x, i) => `<label class="act-chip"><input type="radio" name="burnstyle" value="${i}" ${i === 0 ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
          <div class="burn-prev-wrap"><div class="burn-prev r9x16 s0" id="burn-prev" style="background:linear-gradient(135deg,${p.grad[0]},${p.grad[1]})"><span class="burn-sub">${esc(g.t)}</span></div></div></div>
        <div id="burn-progress"></div>
        <p class="tiny muted">${L('sub.burnDemo')}</p></div>`,
      actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: `${icon('film')} ${L('sub.export')}`, cls: 'primary', onClick: () => {
        const fmt = ($('#modal-root input[name="burnfmt"]:checked') || {}).value || '9x16';
        const box = $('#burn-progress'); if (!box || box.dataset.busy) return; box.dataset.busy = '1';
        $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
        box.innerHTML = `<div class="small strong">${L('sub.exporting')}</div><div class="progress"><div id="burn-bar" style="width:0%"></div></div>`;
        let pct = 0; const iv = setInterval(() => {
          pct += 14; const b = $('#burn-bar'); if (b) b.style.width = Math.min(100, pct) + '%';
          if (pct >= 100) { clearInterval(iv); closeModal(); toast(L('sub.exported', { f: `${esc(slug(p.titel))}_${esc(v)}_${fmt}_${L('sub.fileSuffix')}.mp4` })); }
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
    'set-lang': el => setLang(el.dataset.v),
    // Info-menu & support
    'info-toggle': () => { if (infoOpen()) closeInfo(true); else openInfo(); },
    'info-about': () => aboutModal(),
    'info-news': (el, e) => { if (e) e.preventDefault(); newsModal(); },
    'tk-att-demo': () => { const d = new Date(); S.tkAtt = { naam: `screenshot-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.png`, grootte: '412 KB' }; const b = $('#tk-att'); if (b) b.innerHTML = tkAttHtml(); },
    'tk-att-remove': () => { S.tkAtt = null; const b = $('#tk-att'); if (b) b.innerHTML = tkAttHtml(); },
    'tk-resolve': el => { const t = ticket(el.dataset.nr); if (!t) return; t.status = 'Opgelost'; tkSystem(t, 'status', 'Opgelost', { door: 'Sanne de Vries' }); saveTickets(); toast(L('tk.resolvedToast', { n: t.nr })); renderKeep(); },
    'tk-filter': el => { S.tkFilter.status = el.dataset.v; renderKeep(); },
    'tk-reset': () => { TK = seedTickets(); saveTickets(); S.tkFilter = { status: 'Alle', cat: 'Alle' }; toast(L('tk.resetToast')); renderKeep(); },
    'new-project': () => formModal(L('np.title'), `
        <label>${L('np.name')}<input name="titel" required placeholder="${esc(L('np.namePh'))}"></label>
        <label>${L('np.client')}<input name="klant" required placeholder="${esc(L('np.clientPh'))}"></label>
        <div class="form-grid two"><label>${L('np.contact')}<input name="contact" placeholder="${esc(L('common.name'))}"></label><label>${L('np.email')}<input type="email" name="email" placeholder="${esc(L('common.emailPh'))}"></label></div>
        <div class="form-grid two"><label>${L('np.type')}<select name="type">${['Bedrijfsfilm', 'Aftermovie', 'Social content', 'Productvideo', 'Trouwfilm'].map(v => `<option value="${v}">${esc(dc(v))}</option>`).join('')}</select></label>
        <label>Deadline<input type="date" name="deadline" value="2026-12-15"></label></div>`, L('np.create'), d => {
        const p = newProject(d); toast(L('np.created', { t: esc(p.titel) })); go('#/project/' + p.id + '/planning');
      }),
    'filter-status': el => { S.projectFilter = el.dataset.status; S.search = ''; go('#/projecten'); },
    'clear-filters': () => { S.projectFilter = 'Alle'; S.search = ''; render(); },
    'proj-view': el => { S.projectView = el.dataset.v; render(); },
    'set-status': el => { const p = proj(el.dataset.id); if (p.status === el.dataset.status) return; p.status = el.dataset.status; toast(L('tk.sys.status', { s: esc(dc(p.status)) })); render(); },
    'quote-for': el => { const p = proj(el.dataset.id); S.quote = defaultQuote(p.status === 'Opgeleverd' ? 'p6' : p.id); go('#/financien'); },
    'remind': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); openCompose(draftFor(proj(i.projectId), 'herinnering', { doc: { nr: i.nr, bedrag: i.bedrag, vervalt: i.vervalt } })); },
    'remind-generic': el => toast(L('act.reminded', { w: esc(dc(el.dataset.who)) })),
    'send-invoice': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); openCompose(draftFor(proj(i.projectId), 'factuur', { doc: { nr: i.nr, bedrag: i.bedrag, vervalt: i.vervalt }, onSent: () => { i.status = 'Open'; i.datum = todayIso(); } })); },
    // E-mail
    'compose': el => { const p = proj(el.dataset.id); if (p) openCompose(draftFor(p, el.dataset.kind || 'leeg', { nr: el.dataset.nr })); },
    'reply': el => { const p = proj(el.dataset.id); const m = (S.email.threads[p.id] || [])[Number(el.dataset.i)]; if (m) openCompose(draftFor(p, 'reply', { msg: m })); },
    'compose-connect': el => { const d = readCompose(); openConsent(el.dataset.k, ok => { if (ok) renderKeep(); openCompose(d); }); },
    'mail-enable': el => {
      const k = accKey(el.dataset.k), inCompose = !!$('#compose-form'), d = inCompose ? readCompose() : null;
      setMail(k, true); toast(L('act.mailOnVia', { m: esc(ACC[k].mail), a: esc(acc(k).adres) })); renderKeep();
      if (d) openCompose(d);
    },
    'cmp-del-att': el => { const d = readCompose(); d.att.splice(Number(el.dataset.i), 1); $('#cmp-att').innerHTML = attHtml(d.att); },
    'cmp-add-att': () => {
      const d = readCompose(); const opts = [{ naam: 'Algemene_voorwaarden.pdf', grootte: '120 KB' }, { naam: 'Callsheet.pdf', grootte: '96 KB' }, { naam: 'Moodboard.pdf', grootte: '2,4 MB' }];
      const next = opts.find(o => !d.att.some(a => a.naam === o.naam));
      if (!next) { toast(L('act.allAtt')); return; }
      d.att.push(next); $('#cmp-att').innerHTML = attHtml(d.att); toast(L('act.attAdded', { n: esc(dc(next.naam)) }));
    },
    'mail-filter': el => { S.email.filter = el.dataset.f; renderKeep(); },
    'acc-connect': el => openConsent(el.dataset.k),
    'email-connect': el => openConsent(el.dataset.k),
    'cal-connect': el => openConsent(el.dataset.k),
    'acc-disconnect': el => {
      const k = accKey(el.dataset.k); Object.assign(acc(k), { connected: false, sinds: null, mail: true, agenda: true }); fixActive(); demoSave();
      const s = sender();
      toast(L('act.disconnected', { p: esc(ACC[k].naam) }) + (s.k !== 'noreply' ? L('act.nowVia', { v: esc(s.label) }) : '')); renderKeep();
    },
    'acc-toggle': el => {
      const k = accKey(el.dataset.k), on = el.checked, pr = ACC[k];
      if (el.dataset.w === 'mail') { setMail(k, on); toast(on ? L('act.mailOn', { m: esc(pr.mail) }) : L('act.mailOff', { p: esc(pr.naam) }) + (sender().k !== 'noreply' ? L('act.nowVia', { v: esc(sender().label) }) : L('act.viaNoreply'))); }
      else { const other = setAgenda(k, on); toast(on ? L('act.calOn', { c: esc(pr.cal) }) + (other ? L('act.calOtherOff', { p: esc(ACC[other].naam) }) : '') : L('act.calOff', { p: esc(pr.naam) })); }
      renderKeep();
    },
    'email-active': el => { const k = accKey(el.dataset.k); S.email.active = k; demoSave(); toast(L('act.activeSender', { m: esc(ACC[k].mail), a: esc(acc(k).adres) })); renderKeep(); },
    'email-opt': el => {
      const labels = { sigOn: L('kop.sig'), bcc: L('kop.bcc'), autoKoppel: L('kop.auto') };
      S.email[el.dataset.k] = el.checked; toast(`${labels[el.dataset.k]}: ${el.checked ? L('common.on') : L('common.off')}`); renderKeep();
    },
    'tpl-sel': el => { S.email.tplSel = el.dataset.k; renderKeep(); },
    'tpl-reset': () => { const k = S.email.tplSel; delete S.email.templates[k]; toast(L('act.tplReset', { n: esc(tpl(k).naam) })); renderKeep(); },
    'tpl-preview': () => openCompose(draftFor(proj('p1'), S.email.tplSel)),
    'tpl-insert': el => {
      const t = (lastTplField && document.body.contains(lastTplField)) ? lastTplField : $('[data-tpl-f="body"]'); if (!t) return;
      const a = t.selectionStart == null ? t.value.length : t.selectionStart, b = t.selectionEnd == null ? a : t.selectionEnd;
      t.value = t.value.slice(0, a) + el.dataset.ph + t.value.slice(b);
      tplSet(S.email.tplSel, t.dataset.tplF, t.value);
      t.focus(); try { t.setSelectionRange(a + el.dataset.ph.length, a + el.dataset.ph.length); } catch (er) { /* noop */ }
    },
    'add-shootday': el => formModal(L('act.addShootTitle'), `
        <label>${L('act.titleReq')}<input name="titel" required value="${esc(L('act.shootN', { n: S.planning[el.dataset.id].draaidagen.length + 1 }))}"></label>
        <div class="form-grid two"><label>${L('act.dateReq')}<input type="date" name="datum" required value="2026-10-20" data-cal-date>${calHintHtml('2026-10-20')}</label><label>${L('cs.time')}<input name="tijd" value="09:00 – 17:00"></label></div>
        <label>${L('pj.location')}<input name="locatie" placeholder="${esc(L('act.locPh'))}"></label><label>Crew<input name="crew" value="Sanne"></label>`, L('common.add'), d => {
        const pl = S.planning[el.dataset.id]; pl.draaidagen.push(d); pl.draaidagen.sort((a, b) => a.datum.localeCompare(b.datum));
        if (S.callsheets[el.dataset.id]) { S.callsheets[el.dataset.id].push(csFromDay(proj(el.dataset.id), d)); demoSave(); }
        const k = calProvider(); toast(L('act.shootAdded') + (k && S.agenda.autoZet ? L('act.alsoInCal', { c: esc(CAL[k].label) }) : '')); render();
      }),
    'add-location': el => formModal(L('act.addLocTitle'), `<label>${L('site.f.name')}<input name="naam" required></label><label>${L('cs.address')}<input name="adres"></label><label>${L('act.note')}<textarea name="notitie" rows="3" placeholder="${esc(L('act.notePh'))}"></textarea></label>`, L('common.add'), d => { S.planning[el.dataset.id].locaties.push(d); toast(L('act.locAdded')); render(); }),
    'open-callsheet': el => { const p = proj(el.dataset.id); ensure(p); const l = csList(p); const i = l.findIndex(c => c.datum === el.dataset.datum); S.csSel[p.id] = i < 0 ? 0 : i; go('#/project/' + p.id + '/callsheet'); },
    'cs-day': el => { S.csSel[el.dataset.id] = Number(el.dataset.i); renderKeep(); },
    'cs-add': el => {
      const p = proj(el.dataset.id), l = csList(p), last = l[l.length - 1];
      const datum = last && last.datum ? isoAdd(last.datum, 1) : isoAdd(todayIso(), 7);
      const cs = last ? JSON.parse(JSON.stringify(last)) : csFromDay(p, { datum, tijd: '09:00 – 17:00', titel: L('act.shootDayN', { n: 1 }), locatie: '' });
      cs.datum = datum; cs.titel = L('act.shootDayN', { n: l.length + 1 }); cs.gedeeld = null; l.push(cs); S.csSel[p.id] = l.length - 1; demoSave();
      toast(L('act.csAdded', { n: l.length, d: fdateShort(datum) })); renderKeep();
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
      toast(L('act.printPdf'));
      setTimeout(() => { try { window.print(); } catch (e) { /* noop */ } }, 60);
    },
    // Offerte ondertekenen
    'sign-open': () => { S.signOpen = true; const p = proj(route().a); const box = $('#sign-panel'); if (!box || !p) return; box.innerHTML = signPanelHtml(p, S.quotes[p.id]); initSigPad(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); const n = $('#sign-name'); if (n) setTimeout(() => n.focus({ preventScroll: true }), 300); },
    'sig-clear': () => { if (S.sigClear) S.sigClear(); },
    'sign-copy': el => copyText(signLink(el.dataset.id), L('act.signCopied', { nr: esc(S.quotes[el.dataset.id].nr), c: esc(S.quotes[el.dataset.id].tav || proj(el.dataset.id).contact) })),
    'quote-view': el => { const p = proj(el.dataset.id), q = S.quotes[p.id]; modal({ title: `${dc('Offerte')} ${q.nr}`, wide: true, body: `${signStatusHtml(q)}<div class="doc-preview pq-doc in-modal">${quoteDocHtml(p, q)}</div>`, actions: [{ label: L('common.close'), cls: 'ghost', onClick: closeModal }].concat(q.signed ? [] : [{ label: `${icon('link')} ${L('qb.copySignLink')}`, cls: 'primary', onClick: () => copyText(signLink(p.id), L('act.signCopiedShort')) }]) }); },
    'sign-reset': el => { unsign(el.dataset.id); demoSave(); toast(L('act.signReset')); renderKeep(); },
    // Agenda
    'cal-opt': el => { S.agenda[el.dataset.k] = el.checked; demoSave(); toast(`${el.dataset.k === 'autoZet' ? L('act.autoZet') : L('act.checkAvail')}: ${el.checked ? L('common.on') : L('common.off')}`); renderKeep(); },
    // Pro
    'upgrade': el => upgradeModal(el.dataset.f),
    'plan-demo': el => { if (S.settings.plan !== el.dataset.plan) setPlan(el.dataset.plan, 'demo'); },
    'timer-start': el => timerStart(el.dataset.id),
    'timer-stop': () => timerStopModal(),
    'hours-edit': el => timerEditModal(el.dataset.id, el.dataset.tid),
    'subs-start': el => subsStartModal(el.dataset.id, el.dataset.v),
    'subs-srt': el => { const s = S.subs[el.dataset.key]; if (!s) return; const [pid, v] = el.dataset.key.split(':'); const name = `${slug(proj(pid).titel).replace(/^-|-$/g, '')}_${v}_${s.lang}.srt`; downloadText(name, toSrt(s.segs), 'application/x-subrip;charset=utf-8'); toast(L('act.srtDone', { f: esc(name), n: s.segs.length })); },
    'subs-burn': el => subsBurnModal(el.dataset.key),
    'route': () => toast(L('act.route')),
    'print-draaiboek': () => toast(L('act.draaiboekShared')),
    'toggle-shot': el => { S.shotlist[el.dataset.id][Number(el.dataset.i)].klaar = el.checked; demoSave(); renderKeep(); },
    'upload-file': el => {
      const box = $('#upload-progress'); if (!box || box.dataset.busy) return;
      box.dataset.busy = '1';
      const id = el.dataset.id; const name = 'Drone_reveal_' + (S.files[id].length + 1) + '.mov';
      box.innerHTML = `<div class="upload-row"><span class="small">${icon('upload')} ${name} · ${size('3,4 GB')}</span><div class="progress thin"><div id="upbar" style="width:0%"></div></div></div>`;
      let pct = 0; const iv = setInterval(() => {
        pct += 18; const b = $('#upbar'); if (b) b.style.width = Math.min(100, pct) + '%';
        if (pct >= 100) { clearInterval(iv); S.files[id].push({ map: 'Ruw materiaal', naam: name, grootte: '3,4 GB', datum: todayIso() }); toast(L('act.uploaded', { n: name })); render(); }
      }, 220);
      cleanupFns.push(() => clearInterval(iv));
    },
    'share-folder': () => toast(L('act.folderShared')),
    'download': el => toast(L('act.download', { n: esc(dc(el.dataset.name)) })),
    'copy-link': el => { const inp = el.previousElementSibling; if (inp && inp.select) inp.select(); toast(L('act.linkCopied')); },
    'add-freelancer': el => formModal(L('act.addFlTitle'), `
        <label>${L('site.f.name')}<input name="naam" required placeholder="${esc(L('act.flNamePh'))}"></label>
        <label>${L('pj.role')}<select name="rol">${['Tweede camera', 'Drone-piloot', 'Geluid', 'Editor', 'Gaffer / licht', 'Visagie'].map(v => `<option value="${esc(v)}">${esc(dc(v))}</option>`).join('')}</select></label>
        <div class="form-grid two"><label>${L('pj.days')}<input type="number" name="dagen" min="0" step="0.5" value="1"></label><label>${L('act.costsReq')}<input type="number" name="kosten" min="0" step="1" required value="450"></label></div>`, L('common.add'), d => {
        S.finance[el.dataset.id].freelancers.push({ naam: d.naam, rol: d.rol, dagen: Number(d.dagen) || 0, kosten: Number(d.kosten) || 0 }); toast(L('act.flAdded')); render();
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
    'resolve': el => { const c = S.comments[el.dataset.id][el.dataset.v].find(x => x.t === Number(el.dataset.t) && x.tekst === el.dataset.txt); if (c) c.opgelost = el.checked; toast(el.checked ? L('act.commentResolved') : L('act.commentReopened')); render(); },
    'approve': el => {
      const p = proj(el.dataset.id), v = el.dataset.v;
      modal({
        title: L('act.approveQ', { v }),
        body: `<p>${L('act.approveText', { t: esc(ptitle(p)), v })}</p><ul class="small muted bullets"><li>${L('act.approve1', { c: esc(p.contact) })}</li><li>${L('act.approve2')}</li><li>${L('act.approve3')}</li></ul>`,
        actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, { label: L('act.approveYes'), cls: 'primary', onClick: () => { S.approved[p.id + ':' + v] = nowLabel(); if (v === p.versie || v === 'v3') { p.versie = v; } closeModal(); toast(L('act.approved', { v })); render(); } }]
      });
    },
    'share-review': el => modal({ title: L('rev.share'), body: `<p class="small muted">${L('act.reviewText')}</p><div class="copy-field"><input readonly value="https://frame.voorbeeld/r/${esc(el.dataset.id)}-8f3k2" aria-label="${esc(L('pj.reviewLink'))}"><button class="btn sm" data-action="copy-link">${L('common.copy')}</button></div><label class="check"><input type="checkbox" checked> ${L('act.allowDl')}</label>`, actions: [{ label: L('common.done'), cls: 'primary', onClick: closeModal }] }),
    'upload-v1': el => { proj(el.dataset.id).versie = 'v1'; toast(L('act.v1Uploaded')); go('#/review/' + el.dataset.id + '/v1'); },
    // Klantportaal
    'portal-demo-upload': () => fakeUpload('Teksten_voice-over_' + (S.portal.uploads.length + 1) + '.docx', '86 KB'),
    'portal-approve': el => {
      const p = proj(el.dataset.id); const v = p.versie !== '-' ? p.versie : 'v1';
      modal({
        title: L('act.pApproveTitle'), body: `<p>${L('act.pApproveText', { v, s: esc(D.studio.naam) })}</p>`,
        actions: [{ label: L('act.notYet'), cls: 'ghost', onClick: closeModal }, { label: L('act.pApproveYes'), cls: 'brand-btn', onClick: () => { S.approved[p.id + ':' + v] = nowLabel(); closeModal(); toast(L('act.pApproved')); render(); } }]
      });
    },
    'portal-download': el => toast(L('act.download', { n: esc(el.dataset.f) })),
    'ideal': el => {
      const banks = ['ABN AMRO', 'ING', 'Rabobank', 'SNS', 'ASN Bank', 'Triodos Bank', 'bunq', 'Knab', 'RegioBank'];
      const id = el.dataset.id;
      modal({
        title: L('act.idealTitle'),
        body: `<p class="small muted">${L('act.idealText')}</p>${I.lang() === 'nl' ? '' : `<p class="tiny muted pay-hint">${L('por.idealHint')}</p>`}<div class="banks">${banks.map((b, i) => `<label class="bank"><input type="radio" name="bank" value="${b}" ${i === 1 ? 'checked' : ''}><span>${b}</span></label>`).join('')}</div>`,
        actions: [{ label: L('common.cancel'), cls: 'ghost', onClick: closeModal }, {
          label: L('act.toBank'), cls: 'ideal', onClick: () => {
            const body = $('.modal-body'); if (body) body.innerHTML = `<div class="paying"><div class="spinner"></div><p>${L('act.redirecting')}</p></div>`;
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
    'new-quote': () => { S.quote = defaultQuote('p6'); S.quote.lines = [Object.assign({}, PRESETS.Draaidag)]; S.quote.nr = 'O2026-023'; toast(L('act.newQuote')); render(); },
    'pdf': () => toast(L('act.pdf', { n: esc(S.quote.nr) })),
    'to-invoice': () => { const q = S.quote; q.type = 'Factuur'; q.nr = 'F2026-034'; q.status = (S.tikkie.verzoeken[q.nr] || {}).betaald ? 'Betaald' : 'Concept'; q.geldig = '2026-10-15'; toast(L('act.toInvoice', { nr: 'F2026-034' })); render(); },
    'back-to-quote': () => { const q = S.quote; q.type = 'Offerte'; q.nr = 'O2026-022'; q.status = 'Concept'; q.geldig = '2026-10-31'; render(); },
    'send-quote': () => {
      const q = S.quote, p = proj(q.projectId), c = qCalc(q);
      openCompose(draftFor(p, q.type === 'Offerte' ? 'offerte' : 'factuur', { title: kindTitle(q.type === 'Offerte' ? 'offerte' : 'factuur'), doc: { nr: q.nr, bedrag: c.tot, vervalt: q.geldig }, onSent: () => { q.status = 'Verstuurd'; } }));
    },
    // Showreel
    'sr-toggle': el => { S.showreel.items[Number(el.dataset.i)].on = el.checked; render(); },
    'sr-move': el => { const i = Number(el.dataset.i), j = i + Number(el.dataset.d); const a = S.showreel.items; if (j < 0 || j >= a.length) return; const tmp = a[i]; a[i] = a[j]; a[j] = tmp; render(); },
    'sr-color': el => { S.showreel.kleur = el.dataset.c; render(); },
    'publish': () => toast(L('act.published', { d: esc(S.showreel.domein || L('sr.domainPh')) })),
    'scroll': (el, e) => { e.preventDefault(); const t = document.getElementById(el.dataset.target); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    'play-reel': el => { const p = proj(el.dataset.id); modal({ title: ptitle(p), wide: true, body: `<div class="player"><video controls autoplay muted playsinline>${D.videos.v3.map(s => `<source src="${s}" type="video/mp4">`).join('')}</video></div><p class="small muted">${esc(dc(p.klant))} · ${L('act.sample')}</p>`, actions: [{ label: L('common.close'), cls: 'primary', onClick: closeModal }] }); },
    'reset-form': () => { S.showreelSent = null; render(); setTimeout(() => { const f = document.getElementById('site-form'); if (f) f.scrollIntoView(); }, 50); },
    // Instellingen
    'set-plan': el => setPlan(el.dataset.plan),
    'toggle-int': el => { S.settings.koppelingen[el.dataset.k] = el.checked; toast(el.checked ? L('act.intOn', { k: esc(el.dataset.k) }) : L('act.intOff', { k: esc(el.dataset.k) })); render(); },
    'save-settings': () => toast(L('act.settingsSaved')),
    // Betaalmethoden & Tikkie (demo)
    'tikkie-connect': () => tikkieConsent(ok => { if (ok) renderKeep(); }),
    'tikkie-disconnect': () => { Object.assign(S.tikkie, { gekoppeld: false, on: false, sinds: null }); if (S.email.tplSel === 'tikkie') S.email.tplSel = 'factuur'; demoSave(); toast(L('act.tikkieOff')); renderKeep(); },
    'tikkie-toggle': el => {
      if (el.checked && !S.tikkie.gekoppeld) { el.checked = false; tikkieConsent(ok => { if (ok) renderKeep(); }); return; }
      S.tikkie.on = el.checked; if (!el.checked && S.email.tplSel === 'tikkie') S.email.tplSel = 'factuur'; demoSave();
      toast(el.checked ? L('act.tikkieToggleOn') : L('act.tikkieToggleOff')); renderKeep();
    },
    'tikkie-open': el => tikkieModal(el.dataset.id, el.dataset.nr),
    'tikkie-share': (el, e) => {
      if (!TIK || !tikkieValid()) { if (e) e.preventDefault(); return; }
      const t = Object.assign({}, tikkieRead()), p = proj(t.pid), via = el.dataset.via;
      if (via === 'email') { openCompose(draftFor(p, 'tikkie', { title: kindTitle('tikkie'), doc: { nr: t.nr, bedrag: t.bedrag, vervalt: t.geldig, tikkie: t }, onSent: () => tikkieSent(t, 'per e-mail') })); return; }
      if (via === 'kopie') { copyText(t.link, L('act.tikkieCopied', { n: esc(firstName(p.contact)) })); tikkieSent(t, 'link gekopieerd'); }
      else { el.href = waUrl(t, p); tikkieSent(t, 'via WhatsApp'); toast(L('act.waOpened', { c: esc(p.contact) })); }
      setTimeout(renderKeep, 0); // na het openen van de link: venster sluiten en factuur bijwerken
    },
    'tikkie-paid': el => {
      const nr = el.dataset.nr, pid = el.dataset.id, t = S.tikkie.verzoeken[nr]; if (!t) return;
      invRefs(nr, pid).forEach(r => { r.status = 'Betaald'; }); t.betaald = nowLabel(); demoSave();
      toast(L('act.tikkiePaid', { nr: esc(nr), s: esc(dc('Betaald')), a: eur(t.bedrag) })); renderKeep();
    }
  };

  // Formulieren
  const F = {
    'sign-quote': (f, d) => {
      updateSignBtn(); const b = $('#sign-submit'); if (!b || b.disabled) { toast(L('frm.signMissing')); return; }
      const c = $('#sig-canvas'); signQuote(f.dataset.id, d.naam.trim(), c.toDataURL('image/png'));
    },
    'add-shot': (f, d) => { const sl = S.shotlist[f.dataset.id]; sl.push({ scene: String(sl.length + 1), shot: d.shot, type: d.type, lens: '–', locatie: '–', klaar: false }); toast(L('frm.shotAdded')); render(); },
    'add-hours': (f, d) => { const u = Number(d.uren) || 0; S.hours[f.dataset.id].push({ datum: d.datum, activiteit: d.activiteit, uren: u, km: Number(d.km) || 0 }); addedHours += u; toast(L('frm.hoursAdded', { u: num(u, 2), x: num(urenTotaal(), 2), y: num(S.urenDoel, 0) })); render(); },
    'add-comment': (f, d) => {
      const vid = $('#vid'); const t = Player.mode === 'video' && vid ? vid.currentTime : Player.t;
      S.comments[f.dataset.id][f.dataset.v].push({ t: Math.round(t * 10) / 10, van: 'Sanne de Vries', rol: 'maker', tekst: d.tekst, opgelost: false });
      S.commentFilter = 'Alle'; toast(L('frm.commentPosted', { t: tc(t) })); render();
      const v2 = $('#vid'); if (v2) v2.addEventListener('loadedmetadata', () => seek(t), { once: true });
    },
    'portal-comment': (f, d) => {
      const vid = $('#vid'); const t = vid && !vid.hidden ? vid.currentTime : 0;
      S.portal.comments.push({ t, tekst: d.tekst }); f.reset();
      const ul = $('#portal-comments'); if (ul) ul.innerHTML = S.portal.comments.map(c => `<li><span class="tc">${tc(c.t)}</span><div>${esc(c.tekst)}</div></li>`).join('');
      toast(L('frm.fbSent'));
    },
    'ticket-new': (f, d) => {
      const list = tickets(), now = nowLocal();
      const nr = Math.max(1000, ...list.map(t => t.nr)) + 1;
      const t = { nr, onderwerp: d.onderwerp.trim(), categorie: d.categorie, prioriteit: d.prioriteit, status: 'Open', eigen: true, van: 'Sanne de Vries', bedrijf: D.studio.naam, email: D.studio.email, toegewezen: TK_AGENTS[0], aangemaakt: now, bijgewerkt: now, meta: browserInfo(),
        berichten: [{ rol: 'gebruiker', naam: 'Sanne de Vries', tijd: now, tekst: d.beschrijving.trim(), bijlage: S.tkAtt }, { rol: 'systeem', tijd: now, tekst: 'Automatisch bericht: we hebben je ticket ontvangen. Je hoort meestal binnen één werkdag van ons.' }] };
      list.unshift(t); S.tkAtt = null; saveTickets();
      toast(L('frm.ticketSent')); go('#/support/ticket/' + nr);
    },
    'ticket-reply': (f, d) => {
      const t = ticket(f.dataset.nr); if (!t || !d.tekst.trim()) return;
      t.berichten.push({ rol: 'gebruiker', naam: 'Sanne de Vries', tijd: nowLocal(), tekst: d.tekst.trim() }); t.bijgewerkt = nowLocal();
      if (t.status === 'Wacht op jou' || t.status === 'Opgelost') { t.status = 'Open'; tkSystem(t, 'status', 'Open'); }
      saveTickets(); toast(L('frm.replySent')); renderKeep();
    },
    'ticket-reply-support': (f, d) => {
      const t = ticket(f.dataset.nr); if (!t || !d.tekst.trim()) return;
      const agent = t.toegewezen.indexOf(' · ') > 0 ? t.toegewezen.split(' · ')[0] : 'Noor';
      t.berichten.push({ rol: 'support', naam: SUPPORT_NAAM, agent, tijd: nowLocal(), tekst: d.tekst.trim() }); t.bijgewerkt = nowLocal();
      if (d.status && d.status !== t.status) { t.status = d.status; tkSystem(t, 'status', d.status); }
      saveTickets(); toast(L('frm.answerSent', { n: esc(t.van) })); renderKeep();
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
      toast(k === 'status' ? L('frm.tkStatus', { n: t.nr, s: esc(tkStatusLabel(el.value, true)) }) : k === 'prioriteit' ? L('frm.tkPrio', { n: t.nr, p: esc(dc(el.value)) }) : L('frm.tkAssigned', { n: t.nr, a: esc(dc(el.value)) })); renderKeep(); return;
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
    if (el.matches('[data-tpl-f]')) { tplSet(S.email.tplSel, el.dataset.tplF, el.value); return; }
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
    if (S.migratedKoppeling) { S.migratedKoppeling = false; toast(L('frm.migrated')); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FRAME_STATE = S; // handig bij debuggen in de console
})();
