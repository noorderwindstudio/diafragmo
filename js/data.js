/* Diafragmo – prototype. ALLE data hieronder is fictief (voorbeelddata). */
window.FRAME_DATA = (function () {
  const STATUSES = ['Aanvraag', 'Offerte', 'Pre-productie', 'Opname', 'Montage', 'Feedback', 'Opgeleverd'];

  const studio = {
    naam: 'Sanne de Vries Video',
    eigenaar: 'Sanne de Vries',
    plaats: 'Zwolle',
    email: 'hallo@sannedevries-voorbeeld.nl',
    kvk: '00000000 (voorbeeld)',
    btw: 'NL000000000B01 (voorbeeld)',
    iban: 'NL00 BANK 0000 0000 00 (voorbeeld)',
    domein: 'sannedevries.nl',
    kleur: '#ff6a3d'
  };

  const projects = [
    { id: 'p1', titel: 'Bedrijfsfilm 75 jaar', klant: 'Bakkerij Van Dam', contact: 'Ingrid van Dam', status: 'Feedback', deadline: '2026-10-14', budget: 4850, type: 'Bedrijfsfilm', grad: ['#ff9a5a', '#c2410c'], versie: 'v3' },
    { id: 'p2', titel: 'Wervingsvideo "Werken bij"', klant: 'Gemeente Zwolle (voorbeeld)', contact: 'Ahmed El Amrani', status: 'Montage', deadline: '2026-10-24', budget: 6200, type: 'Wervingsvideo', grad: ['#60a5fa', '#1e3a8a'], versie: 'v1' },
    { id: 'p3', titel: 'Aftermovie festival', klant: 'Festival Weide & Wind (fictief)', contact: 'Daan Hoekstra', status: 'Opname', deadline: '2026-10-31', budget: 3900, type: 'Aftermovie', grad: ['#a78bfa', '#4c1d95'], versie: '-' },
    { id: 'p4', titel: "Productvideo's najaarscollectie", klant: 'Fietsatelier Hanze', contact: 'Roos Mulder', status: 'Pre-productie', deadline: '2026-11-15', budget: 2750, type: 'Productvideo', grad: ['#34d399', '#065f46'], versie: '-' },
    { id: 'p5', titel: 'Trouwfilm Lisa & Tom', klant: 'Lisa Bakker & Tom Visser', contact: 'Lisa Bakker', status: 'Offerte', deadline: '2027-05-22', budget: 2450, type: 'Trouwfilm', grad: ['#f9a8d4', '#9d174d'], versie: '-' },
    { id: 'p6', titel: 'Social reels (6x)', klant: 'Koffiebranderij De Boon', contact: 'Youssef Amrani', status: 'Aanvraag', deadline: '2026-12-01', budget: 1800, type: 'Social content', grad: ['#d6a571', '#5b3714'], versie: '-' },
    { id: 'p7', titel: 'Jaarverslag-video 2025', klant: 'Woonstichting IJsseldelta (fictief)', contact: 'Marloes de Groot', status: 'Opgeleverd', deadline: '2026-06-30', budget: 5400, type: 'Corporate', grad: ['#fbbf24', '#92400e'], versie: 'v3' },
    { id: 'p8', titel: 'Kennismakingsfilm praktijk', klant: 'Tandartspraktijk Stadshagen (fictief)', contact: 'Dr. Pieter Smit', status: 'Opgeleverd', deadline: '2026-05-12', budget: 2100, type: 'Bedrijfsfilm', grad: ['#22d3ee', '#155e75'], versie: 'v2' },
    { id: 'p9', titel: 'Drone-opnames zomerseizoen', klant: 'Camping De Vecht (fictief)', contact: 'Henk Jansen', status: 'Opgeleverd', deadline: '2026-08-20', budget: 1650, type: 'Drone', grad: ['#4ade80', '#14532d'], versie: 'v1' },
    { id: 'p10', titel: 'Merkfilm vakmanschap', klant: 'Zeilmakerij Kampen (fictief)', contact: 'Anouk Meijer', status: 'Opgeleverd', deadline: '2026-03-18', budget: 3800, type: 'Merkfilm', grad: ['#94a3b8', '#1e293b'], versie: 'v3' },
    { id: 'p11', titel: 'Eventvideo Ondernemersdag', klant: 'Ondernemerskring Salland (fictief)', contact: 'Bas Kuipers', status: 'Opgeleverd', deadline: '2026-02-09', budget: 1950, type: 'Event', grad: ['#f87171', '#7f1d1d'], versie: 'v2' }
  ];

  const invoices = [
    { nr: 'F2026-029', projectId: 'p3', klant: 'Festival Weide & Wind (fictief)', omschrijving: 'Aanbetaling 50%', bedrag: 2359.50, vervalt: '2026-09-28', status: 'Verlopen' },
    { nr: 'F2026-031', projectId: 'p2', klant: 'Gemeente Zwolle (voorbeeld)', omschrijving: 'Aanbetaling 40%', bedrag: 3000.80, vervalt: '2026-10-09', status: 'Open' },
    { nr: 'F2026-032', projectId: 'p1', klant: 'Bakkerij Van Dam', omschrijving: 'Eindfactuur', bedrag: 2934.25, vervalt: '2026-10-15', status: 'Open' },
    { nr: 'F2026-033', projectId: 'p4', klant: 'Fietsatelier Hanze', omschrijving: 'Aanbetaling 30%', bedrag: 998.25, vervalt: '2026-10-20', status: 'Concept' }
  ];

  const feedbackWaiting = [
    { projectId: 'p1', versie: 'v3', van: 'Ingrid van Dam', aantal: 2, wanneer: 'vandaag, 14:32', quote: 'Kan het logo aan het eind iets langer in beeld?' },
    { projectId: 'p2', versie: 'v1', van: 'Ahmed El Amrani', aantal: 2, wanneer: 'gisteren, 16:05', quote: 'Ondertitels graag ook in het Engels.' },
    { projectId: 'p8', versie: 'v2', van: 'Dr. Pieter Smit', aantal: 1, wanneer: 'ma 28 sep', quote: 'Top! Alleen de muziek iets zachter onder de voice-over.' }
  ];

  const videos = {
    v1: ['https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    v2: ['https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    v3: ['https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4']
  };

  const comments = {
    p1: {
      v1: [
        { t: 1.2, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Mooie opening! Kan de titel iets eerder in beeld?', opgelost: true },
        { t: 4.0, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Hier graag opa Van Dam bij de oven laten zien.', opgelost: true },
        { t: 7.6, van: 'Sanne de Vries', rol: 'maker', tekst: 'Notitie: kleurcorrectie warmer maken.', opgelost: true }
      ],
      v2: [
        { t: 0.8, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Muziek mag hier wat rustiger beginnen.', opgelost: true },
        { t: 3.4, van: 'Kees van Dam', rol: 'klant', tekst: 'Klopt het jaartal in de ondertitel? Het moet 1951 zijn.', opgelost: true },
        { t: 6.1, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Prachtig shot van het deeg! Precies goed zo.', opgelost: true },
        { t: 9.0, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Kan het logo aan het eind iets langer in beeld?', opgelost: true }
      ],
      v3: [
        { t: 2.5, van: 'Sanne de Vries', rol: 'maker', tekst: 'Jaartal aangepast naar 1951 en muziek rustiger ingezet.', opgelost: true },
        { t: 3.6, van: 'Kees van Dam', rol: 'klant', tekst: 'Jaartal klopt nu, top!', opgelost: false },
        { t: 9.1, van: 'Ingrid van Dam', rol: 'klant', tekst: 'Kan het logo aan het eind iets langer in beeld?', opgelost: false }
      ]
    }
  };

  const hours = {
    p1: [
      { datum: '2026-09-02', activiteit: 'Intake & voorbereiding', uren: 3, km: 34 },
      { datum: '2026-09-09', activiteit: 'Locatiebezoek bakkerij', uren: 2, km: 34 },
      { datum: '2026-09-16', activiteit: 'Draaidag 1', uren: 10, km: 34 },
      { datum: '2026-09-17', activiteit: 'Draaidag 2', uren: 9, km: 34 },
      { datum: '2026-09-21', activiteit: 'Montage v1', uren: 8, km: 0 },
      { datum: '2026-09-25', activiteit: 'Montage v2 + kleurcorrectie', uren: 7, km: 0 }
    ]
  };

  const planning = {
    p1: {
      draaidagen: [
        { datum: '2026-09-16', tijd: '05:30 – 15:30', titel: 'Draaidag 1 – Bakken in de vroege ochtend', locatie: 'Bakkerij Van Dam, Voorbeeldstraat 12, Zwolle', crew: 'Sanne, Mark (2e camera)' },
        { datum: '2026-09-17', tijd: '09:00 – 18:00', titel: 'Draaidag 2 – Interviews & winkel', locatie: 'Winkel Diezerstraat (fictief adres), Zwolle', crew: 'Sanne, Femke (geluid), Joris (drone)' }
      ],
      locaties: [
        { naam: 'Bakkerij (productie)', adres: 'Voorbeeldstraat 12, Zwolle', notitie: 'Laden/lossen via achterom. Ovens zijn heet – let op met statieven.' },
        { naam: 'Winkel', adres: 'Diezerstraat (fictief adres), Zwolle', notitie: 'Opnames vóór openingstijd (09:30). Daglicht via etalage.' },
        { naam: 'Drone-locatie', adres: 'Weiland bij de IJssel (fictief)', notitie: 'Vergunning aangevraagd, max. 120 m. Check NOTAM.' }
      ]
    }
  };

  const shotlist = {
    p1: [
      { scene: '1', shot: 'Establishing: bakkerij in het donker, licht gaat aan', type: 'Wide', lens: '24mm', locatie: 'Bakkerij', klaar: true },
      { scene: '1', shot: 'Handen kneden deeg – slow motion 100fps', type: 'Close-up', lens: '85mm', locatie: 'Bakkerij', klaar: true },
      { scene: '2', shot: 'Interview Kees van Dam (A-cam + B-cam)', type: 'Medium', lens: '50mm / 35mm', locatie: 'Bakkerij', klaar: true },
      { scene: '3', shot: 'Oude foto\'s uit 1951 – archiefmateriaal', type: 'Insert', lens: '100mm macro', locatie: 'Kantoor', klaar: true },
      { scene: '4', shot: 'Klanten in de winkel, eerste broodjes over de toonbank', type: 'Medium', lens: '35mm', locatie: 'Winkel', klaar: false },
      { scene: '5', shot: 'Drone: reveal van de binnenstad naar de bakkerij', type: 'Aerial', lens: 'Drone 24mm', locatie: 'Buiten', klaar: false },
      { scene: '6', shot: 'Slotshot: hele familie voor de winkel', type: 'Wide', lens: '24mm', locatie: 'Winkel', klaar: false }
    ]
  };

  const draaiboek = [
    { tijd: '05:30', item: 'Aankomst crew, opbouw licht in bakkerij' },
    { tijd: '06:15', item: 'Scene 1 – bakproces (ovens aan)' },
    { tijd: '08:30', item: 'Ontbijt + back-up kaarten' },
    { tijd: '09:00', item: 'Scene 2 – interview Kees (30 min)' },
    { tijd: '11:00', item: 'Scene 3 – archief inserts' },
    { tijd: '13:00', item: 'Lunch' },
    { tijd: '14:00', item: 'B-roll en sfeershots, afbouw 15:30' }
  ];

  const files = {
    p1: [
      { map: 'Ruw materiaal', naam: 'A-cam_dag1 (142 clips)', grootte: '286 GB', datum: '16 sep' },
      { map: 'Ruw materiaal', naam: 'B-cam_dag1 (88 clips)', grootte: '164 GB', datum: '16 sep' },
      { map: 'Audio', naam: 'Interview_Kees_lav.wav', grootte: '1,2 GB', datum: '16 sep' },
      { map: 'Aangeleverd door klant', naam: 'Logo_VanDam_2026.svg', grootte: '48 KB', datum: '3 sep' },
      { map: 'Aangeleverd door klant', naam: 'Archieffoto\'s_1951.zip', grootte: '312 MB', datum: '5 sep' },
      { map: 'Exports', naam: 'VanDam_75jaar_v2.mp4', grootte: '1,8 GB', datum: '25 sep' },
      { map: 'Exports', naam: 'VanDam_75jaar_v3.mp4', grootte: '1,8 GB', datum: '30 sep' }
    ]
  };

  const finance = {
    p1: {
      offerte: { nr: 'O2026-018', bedrag: 4850, status: 'Geaccepteerd', datum: '28 aug' },
      aanbetaling: { nr: 'F2026-024', bedrag: 2934.25, status: 'Betaald', datum: '2 sep' },
      eindfactuur: { nr: 'F2026-032', bedrag: 2934.25, status: 'Open', datum: '1 okt' },
      freelancers: [
        { naam: 'Mark Jansen (fictief)', rol: 'Tweede camera', dagen: 1, kosten: 450 },
        { naam: 'Joris Kok – Aerial Noord (fictief)', rol: 'Drone-piloot', dagen: 0.5, kosten: 395 },
        { naam: 'Femke Bos (fictief)', rol: 'Geluid', dagen: 1, kosten: 380 }
      ],
      overig: [{ omschrijving: 'Muzieklicentie (1 jaar)', kosten: 49 }]
    }
  };


  // ---------- 0.4.0: offerte ondertekenen, callsheets, agenda, ondertiteling ----------
  // Offerte die nog op een digitale handtekening wacht (Trouwfilm Lisa & Tom)
  finance.p5 = {
    offerte: { nr: 'O2026-021', bedrag: 2450, status: 'Verstuurd', datum: '28 sep' },
    aanbetaling: { nr: '–', bedrag: 889.35, status: 'Nog niet verstuurd', datum: '–' },
    eindfactuur: { nr: '–', bedrag: 2075.15, status: 'Na oplevering', datum: '–' },
    freelancers: [], overig: []
  };
  const quotes = {
    p5: {
      nr: 'O2026-021', datum: '2026-09-28', geldig: '2026-10-28', verstuurd: '2026-09-28', status: 'Verstuurd', aanbetalingPct: 30,
      aan: 'Lisa Bakker & Tom Visser', tav: 'Lisa Bakker',
      intro: 'Wat leuk dat ik jullie trouwdag mag vastleggen! Hieronder vinden jullie de offerte voor een trouwfilm van de hele dag, met drone-opnames bij de ceremonie en een korte teaser voor social media.',
      lines: [
        { omschrijving: 'Trouwfilm hele dag (10 uur, 2 camera’s), van voorbereiding tot openingsdans', aantal: 1, eenheid: 'dag', prijs: 1450 },
        { omschrijving: 'Drone-opnames ceremonie en fotoshoot (gecertificeerde piloot)', aantal: 1, eenheid: 'stuk', prijs: 295 },
        { omschrijving: 'Montage trouwfilm (15–20 min) + teaser van 1 minuut', aantal: 1, eenheid: 'stuk', prijs: 595 },
        { omschrijving: 'Online galerij + houten USB-box', aantal: 1, eenheid: 'stuk', prijs: 110 }
      ],
      voorwaarden: 'Bij akkoord ontvangen jullie een aanbetalingsfactuur van 30%. Het restant volgt na oplevering. Verzetten van de datum kan kosteloos tot 3 maanden vooraf. Op deze offerte zijn de algemene voorwaarden van Sanne de Vries Video van toepassing (voorbeeld).'
    }
  };

  // Extra planning: festival (vandaag/morgen), pick-ups en de productvideo-draaidag
  planning.p2 = {
    draaidagen: [
      { datum: '2026-09-15', tijd: '08:30 – 17:00', titel: 'Draaidag 1 – Collega’s aan het werk', locatie: 'Stadskantoor (fictief adres), Zwolle', crew: 'Sanne, Femke (geluid)' },
      { datum: '2026-10-06', tijd: '13:00 – 16:00', titel: 'Pick-ups & Engelse voice-over', locatie: 'Stadskantoor (fictief adres), Zwolle', crew: 'Sanne' }
    ],
    locaties: [{ naam: 'Stadskantoor', adres: 'Voorbeeldplein 1, Zwolle (fictief)', notitie: 'Aanmelden bij de receptie, badge ophalen.' }]
  };
  planning.p3 = {
    draaidagen: [
      { datum: '2026-10-03', tijd: '12:00 – 01:00', titel: 'Festivaldag 1 – opbouw, publiek & hoofdpodium', locatie: 'Festivalterrein Weide & Wind (fictief), Dalfsen', crew: 'Sanne, Mark (2e camera), Joris (drone)' },
      { datum: '2026-10-04', tijd: '12:00 – 23:00', titel: 'Festivaldag 2 – sfeer, interviews & afsluiter', locatie: 'Festivalterrein Weide & Wind (fictief), Dalfsen', crew: 'Sanne, Mark (2e camera)' }
    ],
    locaties: [{ naam: 'Festivalterrein', adres: 'Weide & Wind, Dalfsen (fictief)', notitie: 'Crewparkeren P3, polsbandje bij de productie-unit.' }]
  };
  planning.p4 = {
    draaidagen: [
      { datum: '2026-10-15', tijd: '07:30 – 16:30', titel: 'Draaidag – productvideo’s najaarscollectie', locatie: 'Fietsatelier Hanze, Voorbeeldkade 8, Zwolle (fictief)', crew: 'Sanne, Mark (2e camera), Lotte (styling)' }
    ],
    locaties: [
      { naam: 'Werkplaats & showroom', adres: 'Voorbeeldkade 8, Zwolle (fictief)', notitie: 'Roldeur aan de achterkant voor laden/lossen.' },
      { naam: 'Rijshots aan de IJssel', adres: 'Fietspad langs de IJssel (fictief)', notitie: 'Rustig tussen 10:00 en 12:00.' }
    ]
  };
  shotlist.p4 = [
    { scene: '1', shot: 'Hero: nieuwe stadsfiets op draaiplateau, zachte zijlichtbak', type: 'Medium', lens: '50mm', locatie: 'Showroom', klaar: false },
    { scene: '1', shot: 'Details: lak, leren zadel, logo op het balhoofd', type: 'Close-up', lens: '100mm macro', locatie: 'Showroom', klaar: false },
    { scene: '2', shot: 'Roos stelt een fiets af in de werkplaats', type: 'Medium', lens: '35mm', locatie: 'Werkplaats', klaar: false },
    { scene: '3', shot: 'Rijshot langs de IJssel, gimbal vanaf bakfiets', type: 'Wide', lens: '24mm', locatie: 'Buiten', klaar: false },
    { scene: '3', shot: 'Drone: fietser over de dijk in herfstlicht', type: 'Aerial', lens: 'Drone 24mm', locatie: 'Buiten', klaar: false },
    { scene: '4', shot: 'Social 9:16: unboxing van een bestelling', type: 'Insert', lens: '35mm', locatie: 'Showroom', klaar: false }
  ];

  // Callsheet (draaiboek per opnamedag) – volledig uitgewerkt voor de productvideo’s
  const callsheets = {
    p4: [{
      titel: 'Draaidag – productvideo’s najaarscollectie', datum: '2026-10-15', calltime: '07:30', eind: '16:30',
      locatie: { naam: 'Fietsatelier Hanze', adres: 'Voorbeeldkade 8, 8000 AA Zwolle (fictief adres)', parkeren: 'Twee plekken op eigen terrein achter de werkplaats. Laden en lossen via de roldeur. Overige crew: parkeergarage Voorbeeldpoort (5 min lopen).' },
      blokken: [
        { tijd: '07:30', wat: 'Call time crew · koffie & korte briefing' },
        { tijd: '08:00', wat: 'Opbouw licht in showroom (draaiplateau + lichtbak)' },
        { tijd: '08:45', wat: 'Scene 1 – hero- en detailshots stadsfiets' },
        { tijd: '10:15', wat: 'Scene 3 – rijshots en drone langs de IJssel' },
        { tijd: '12:15', wat: 'Lunch (verzorgd door Fietsatelier Hanze)' },
        { tijd: '13:00', wat: 'Scene 2 – Roos in de werkplaats' },
        { tijd: '14:30', wat: 'Scene 4 – social 9:16 en unboxing' },
        { tijd: '15:45', wat: 'Back-up kaarten, afbouw, wrap 16:30' }
      ],
      crew: [
        { naam: 'Sanne de Vries', rol: 'Regie & camera', tel: '06 0000 0001', freelancer: false },
        { naam: 'Mark Jansen (fictief)', rol: 'Tweede camera & gimbal', tel: '06 0000 0012', freelancer: true },
        { naam: 'Joris Kok – Aerial Noord (fictief)', rol: 'Drone-piloot (10:15 – 12:00)', tel: '06 0000 0034', freelancer: true },
        { naam: 'Lotte Visser (fictief)', rol: 'Styling & props', tel: '06 0000 0056', freelancer: true }
      ],
      klant: { naam: 'Roos Mulder', rol: 'Eigenaar Fietsatelier Hanze', tel: '06 0000 0078', email: 'roos@fietsatelierhanze.voorbeeld.nl' },
      notities: 'Showroom is open vanaf 10:00: tot die tijd geen klanten in beeld. Roos regelt drie fietsen uit de nieuwe collectie (maat M). Bij regen schuiven de rijshots naar 14:30 en draaien we eerst de werkplaats.'
    }]
  };

  // Mijlpalen/deadlines binnen projecten (voor "Deze week" en je agenda)
  const mijlpalen = [
    { projectId: 'p1', datum: '2026-10-07', titel: 'Versie 4 naar klant (logo langer in beeld)' },
    { projectId: 'p2', datum: '2026-10-09', titel: 'Versie 2 opleveren, incl. Engelse ondertitels' },
    { projectId: 'p4', datum: '2026-10-12', titel: 'Shotlist en callsheet akkoord met klant' }
  ];
  // Fictieve afspraken uit je eigen agenda (alleen zichtbaar na koppelen, demo)
  const agendaDemo = [
    { datum: '2026-10-05', tijd: '09:00 – 12:00', titel: 'Bezet (uit je agenda)' },
    { datum: '2026-10-08', tijd: 'hele dag', titel: 'Bezet (uit je agenda)' },
    { datum: '2026-10-13', tijd: '13:00 – 17:00', titel: 'Bezet (uit je agenda)' },
    { datum: '2026-10-21', tijd: 'hele dag', titel: 'Bezet (uit je agenda)' }
  ];

  // Demo-transcript (fictieve voice-over) voor ondertiteling – past op de testclips van 10 seconden
  const transcripts = {
    p1: {
      nl: [
        { s: 0.0, e: 2.0, t: 'In 1951 begon opa Van Dam met één oven.' },
        { s: 2.0, e: 4.2, t: 'Vijfenzeventig jaar later staan we hier nog elke ochtend om vier uur.' },
        { s: 4.2, e: 6.3, t: 'Het recept is nooit veranderd: tijd, liefde en goed meel.' },
        { s: 6.3, e: 8.3, t: 'Dat proef je in elk brood dat over de toonbank gaat.' },
        { s: 8.3, e: 10.0, t: 'Bakkerij Van Dam. Al 75 jaar vers uit Zwolle.' }
      ],
      en: [
        { s: 0.0, e: 2.0, t: 'In 1951, Grandpa Van Dam started out with a single oven.' },
        { s: 2.0, e: 4.2, t: 'Seventy-five years later, we’re still here at four every morning.' },
        { s: 4.2, e: 6.3, t: 'The recipe never changed: time, love and good flour.' },
        { s: 6.3, e: 8.3, t: 'You can taste it in every loaf that crosses the counter.' },
        { s: 8.3, e: 10.0, t: 'Bakkerij Van Dam. Freshly baked in Zwolle for 75 years.' }
      ]
    }
  };

  // Fictieve e-mailadressen van klanten (domein .voorbeeld.nl bestaat niet echt)
  const clientEmails = {
    p1: ['ingrid@bakkerijvandam.voorbeeld.nl', 'kees@bakkerijvandam.voorbeeld.nl'],
    p2: ['ahmed.elamrani@gemeente.voorbeeld.nl'],
    p3: ['daan@weideenwind.voorbeeld.nl'],
    p4: ['roos@fietsatelierhanze.voorbeeld.nl'],
    p5: ['lisa.bakker@voorbeeld.nl', 'tom.visser@voorbeeld.nl'],
    p6: ['youssef@koffiedeboon.voorbeeld.nl'],
    p7: ['m.degroot@ijsseldelta.voorbeeld.nl'],
    p8: ['info@tandartsstadshagen.voorbeeld.nl'],
    p9: ['henk@campingdevecht.voorbeeld.nl'],
    p10: ['anouk@zeilmakerijkampen.voorbeeld.nl'],
    p11: ['bas@ondernemerskringsalland.voorbeeld.nl']
  };

  // Uitgewerkte (fictieve) mailwisseling voor Bakkerij Van Dam
  const emails = {
    p1: [
      { dir: 'in', van: 'Ingrid van Dam', adres: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-08-24', tijd: '09:12', onderwerp: 'Bedrijfsfilm voor ons 75-jarig jubileum',
        tekst: 'Hoi Sanne,\n\nVolgend jaar bestaat onze bakkerij 75 jaar en we willen graag een korte film laten maken over ons familiebedrijf: van opa Van Dam die in 1951 begon tot het bakken van nu. We zagen je film voor de Zeilmakerij en waren meteen enthousiast.\n\nHeb je binnenkort tijd om een keer langs te komen? Liefst vroeg in de ochtend, dan kun je meteen de ovens zien.\n\nGroetjes,\nIngrid van Dam\nBakkerij Van Dam' },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-08-24', tijd: '13:40', onderwerp: 'Re: Bedrijfsfilm voor ons 75-jarig jubileum',
        tekst: 'Hoi Ingrid,\n\nWat een mooi jubileum, gefeliciteerd! Ik kom graag langs. Past dinsdag 26 augustus om 07:00? Dan neem ik wat voorbeelden mee en bespreken we wat jullie voor ogen hebben.\n\nHartelijke groet,\nSanne' },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-08-28', tijd: '16:05', onderwerp: 'Offerte O2026-018 – Bedrijfsfilm 75 jaar',
        tekst: 'Hoi Ingrid,\n\nBedankt voor de koffie en de verse krentenbollen! In de bijlage vind je de offerte voor “Bedrijfsfilm 75 jaar”: twee draaidagen, drone-opnames, montage en een social-versie. Akkoord geven kan met één klik in je klantportaal.\n\nHartelijke groet,\nSanne', bijlagen: [{ naam: 'O2026-018.pdf', grootte: '86 KB' }] },
      { dir: 'in', van: 'Ingrid van Dam', adres: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-08-29', tijd: '08:21', onderwerp: 'Re: Offerte O2026-018 – Bedrijfsfilm 75 jaar',
        tekst: 'Hoi Sanne,\n\nWe hebben het met de familie besproken en gaan akkoord, ik heb net op de knop gedrukt. Kees zoekt de oude foto’s uit 1951 op zolder op. Kun je die het best via het portaal ontvangen?\n\nGroetjes,\nIngrid' },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-09-02', tijd: '10:15', onderwerp: 'Aanbetalingsfactuur F2026-024 – Bedrijfsfilm 75 jaar',
        tekst: 'Hoi Ingrid,\n\nSuper dat jullie akkoord zijn! Hierbij de aanbetalingsfactuur van 50%. Betalen kan met iDEAL via het klantportaal. Daar kan Kees ook de archieffoto’s uploaden (gewoon slepen, een zip mag ook).\n\nHartelijke groet,\nSanne', bijlagen: [{ naam: 'F2026-024.pdf', grootte: '64 KB' }] },
      { dir: 'in', van: 'Kees van Dam', adres: 'kees@bakkerijvandam.voorbeeld.nl', datum: '2026-09-05', tijd: '19:47', onderwerp: 'Archieffoto’s 1951',
        tekst: 'Beste Sanne,\n\nIk heb de foto’s in het portaal gezet. Op nummer 14 staat mijn vader voor de eerste winkel, die zou ik graag in de film zien.\n\nMet vriendelijke groet,\nKees van Dam' },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-09-10', tijd: '11:30', onderwerp: 'Draaiboek draaidagen 16 & 17 september',
        tekst: 'Hoi Ingrid en Kees,\n\nIn de bijlage het draaiboek. Dag 1 beginnen we om 05:30 in de bakkerij, dag 2 doen we de interviews en de winkel. Foto 14 komt er zeker in!\n\nHartelijke groet,\nSanne', bijlagen: [{ naam: 'Draaiboek_VanDam.pdf', grootte: '212 KB' }] },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-09-30', tijd: '17:02', onderwerp: 'Versie 3 staat klaar: Bedrijfsfilm 75 jaar',
        tekst: 'Hoi Ingrid,\n\nVersie 3 staat klaar in je klantportaal. Het jaartal is aangepast naar 1951 en de muziek begint rustiger. Je kunt direct op het juiste moment in de video feedback geven.\n\nHartelijke groet,\nSanne' },
      { dir: 'out', van: 'Sanne de Vries', adres: 'sanne@sannedevriesvideo.nl', aan: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-10-01', tijd: '09:00', onderwerp: 'Factuur F2026-032 – Bedrijfsfilm 75 jaar',
        tekst: 'Hoi Ingrid,\n\nHierbij alvast de eindfactuur, te voldoen vóór 15 oktober. Betalen kan met iDEAL via je klantportaal.\n\nHartelijke groet,\nSanne', bijlagen: [{ naam: 'F2026-032.pdf', grootte: '66 KB' }] },
      { dir: 'in', van: 'Ingrid van Dam', adres: 'ingrid@bakkerijvandam.voorbeeld.nl', datum: '2026-10-02', tijd: '14:32', onderwerp: 'Re: Versie 3 staat klaar: Bedrijfsfilm 75 jaar', nieuw: true,
        tekst: 'Hoi Sanne,\n\nWat is hij mooi geworden! Mijn moeder moest er zelfs een beetje van huilen. Nog één puntje: kan het logo aan het eind iets langer in beeld? Dan keuren we hem daarna meteen goed.\n\nGroetjes,\nIngrid' }
    ]
  };

  return { STATUSES, clientEmails, emails, studio, projects, invoices, feedbackWaiting, videos, comments, hours, planning, shotlist, draaiboek, files, finance, quotes, callsheets, mijlpalen, agendaDemo, transcripts };
})();
