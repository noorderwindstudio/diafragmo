/* Diafragmo – automatische taalkeuze op basis van land (vanaf 0.5.1).
   Eén gedeelde functie DiafragmoLand.detect(), gebruikt door het inline script in <head> (taal vóór de eerste weergave)
   én door js/i18n.js / app.js (Instellingen → Weergave → Taal). Wordt synchroon in <head> geladen.
   Privacy (AVG): er wordt GEEN externe dienst aangeroepen (geen IP-geolocatie). Alleen lokaal beschikbare signalen:
     1. handmatig gekozen taal in localStorage 'diafragmo-taal' wint altijd;
     2. tijdzone (Intl) → land;
     3. regio-subtag van navigator.languages (nl-BE, de-AT, en-GB …) als tweede signaal,
        of als eerste signaal wanneer de tijdzone ontbreekt of dubbelzinnig is (UTC, Etc/…).
   Testhaak: ?land=DE (NL, BE, AT, CH, LU, US …) simuleert het land voor demo/test; wordt nooit bewaard. */
(function () {
  'use strict';
  var KEY = 'diafragmo-taal';
  var LANGS = ['nl', 'de', 'en'];
  var TZ = {
    'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
    'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Vaduz': 'LI', 'Europe/Luxembourg': 'LU',
    // Caribisch deel van het Koninkrijk der Nederlanden
    'America/Curacao': 'CW', 'America/Aruba': 'AW', 'America/Kralendijk': 'BQ', 'America/Lower_Princes': 'SX'
  };
  var NL_KINGDOM = { NL: 1, CW: 1, AW: 1, BQ: 1, SX: 1 };
  // Tijdzones die in de tz-database aan elkaar gelinkt zijn (2022b: Amsterdam/Luxemburg → Brussel; Vaduz/Busingen → Zürich).
  // Valt de regio van de browser in dezelfde groep, dan is die preciezer dan de tijdzone.
  var TZ_GROUP = { BE: 'benelux', NL: 'benelux', LU: 'benelux', CH: 'alpen', LI: 'alpen' };
  // Landen met een eigen taalregel; alle andere landen krijgen Engels
  var SPECIAL = { NL: 1, CW: 1, AW: 1, BQ: 1, SX: 1, DE: 1, AT: 1, LI: 1, CH: 1, LU: 1, BE: 1 };

  function stored() { try { var v = localStorage.getItem(KEY); return LANGS.indexOf(v) >= 0 ? v : null; } catch (e) { return null; } }
  function timeZone() { try { return (Intl.DateTimeFormat().resolvedOptions().timeZone) || ''; } catch (e) { return ''; } }
  function browserLangs() {
    var l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    return Array.prototype.slice.call(l).map(function (x) { return String(x || ''); }).filter(Boolean);
  }
  function primary(tag) { return String(tag || '').split(/[-_]/)[0].toLowerCase(); }
  function regionOf(tag) {
    var p = String(tag || '').split(/[-_]/);
    for (var i = 1; i < p.length; i++) if (/^[A-Za-z]{2}$/.test(p[i])) return p[i].toUpperCase();
    return null;
  }
  function paramCountry() {
    try { var m = /[?&]land=([A-Za-z]{2})(?:&|$)/.exec(location.search || ''); return m ? m[1].toUpperCase() : null; } catch (e) { return null; }
  }
  function ambiguousTz(tz) { return !tz || /^(UTC|GMT|Etc\/|Factory)/i.test(tz); }

  // Land → taal (we hebben nl/de/en; geen fr/it)
  function langForCountry(cc, bl) {
    if (!cc) return 'en';
    if (NL_KINGDOM[cc]) return 'nl';
    if (cc === 'DE' || cc === 'AT' || cc === 'LI') return 'de';
    if (cc === 'CH') return bl === 'fr' || bl === 'it' ? 'en' : 'de';
    if (cc === 'LU') return bl === 'nl' || bl === 'en' ? bl : 'de';
    if (cc === 'BE') return bl === 'nl' ? 'nl' : bl === 'de' ? 'de' : 'en';
    return 'en';
  }

  /* detect(opts?) → { lang, auto, country, source, tz, region, browserLang, simulated }
     opts.ignoreStored: true = de automatische taal berekenen, ook als er een handmatige keuze is (voor de weergave in Instellingen). */
  function detect(opts) {
    opts = opts || {};
    var tz = timeZone(), langs = browserLangs(), bl = primary(langs[0]), region = null;
    for (var i = 0; i < langs.length && !region; i++) region = regionOf(langs[i]);
    var sim = paramCountry(), country = null, source = 'default';
    if (sim) { country = sim; source = 'param'; }
    else if (!ambiguousTz(tz)) {
      country = TZ[tz] || null; source = 'tz';
      if (country && region && region !== country && TZ_GROUP[country] && TZ_GROUP[country] === TZ_GROUP[region]) { country = region; source = 'tz+region'; }
      else if (country && region === country) source = 'tz+region';
      // Andere tijdzone = “overig land” (Engels); een niet-speciale regio (bijv. US, GB) alleen ter weergave
      else if (!country && region && !SPECIAL[region]) country = region;
    } else if (region) { country = region; source = 'region'; }
    var res = { lang: langForCountry(country, bl), auto: true, country: country, source: source, tz: tz, region: region, browserLang: bl, simulated: !!sim };
    var s = opts.ignoreStored ? null : stored();
    if (s) { res.lang = s; res.auto = false; res.source = 'manual'; }
    return res;
  }

  window.DiafragmoLand = { detect: detect, langForCountry: langForCountry, countryForTz: function (tz) { return TZ[tz] || null; }, stored: stored, KEY: KEY, LANGS: LANGS };
})();
