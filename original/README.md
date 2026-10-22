# My Brain Originale Mobile (v0.5)

Questa cartella contiene il frontend del progetto My Brain del Mac fornito il 22 ottobre 2026, adattato per Safari iOS/iPadOS e GitHub Pages.

Il frontend originale è preservato nei file `app.js`, `styles.css`, `theme-init.js`; `index.html` usa percorsi relativi e include l'adattatore `local-api.js`. Non ci sono backend Python o database SQLite sul server web.

## Funzionalità
- Mappa delle cinque aree ufficiali, espansione progressiva, pan, zoom, inspector.
- Progetti, obiettivi, decisioni, conoscenze, idee, segnali, azioni, competenze, timeline.
- Lettura, creazione, modifica e archiviazione dei record con IndexedDB locale.
- Ricerca, tema chiaro/scuro, export JSON, import del backup JSON ufficiale del Mac.
- Service worker e manifest per installazione Home e uso offline dopo prima apertura.

## Import
Nella versione Mac originale scegliere *⇩ Export My Brain*. Trasferire quel **JSON** sul dispositivo iOS, aprire questa web app e premere **Importa Mac**.

Il file ZIP di codice non contiene il database operativo del Mac. Quindi non avviene alcuna migrazione automatica delle memorie.

## Confini importanti
- Nessuna sincronizzazione Mac ↔ iPhone/iPad, nemmeno se lo stesso account GitHub è collegato.
- My Brain Bridge non è attivo in questa PWA: manca il server Python di acquisizione e le funzioni di automazione non vengono eseguite.
- La proiezione del grafo sul browser segue i principi dell'originale, ma non è lo stesso algoritmo SQLite di `graph.py`.
- Il Gatekeeper disponibile è solo classificazione deterministica locale, non AI.
- Gli export modificati da iPhone non sono importabili automaticamente nella versione Mac v0.5 senza uno strumento di import.
- Dati locali non crittografati a livello applicativo; non pubblicare gli export o la cartella dati nel repository pubblico.
- Safari può eliminare i dati del sito: esportare spesso copie di sicurezza.

La PWA semplificata preesistente resta in `../index.html` e i suoi dati non vengono cancellati.
