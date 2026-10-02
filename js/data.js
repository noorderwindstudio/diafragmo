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

  return { STATUSES, studio, projects, invoices, feedbackWaiting, videos, comments, hours, planning, shotlist, draaiboek, files, finance };
})();
