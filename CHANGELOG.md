# Changelog — Șah fără frontiere

Format: [SemVer](https://semver.org/lang/ro/) MAJOR.MINOR.PATCH. Istoricul detaliat al versiunilor 14.x se află în secțiunea „Istoric / Changelog” din `README.ro.md`.

## 15.2.1 — 2026-10-31

Doar interfață (accesibilitate pe telefon, 360×740): etichetele de filtru 10 → 12 px. Fără alte schimbări de comportament.

## 15.2.0 — 2026-10-27 (anterior: v15.1.0)

### Adăugat
- **Nivelul 4 „expert”** în „Contra motorului”: același motor negamax, cu adâncime 7 și plafon de 1.500.000 de noduri pe mutare. Textele „expert” sunt în cele 8 limbi (fr/it/es/pt/hu/de: traduceri automate, neverificate nativ).
- **Simulare** (`tests/level4-sim.mjs`): nivelul 4 contra nivelului 3, 51 de partide, culori alternate, deschidere aleatoare de 6 jumătăți de mutare per pereche, adjudecare la 140 de jumătăți de mutare (4 partide adjudecate). Rezultat: 28 victorii, 18 remize, 5 înfrângeri, scor 0,726, interval Wilson 95% [0,59; 0,83] (diferență Elo estimată 169, [64; 274]). Nivelul 4 bate semnificativ nivelul 3.
- Teste noi: `tests/level4.test.mjs` (nivelurile 0–3 neschimbate, nivelul 4 determinist și legal, plafonul de noduri, mat în 1 și în 2); `tests/vs-filters.test.mjs` așteaptă acum 5 niveluri.

### Neschimbat
- Nivelurile 0–3 și turneul Elo (care folosește 1–3).

### Neimplementat
- Modul multiplayer unificat între jocuri rămâne planificat.
- Simularea măsoară doar nivelul 4 contra nivelului 3 pe o singură mașină; nu este o evaluare Elo absolută.

## 15.1.0 — 2026-10-27 (anterior: v15.0.0)

### Adăugat
- **Atlas: filtre după dificultate** (Ușor / Mediu / Avansat / Expert) și **după numărul de jucători** (1 / AI, 2, 3+), combinabile între ele și cu căutarea, categoria și filtrul „jucabile / documentate”. Clasificarea jucătorilor se face din câmpul `meta.players` al fiecărei variante; intrările fără valoare precisă (lexicon, „Global”) nu apar la filtrele de jucători.
- **Masa de șah → „Contra motorului”**: partidă împotriva motorului local cu **nivel reglabil** (începător, ușor, mediu, avansat), culoare la alegere, **anularea ultimei mutări**, abandon, descărcare **PGN** și reluarea unei partide dintr-un **PGN** sau dintr-o listă de mutări (SAN englez). Textele sunt în cele 8 limbi (fr/it/es/pt/hu/de: traduceri automate, neverificate nativ).
- Motor: nivelul 0 („începător”) – alege aproape la întâmplare dintre mutări rezonabile; nivelurile 1–3 rămân neschimbate (turneul Elo continuă să folosească 1–3).
- Teste noi: `tests/vs-filters.test.mjs` (filtre, nivel AI, anulare, PGN dus-întors, PGN ilegal respins, abandon) și extinderea `tests/engine.test.mjs` (nivelul 0, PGN-ul motorului se reciteste identic).

### Neschimbat
- Atlasul (1005 intrări), modul „▶ Joacă” din fișe, importul/exportul PGN existent, analiza și revizuirea partidei.
- Offline: un singur `index.html`, fără CDN, fără urmărire, fără conturi; politica CSP are hash-urile scripturilor inline recalculate.

### Cunoscut
- `tests/fff-r8.test.mjs` are nevoie de `axe-core` (variabila `AXE_PATH` sau `npm i -D axe-core`); în mediul de verificare nu era instalat, așa că rularea se oprește la pasul „axe 0 în dialogul P2P”, după ce toate verificările anterioare (pornire, tastatură, provocarea zilei, turneu Elo, perft, jocul în doi) au trecut. Comportamentul este identic înainte și după această versiune.

## 15.0.0 — 2026-10-26
- Import PGN în panoul Analiză, deschideri recunoscute dintr-o listă internă, revizuire cu greșeli etichetate și „Vezi poziția”.
