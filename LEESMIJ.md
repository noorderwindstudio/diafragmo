# Frame – klikbaar prototype (noorderwind.app)

Front-end-only prototype voor zzp-videomakers. **Alle data is fictief (voorbeelddata).** Geen backend: wat je invult blijft alleen in het geheugen staan, en na herladen begin je weer opnieuw.

## Openen
Dubbelklik op `index.html` (werkt direct vanaf schijf) of start `python3 -m http.server` in deze map en ga naar http://localhost:8000.

## Schermen (hash-routes)
- `#/dashboard`: lopende projecten, pijplijn, openstaande facturen, feedback die op je wacht, urencriterium
- `#/projecten` en `#/project/p1/planning|shotlist|bestanden|feedback|uren|financien`
- `#/review/p1/v3`: videospeler, opmerkingen op timecode, wisselen tussen v1/v2/v3, goedkeuren
- `#/klant/p1`: klantportaal (iDEAL-demo → `#/klant/p1/betaald`)
- `#/financien`: offerte- en factuurbouwer met live totalen
- `#/showreel` en `#/showreel/live`: showreel-editor en publieke pagina met aanvraagformulier
- `#/instellingen`: abonnement (Basis €24 / Pro €39) en boekhoudkoppelingen

Voorbeeldvideo's: open-source testclips van test-videos.co.uk (Big Buck Bunny, Jellyfish, Sintel), met MDN "flower.mp4" als reserve. Zonder internet verschijnt een gesimuleerde speler.
