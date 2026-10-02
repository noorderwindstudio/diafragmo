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
    timer: null
  };
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
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="13" y2="14"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    camera: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'
  };
  function icon(n, cls) { return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`; }

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
        aanbetaling: { nr: idx >= 2 ? 'F2026-0' + (12 + n) : '–', bedrag: half, status: idx >= 2 ? (idx >= 4 ? 'Betaald' : 'Open') : 'Nog niet verstuurd', datum: idx >= 2 ? '20 sep' : '–' },
        eindfactuur: { nr: idx >= 6 ? 'F2026-0' + (2 + n) : '–', bedrag: half, status: idx >= 6 ? 'Betaald' : 'Na oplevering', datum: idx >= 6 ? fdateShort(p.deadline) : '–' },
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
        html = r.b === 'betaald' ? viewPaid(p) : viewPortal(p); mount = () => mountPortal(p); break;
      }
      case 'instellingen': html = viewSettings(); break;
      default: html = viewNotFound();
    }
    document.body.classList.toggle('external-mode', external);
    if (external) { $('#external').innerHTML = html; $('#view').innerHTML = ''; }
    else { $('#view').innerHTML = html; $('#external').innerHTML = ''; }
    $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
    const clientBtn = $('#topbar-client');
    if (clientBtn) clientBtn.setAttribute('href', '#/klant/' + ((r.name === 'project' || r.name === 'review') && proj(r.a) ? r.a : 'p1'));
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
            <li class="row-item click" data-action="go" data-href="#/project/${u.p.id}/planning">
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
  const TABS = [['planning', 'Planning'], ['shotlist', 'Shotlist & draaiboek'], ['bestanden', 'Bestanden'], ['feedback', 'Feedback'], ['uren', 'Uren & km'], ['financien', 'Financiën']];
  function viewProject(p, tab) {
    if (!TABS.find(t => t[0] === tab)) tab = 'planning';
    const body = { planning: tabPlanning, shotlist: tabShotlist, bestanden: tabFiles, feedback: tabFeedback, uren: tabHours, financien: tabFinance }[tab](p);
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
        </div>
      </div>
      <nav class="tabs">${TABS.map(t => `<a class="tab ${t[0] === tab ? 'active' : ''}" href="#/project/${p.id}/${t[0]}">${t[1]}</a>`).join('')}</nav>
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
            <div class="grow"><div class="strong">${esc(d.titel)}</div><div class="small muted">${icon('clock')} ${esc(d.tijd)} · ${icon('pin')} ${esc(d.locatie)}</div><div class="small muted">${icon('users')} ${esc(d.crew)}</div></div>
            <button class="btn sm ghost" data-action="callsheet">Callsheet</button>
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
        <div class="card-head"><h2>Draaiboek – draaidag 1</h2><button class="btn sm ghost" data-action="print-draaiboek">Delen met crew</button></div>
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
    const running = S.timer && S.timer.id === p.id;
    return `<div class="kpis three">
        <div class="kpi"><span class="kpi-label">Uren dit project</span><strong>${num(tu, 2)} u</strong><span class="small muted">telt mee voor urencriterium</span></div>
        <div class="kpi"><span class="kpi-label">Kilometers</span><strong>${num(tk, 0)} km</strong><span class="small muted">${eur(tk * 0.23)} à €0,23/km (voorbeeld)</span></div>
        <div class="kpi"><span class="kpi-label">Effectief uurtarief</span><strong>${tu ? eur((p.budget - financeCosts(p.id)) / tu) : '–'}</strong><span class="small muted">(budget − kosten) / uren</span></div>
      </div>
      <section class="card">
        <div class="card-head"><h2>Uren & kilometers</h2><button class="btn sm ${running ? 'danger-btn' : 'primary'}" data-action="timer" data-id="${p.id}">${icon('clock')} ${running ? 'Stop timer <span id="timer-val">' + tc((Date.now() - S.timer.start) / 1000).slice(0, 8) + '</span>' : 'Start timer'}</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Datum</th><th>Activiteit</th><th class="num">Uren</th><th class="num">Km</th></tr></thead>
          <tbody>${h.map(x => `<tr><td>${fdateShort(x.datum)}</td><td>${esc(x.activiteit)}</td><td class="num">${num(x.uren, 2)}</td><td class="num">${num(x.km, 0)}</td></tr>`).join('')}</tbody>
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
    const act = d => d.status === 'Open' || d.status === 'Verlopen' ? `<button class="btn sm ghost" data-action="remind-generic" data-who="${esc(p.contact)}">Herinner</button>` : d.status === 'Betaald' || d.status === 'Geaccepteerd' ? '' : `<button class="btn sm ghost" data-action="quote-for" data-id="${p.id}">Maken</button>`;
    const doc = (label, d) => `<div class="fin-doc card"><div class="small muted">${label}</div><div class="strong big">${eur(d.bedrag)}</div><div class="small muted">${esc(d.nr)} · ${esc(d.datum)}</div><div class="row-between">${statusPillInv(d.status)}${act(d)}</div></div>`;
    return `<div class="fin-docs">
        ${doc('Offerte (excl. btw)', f.offerte)}
        ${doc('Aanbetaling (incl. btw)', f.aanbetaling)}
        ${doc('Eindfactuur (incl. btw)', f.eindfactuur)}
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
    if (tab === 'uren' && S.timer) {
      const iv = setInterval(() => { const el = $('#timer-val'); if (el && S.timer) el.textContent = tc((Date.now() - S.timer.start) / 1000).slice(0, 8); }, 500);
      cleanupFns.push(() => clearInterval(iv));
    }
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
      ${appr ? `<div class="banner ok">${icon('check')} Versie ${v} is goedgekeurd op ${esc(appr)}. De klant kan nu de definitieve video downloaden.</div>` : ''}
      <div class="review">
        <div class="review-main card">
          <div class="vswitch" role="tablist">${['v1', 'v2', 'v3'].map(x => `<a role="tab" class="${x === v ? 'active' : ''}" href="#/review/${p.id}/${x}">${x}${x === p.versie ? ' <small>nieuwste</small>' : ''}</a>`).join('')}<span class="tiny muted vs-note">Voorbeeldbeelden: open-source testclips</span></div>
          <div class="player" id="player">
            ${videoTag(v)}
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
  function mountReview() {
    const vid = $('#vid'); if (!vid) return;
    Player.mode = 'video'; Player.t = 0; Player.dur = 10;
    const update = () => {
      const t = Player.mode === 'video' ? vid.currentTime : Player.t;
      const el = $('#tc-now'); if (el) el.textContent = tc(t);
      const f = $('#scrub-fill'); if (f) f.style.width = Math.min(100, t / Player.dur * 100) + '%';
      $$('.comment').forEach(c => c.classList.toggle('near', Math.abs(Number(c.dataset.t) - t) < 0.6));
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
    const inv = S.invoices.find(i => i.projectId === p.id && i.status !== 'Concept');
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
    return `${portalBar(p, `Je bekijkt het klantportaal zoals <strong>${esc(p.contact)}</strong> (${esc(p.klant)}) het ziet`)}
    <div class="portal" style="--brand:${S.showreel.kleur}">
      <header class="portal-head">
        <div class="brand"><span class="brand-logo">SV</span><div><div class="strong">${esc(D.studio.naam)}</div><div class="tiny muted">Videoproductie · Zwolle</div></div></div>
        <div class="small muted">Welkom, ${esc(p.contact.split(' ')[0] === 'Dr.' ? p.contact : p.contact.split(' ')[0])}</div>
      </header>
      <section class="portal-hero">
        <div><div class="small muted">Jouw project</div><h1>${esc(p.titel)}</h1><p class="muted">Verwachte oplevering: ${fdate(p.deadline)}</p></div>
        ${approved ? `<div class="callout ok">${icon('check')}<div><div class="strong">Video goedgekeurd</div><div class="small">Je kunt de definitieve video downloaden.</div></div></div>` : idx >= 5 ? `<div class="callout">${icon('play')}<div><div class="strong">Volgende stap: bekijk versie ${v}</div><div class="small">Geef feedback of keur de video goed.</div></div></div>` : ''}
      </section>
      <ol class="ctimeline">${CLIENT_STEPS.map((s, k) => `<li class="${k < cur ? 'done' : ''} ${k === cur ? 'current' : ''}"><span class="dot">${k < cur ? icon('check') : ''}</span><span>${s}</span></li>`).join('')}</ol>
      <div class="portal-grid">
        <section class="pcard span-2">
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
        </section>
        <section class="pcard">
          <h2>${icon('upload')} Materiaal aanleveren</h2>
          <label class="dropzone" id="dropzone"><input type="file" id="portal-file" multiple hidden>${icon('upload')}<span class="strong">Sleep bestanden hierheen</span><span class="small muted">of klik om te kiezen · logo's, foto's, muziek, teksten</span><span class="tiny muted">Prototype: bestanden worden niet echt geüpload.</span></label>
          <button class="btn sm ghost block" data-action="portal-demo-upload">Voorbeeldbestand toevoegen</button>
          <ul class="list files" id="portal-uploads">${portalUploadsHtml()}</ul>
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
          <div class="invoice-mini">
            <div class="row-between"><span class="small muted">${esc(inv.nr)} · ${esc(inv.omschrijving)}</span>${statusPillInv(paid ? 'Betaald' : 'Open')}</div>
            <div class="amount">${eur(inv.bedrag)}</div>
            <div class="small muted">incl. 21% btw · vervaldatum ${fdate(inv.vervalt)}</div>
          </div>
          ${paid ? `<div class="banner ok small">${icon('check')} Betaald – bedankt!</div>` : `<button class="btn ideal block" data-action="ideal" data-id="${p.id}"><span class="ideal-logo">iD</span> Betalen met iDEAL</button>`}
          <button class="btn ghost block sm" data-action="download" data-name="${esc(inv.nr)}.pdf">${icon('file')} Factuur als PDF</button>
        </section>
      </div>
      <footer class="portal-foot">Klantportaal van ${esc(D.studio.naam)} · aangedreven door <strong>Diafragmo</strong> · Prototype – voorbeelddata</footer>
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
      { nr: 'O2026-021', soort: 'Offerte', klant: proj('p5').klant, bedrag: 2450, status: 'Verstuurd', pid: 'p5' },
      { nr: 'O2026-018', soort: 'Offerte', klant: proj('p1').klant, bedrag: 4850, status: 'Geaccepteerd', pid: 'p1' }
    ].concat(S.invoices.map(i => ({ nr: i.nr, soort: 'Factuur', klant: i.klant, bedrag: i.bedrag, status: i.status, pid: i.projectId })));
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
          <div class="builder-actions">
            <button class="btn ghost" data-action="pdf">${icon('download')} PDF</button>
            ${q.type === 'Offerte' ? `<button class="btn" data-action="to-invoice">${icon('euro')} Zet om naar factuur</button><button class="btn primary" data-action="send-quote">${icon('send')} Verstuur offerte</button>`
              : `<button class="btn" data-action="back-to-quote">Terug naar offerte</button><button class="btn primary" data-action="send-quote">${icon('send')} Verstuur factuur</button>`}
          </div>
        </section>
        <section class="doc-preview card" id="quote-preview" aria-label="Voorbeeld document"></section>
      </div>
      <section class="card">
        <div class="card-head"><h2>Recente documenten</h2></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Nummer</th><th>Soort</th><th>Klant</th><th class="num">Bedrag</th><th>Status</th><th></th></tr></thead>
          <tbody>${docs.map(d => `<tr class="click" data-action="go" data-href="#/project/${d.pid}/financien"><td class="strong">${esc(d.nr)}</td><td>${d.soort}</td><td>${esc(d.klant)}</td><td class="num">${eur(d.bedrag)}${d.soort === 'Offerte' ? ' <span class="tiny muted">excl.</span>' : ''}</td><td>${statusPillInv(d.status)}</td><td class="num"><span class="link">Project →</span></td></tr>`).join('')}</tbody>
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
        ${q.type === 'Factuur' ? `<div class="doc-pay"><span class="ideal-logo">iD</span><div class="small">Betaal direct online met iDEAL via de link in de e-mail, of maak over naar ${esc(D.studio.iban)} o.v.v. ${esc(q.nr)}.</div></div>`
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
      <footer class="site-foot">© 2026 ${esc(sr.titel)} · ${esc(sr.domein)} · gemaakt met Diafragmo</footer>`;
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

  // ---------- Instellingen ----------
  function viewSettings() {
    const st = S.settings;
    const plans = [
      { naam: 'Basis', prijs: 24, f: ['Onbeperkt projecten & klanten', 'Klantportaal met jouw logo', 'Offertes & facturen met iDEAL-betaallink', 'Uren, kilometers & urencriterium', '250 GB opslag'] },
      { naam: 'Pro', prijs: 39, f: ['Alles uit Basis', 'Review met feedback op timecode', 'Showreel-site op eigen domein', 'Boekhoudkoppelingen', 'Freelancers & projectmarge', '2 TB opslag'] }
    ];
    return `
      <div class="page-head"><div><h1>Instellingen</h1><p class="muted">Profiel, abonnement en koppelingen</p></div><div class="head-actions"><button class="btn primary" data-action="save-settings">${icon('check')} Opslaan</button></div></div>
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
        </section>
        <section class="card">
          <div class="card-head"><h2>Abonnement</h2><span class="small muted">per maand, excl. btw</span></div>
          <div class="plans">${plans.map(pl => `
            <div class="plan ${st.plan === pl.naam ? 'current' : ''}">
              <div class="row-between"><span class="strong">${pl.naam}</span>${st.plan === pl.naam ? '<span class="pill inv-betaald">Huidig plan</span>' : ''}</div>
              <div class="price">€${pl.prijs}<small> /mnd</small></div>
              <ul>${pl.f.map(x => `<li>${icon('check')} ${esc(x)}</li>`).join('')}</ul>
              <button class="btn block ${st.plan === pl.naam ? '' : 'primary'}" data-action="set-plan" data-plan="${pl.naam}" ${st.plan === pl.naam ? 'disabled' : ''}>${st.plan === pl.naam ? 'Je huidige plan' : 'Overstappen naar ' + pl.naam}</button>
            </div>`).join('')}</div>
          <p class="tiny muted">Prototype: de verdeling van functies over de plannen is een voorstel. Er wordt niets afgeschreven.</p>
          <div class="card-head mt"><h2>Boekhoudkoppeling</h2></div>
          <ul class="list">${Object.keys(st.koppelingen).map(k => `
            <li class="row-item"><span class="icon-box logo-box">${esc(k.slice(0, 2))}</span><div class="grow"><div class="strong">${esc(k)}</div><div class="small muted">${st.koppelingen[k] ? 'Verbonden – facturen en betalingen worden gesynchroniseerd' : 'Niet verbonden'}</div></div>
              <label class="switch"><input type="checkbox" data-action="toggle-int" data-k="${esc(k)}" ${st.koppelingen[k] ? 'checked' : ''} aria-label="${esc(k)} koppelen"><span></span></label></li>`).join('')}</ul>
        </section>
      </div>`;
  }
  function viewNotFound() { return `<div class="empty card">${icon('search')}<h2>Pagina niet gevonden</h2><p class="muted">Deze pagina bestaat niet in het prototype.</p><a class="btn primary" href="#/dashboard">Naar dashboard</a></div>`; }

  // ---------- Acties ----------
  function newProject(data) {
    const id = 'n' + (Date.now() % 1000000);
    const grads = [['#ff9a5a', '#c2410c'], ['#60a5fa', '#1e3a8a'], ['#a78bfa', '#4c1d95'], ['#34d399', '#065f46']];
    const p = { id, titel: data.titel, klant: data.klant, contact: data.contact || data.klant, status: 'Aanvraag', deadline: data.deadline || '2026-12-15', budget: Number(data.budget) || 0, type: data.type || 'Bedrijfsfilm', grad: grads[S.projects.length % grads.length], versie: '-' };
    S.projects.unshift(p); return p;
  }
  const A = {
    'go': el => go(el.dataset.href),
    'modal-close': closeModal,
    'modal-act': el => { const h = modalHandlers[Number(el.dataset.i)]; if (h && h.onClick) h.onClick(); },
    'toggle-nav': () => document.body.classList.toggle('nav-open'),
    'new-project': () => formModal('Nieuw project', `
        <label>Projectnaam*<input name="titel" required placeholder="Bijv. Bedrijfsfilm 2027"></label>
        <label>Klant*<input name="klant" required placeholder="Bijv. Bakkerij Van Dam"></label>
        <label>Contactpersoon<input name="contact" placeholder="Naam"></label>
        <div class="form-grid two"><label>Soort<select name="type"><option>Bedrijfsfilm</option><option>Aftermovie</option><option>Social content</option><option>Productvideo</option><option>Trouwfilm</option></select></label>
        <label>Deadline<input type="date" name="deadline" value="2026-12-15"></label></div>`, 'Project aanmaken', d => {
        const p = newProject(d); toast(`Project “${esc(p.titel)}” aangemaakt`); go('#/project/' + p.id + '/planning');
      }),
    'filter-status': el => { S.projectFilter = el.dataset.status; S.search = ''; go('#/projecten'); },
    'clear-filters': () => { S.projectFilter = 'Alle'; S.search = ''; render(); },
    'proj-view': el => { S.projectView = el.dataset.v; render(); },
    'set-status': el => { const p = proj(el.dataset.id); if (p.status === el.dataset.status) return; p.status = el.dataset.status; toast(`Status gewijzigd naar ${esc(p.status)}`); render(); },
    'quote-for': el => { const p = proj(el.dataset.id); S.quote = defaultQuote(p.status === 'Opgeleverd' ? 'p6' : p.id); go('#/financien'); },
    'remind': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); toast(`Betaalherinnering voor ${esc(i.nr)} verstuurd aan ${esc(i.klant)} (demo)`); },
    'remind-generic': el => toast(`Herinnering verstuurd aan ${esc(el.dataset.who)} (demo)`),
    'send-invoice': el => { const i = S.invoices.find(x => x.nr === el.dataset.nr); i.status = 'Open'; toast(`Factuur ${esc(i.nr)} verstuurd met iDEAL-betaallink (demo)`); render(); },
    'add-shootday': el => formModal('Draaidag toevoegen', `
        <label>Titel*<input name="titel" required value="Draaidag ${S.planning[el.dataset.id].draaidagen.length + 1}"></label>
        <div class="form-grid two"><label>Datum*<input type="date" name="datum" required value="2026-10-20"></label><label>Tijd<input name="tijd" value="09:00 – 17:00"></label></div>
        <label>Locatie<input name="locatie" placeholder="Adres of plek"></label><label>Crew<input name="crew" value="Sanne"></label>`, 'Toevoegen', d => {
        const pl = S.planning[el.dataset.id]; pl.draaidagen.push(d); pl.draaidagen.sort((a, b) => a.datum.localeCompare(b.datum)); toast('Draaidag toegevoegd'); render();
      }),
    'add-location': el => formModal('Locatie toevoegen', `<label>Naam*<input name="naam" required></label><label>Adres<input name="adres"></label><label>Notitie<textarea name="notitie" rows="3" placeholder="Parkeren, stroom, toegang…"></textarea></label>`, 'Toevoegen', d => { S.planning[el.dataset.id].locaties.push(d); toast('Locatie toegevoegd'); render(); }),
    'callsheet': () => toast('Callsheet gemaakt en gedeeld met de crew (demo)'),
    'route': () => toast('Route wordt geopend in je kaarten-app (demo)'),
    'print-draaiboek': () => toast('Draaiboek gedeeld met de crew (demo)'),
    'toggle-shot': el => { S.shotlist[el.dataset.id][Number(el.dataset.i)].klaar = el.checked; render(); },
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
    'timer': el => {
      if (!S.timer) { S.timer = { start: Date.now(), id: el.dataset.id }; toast('Timer gestart'); render(); return; }
      const secs = (Date.now() - S.timer.start) / 1000; const uren = Math.max(0.25, Math.ceil(secs / 900) * 0.25);
      (S.hours[S.timer.id] = S.hours[S.timer.id] || []).push({ datum: '2026-10-01', activiteit: 'Getimed werk', uren, km: 0 });
      addedHours += uren; S.timer = null; toast(`${num(uren, 2)} uur geregistreerd (afgerond op kwartieren)`); render();
    },
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
        title: 'Betalen met iDEAL (demo)',
        body: `<p class="small muted">Kies je bank. Dit is een nagebootste betaalstap – er wordt niets afgeschreven.</p><div class="banks">${banks.map((b, i) => `<label class="bank"><input type="radio" name="bank" value="${b}" ${i === 1 ? 'checked' : ''}><span>${b}</span></label>`).join('')}</div>`,
        actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, {
          label: 'Naar mijn bank', cls: 'ideal', onClick: () => {
            const body = $('.modal-body'); if (body) body.innerHTML = `<div class="paying"><div class="spinner"></div><p>Je wordt doorgestuurd naar je bank…</p></div>`;
            $$('.modal-foot .btn').forEach(b => { b.disabled = true; });
            const tmo = setTimeout(() => { S.portal.paidIds[id] = true; const inv = S.invoices.find(i => i.projectId === id && i.status !== 'Concept'); if (inv) inv.status = 'Betaald'; go('#/klant/' + id + '/betaald'); }, 1300);
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
    'to-invoice': () => { const q = S.quote; q.type = 'Factuur'; q.nr = 'F2026-034'; q.status = 'Concept'; q.geldig = '2026-10-15'; toast('Offerte omgezet naar factuur F2026-034'); render(); },
    'back-to-quote': () => { const q = S.quote; q.type = 'Offerte'; q.nr = 'O2026-022'; q.status = 'Concept'; q.geldig = '2026-10-31'; render(); },
    'send-quote': () => {
      const q = S.quote, p = proj(q.projectId), c = qCalc(q);
      modal({
        title: `${q.type} versturen`, wide: true,
        body: `<div class="form-col"><label>Aan<input value="${esc(p.contact)} <${esc(slug(p.contact).replace(/^-|-$/g, '').replace(/-/g, '.'))}@voorbeeld.nl>"></label><label>Onderwerp<input value="${q.type} ${esc(q.nr)} – ${esc(p.titel)}"></label>
          <label>Bericht<textarea rows="7">Hoi ${esc(p.contact.split(' ')[0])},&#10;&#10;Hierbij ${q.type === 'Offerte' ? 'de offerte' : 'de factuur'} voor “${esc(p.titel)}” (${eur(c.tot)} incl. btw). ${q.type === 'Offerte' ? 'Via de knop in deze mail geef je direct online akkoord.' : 'Je kunt direct betalen met iDEAL via de knop in deze mail.'}&#10;&#10;Groet,&#10;Sanne de Vries</textarea></label>
          <p class="tiny muted">Prototype: er wordt geen e-mail verstuurd.</p></div>`,
        actions: [{ label: 'Annuleren', cls: 'ghost', onClick: closeModal }, { label: `${icon('send')} Versturen`, cls: 'primary', onClick: () => { q.status = 'Verstuurd'; closeModal(); toast(`${q.type} ${esc(q.nr)} verstuurd aan ${esc(p.contact)} (demo)`); render(); } }]
      });
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
    'set-plan': el => { S.settings.plan = el.dataset.plan; toast(`Plan gewijzigd naar ${esc(el.dataset.plan)} (demo – er wordt niets afgeschreven)`); render(); },
    'toggle-int': el => { S.settings.koppelingen[el.dataset.k] = el.checked; toast(`Koppeling met ${esc(el.dataset.k)} ${el.checked ? 'ingeschakeld' : 'uitgeschakeld'} (demo)`); render(); },
    'save-settings': () => toast('Instellingen opgeslagen (demo)')
  };

  // Formulieren
  const F = {
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
    'public-request': (f, d) => {
      const klant = d.bedrijf || d.naam;
      const p = newProject({ titel: d.type + ' – aanvraag via website', klant, contact: d.naam, type: d.type, deadline: d.datum || '2026-12-15' });
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
    if (el.matches('[data-q]')) { S.quote[el.dataset.q] = el.type === 'checkbox' ? el.checked : el.value; renderQuoteLive(); return; }
    if (el.matches('[data-sr="formulier"]')) { S.showreel.formulier = el.checked; refreshReelPreview(); return; }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-line]')) { const l = S.quote.lines[Number(el.dataset.line)]; const f = el.dataset.f; l[f] = f === 'omschrijving' ? el.value : (el.value === '' ? 0 : Number(el.value)); renderQuoteLive(); return; }
    if (el.matches('input[data-q]') && el.type !== 'checkbox') { S.quote[el.dataset.q] = el.value; renderQuoteLive(); return; }
    if (el.matches('[data-sr]') && el.type !== 'checkbox') { S.showreel[el.dataset.sr] = el.value; refreshReelPreview(); return; }
    if (el.id === 'proj-search') { S.search = el.value; const pos = el.selectionStart; render(); const n = $('#proj-search'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* noop */ } } }
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.dataset || !f.dataset.form) return;
    e.preventDefault(); const fn = F[f.dataset.form];
    if (fn) fn(f, Object.fromEntries(new FormData(f).entries()));
  });
  window.addEventListener('hashchange', render);
  function boot() {
    $$('[data-ic]').forEach(el => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.ic)); });
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.FRAME_STATE = S; // handig bij debuggen in de console
})();
