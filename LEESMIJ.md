# Diafragmo – klikbaar prototype (noorderwind.app)

Front-end-only prototype voor zzp-videomakers. **Alle data is fictief (voorbeelddata).** Geen backend: wat je invult blijft meestal alleen in het geheugen staan, en na herladen begin je weer opnieuw. Uitzondering (vanaf 0.4.0): de demo-stand van plan, koppeling (e-mail & agenda), timer en timer-uren, ondertekende offertes, callsheets, afgevinkte shots en ondertitels wordt in `localStorage` bewaard (sleutel `diafragmo-demo-040`). Leegmaken via de ontwikkelaarstools of de knop “Demo: handtekening resetten” bij de offerte.

## Openen
Dubbelklik op `index.html` (werkt direct vanaf schijf) of start `python3 -m http.server` in deze map en ga naar http://localhost:8000.

## Schermen (hash-routes)
- `#/dashboard`: lopende projecten, pijplijn, openstaande facturen, feedback die op je wacht, urencriterium
- `#/projecten` en `#/project/p1/planning|callsheet|shotlist|bestanden|feedback|email|uren|financien`
- `#/project/p4/callsheet`: volledig ingevulde callsheet (locatie, call time, tijdsplanning, crew, shotlist, notities); delen en PDF via het printvenster
- `#/review/p1/v3`: videospeler, opmerkingen op timecode, wisselen tussen v1/v2/v3, goedkeuren; Ondertitels maken (Pro): transcript, ondertitels in de speler, .srt-download
- `#/klant/p1`: klantportaal (iDEAL-demo → `#/klant/p1/betaald`)
- `#/klant/p5/offerte`: offerte digitaal ondertekenen (naam, handtekening, akkoord) → offerte Geaccepteerd, project naar Pre-productie, 30% aanbetalingsfactuur als concept
- `#/financien`: offerte- en factuurbouwer met live totalen
- `#/showreel` en `#/showreel/live`: showreel-editor en publieke pagina met aanvraagformulier
- `#/instellingen`: abonnement (Basis €24 / Pro €39, met demo-schakelaar “bekijk als Basis / Pro”), boekhoudkoppelingen en de kaart “Account koppelen: e-mail & agenda” (`#/instellingen/email`, `#/instellingen/agenda` en `#/instellingen/koppeling` scrollen er allemaal naartoe)
- Timer voor uren (Pro): start in de projectkop of bij Uren & km; de lopende timer staat als pil in de bovenbalk

## E-mail & agenda: één koppeling (gesimuleerd, vanaf 0.4.1)
Eén kaart “Account koppelen: e-mail & agenda” met twee aanbieders: **Microsoft 365** (Outlook-mail + agenda) en **Google** (Gmail + Google Agenda). Eén keer “Koppelen” opent één nagebootst toestemmingsscherm met alle rechten samen (e-mail verzenden namens jou, berichten met klanten lezen die bij projecten horen, agenda lezen voor beschikbaarheid, opnamedagen en deadlines in je agenda zetten). Daarna staan per account de schakelaars **E-mail** en **Agenda** allebei aan; je zet ze los uit. “Ontkoppelen” stopt e-mail én agenda. Er is één verzendaccount en één agenda tegelijk actief (koppel je het tweede account, dan neemt dat de agenda over).

- Agenda uit (of niet gekoppeld): geen “vrij / bezet”-hint bij datumkiezers, en het dashboardblok “Deze week” toont de niet-gekoppelde stand.
- E-mail uit: het opstelvenster en het tabblad E-mail tonen “E-mail aanzetten”; zonder koppeling “Koppel je e-mail” met knoppen Microsoft 365 / Google.
- De koppeling wordt bewaard in `localStorage` (`diafragmo-demo-040`, veld `koppeling`). Oude stand uit 0.4.0 wordt automatisch overgezet: was de agenda of e-mail van een aanbieder gekoppeld, dan is die aanbieder gekoppeld met precies die schakelaar aan.

### E-mail
Eén account is het actieve verzendaccount; handtekening, BCC naar mezelf en sjablonen (Offerte, Factuur, Herinnering, Oplevering met `{klant}`, `{voornaam}`, `{project}`, `{portaallink}`, `{documentnr}`, `{bedrag}`, `{vervaldatum}`) zijn instelbaar. Verstuur offerte, factuur Versturen, Herinner en Antwoord openen een opstelvenster; verzonden mail verschijnt in het tabblad E-mail van het project. Zonder koppeling wordt verzonden via Diafragmo (noreply). Er wordt nooit echt ingelogd of gemaild; adressen op `.voorbeeld` zijn fictief.

Voorbeeldvideo's: open-source testclips van test-videos.co.uk (Big Buck Bunny, Jellyfish, Sintel), met MDN "flower.mp4" als reserve. Zonder internet verschijnt een gesimuleerde speler.
