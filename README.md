# Runway-laben – kildekode

En interaktiv 3D-lab som viser forskjellen på svak, sterk og verdensklasse catwalk. Appen er vanlig JavaScript med three.js r128 og bygges til én HTML-fil.

## Bygg appen

Krever Python 3.8 eller nyere.

```bash
python3 build.py                  # runway-laben.html, samme fil som er publisert
python3 build.py --standalone     # runway-laben-standalone.html, kan åpnes direkte i nettleseren
python3 build.py -o min-fil.html  # velg filnavn selv
```

`build.py` limer sammen `style.css`, `shell.html` og JavaScript-filene i denne rekkefølgen:
`engine.js` → `meshdata.js` → `mannequin.js` → `lessons.js` → `app.js`.

Siden trenger nett for to ting: three.js r128 fra cdnjs og skrifttypene fra Google Fonts. Alt annet ligger i filen.

## Lag 3D-kroppen på nytt (valgfritt)

`meshdata.js` følger med ferdig generert. Du trenger bare dette steget hvis du endrer kroppen eller skoene i `gen/`.

Krever Node.js 18 eller nyere.

```bash
cd gen
npm ci              # installerer meshoptimizer 0.21.0
npm run build       # skriver ../meshdata.js (tar omtrent 30–60 sekunder)
cd ..
python3 build.py
```

`npm run build:reuse` gjenbruker forrige kropp fra `gen/body_pos.bin` og `gen/body_idx.bin`. Den regner bare ut vekter, soner og sko på nytt, så det går raskere.

Med samme versjon av meshoptimizer blir `meshdata.js` helt identisk med den som følger med.

## Filene

| Fil | Innhold |
|---|---|
| `engine.js` | Gangmotoren. Den planlegger fotsteg, regner ut positur ved hvert tidspunkt (svingbein, tåavsett, hofte, overkropp, armer, hode), stående positurer og knokkelrammer for skinning. Den har ingen avhengigheter. |
| `mannequin.js` | Bygger den skinnede 3D-modellen og skoene i three.js, med fargesoner for hud, drakt og hår. Inneholder også hestehalen. |
| `lessons.js` | Alt innholdet i de 23 leksjonene, kontekstene og selvtesten. |
| `app.js` | Scene, lys, kameraer, fokus, hjelpelinjer, målinger, kontroller og leksjonsvisning. |
| `shell.html`, `style.css` | Sidens oppsett og stil. |
| `meshdata.js` | Generert kropp og sko, kodet som base64. |
| `gen/sdf.js` | Avstandsfelt (SDF), et mesher-verktøy (surface nets) og hjelpefunksjoner. |
| `gen/body.js` | Anatomien som SDF-former, og sonene for drakt og hår. |
| `gen/shoes.js` | Pumps og flate sko, formet rundt foten. |
| `gen/build_all.js` | Lager mesh, forenkler, regner ut normaler, skinnvekter og soner, og skriver `meshdata.js`. |
| `tests/` | Enkle kontroller av gangmotoren. |

## Tester

```bash
node tests/test_engine.js   # ser etter hopp, NaN og overstrukne bein i alle stiler. Siste linje skal være «bad 0»
node tests/knee_test.js     # skriver ut kne- og hoftevinkel gjennom ett steg
```

## Endre noe vanlig

- **Ny gangstil:** legg til en oppføring i `PRESETS` i `engine.js`. Alle tall som ikke er satt, arves fra `BASE`.
- **Ny leksjon:** legg til et objekt i `LESSONS` i `lessons.js`. Feltene `vps`, `cam`, `guides` og `metrics` styrer scenen.
- **Farger på drakt, hud og hår:** `skinMaterial` i `mannequin.js` og `SUIT` i `app.js`.
