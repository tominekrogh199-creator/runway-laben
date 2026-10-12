// ================= Lesson content (extracted from the two texts) =================
const GROUPS = ['Grunnlaget', 'Kroppens arkitektur', 'Steget', 'Rytme', 'Overkropp og uttrykk', 'Vending', 'Signatur og kontekst', 'Kameraet', 'Øv selv'];

const CONTEXTS = {
  ctxCouture: {
    name: 'Couture / editorial',
    turn: 'Skru ned armamplitude og unødige uttrykk. Gi plagget mer luft mellom akselerasjon og vending. Tempoet kan være lavere, men ikke slappere.',
    prio: 'Stabil overkropp, presis rute og ekstremt ren vektflyt, fordi detaljer, stoff, broderi og silhuett er synlige. Vendingen er mer forutsigbar enn dramatisk når kjolen har volum, slep eller skjør konstruksjon.',
    ruin: '«Supermodel face», for store hofter eller en kommersiell pose ved enden.',
    extra: 'Reduser personlig energi før du reduserer teknikk. Det er en forskjell. Signaturen kan ligge i hvordan du eier tiden, mens plaggets arkitektur får prioritet.',
  },
  ctxUndertoy: {
    name: 'Sexy / undertøy',
    turn: 'Skru opp den langsomme vektovergangen og kroppens vertikale kontroll, ikke antall bevegelser.',
    prio: 'Rolig brystkasse og hode, stabil mage og bekken, myke men sikre steg. Bekkenet kan vandre, ribbeina er ikke stive.',
    ruin: 'Overdrevet korsrygg, skulderrulling, trutmunn, brystfremstøt og bevisst «sexy» hoftekast.',
    extra: 'Undertøy avslører stress raskt. Nervøs armbruk, blikk ned, asymmetrisk vekt eller et kne som faller inn kan ikke gjemmes bak stoff. Den beste versjonen ser ut som kroppen er tilgjengelig for kameraet uten å be om oppmerksomhet. Velg én motorisk kvalitet: i de fleste high-fashion-sexy walks er torsoen overraskende rolig, og sensualiteten kommer fra timing, vekt og avstand.',
  },
  ctxMinimal: {
    name: 'Minimalistisk high fashion',
    turn: 'Skru ned alt som ser performativt ut, men behold fremdriften. Velg ett signal: tempo, blikk, litt skulderfrihet eller en bestemt ro. Ikke alle.',
    prio: 'En nesten grafisk silhuett: hodet rolig, armene stille, presis timing.',
    ruin: 'Å bli så kontrollert at walken ser redd eller livløs ut.',
    extra: 'Minimalisme er brutal fordi ingenting dekker feil. Enkel sort kjole, flat lyssetting og ren runway gjør at publikum ser hodebane, håndposisjon, lårpassasje og vending nesten uten distraksjon. Riktig minimalisme er høy oppløsning med lav amplitude: du ser hver beslutning, den roper bare ikke.',
  },
  ctxAvant: {
    name: 'Dramatisk / avant-garde',
    turn: 'Følg showets verb: skjær, svev, marsjer, forskyv, stopp. Skjeve linjer, kunstig forsinket hode, tyngre fotfall, merkelig armføring, staccato eller nesten maskinell repetisjon kan være riktig.',
    prio: 'Bevegelsen må understøtte ideen uten å ødelegge balansen eller plagget. Du må fortsatt eie tyngdepunkt, sikkerhet og plagg.',
    ruin: 'Å improvisere «weirdness» fordi klærne er rare. Da ser modellen ikke regissert ut, bare usikker.',
    extra: 'Bruddet må være en regel. Gjør kroppen noe rart tre ganger på ulike måter, leses det som usikkerhet. Gjentas den samme rare logikken presist, leses det som design. Dukken her bruker staccato-timing og én arm med en fast oppgave.',
  },
  ctxKommersiell: {
    name: 'Kommersiell / showpreget',
    turn: 'Større lesbarhet for publikum og kamera: litt større armrespons, tydeligere front, mer energi i returen, eventuelt mer øyekontakt eller varme hvis showet ber om det.',
    prio: 'Klarere rytme og mer romlig energi, men fortsatt ren teknikk.',
    ruin: 'Å bli beauty pageant, TikTok-dans eller TV-vert når retningen egentlig er fashion.',
    extra: 'Kommersielt er ikke mindre sofistikert. High fashion spør: kan du holde et komplekst bilde uten å forklare det? Kommersielt spør: kan rommet lese deg umiddelbart?',
  },
};

const SCORE_AREAS = [
  { k: 'rute', name: 'Rute', d: ['Stadige korrigeringer.', 'Holder stort sett linjen.', 'Samme korridor uten synlig innsats.'] },
  { k: 'landing', name: 'Landing', d: ['Kroppen må hente seg inn.', 'Mest stabil, men enkelte bremsinger.', 'Vekten går gjennom foten uten redningsbevegelse.'] },
  { k: 'overkropp', name: 'Overkropp', d: ['Hode og skuldre reagerer på beina.', 'Stabil, men noe låst.', 'Rolig, fri og koblet til underkroppen.'] },
  { k: 'armer', name: 'Armer og hender', d: ['Urolige eller frosne.', 'For det meste passende.', 'Naturlige, men kontrollert usynlige.'] },
  { k: 'vending', name: 'Vending', d: ['Stopper, dobbeltsjekker eller tar ekstra steg.', 'Fungerer, men bryter rytmen.', 'Forberedt, ren og med sterk retur.'] },
  { k: 'plagg', name: 'Plagg og karakter', d: ['Kropp og klær jobber hver sin vei.', 'Klærne forstyrres lite.', 'Walken gjør plaggets idé tydeligere.'] },
];

const LESSONS = [
  {
    id: 'kjerne', group: 0, title: 'Hva verdensklasse faktisk er', cam: 'front', guides: ['head'], metrics: ['head', 'tempo'],
    vps: [
      { w: 'svak', label: 'Teknisk svak', tag: 'svak', note: 'Kroppen reagerer etter hvert steg og må redde seg selv.' },
      { w: 'sterk', label: 'Sterk runway-walk', tag: 'sterk', note: 'Vekt, tempo, armer og blikk er organisert. Ingenting må reddes.' },
    ],
    lead: 'En fantastisk catwalk er ikke en pen måte å gå på. Den er en presis organisering av vekt, retning, tempo, ansikt, plagg og rom, slik at ingen del av kroppen ser ut til å måtte reddes av en annen.',
    look: [
      'Foten lander uten at overkroppen må korrigere etterpå.',
      'Hodet flyter gjennom rommet i stedet for å bli slått opp og ned av hvert fotisett. Følg den rosa hodebanen.',
      'Bruk Fokus under scenen for å zoome inn på hode, overkropp, hofter, knær eller føtter. Dra i scenen for å se fra en annen vinkel.',
      'Armene reagerer på gangen, men konkurrerer ikke med klærne.',
      'Blikket ligger fast fremover og søker ikke bekreftelse.',
      'Rytmen er valgt: stegene har samme indre logikk.',
    ],
    body: `
<h3>Hendelsene som beviser kontroll</h3>
<p>Det er lett å si at verdensklasse er kontroll, rytme, klær, blikk og tilpasning. Det vanskelige er å se det. Se etter fire synlige hendelser i hvert steg: når vekten flyttes, om kroppen korrigerer etterpå, om steget bremser, og hvordan skulderen reagerer etter fotisettet. Resten av laben viser én slik hendelse om gangen.</p>
<p>Ingenting skjer tilfeldig: vekten flyttes uten nøling, hodet er visuelt rolig, rytmen er valgt, armene forstyrrer ikke silhuetten, og hvert stopp, blikk og hver vending virker som en del av samme setning.</p>
<h3>Teknikk er ikke det samme som ikonisk</h3>
<p class="formula">Ikonisk = teknikk + gjenkjennelig bevegelsesidentitet + casting, bilde, timing og historisk øyeblikk</p>
<ul>
<li>En teknisk sterk modell gjør dette konsekvent. En ikonisk modell gjør det i tillegg gjenkjennelig, riktig for konteksten og kulturelt minneverdig.</li>
<li>En perfekt teknisk walk kan være anonym.</li>
<li>En viral walk kan være dårlig teknikk med god kjole og sterk klipping.</li>
<li>«Ikonisk» er ikke en høyere hæl, større hoftesving eller kaldere mine.</li>
<li>Verdensklasse betyr at du kan skru mekanikken opp eller ned etter plagget og huset uten å miste din egen signatur.</li>
</ul>
<div class="callout"><p class="callout-k">Testen</p><p>Ikke «ser hun ut som en supermodell i et stillbilde?», men: holder kroppen, plagget og fortellingen sammen gjennom innmarsj, hovedpassasje, front, vending og retur, uten at noen del av performancen lekker stress?</p></div>
<h3>Slik ser du detaljene</h3>
<ul>
<li><b>Fokus</b> zoomer inn på en kroppsdel og følger den mens modellen går.</li>
<li><b>Skjelett</b> gjør kroppen gjennomsiktig og viser leddene, så du ser hva bekken, knær og ankler gjør under huden.</li>
<li><b>Bevegelsesspor</b> tegner de siste bevegelsene som et stroboskop, så du ser banen kroppen følger.</li>
<li><b>Leddvinkler</b> viser hvor mye kne og hofte er bøyd akkurat nå.</li>
<li>¼× og <b>Ett bilde frem</b> lar deg stoppe i hver fase av steget.</li>
</ul>
<p class="note">Modellene isolerer én forskjell om gangen. Bevegelsene er modellert etter prinsippene i teksten og kjente gangmønstre, ikke målt på ekte modeller. Tallene i rutene er målt på 3D-modellene.</p>`,
  },
  {
    id: 'hierarki', group: 0, title: 'Fire nivåer', cam: 'front', mode: 'runway', guides: [], metrics: ['head', 'tempo'],
    vps: [
      { w: 'svak', label: 'Teknisk svak', tag: 'svak', note: 'Sen vekt, ujevnt tempo, urolige armer, rotete vending.' },
      { w: 'kompetent', label: 'Kompetent', tag: 'noytral', note: 'Trygg og castbar, men få tydelige valg.' },
      { w: 'sterk', label: 'Sterk', tag: 'sterk', note: 'Alt samarbeider. Valgt rytme og ren vending.' },
      { w: 'signatur', label: 'Med signatur', tag: 'sterk', note: 'Samme kontroll, men en gjenkjennelig bevegelseslogikk.' },
    ],
    lead: 'De tre første nivåene er tekniske. Det fjerde er en kulturell kategori. Det er ikke fire trinn på én rett stige.',
    look: [
      'Alle fire går hele runwayen med vending. Se hva som skjer i de to stegene før enden.',
      'Kompetent og sterk ser like ut i ett bilde. Forskjellen er timing: sterk henger et øyeblikk i standbeinet.',
      'Signaturen ligger i forholdet mellom skuldre og hofter og den lengre tiden over standbeinet, ikke i ett triks.',
    ],
    body: `
<div class="levels">
<div class="lvl"><p class="lvl-n"><span class="sw sw-svak"></span>Teknisk svak walk</p><dl>
<dt>Kroppen</dt><dd>Vekten kommer sent over standbeinet. Føttene lander ulikt, knær eller ankler korrigerer etter landing, hode og skuldre må redde balansen, og tempoet varierer ubevisst.</dd>
<dt>Kameraet avslører</dt><dd>Ujevne steglengder, vingling, blikk ned, hender som «leter», brå fartsskifter, dårlig vending.</dd>
<dt>Publikum ser</dt><dd>Noen som prøver å komme seg gjennom en oppgave: litt forsiktig, litt stresset, som om skoene styrer.</dd>
<dt>Mangler</dt><dd>Planlagt vektflyt og rytmisk kontinuitet.</dd></dl></div>
<div class="lvl"><p class="lvl-n"><span class="sw sw-noytral"></span>Kompetent profesjonell walk</p><dl>
<dt>Kroppen</dt><dd>Stabil, ryddig linje, forutsigbare fotisett. Hun kommer trygt fra A til B, følger tempoet, vendingen fungerer og hun skader ikke plagget.</dd>
<dt>Kameraet avslører</dt><dd>Lite feil, men få tydelige valg. Rytme, blikk og energifordeling er generiske.</dd>
<dt>Publikum ser</dt><dd>Castbar og trygg. Plagget ser ordentlig ut, men rommet endrer seg ikke når hun entrer.</dd>
<dt>Mangler</dt><dd>Spesifikk dramaturgi og en aktiv relasjon til plagg, rom og kamera.</dd></dl></div>
<div class="lvl"><p class="lvl-n"><span class="sw sw-sterk"></span>Sterk runway-walk</p><dl>
<dt>Kroppen</dt><dd>Alle deler samarbeider. Steglengde, tempo, bredde, forholdet mellom hofte og overkropp, armnivå, blikk, vending og kameraøyeblikk er valgt for akkurat dette showet. Hard uten å bli bråkete, rolig uten å bli død.</dd>
<dt>Kameraet avslører</dt><dd>Stabilitet uten stivhet, intensjon uten overspill. Bildene ser komponerte ut selv mens hun går.</dd>
<dt>Mangler</dt><dd>Ikke nødvendigvis berømmelse eller en signatur publikum husker.</dd></dl></div>
<div class="lvl"><p class="lvl-n"><span class="sw sw-sterk"></span>Ikonisk / supermodel-nivå</p><dl>
<dt>Kroppen</dt><dd>En stabil, gjenkjennelig bevegelseslogikk som kan tilpasses uten å forsvinne. Tåler dårlige sko, lang runway, stress, støy og kameravinkler uten at kontrollen sprekker.</dd>
<dt>Kameraet avslører</dt><dd>Folk kan beskrive virkningen uten å kunne biomekanikken. Bildet overlever styling, flere vinkler og tid. Folk husker hvordan rommet føltes da hun gikk.</dd>
<dt>Mangler</dt><dd>Ingenting teknisk i seg selv. Statusen krever også gjentakelse, karriere, casting, eksponering og kultur. Det kan ikke animeres.</dd></dl></div>
</div>
<h3>Viral er ikke det samme som sterk</h3>
<p>Det er fullt mulig å ha en ekstremt sterk walk uten å være ikonisk, og en viral, sexy eller særegen walk som ikke er spesielt god teknisk. Viralitet belønner det som er lett å imitere i fem sekunder: stort hofteutslag, hardt stomp, dramatisk hårkast, ekstremt blikk. Runway belønner evnen til å levere et helt system over tid.</p>
<p class="note">Det finnes ikke én biologisk korrekt supermodel-walk. En studie av 69 runway-modeller fant fem distinkte gangmønstre, og at ekstrem benkryssing er blitt mindre vanlig over tid.</p>`,
  },
  {
    id: 'staa', group: 1, title: 'Stå: én vertikal stabel', mode: 'stand', cam: 'side', guides: ['com'], metrics: ['stack'],
    vps: [
      { w: 'standMilitar', label: '«Skuldrene bak»', tag: 'svak', note: 'Brystet løftet, svai korsrygg, låste armer.' },
      { w: 'standSvai', label: 'Hofter frem, rygg bak', tag: 'svak', note: 'Bekkenet skyves frem, overkroppen henger bak og hodet stikker frem.' },
      { w: 'standSammensunket', label: 'Sammensunket', tag: 'svak', note: 'Brystkassen faller frem og skuldrene ruller inn.' },
      { w: 'standStablet', label: 'Stablet', tag: 'sterk', note: 'Hode, brystkasse og bekken ligger over hverandre. Vekten hviler på ett bein.' },
    ],
    lead: 'En god walk starter ikke i ansiktet eller hoftene. Den starter i hvor kroppen kan bære vekt. Hode, brystkasse og bekken må lese som én vertikal organisme, mens beina gjør arbeidet under.',
    look: [
      'Den gule loddlinjen går opp fra tyngdepunktet. Hos den stablede ligger brystkasse og hode nesten rett over bekkenet.',
      'Tallene nederst viser hvor langt brystkassen og hodet ligger foran eller bak bekkenet.',
      'Bytt til Forfra: den stablede har vekten på ett bein. Hoften er høyere på den siden, og skuldrene svarer motsatt.',
      'Slå på Skjelett for å se ryggrad, bekken og knær gjennom kroppen, eller velg Fokus: Overkropp.',
    ],
    body: `
<h3>«Skuldrene bak» er dårlig instruksjon</h3>
<p>Drar du skulderbladene hardt sammen, låser du ribbeina, løfter brystet kunstig og gjør armene døde. Det du vil se, er brede kragebein, lave skuldre og en brystkasse som ikke stikker frem foran bekkenet.</p>
<h3>Brystkassen er båret over bekkenet</h3>
<ul>
<li>Den skal ikke lene seg foran bekkenet som om du går ned en bakke.</li>
<li>Den skal ikke henge bak med hoftene skjøvet frem.</li>
<li>Bekkenet fryses ikke. Det kan vippe litt når vekten ligger på ett bein.</li>
<li>Knærne peker samme vei som foten. De kollapser ikke innover og låses ikke aggressivt bakover.</li>
<li>Nakken er fri nok til at hodet ikke må korrigere balansen. «Lang nakke» betyr ikke «løft haken».</li>
</ul>
<h3>Øvelse: stack og marsj</h3>
<p>Stå i flate sko med ribbein over bekken. Løft ett kne som starten på et steg uten at brystkassen løfter seg eller bekkenet tipper. Seks rolige repetisjoner per side.</p>`,
  },
  {
    id: 'hode', group: 1, title: 'Hodet: jevnt, ikke frosset', cam: 'side', guides: ['head'], metrics: ['head'],
    vps: [
      { w: 'hodeSvak', label: 'Hodet nikker', tag: 'svak', note: 'Støt fra hvert fotisett går rett opp i hodet.' },
      { w: 'sterk', label: 'Hodet flyter', tag: 'sterk', note: 'Hodet blir båret av kroppen, ikke dratt av føttene.' },
    ],
    lead: 'Hodet skal være den mest stabile synlige delen av kroppen, men ikke et fastfrosset objekt. Målet er jevn bevegelse, ikke null bevegelse.',
    look: [
      'Hodebanen (rosa): en jevn, lav bølge er målet. Hakk ved hvert fotisett betyr støt.',
      'Se etter et lite nikk for hvert steg. Det betyr at hodet korrigerer balansen.',
      'Bytt til Forfra: flytter hodet seg sideveis med vekten?',
    ],
    body: `
<ul>
<li>Hopper hodet opp ved hvert steg, leser kameraet «støt».</li>
<li>Flyter det ned på ett steg og opp på neste, leser kameraet usikker kontroll.</li>
<li>Når en modell ser «dyr» ut, er det ofte fordi hodet ser ut til å flyte gjennom rommet i stedet for å bli slått opp og ned av hvert fotisett.</li>
<li>Et godt hode ser ut til å bli båret av resten av kroppen, ikke dratt rundt av føttene.</li>
</ul>
<h3>Nakken</h3>
<p>Nakken må være fri nok til at hodet kan orientere seg uten at brystkassen følger med, og fri nok til at hodet ikke må korrigere balansen.</p>
<ul>
<li>Låst nakke, hake skjøvet frem og hardt blikk ser ikke autoritært ut. Det ser ut som kroppen venter på et sammenstøt.</li>
<li>«Lang nakke» betyr ikke «løft haken». Det betyr at kjeven ikke er presset frem, og at bakhodet ikke trekkes bakover som i en militærposisjon.</li>
</ul>
<h3>Øvelse: still hode, fri thorax</h3>
<p>Gå åtte steg mens du filmer fra siden. Oppgaven er ikke å fryse hodet, men å gjøre høyde- og fremoverbanen jevn. La ribbeina og skuldrene være frie nok til å reagere på vekten. Blir hodet stille fordi hele torsoen stivner, har du ikke løst problemet. Du har flyttet det.</p>`,
  },
  {
    id: 'skuldre', group: 1, title: 'Skuldre og brystkasse', cam: 'threeq', guides: ['lines', 'com'], metrics: ['lean', 'arm'],
    vps: [
      { w: 'laast', label: '«Skuldrene bak»', tag: 'svak', note: 'Skulderbladene klemt, brystet løftet, armene døde.' },
      { w: 'foran', label: 'Brystkasse foran bekken', tag: 'svak', note: 'Lener seg som om hun går ned en bakke.' },
      { w: 'sterk', label: 'Stablet og fri', tag: 'sterk', note: 'Brystkassen båret over bekkenet, skuldrene frie.' },
    ],
    lead: '«Skuldrene bak, magen inn, hodet opp» gjør mange til én stiv blokk. En god walk har ikke en fast kropp. Den har en kropp med klart hierarki: hode, brystkasse og bekken leses som én vertikal organisme, mens beina gjør arbeidet under.',
    look: [
      'Mintlinjen gjennom skuldrene: små, udramatiske bevegelser er riktig. Ingen bevegelse betyr låst.',
      'Bytt til Siden: ligger brystkassen over bekkenet, eller foran det? Den gule loddlinjen hjelper.',
      'Se armene til den låste: når skuldrene trekkes bak, mister armene pendelen.',
    ],
    body: `
<h3>Skuldrene trenger frihet, ikke tilbaketrekking</h3>
<p>Drar du skulderbladene hardt sammen, låser du ribbeina, løfter brystet kunstig og gjør armene døde. Overkroppen ser ut som den forsvarer seg.</p>
<p>Det du vil se: brede kragebein, lave skuldre, myk avstand mellom skuldrene og ørene, og små, udramatiske bevegelser i skulderbladene når vekten flytter seg fra side til side.</p>
<h3>Brystkassen er en stabil masse over bekkenet</h3>
<ul>
<li>Henger den etter hvert steg, får du en slapp walk.</li>
<li>Drives den først, får du en marsjerende eller aggressivt fremoverlent walk.</li>
<li>Lener den foran bekkenet, ser det ut som du går ned en bakke.</li>
<li>Sterk versjon: brystbeinet peker omtrent dit kroppen skal, mens ribbeina fortsatt kan rotere og puste. Brystkassen er ikke en dekorasjon som holdes høyt.</li>
</ul>
<h3>Se etter på film</h3>
<ul>
<li>Ribbein: ingen synlig kollaps til én side når vekten lander.</li>
<li>Skuldre: omtrent i samme høyde forfra, og de løfter seg ikke ved landing.</li>
</ul>`,
  },
  {
    id: 'bekken', group: 1, title: 'Bekkenet: bevegelse nedenfra', cam: 'back', guides: ['lines'], metrics: ['pelvis'],
    vps: [
      { w: 'wobble', label: 'Hoftekast etter landing', tag: 'svak', note: 'Bekkenet ristes etter at foten har landet.' },
      { w: 'sterk', label: 'Bevegelse nedenfra', tag: 'sterk', note: 'Hoften beveger seg fordi vekten flyttes.' },
    ],
    lead: 'Bekkenet skal ikke fryses. Vekten må gå fra side til side, og bekkenet vil alltid rotere og forskyve seg litt. Forskjellen mellom elegant hoftebevegelse og billig «wobble» er rekkefølgen.',
    look: [
      'Mintlinjen gjennom hoftene: følger den vekten, eller får den et ekstra kast etter landing?',
      'Spill av i ¼× og se hva som kommer først: fotisettet eller hoftebevegelsen.',
      'Se om skulderlinjen må kompensere for hoftene.',
    ],
    body: `
<h3>Tre ting skjer samtidig</h3>
<ol>
<li>Vekten flytter seg over standbeinet.</li>
<li>Bekkenet roterer svakt fremover rundt det frie beinet.</li>
<li>Den frie hoften får slippe gjennom uten å bli holdt igjen.</li>
</ol>
<p>I en god walk kommer bevegelsen nedenfra: fot, ankel, kne, hofte, fordi vekten flyttes. I en påtatt walk begynner modellen å riste bekkenet etter at foten har landet. Da ser det ut som en egen dans oppå gangen.</p>
<p>Prøver du å «lage hofter» med vilje, beveger bekkenet seg mer enn kroppen har balanse for. Overkroppen må kompensere, og walken ser billig ut fordi den er dekorasjon oppå ustabilitet. Hoftebevegelse er ikke at rumpen sendes sideveis som en egen effekt.</p>
<h3>Bakfra</h3>
<ul>
<li>Riktig: bekkenet skifter kontrollert fra side til side, anklene holder linjen, armene har jevn og lav amplitude.</li>
<li>Feil: hoften kollapser ned på én side, ankelen ruller, én arm er mye mer aktiv, eller skulderlinjen vrir seg tilfeldig.</li>
</ul>`,
  },
  {
    id: 'kne', group: 1, title: 'Knær og ankler', cam: 'front', guides: ['knee'], metrics: ['knee'],
    vps: [
      { w: 'kneInn', label: 'Kneet faller inn', tag: 'svak', note: 'Kneet kollapser innover og ankelen ruller.' },
      { w: 'knebøy', label: 'Knebøy-gang', tag: 'svak', note: 'For mye bøy hele veien. Ser sliten ut.' },
      { w: 'sterk', label: 'Riktig jobb i riktig fase', tag: 'sterk', note: 'Kneet over foten, myk landing, lang fraskyv.' },
    ],
    lead: 'Knærne er ikke enten myke eller strake. De må gjøre riktig jobb i riktig fase, og peke samme vei som foten.',
    look: [
      'Lilla linje fra hofte til forfot: kneet skal ligge på linjen. Rødt utslag betyr at kneet faller inn.',
      'Se ankelen i det vekten lander: ruller den innover?',
      'Bytt til Siden for å se knebøy-gangen.',
    ],
    body: `
<h3>Kneets to jobber</h3>
<ul>
<li>Landing: akkurat nok bøy til å ta imot belastningen uten synlig kollaps.</li>
<li>Fraskyv: beinet forlenger seg slik at kroppen går fremover, ikke synker ned.</li>
<li>Knebøyaktig gang ser sliten ut. Hyperstrukket, låst gang ser mekanisk og ufleksibel ut.</li>
<li>Knærne peker samme vei som foten. De kollapser ikke innover og låses ikke aggressivt bakover.</li>
</ul>
<h3>Ankler og føtter er der sannheten ligger</h3>
<ul>
<li>Ingen synlig rulling inn eller ut når hælen eller forfoten tar vekten.</li>
<li>Lander foten for langt foran kroppen, må kroppen bremse og komme seg over den etterpå.</li>
<li>Lander den for smalt eller på tvers av vekten, må ankel, kne eller hofte hente deg inn.</li>
<li>En sterk walk ser ikke presis ut fordi modellen ser ned og plasserer føttene. Den ser presis ut fordi kroppen allerede er over neste landingssted før foten kommer ned.</li>
</ul>
<p class="note">En studie av «gait attractiveness» fant at modeller brukte flere strategikombinasjoner enn ikke-modeller, blant annet i kneets arbeid ved fraskyv og plasseringen av overarmene. Det er en observasjon, ikke en oppskrift alle skal kopiere.</p>`,
  },
  {
    id: 'vekt', group: 1, title: 'Vekten flyttes før foten ber om det', cam: 'front', guides: ['com', 'lines'], metrics: ['tilt'],
    vps: [
      { w: 'senVekt', label: 'Vekten kommer for sent', tag: 'svak', note: 'Skuldrene vipper for å redde balansen.' },
      { w: 'sterk', label: 'Vekten flyttes før', tag: 'sterk', note: 'Beinet blir ledig fordi kroppen allerede har bestemt seg.' },
    ],
    lead: 'Det finnes ikke ett fast tyngdepunkt som skal holdes lavt eller midt. Det vandrer hele tiden. Før et bein kan bli fritt, må massen allerede være over det andre.',
    look: [
      'Den gule loddlinjen fra bekkenet: hvor er den når det frie beinet slipper gulvet?',
      'Mintlinjen gjennom skuldrene: vipper den for å hjelpe til? Da redder overkroppen balansen.',
      'Spill av i ¼× og se øyeblikket foten slipper.',
    ],
    body: `
<p>Dette er den viktigste forskjellen på en som bare går og en som ser ut til å styre hvert steg:</p>
<ul>
<li><b>Svak:</b> vektflyttingen skjer etter at foten har begynt å gå frem. Beinet trekkes løs fra bakken, og skuldrene eller hodet må hente balansen.</li>
<li><b>Sterk:</b> vektflyttingen skjer før. Du ser ikke et bein som trekkes løs. Du ser et bein som blir ledig fordi resten av kroppen allerede har bestemt seg.</li>
</ul>
<h3>Øvelse: vektflyt uten show</h3>
<p>Stå på begge bein. Flytt vekten helt over høyre bein uten å vippe skulderen opp eller skyve hoften teatralsk ut. Løft venstre fot bare én centimeter. Gå tilbake og gjenta på andre siden. 2 sett à 8 per side, barbeint eller i stabile flate sko. Det frie beinet skal bli lett fordi vekten allerede er flyttet, ikke fordi du drar det opp.</p>
<h3>Øvelse: ettbeins belastning</h3>
<p>Stå på ett bein i 10 sekunder, flytt vekten rolig fremover og ta ett kontrollert steg. Dette trener overføringen som gjør at du slipper å «fange» deg selv med skuldrene.</p>
<h3>Øvelse: stack og marsj</h3>
<p>Stå i flate sko med ribbein over bekken. Løft ett kne som starten på et steg uten at brystkassen løfter seg eller bekkenet tipper. Seks rolige repetisjoner per side.</p>`,
  },
  {
    id: 'syklus', group: 2, title: 'Ett steg i sakte film', cam: 'side', speed: 0.25, guides: ['skel', 'trail', 'angles'], metrics: ['phase'],
    vps: [
      { w: 'sterk', label: 'Sterk walk i ¼ fart', tag: 'sterk', note: 'Skjelett, bevegelsesspor og leddvinkler er slått på.' },
    ],
    lead: 'Én modell går i kvart fart med skjelettet synlig, så du kan se hver fase av steget. Teksten nederst i ruten sier hva hvert bein gjør akkurat nå.',
    look: [
      '<b>Fotisett:</b> i stiletthæl tar hælen og forfoten imot vekten nesten samtidig. Kneet er nesten strakt.',
      '<b>Kroppen over foten:</b> standbeinet er langt og rolig, og hoften kommer rett over foten. Hodet beveger seg knapt.',
      '<b>Hælen løftes:</b> foten ruller over tærne, skoen bøyer seg ved tåballen og kneet begynner å bøye.',
      '<b>Kneet går frem:</b> foten henger etter mens kneet bøyes mest, rundt 60 grader, og løfter foten fri av gulvet.',
      '<b>Strekker ut:</b> kneet retter seg ut igjen like før neste fotisett.',
      'Velg Fokus: Føtter eller Knær, og bruk Ett bilde frem for å stoppe i hver fase.',
    ],
    body: `
<h3>Steget i fem hendelser</h3>
<ol>
<li>Vekten samles over standbeinet. Du slipper vekten fra det gamle støttebeinet.</li>
<li>Det frie beinet slipper gulvet uten at hoften henger igjen. Kneet går frem uten å sparkes ut.</li>
<li>Beinet svinger frem med en bestemt, men ikke kastet, lengde.</li>
<li>Foten settes ned på en linje kroppen faktisk kan komme over.</li>
<li>Kroppen tar imot vekten uten etterkorrigering og fortsetter gjennom steget.</li>
</ol>
<h3>Det sakte film avslører</h3>
<ul>
<li>Se på bevegelsessporet rundt hodet og bekkenet. Jevne buer betyr at vekten flyttes uten nøling.</li>
<li>Se når hoften kommer over standfoten. I en sterk walk skjer vektflyttingen før det frie beinet slipper, ikke etter.</li>
<li>Se om skuldrene rykker i det foten lander. Gjør de det, var ikke steget under kontroll.</li>
</ul>
<p class="note">Kneets og hoftens bevegelse følger kjente gangmønstre for gange i hæl. De er ikke målt på en bestemt modell.</p>`,
  },
  {
    id: 'steget', group: 2, title: 'Fotisett og brems', cam: 'side', speed: 0.5, guides: ['com', 'feet', 'head'], metrics: ['reach', 'head'],
    vps: [
      { w: 'overstride', label: 'Foten langt foran', tag: 'svak', note: 'Beinet strekkes ut og kroppen dras etter. Hvert steg bremser.' },
      { w: 'sterk', label: 'Kroppen kommer over foten', tag: 'sterk', note: 'Kroppen sendes frem gjennom standbeinet.' },
    ],
    lead: 'Et runway-steg er ikke et langt steg. Det er et steg der kroppen rekker å komme over foten før neste fot må redde deg.',
    look: [
      'Den stiplede linjen på gulvet viser hvor langt foran bekkenet foten lander. Langt foran gir «BREMS».',
      'Hodebanen: bremsingen gir et hakk i det foten lander.',
      'Spill av i ¼× og finn de fem hendelsene under.',
    ],
    body: `
<h3>Steget i fem hendelser</h3>
<ol>
<li>Vekten samles over standbeinet. Du slipper vekten fra det gamle støttebeinet.</li>
<li>Det frie beinet slipper gulvet uten at hoften henger igjen. Kneet går frem uten å sparkes ut.</li>
<li>Beinet svinger frem med en bestemt, men ikke kastet, lengde.</li>
<li>Foten settes ned i en smal, repeterbar korridor, på en linje kroppen faktisk kan komme over.</li>
<li>Kroppen tar imot vekten uten etterkorrigering, passerer over foten uten sideveis rykk og skyver rolig fra igjen.</li>
</ol>
<p>Folk som ser ut til å «styre hvert steg» strekker ikke beinet langt ut og drar kroppen etter. De sender kroppen frem gjennom støttebeinet, lar det frie beinet passere, og lander med nok plass til å ta imot vekten uten synlig brems.</p>
<h3>Bevisst er ikke det samme som forsiktig</h3>
<p>Forsiktig gange er ofte langsom fordi du ikke stoler på landingen. Den stopper litt etter hvert fotisett. Bevisst gange kan også være langsom, men kroppen har allerede valgt tempo, landingspunkt og overføring, og den fortsetter.</p>
<h3>Fraværet av etterkorreksjon</h3>
<p>Rykker skuldrene etter foten, flakser hendene, faller blikket ned, eller må du ta et ekstra lite steg for å samle deg, var ikke det forrige steget under kontroll.</p>`,
  },
  {
    id: 'bredde', group: 2, title: 'Stegbredde: korridor, ikke line', cam: 'top', guides: ['floor', 'feet', 'lines'], metrics: ['width'],
    vps: [
      { w: 'tightrope', label: 'Tightrope', tag: 'svak', note: 'Føttene krysser midtlinjen. Hoften kastes ut.' },
      { w: 'korridor', label: 'Smal korridor', tag: 'sterk', note: 'Hvert steg i samme sone, uten kryssing.' },
      { w: 'bred', label: 'Hverdagsbredde', tag: 'noytral', note: 'Stabil, men leser som vanlig gange.' },
    ],
    lead: '«Gå på en linje» betyr ikke at begge føttene skal lande på samme tapestripe. Kroppen trenger en smal korridor, ikke en tightrope.',
    look: [
      'Ovenfra: ligger fotsporene i korridoren (blå linjer), eller krysser de midtlinjen?',
      'Mintlinjen gjennom hoftene: kryssing tvinger hoften ut på motsatt side.',
      'Bytt til Forfra: se skuldrene dra mot motsatt side for å holde balansen.',
      'Tallet nederst er hvor langt foten lander fra midtlinjen. «Kryss» betyr at den lander på motsatt side.',
    ],
    body: `
<ul>
<li>Når føttene krysser langt over midtlinjen, må hoften kastes ut på motsatt side for at du ikke skal velte. Resultatet er «catwalk cosplay»: mye hofte, dårlig stabilitet og bein som konkurrerer om samme plass.</li>
<li>Overkryssing gir ofte knær som faller inn og et kunstig vugg. Det ser sexy ut på en billig måte, fordi bevegelsen kommer av ustabilitet og ikke av et valg.</li>
<li>Må du trekke skuldrene mot motsatt side for å holde deg på linjen, er walken et balanseprosjekt, ikke elegant.</li>
<li>En visuell midtlinje kan være nyttig. Foten kan nærme seg senteret visuelt uten at kroppen mister plass til å lande.</li>
<li>En høyfashion-walk er gjerne smalere enn vanlig gange, men ikke en tightrope.</li>
</ul>
<p class="note">En studie av 69 runway-modeller fant fem distinkte gangmønstre, og at overdreven «tightrope»-kryssing er blitt mindre vanlig over tid. Moderne high fashion belønner ofte mindre overkryssing og mer variasjon mellom hus.</p>
<h3>Øvelse: korridor, ikke tightrope</h3>
<p>Teip to parallelle linjer på gulvet med en smal, men realistisk avstand. Gå uten at føttene jager samme linje. Film forfra. Må du overdrive skuldervridningen for å holde deg mellom stripene, er korridoren for smal eller kroppen for stiv. Gjør åtte passeringer i flate sko før du går videre til lave hæler eller sko du faktisk tåler.</p>`,
  },
  {
    id: 'lengde', group: 2, title: 'Steglengde og sko', cam: 'side', guides: ['feet', 'com'], metrics: ['step'],
    vps: [
      { w: 'kort', label: 'For kort steg', tag: 'svak', note: 'Innestengt. En lang kjole ser tung ut.' },
      { w: 'sterkFlat', label: 'Riktig, flate sko', tag: 'sterk', note: 'Foten kan lande med hælen først.' },
      { w: 'sterk', label: 'Riktig, hæl', tag: 'sterk', note: 'Kortere steg og mer arbeid i ankelen.' },
      { w: 'lang', label: 'For langt steg', tag: 'svak', note: 'Bremser og lener seg bakover for å nå foten.' },
    ],
    lead: 'Steglengde er ikke et estetisk tall. Den riktige lengden er den der bekkenet kan fortsette fremover uten at overkroppen må lene seg tilbake for å nå foten.',
    look: [
      'Fotsporene viser lengden. Den gule loddlinjen viser om bekkenet rekker frem.',
      'Sammenlign flate sko og hæl: hælen gir et kortere steg og et annet fotisett.',
      'Se overkroppen til «for langt steg»: den lener seg bakover for å nå foten.',
    ],
    body: `
<h3>Lengden tilpasses</h3>
<p>Høyde, hæl, plagg, scene, musikk og retning.</p>
<ul>
<li>For kort: en lang kjole ser tung ut, og modellen ser innestengt ut.</li>
<li>For langt: trekker i kjolen, gir bremsing, kan åpne skrittlinjen uønsket eller få dressbukser til å stramme.</li>
<li>Stegene trenger samme indre logikk, ikke samme lengde. Det kan være riktig at tre steg før fronten blir litt kortere for å redusere farten før vendingen. Det ser bare dårlig ut når forkortingen kommer for sent, og avslører at modellen «oppdager» at runwayen tar slutt.</li>
</ul>
<h3>Fotisettet avhenger av skoen</h3>
<ul>
<li>En spiss pump, en tykk plattform og en boot har ikke samme mekanikk.</li>
<li>Stabil støvel: foten kan lande nesten flatt. Smal stiletto: hælen kommer ofte først eller nesten samtidig med forfoten, avhengig av hælvinkel, plattform, underlag og tempo.</li>
<li>Det avgjørende er ikke om hæl eller forfot treffer først, men om foten tar imot vekten uten lydlig krasj, synlig knefall, ankelsøk eller ekstra justering.</li>
<li>Ikke tving en teatralsk hæl–tå-rulling hvis skoen gjør den ustabil. Målet er et stille, kontrollert mottak av vekt, ikke mest mulig lyd med hælen eller å stå på tærne som om gulvet er varmt.</li>
<li>Hæler endrer fotens rullefunksjon, arbeidet i ankel og kne, korsryggen, steglengden og balansen. «Gå likt i alle hæler» er ikke et høyt nivå, det er fysisk umulig. «Gå som barbeint, bare i hæler» er ikke god coaching.</li>
</ul>
<div class="callout"><p class="callout-k">Sikkerhet</p><p>Gir skoene smerte, ustabilitet eller en ankel som kollapser, er løsningen ikke mer attitude. Det er informasjon. Gå ned i hælhøyde, få kontroll på mekanikken i stabile sko og bygg derfra.</p></div>`,
  },
  {
    id: 'rytme', group: 3, title: 'Rytme og mikropause', cam: 'side', guides: ['timeline', 'head'], metrics: ['tempo', 'cad'],
    vps: [
      { w: 'tilfeldig', label: 'Tilfeldig tempo', tag: 'svak', note: 'Raskere når usikker, saktere nær kamera.' },
      { w: 'valgt', label: 'Valgt kadens', tag: 'noytral', note: 'Jevnt, men ren transport.' },
      { w: 'mikro', label: 'Kadens og mikropause', tag: 'sterk', note: 'Henger et øyeblikk i standbeinet.' },
    ],
    lead: 'Kadens er hvor ofte føttene treffer gulvet. Timing er hvordan tiden fordeles inne i hvert steg. Mange har grei kadens, men svak timing.',
    look: [
      'Tidslinjen nederst i hver rute: like lange felt betyr valgt kadens. Ujevne felt betyr at tempoet styrer deg.',
      'Mikropausen er ikke et stopp. Se kroppen henge et øyeblikk over standbeinet før neste overgang.',
      'Sammenlign de to til høyre: samme takt, ulik timing.',
    ],
    body: `
<p>Det som oppleves som hypnotisk, er lav variasjon i det ufrivillige og bevisst variasjon i det viktige. Kadensen trenger ikke være identisk, men den må virke valgt.</p>
<h3>Tre ting som må henge sammen</h3>
<ul>
<li>Tiden kroppen bruker på standbeinet.</li>
<li>Hvor raskt det frie beinet går gjennom.</li>
<li>Når overkroppen får lov til å «lande» visuelt.</li>
</ul>
<h3>Mikropausen</h3>
<p>Modellen trenger ikke stoppe. Hun skaper følelsen av pause ved å la kroppen være fullt over standbeinet litt lenger før neste overgang. På kamera ser det ut som et øyeblikk der silhuetten er komplett. Publikum leser beherskelse, ikke nøling. Er pausen for lang, ser du usikkerhet. Finnes den ikke, ser alt ut som ren transport.</p>
<h3>Runwayen i fem rytmiske soner</h3>
<div class="tbl"><table>
<tr><th>Sone</th><th>Oppgave</th></tr>
<tr><td>Entré</td><td>Etablere tempo og kroppens regelsett før publikum rekker å analysere deg.</td></tr>
<tr><td>Første tredjedel</td><td>La publikum lese silhuett og energi. Ikke legg inn et nytt uttrykk for tidlig.</td></tr>
<tr><td>Hovedpassasje</td><td>Stabil repetisjon: samme idé, flere steg.</td></tr>
<tr><td>Før vending</td><td>Redusere fremdrift uten å kollapse tempoet.</td></tr>
<tr><td>Retur</td><td>Bekrefte at walken var valgt, ikke tilfeldig.</td></tr>
</table></div>
<h3>Musikk</h3>
<p>Musikk er ikke en metronom du skal treffe med hælen. Treffer du hvert beat slavisk, blir du sent ute eller mekanisk. Du kan gå mot musikken, under den, litt bak den eller i bevisst kontrast. Det viktige er at relasjonen er stabil. Begynner du å jage pulsen halvveis ut, ser det ut som musikken har kontroll over deg.</p>`,
  },
  {
    id: 'tempo', group: 3, title: 'Tempo-stigen', cam: 'front', guides: ['head', 'timeline'], metrics: ['cad', 'head'],
    vps: [
      { w: 'tempoRolig', label: 'Rolig', tag: 'sterk', note: 'Sakte uten å dra føttene.' },
      { w: 'sterk', label: 'Middels', tag: 'sterk', note: 'Samme kropp.' },
      { w: 'tempoRask', label: 'Raskere', tag: 'sterk', note: 'Raskt uten å se jaget ut.' },
      { w: 'sakteUsikker', label: 'Sakte og usikker', tag: 'svak', note: 'Stopper litt etter hver landing.' },
    ],
    lead: 'Autoritet er ikke lav hastighet. Autoritet er fravær av hastverk i beslutningene.',
    look: [
      'De tre sterke har samme hode, armer og korridor i alle tempoer.',
      'Den usikre er langsom fordi hun ikke stoler på landingen. Pausen kommer rett etter fotisettet, ikke midt i steget.',
      'Sammenlign tidslinjene: rolig betyr lengre felt, ikke ujevne felt.',
    ],
    body: `
<div class="callout"><p class="callout-k">Misforståelse</p><p>«Sakte er dyrt.» Sakte kan være majestetisk, men det kan også se ut som du er redd for å falle. Dyrt er ikke lav hastighet. Dyrt er at kroppen fortsatt har fremdrift, og at vekten forlater hver fot på riktig tidspunkt.</p></div>
<ul>
<li>En rask walk kan være autoritær hvis landingene er rene, akselerasjonen er planlagt og vendingen ikke blir en nødbrems.</li>
<li>En langsom walk kan være svak hvis den bare er treg av usikkerhet.</li>
<li>En modell kan «storme» og fortsatt være kontrollert. Hun kan «gli» og fortsatt ha voldsom styrke.</li>
<li>Autoritet kommer av at innmarsj, midtparti, kameraøyeblikk, vending og retur har samme rytmiske logikk.</li>
</ul>
<h3>Øvelse: tre tempoer, samme kropp</h3>
<p>Gå samme strekning roligere enn naturlig, naturlig og litt raskere. Ikke prøv å se forskjellig ut. Behold hodebane, hender, skuldre, korridor og vending. Forsvinner kontrollen når tempoet endres, eier du ikke walken ennå. Du har en favorittfart.</p>`,
  },
  {
    id: 'armer', group: 4, title: 'Armer og hender', cam: 'front', guides: ['hands'], metrics: ['arm'],
    vps: [
      { w: 'armLaast', label: 'Låst og presset', tag: 'svak', note: 'Skuldre løftet, albuer låst, hender mot lårene.' },
      { w: 'armUro', label: 'Urolige', tag: 'svak', note: 'Krysser foran kroppen, håndledd flipper, albue ut.' },
      { w: 'armKontroll', label: 'Kontrollert «deadness»', tag: 'sterk', note: 'Lav amplitude, levende ledd.' },
    ],
    lead: 'Kontrollerte armer er ikke helt stille armer. De er armer uten egen agenda.',
    look: [
      'Oransje håndbaner: liten, jevn pendel er målet.',
      'For stiv: hånden endrer ikke plass i forhold til låret i det hele tatt.',
      'For løs: hånden kommer frem foran kroppens midtlinje, eller albuen svinger ut for å hjelpe balansen.',
    ],
    body: `
<h3>«Deadness» mot stivhet</h3>
<ul>
<li><b>Kontrollert deadness:</b> lav amplitude med levende ledd. Skulderen er fri, albuen myk, underarmen følger rytmen svakt, hånden hviler i en naturlig form. Klærne får dominere.</li>
<li><b>Stivhet:</b> skuldre løftet, albuer låst, håndledd knekt eller hender presset flatt mot lårene. Avslører at modellen prøver å holde kroppen sammen.</li>
</ul>
<h3>Hvorfor armene blir urolige</h3>
<p>Skuldrene er låst, kroppen mangler balanse, eller modellen prøver å «gjøre noe» med hendene. Ingen av delene løses ved å presse armene inn langs kroppen.</p>
<h3>Detaljene</h3>
<ul>
<li>Albuen litt fra ribbeina: ikke presset inn, ikke holdt ut som en usynlig vinge.</li>
<li>Håndleddet nøytralt nok til at hånden ikke ser posert ut.</li>
<li>Fingrene trenger ikke strekkes. Overstrakte fingre ser ut som modellskole. Fingrene skal ikke prøve å være vakre.</li>
<li>En god hånd prøver ikke å bli sett, men ser ferdig ut når kameraet tilfeldigvis fryser den.</li>
</ul>
<h3>Vanlige avsløringer</h3>
<ul>
<li>Én hånd slår lenger frem enn den andre.</li>
<li>Håndleddene «flipper» ved hvert steg.</li>
<li>Albuene presses hardt inn i livet.</li>
<li>Hendene flyr foran kroppen og bryter plaggets silhuett.</li>
<li>Skuldrene løfter seg ved landing, som om kroppen støtdemper fra toppen i stedet for fra beina.</li>
</ul>
<h3>Asymmetri</h3>
<p>En veske, en hånd i lomma, en hanske, en asymmetrisk kåpe eller en kjole med slit kan gi den ene armen en annen oppgave. Da er asymmetrien funksjonell. Gjør den ene armen alltid en «cool girl»-gest bare for å virke mindre stiv, eller er den ene siden svakere, er det et symptom.</p>`,
  },
  {
    id: 'blikk', group: 4, title: 'Blikk og ansikt', cam: 'threeq', guides: ['gaze'], metrics: ['gaze'],
    vps: [
      { w: 'blikkNed', label: 'Søker gulvet og rommet', tag: 'svak', note: 'Skanner, ser ned, hodet jakter.' },
      { w: 'sterk', label: 'Valgt fokuspunkt', tag: 'sterk', note: 'Fast, mykt fokus i retningen kroppen går.' },
    ],
    lead: '«Vær selvsikker» er et resultat, ikke en instruksjon. På film ser sikkerhet ut som et stabilt fokuspunkt, ingen skanning, ingen panikkblikk mot gulvet, en kjeve som ikke biter og et ansikt som ikke ber om godkjenning.',
    look: [
      'Den blå blikklinjen: står endepunktet stille, eller vandrer det?',
      'Ser hun ned mot føttene i perioder?',
      'Dukkene har ikke ansikt. Hodestilling og blikkretning er det du kan lese her.',
    ],
    body: `
<ul>
<li>Blikket ligger på en konkret, myk sone et stykke fremme i rommet, omtrent der kroppen går. Ikke på en tilfeldig person, ikke på telefonkameraer, ikke på egne føtter.</li>
<li>«Se gjennom veggen» kan også se dårlig ut. Øynene skal være aktive nok til å orientere seg, men ikke så aktive at de søker godkjenning.</li>
<li>Øynene kan møte kameraet hvis showet trenger det, men et godt blikk jakter ikke linsen. Det har allerede et mål.</li>
<li>Blikket trenger ikke være hardt. Et hardt blikk er bare én temperatur.</li>
</ul>
<h3>Ansiktet</h3>
<p>Ansiktet støtter kroppens idé, men erstatter den ikke. En sammenpresset kjeve kan se konsentrert, sint eller anstrengt ut. En helt død munn kan se kjølig, men også frakoblet ut. Et lite, kontrollert slipp i underkjeven gjør ofte mer for roen enn en teatralsk pout. Forskning på bevegelse viser at folk leser følelser i gange gjennom tempo, holdning og små leddmønstre, også uten ansikt.</p>
<div class="tbl"><table>
<tr><th>Inntrykk</th><th>Det du ser</th><th>Det som gjør det påtatt</th></tr>
<tr><td>Farlig</td><td>Stabilt fremoverfokus, lite korrigering, lite unødig ansiktsaktivitet, tempo som ikke haster, lite sosial varme.</td><td>Hard panne, klemt munn og truende stirring uten kroppslig ro.</td></tr>
<tr><td>Rolig</td><td>Jevn pust, myk kjeve, stabil hodebane, lik timing fra steg til steg.</td><td>Tomt ansikt kombinert med kollaps i brystkassen.</td></tr>
<tr><td>Utilnærmelig</td><td>Ingen sosial respons til publikum, men full tilstedeværelse i rommet.</td><td>Å late som man ikke ser hvor man går.</td></tr>
<tr><td>Leken</td><td>Ett eller to presise rytmiske avvik, større elastisitet, men fortsatt ren rute.</td><td>Nye ansikter, hofter og håndbevegelser i hvert steg. Et teatralsk bryn.</td></tr>
<tr><td>Sensuell</td><td>Kontinuerlig vektflyt, fri bekkenmekanikk, rolig overkropp, roligere frigjøring av steget, ingen unnskyldende småbevegelser.</td><td>Isolert rumpesving, brystfremstøt, trutmunn og å «performe mot» publikum.</td></tr>
</table></div>
<p>Det sexy eller farlige ligger sjelden i en ansiktsmaske. Det ligger i hvor lite modellen trenger å forklare seg selv med kroppen.</p>
<div class="callout"><p class="callout-k">Misforståelse</p><p>«Et tomt ansikt er mystikk.» Mystikk er et ansikt som ikke gir bort mer enn kroppen trenger. Tomhet er et ansikt uten kontakt med oppgaven. Uforankret blikk, låst kjeve og treg kropp blir ikke utilnærmelig. Det blir frakoblet.</p></div>`,
  },
  {
    id: 'stamp', group: 4, title: 'Hard walk uten å stampe', cam: 'front', guides: ['head', 'hands'], metrics: ['head', 'arm'],
    vps: [
      { w: 'stamp', label: 'Stamp: energien lekker', tag: 'svak', note: 'Sjokkbølge opp gjennom skuldre, hode og hender.' },
      { w: 'perkusiv', label: 'Perkusiv med bunn', tag: 'sterk', note: 'Klart fotisett, stille topp.' },
    ],
    lead: 'En virkelig hard walk har et klart fotisett, men hodet, skuldrene og hendene eksploderer ikke ved kontakt.',
    look: [
      'Begge har et tydelig fotisett. Se hva som skjer over hoftene i det foten treffer.',
      'Hodebanen: sjokkbølgen gir et hakk opp i hodet ved hvert steg.',
      'Håndbanene: lekker energien ut i hendene?',
    ],
    body: `
<p>Hvis hvert hælslag gir en synlig sjokkbølge opp i kroppen, er det ikke power. Det er energi som lekker.</p>
<ul>
<li>En god hard walk kommer av klar fremdrift, ikke av at skoen smeller i gulvet.</li>
<li>Energien skal ha retning og bunn, i stedet for å spre seg ut i hender, ansikt og tilfeldige bevegelser.</li>
<li>«Stomp» betyr ikke å slå hælen hardt i gulvet. Det er ofte dårlig teknikk, særlig i smale hæler.</li>
<li>Det trenbare er å få et steg til å lese som bestemt uten at foten krasjer, kneet låser eller overkroppen mister kontroll.</li>
<li>Den samme feilen finnes i «sexy betyr mer hofte»: når du isolerer effekten fra mekanikken, ser det ut som en TikTok-versjon av runway.</li>
</ul>`,
  },
  {
    id: 'vending', group: 5, title: 'Vending, stopp og retur', cam: 'turn', mode: 'runway', segment: true, camTrack: true, lockMode: true,
    speed: 0.7, guides: ['feet'], numberTurn: true, metrics: ['turnsteps'],
    vps: [
      { w: 'vendSvak', label: 'Panikkbrems og ekstra steg', tag: 'svak', note: 'Bremser for sent, ser ned, armene som propell.' },
      { w: 'vendPivot', label: 'Kompakt pivot', tag: 'sterk', note: 'Først bære, så rotere, så gå.' },
      { w: 'vendBue', label: 'Bue på tre steg', tag: 'sterk', note: 'Mykere vending for kjole eller plattform.' },
    ],
    lead: 'En dårlig vending avslører alt, fordi det er øyeblikket der ren gange ikke lenger kan skjule manglende balanse.',
    look: [
      'Tallene på fotsporene viser hvor mange steg vendingen tar.',
      'De to stegene før enden: bremser hun i panikk, eller er farten redusert i tide?',
      'Første steg ut igjen: samme besluttsomhet som første steg inn?',
    ],
    body: `
<h3>Den universelle regelen</h3>
<p class="formula">Først bære. Så rotere. Så gå.</p>
<p>Ikke roter kroppen mens vekten fortsatt henger mellom to føtter. Hvilken fot som blir pivot, hvor lenge du stopper og om hodet vender først eller sist, er koreografi og house code.</p>
<h3>En sterk 180-graders vending</h3>
<ol>
<li>To til tre steg før enden vet kroppen hvilken vending den skal gjøre. Du beholder rytmen og bremser ikke i panikk. Du bremser ved å gjøre fremdriften litt mindre, ikke ved å lene deg tilbake.</li>
<li>Den siste bærende foten settes slik at vekten kan komme fullt over den. Kneet er mykt, ikke låst.</li>
<li>Blikket bestemmer ny retning et øyeblikk før resten av kroppen, men hodet får ikke piske rundt eller løpe langt foran torsoen.</li>
<li>Brystkasse og bekken roterer uten å virke i konflikt. Den frie foten tegner en kontrollert bue og finner ny linje.</li>
<li>Første retursteg har samme intensjon som de første stegene ut. Du starter ikke walken på nytt.</li>
</ol>
<h3>Tre vendingsfamilier</h3>
<div class="tbl"><table>
<tr><th>Type</th><th>Passer når</th><th>Risiko</th></tr>
<tr><td>Kompakt 180-graders pivot</td><td>Smal runway, enkel sko, minimalistisk uttrykk.</td><td>Stopp, knelås, overrotasjon eller et ekstra redningssteg.</td></tr>
<tr><td>To- eller trestegs bue</td><td>Høy plattform, lang kjole, bred scene eller mykere uttrykk.</td><td>Buen blir en vag sirkel og bryter frontens rytme.</td></tr>
<tr><td>Posisjonert stopp og vending</td><td>Showet ønsker et fotoøyeblikk eller karakter.</td><td>Posen føles som et tillegg i stedet for en del av gangen.</td></tr>
</table></div>
<h3>Feilene som avslører</h3>
<ul>
<li>Lander foten for langt fremme, må du trekke kroppen bakover.</li>
<li>Er kneet helt låst, må du hoppe eller dra det rundt.</li>
<li>Spinner overkroppen før vekten er plassert, ser det ut som skuldrene har forlatt beina.</li>
<li>Tre små steg, blikk ned, armer som balansepropell, eller rytmen må finnes igjen etterpå. Da blir hele walken retroaktivt mindre overbevisende.</li>
</ul>
<h3>Returen er testen</h3>
<p>Mange klarer fronten og går tilbake som om showet allerede er over. Første returfot må ha samme besluttsomhet som første steg ut: ikke nødvendigvis samme uttrykk, men samme kroppslige organisering. Se hvordan dukken til venstre synker sammen etter vendingen.</p>
<h3>Øvelse: vendingstrappen</h3>
<p>Øv 90° før 180° på et tydelig markert punkt. Begynn med en trestegs bue i flate sko. Når den er ren: kompakt 180-graders vending. Deretter samme vending i skoene du skal gå i, men bare hvis du klarer den uten smerte, glidning, ekstra steg, blikk mot gulvet eller armkorrigering. Film de to stegene før og de to etter. Der ser du om vendingen var planlagt.</p>`,
  },
  {
    id: 'registre', group: 6, title: 'To registre: glidende og perkusivt', cam: 'front', guides: ['head', 'lines'], metrics: ['cad', 'head'],
    vps: [
      { w: 'glidende', label: 'Glidende register', tag: 'sterk', note: 'Tidskontroll. Hofter og skuldre svarer hverandre.' },
      { w: 'perkusiv', label: 'Perkusivt register', tag: 'sterk', note: 'Energi med retning og bunn.' },
      { w: 'kopiGlid', label: 'Dårlig kopi: hoftesving', tag: 'svak', note: 'Langsom vugging uten mekanikk.' },
      { w: 'kopiPerk', label: 'Dårlig kopi: hælslag', tag: 'svak', note: 'Hardt stamp som rister kroppen.' },
    ],
    lead: 'Den interessante forskjellen mellom to sterke walks er ikke «rolig mot hard», men hvor energien plasseres.',
    look: [
      'Øverst: to ulike, men kontrollerte registre. Nederst: overflaten kopiert uten mekanikken.',
      'Mintlinjene: hos det glidende registeret svarer skuldre og hofter hverandre, uten at hodet svaier.',
      'Hodebanen avslører hælslag-kopien. Mintlinjene og den bakoverlente overkroppen avslører hoftesving-kopien.',
    ],
    body: `
<div class="callout"><p class="callout-k">Bevisnivå</p><p>Teksten bruker Anok Yai og Alex Consani som eksempler på disse to registrene. Den er tydelig på at walkene deres ikke kan måles uten ukuttede klipp av hele kroppen, fra samme vinkel, over flere show. Dukkene er derfor ikke dem. De viser prinsippene teksten beskriver.</p></div>
<h3>Det kildene faktisk støtter</h3>
<ul>
<li>I et Allure-intervju beskrives Alex som en som «storms», med et galopperende preg. Hun kaller seg selv en «stomper».</li>
<li>Anok beskriver sin egen walk som langsom, med hofter og skuldre i bevegelse.</li>
<li>Begge sier at det er «different vibes», og at de fortsatt «sell it».</li>
<li>Det beviser at de oppfatter walkene som ulike. Det beviser ikke fotisett, stegbredde, hoftesving, knestrategi eller rytmisk signatur.</li>
</ul>
<h3>Hypoteser å sjekke i video</h3>
<div class="tbl"><table>
<tr><th></th><th>Se etter</th><th>Kan ikke hevdes</th></tr>
<tr><td>Glidende (Anok)</td><td>Lengre tid over standbeinet, tydelig samspill mellom bekken og brystkasse, og om hodet fortsatt er stabilt.</td><td>At hun alltid går sakte, alltid bruker mye hofte, eller at dette alene forklarer statusen hennes.</td></tr>
<tr><td>Perkusivt (Alex)</td><td>Om energien kommer av kraftig fremdrift, rytmisk aksent, større stegimpuls, eller bare av produksjonens styling.</td><td>At hun bokstavelig stamper hardt, at fotisettet er teknisk ideelt, eller at dette er hennes universelle walk.</td></tr>
</table></div>
<h3>Hva du kan lære</h3>
<ul>
<li>Av det glidende: ikke «gå sakte og vugg», men la autoriteten komme av tidskontroll og kontinuitet. Lær å slippe bekken og brystkasse i riktig rekkefølge uten å miste sentrum. Mer tid i hvert steg gir rom for silhuett, stoff og sekundær bevegelse i overkroppen.</li>
<li>Av det perkusive: ikke «stamp hardt», men la energien ha retning og bunn i stedet for å spre seg ut i hender, ansikt og tilfeldige bevegelser. Driv fra standbeinet, rytmisk presisjon, kontrollert slagkraft og rask retur til stillhet.</li>
<li>Felles: viljen til å committe. Teksten oversetter «pump» slik: du går ikke halvveis, vekten lander med beslutning, rytmen løper ikke fra deg, og kroppen prøver ikke å unnskylde sin egen størrelse i rommet.</li>
</ul>
<h3>Risiko ved dårlig kopi</h3>
<ul>
<li>Glidende kopiert som ekstra sakte hoftesving blir fort stivt eller overseksualisert.</li>
<li>Perkusivt kopiert som harde hælslag og store bevegelser blir fort aggressivt, klumpete eller kostymeaktig.</li>
<li>Ikke kopier ordene «slow», «stomp», «hips» eller «gallop». De beskriver effekt, ikke øvelser.</li>
<li>Når du kopierer overflaten av en annen kvinnes walk, viser du at du fortsatt trenger hennes kropp og historie for å virke interessant.</li>
</ul>
<h3>Trenbart og ikke trenbart</h3>
<p><b>Trenbart:</b> rytmisk stabilitet, vektflyt, bevegelsesøkonomi, vending, kamerabevissthet og evnen til å holde et fast fokus uten å stivne.</p>
<p><b>Ikke trenbart på samme måte:</b> proporsjoner, erfaring fra høyprofilerte show, kroppens bevegelseshistorie, castingstatus, kulturell betydning og publikums forventning før de entrer runwayen.</p>
<h3>Styling er ikke walk</h3>
<p>Anoks Versace S/S 2025-øyeblikk (look 28) er et eksempel. Kjolen var bygget av mange metalliske, olivengrønne elementer og laget som et visuelt midtpunkt. Mye av det folk opplever som ikonisk der, kommer av kombinasjonen av presence, lysrefleks, hår, sko, musikk og showets rekkefølge. Det er ikke en nedvurdering av walken. En virkelig god modell lar ofte et slikt plagg være sentrum i stedet for å konkurrere med det.</p>
<p>Alex' perkusive register er også beskrevet utenfor fan-klipp. The New Yorker skrev om hennes «equine stomp» hos Luar, og Vogue Hong Kong knyttet Mugler A/W 2024-walken hennes til tydelig vekt på hvert steg. Det betyr ikke at walken er hardere i alle show, bare at bevegelsesspråket hennes kan bære en retning som vil ha aktiv energi.</p>`,
  },
  {
    id: 'kontekst', group: 6, title: 'Samme kropp, fem walks', cam: 'front', guides: [], metrics: ['cad', 'arm'], context: true,
    vps: [
      { w: 'sterk', label: 'Grunnwalk', tag: 'noytral', note: 'Utgangspunktet.' },
      { w: 'ctxCouture', label: 'Couture / editorial', tag: 'sterk', note: 'Velg kontekst under.' },
    ],
    lead: 'Verdensklasse betyr ikke å gå med samme autoritet overalt. Det betyr å kunne få autoriteten til å endre form.',
    look: [
      'Bytt kontekst og se hva som skrus opp og ned: tempo, armer, hofte, timing.',
      'Teknikken under er den samme. Det er parameterne som skifter.',
    ],
    body: `
<h3>Signatur eller gimmick</h3>
<ul>
<li>En signatur er et stabilt forhold mellom tempo, vekt, overkropp og blikk. For eksempel litt lang tid over standbeinet, en spesielt rolig overkropp over en elastisk underkropp, eller et lavmælt, men fast blikk.</li>
<li>Dette må skifte mellom show: steglengde, amplitude, armplass, tempo, ansiktsgrad, vendingstype og forholdet til publikum.</li>
<li>Regelen: behold én til to identitetsmarkører, og juster resten.</li>
<li>Fungerer walken bare med samme ansikt, samme hofte og samme «stomp», har du en vane eller et gimmick, ikke en signatur.</li>
<li>En signatur er ofte merkbar først når den er borte. Må hele walken synes fra bakerste rad for å føles som «deg», er den sannsynligvis for stor. Signaturen skal tåle å dempes.</li>
<li>Gimmicker kameraet elsker én gang: knekk i håndleddet, en spesifikk grimase, overdrevet skulderfall, et fast sideblikk. En signatur er fortsatt lesbar etter fem ulike show, i en enkel dress, en tung kjole og en avant-garde-silhuett.</li>
</ul>
<p class="note">Den klassiske 1990-talls supermodel-walken er ikke standarden for alle motehus i 2026. En Mugler- eller Dsquared2-walk kan tåle større amplitude enn en Lemaire- eller The Row-walk. En walk som er perfekt for Mugler, Versace eller Dsquared2 kan være for stor, for seksualisert eller for energisk for et annet hus.</p>`,
  },
  {
    id: 'kamera', group: 7, title: 'Kameraet er medforfatter', cam: 'eye', guides: [], metrics: [], camLocked: true,
    vps: [
      { w: 'middels', cam: 'eye', label: 'Øyehøyde, normal linse', tag: 'noytral', note: 'Referansen.' },
      { w: 'middels', cam: 'low', label: 'Lavt kamera, vidvinkel', tag: 'noytral', note: 'Lengre bein, mer kraft.' },
      { w: 'middels', cam: 'tele', label: 'Tele, langt unna', tag: 'noytral', note: 'Flater ut dybde og korreksjoner.' },
      { w: 'middels', cam: 'eye', speed: 0.4, label: 'Sakte film 0,4×', tag: 'noytral', note: 'Gir landingen falsk tyngde.' },
    ],
    lead: 'Kameraet kan fabrikkere eller skjule kvalitet. Her går samme dukke, med samme middels walk, i alle fire rutene.',
    look: [
      'Lavt kamera og vidvinkel gir lengre bein og mer kraft.',
      'Tele flater ut dybden og skjuler små sideveis korrigeringer.',
      'Sakte film kan gi en ustabil landing en falsk følelse av tyngde.',
      'Ingen av dem endrer selve walken.',
    ],
    body: `
<h3>Hva produksjonen gjør</h3>
<ul>
<li>Lavt kamera: lengre bein og større følelse av kraft.</li>
<li>Telelinse: flater ut dybden og gjør små sideveis korrigeringer mindre synlige.</li>
<li>Klipping: kan fjerne et dobbeltsteg før vendingen.</li>
<li>Slow motion: kan gi en ustabil landing en falsk følelse av tyngde.</li>
<li>Styling: vindmaskin, tungt hår, en glitrende kjole eller en ekstrem sko gir bevegelsen «materiale» før modellen har gjort noe ekstraordinært.</li>
<li>Musikk, lys, lav vinkel, ekstrem styling og klipping kan få en middelmådig walk til å se monumental ut. Det er ikke juks, det er showdesign. Men det er ikke bevis for at gangen var overlegen.</li>
</ul>
<h3>Fire kilder til inntrykket</h3>
<div class="tbl"><table>
<tr><th>Kilde</th><th>Hva den kan gjøre</th></tr>
<tr><td>Teknikk</td><td>Gir stabil rute, timing, landing, vending og kroppslig lesbarhet.</td></tr>
<tr><td>Styling</td><td>Kan forlenge, skjule, definere eller seksualisere kroppen visuelt.</td></tr>
<tr><td>Kamera og klipp</td><td>Kan gjøre steget større, jevnere, tyngre, mer dramatisk eller mindre korrigert enn det var live.</td></tr>
<tr><td>Casting</td><td>Gir modellen en fortelling publikum allerede er klar til å se.</td></tr>
</table></div>
<h3>Alternative forklaringer</h3>
<ul>
<li>En arm ser kontrollert ut: fri skuldermekanikk, men også lavt tempo, en tung jakke, smale ermer eller mørk lyssetting.</li>
<li>En hofte ser «dyr» ut: god lastoverføring, men også høy hæl, proporsjoner, kjolens snitt eller en linse nedenfra.</li>
<li>Noen ser farlig ut: blikket, men også lys, musikk, make-up, casting eller at publikum allerede forventer den fortellingen.</li>
</ul>
<h3>Det modellen selv kan styre</h3>
<ul>
<li>Holde hovedsilhuetten lesbar i frontale øyeblikk.</li>
<li>Unngå at hånden dekker plaggdetaljen akkurat når hun passerer kameraet.</li>
<li>La ansiktet være rolig gjennom et fotisett, så fotografen får et stillbilde med både kropp og klær i orden.</li>
<li>Gi linsen en ren profil et halvt sekund før hun går videre.</li>
<li>Gå gjennom kameraet uten å kollapse ansiktet eller endre tempo i det sekundet hun vet at hun filmes.</li>
</ul>
<p>Hun kan ikke styre objektiv, klipping eller hvilken frame som publiseres. Ser en walk bare god ut i ett bestemt TikTok-klipp, er det ikke bevist at den er god live.</p>
<h3>Gode stillbilder</h3>
<p>De oppstår ikke nødvendigvis i en positur, men når gangen passerer gjennom en ren form: kroppen er over standbeinet, ansiktet er rolig, plaggets silhuett er synlig, og det frie beinet lager en klar diagonal uten å dekke antrekket.</p>
<h3>Plagget</h3>
<p>En modell får ikke plagget til å leve ved å vifte med det. Hun gir det en tydelig impuls og lar materialets egen fysikk fullføre bildet.</p>
<div class="tbl"><table>
<tr><th>Plagg</th><th>Prioriter</th><th>Vanlig feil</th></tr>
<tr><td>Flytende kjole, chiffon, frynser</td><td>Jevn fremdrift og akselerasjon, nok fart til at stoffet får etterslep, få brå stopp, ren vending.</td><td>Øke steget for å «lage drama» og tråkke i eller slå klærne ut av rytme.</td></tr>
<tr><td>Dress, skreddersøm</td><td>Vertikal ro og rolig overkropp så skulderlinje, slag og struktur leses tydelig. Kontrollert armplassering.</td><td>Overdrive hoftene så skulder- og jakkelinjen mister autoritet.</td></tr>
<tr><td>Undertøy, bodycon</td><td>Stabil bekken, mage og brystkasse, ikke se ned, ingen overdreven presentasjon av kroppen.</td><td>Forveksle seksualitet med isolert rumpesving eller brystfremstøt.</td></tr>
<tr><td>Avant-garde, arkitektonisk</td><td>Tydelig bevegelsesregel og romforståelse. La klærne være det rareste objektet i rommet.</td><td>Bli så opptatt av å se rar ut at tyngdepunkt, plagg og vending kolliderer.</td></tr>
</table></div>`,
  },
  {
    id: 'sandkasse', group: 8, title: 'Bygg en walk', cam: 'front', guides: ['head', 'feet'], metrics: ['head', 'tempo', 'width'], sandbox: true,
    vps: [
      { w: 'sterk', sandbox: true, label: 'Din walk', tag: 'noytral', note: 'Styres med glidebryterne.' },
      { w: 'sterk', label: 'Referanse: sterk', tag: 'sterk', note: 'Uendret.' },
    ],
    lead: 'Skru på én ting om gangen og se hva som skjer med resten av kroppen. Høyre rute er en sterk referanse med de samme hjelpelinjene.',
    look: [
      'Dra «Vektflytting» mot sen og se skuldrene begynne å redde balansen.',
      'Gjør stegbredden negativ og se hoften kastes ut.',
      'Skru «Fot foran kroppen» opp og se hodebanen få hakk.',
    ],
    body: '',
  },
  {
    id: 'selvtest', group: 8, title: 'Selvtest med telefonen', cam: 'front', guides: ['floor'], metrics: [], camLocked: true, selftest: true,
    vps: [
      { w: 'sterk', cam: 'front', label: 'Forfra', tag: 'sterk', note: 'Fotrute, kneakse, hodebane, armavstand.' },
      { w: 'sterk', cam: 'side', label: 'Fra siden', tag: 'sterk', note: 'Landing i forhold til kroppen, brystkasse over bekken.' },
      { w: 'sterk', cam: 'back', label: 'Bakfra', tag: 'sterk', note: 'Bekkenets flyt, ankelretning, armpendel.' },
    ],
    lead: 'Film ikke én «beste take». Film sammenlignbare passasjer og se etter det som gjentar seg. Rutene viser de tre vinklene du skal filme fra.',
    look: [
      'Forfra: hode stabilt, skuldre i samme høyde, føtter i en smal korridor, knær over føttene, rolige armer.',
      'Fra siden: kroppen passerer over standfoten uten å henge bak. Fremdrift uten overdreven rekkevidde.',
      'Bakfra: bekkenet skifter kontrollert fra side til side, anklene holder linjen, armene har jevn og lav amplitude.',
    ],
    body: `
<h3>Slik filmer du</h3>
<ul>
<li>Bruk 1×-kameraet, ikke 0,5× vidvinkel helt nær kroppen. Ingen filtre, slow motion eller musikk første gang du vurderer teknikk.</li>
<li>Stabil telefon, omtrent i bekkenhøyde, i samme høyde hver gang, og langt nok unna til at hele kroppen synes gjennom åtte til tolv steg.</li>
<li>Film minst åtte steg ut, vendingen og åtte steg tilbake. Forfra, fra siden og bakfra.</li>
<li>Samme sko, samme underlag og samme klær hver gang du sammenligner deg selv.</li>
<li>Tre forsøk i flate sko, deretter i hælene du faktisk skal gå i. Ikke velg det beste forsøket. Se etter det som gjentar seg.</li>
<li>Se først i normal fart, så uten lyd, så i 0,25×. Uten musikk mister du den falske følelsen av at rytmen er bedre enn den er.</li>
</ul>
<h3>Det som avslører manglende kontroll</h3>
<div class="tbl"><table>
<tr><th>Vinkel</th><th>Tegn</th></tr>
<tr><td>Forfra</td><td>Hodet vipper eller flytter seg sideveis, én skulder løfter seg, knær faller inn, føttene krysser mer enn kroppen tåler, hender slår foran kroppen eller begynner å «snakke».</td></tr>
<tr><td>Fra siden</td><td>Foten lander langt foran kroppen og lager en brems, ryggen lener seg tilbake ved landing, korsryggen overdrives, hodet skyves frem, brystet kollapser eller stikker ut, eller du «faller» over skoen.</td></tr>
<tr><td>Bakfra</td><td>Ett hoftefall er større, ankelen ruller inn eller ut, en skulder heves for å hjelpe balansen, armene svinger ulikt, skulderlinjen vrir seg tilfeldig.</td></tr>
<tr><td>Vending</td><td>Flere små steg, blikk ned, armene brukes som balansepropell, eller første steg etter vendingen ser svakt ut.</td></tr>
</table></div>
<h3>Gi deg selv poeng</h3>
<div id="scoreBox"></div>
<h3>Når noe ser «off»</h3>
<ul>
<li>Ser det feil ut i normal fart, men du finner ikke problemet i sakte film: se etter rytmen.</li>
<li>Ser det dårlig ut i sakte film, men greit i normal fart: se etter kamera- og timingeffekter før du får panikk over små anatomiske detaljer.</li>
</ul>
<h3>Øvelsene samlet</h3>
<ol>
<li><b>Vektflyt uten show.</b> Vekten over ett bein uten å vippe skulder eller skyve hofte, løft den andre foten én centimeter. 2 × 8 per side.</li>
<li><b>Stack og marsj.</b> Ribbein over bekken, løft ett kne uten at brystkassen løfter seg eller bekkenet tipper. 6 per side.</li>
<li><b>Ettbeins belastning.</b> 10 sekunder på ett bein, flytt vekten rolig frem og ta ett kontrollert steg.</li>
<li><b>Korridor, ikke tightrope.</b> To parallelle teipstriper, åtte passeringer i flate sko, film forfra.</li>
<li><b>Tre tempoer, samme kropp.</b> Rolig, naturlig og raskere, med samme hode, hender, skuldre, korridor og vending.</li>
<li><b>Still hode, fri thorax.</b> Åtte steg filmet fra siden. Jevn hodebane uten stiv torso.</li>
<li><b>Vendingstrappen.</b> 90° før 180°, trestegs bue før kompakt pivot, flate sko før hæl. Film to steg før og to etter.</li>
</ol>
<div class="callout"><p class="callout-k">Hæler</p><p>Høye hæler er ikke en viljestyrketest. Smerte, tydelig ustabilitet eller en gange du endrer for å beskytte en fot er informasjon, ikke mangel på attitude. Tren mekanikken i stabile sko først.</p></div>
<h3>Konklusjonen</h3>
<p>Du bør ikke prøve å bli noen andre. Det du kan lære av de beste, er å eie tid, flytte vekt før foten ber om det, la overkroppen være fri uten å bli løs, og gjøre vendingen til en del av setningen i stedet for punktumet etterpå.</p>
<p>Å se ut som en modell betyr at du kan produsere et flatterende bilde i ett øyeblikk. Å få en runway til å føles som din betyr at du kan holde en klar fysisk idé gjennom åtte til tolv sekunder, en vending og flere kameraer, uten at kroppen begynner å forhandle med deg. En regel som bare du kan gjenta, dempe, forsterke og fortsatt eie.</p>`,
  },
];
