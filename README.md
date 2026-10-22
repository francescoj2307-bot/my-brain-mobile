# My Brain Mobile

Applicazione personale local-first per iPhone, iPad e browser desktop.

## Funzioni
- Home e mappa interattiva delle cinque aree: Persona, Conoscenza, Progetti, Decisioni e Crescita.
- Inbox con classificazione manuale delle idee.
- Note, progetti, decisioni, attività, scadenze e tag.
- Archivio con filtri e ricerca; schermata Oggi; Timeline.
- Salvataggio sul dispositivo tramite localStorage, backup/importazione JSON, cache offline.

## Privacy
Il codice sorgente è pubblico, **ma non ci sono dati personali nel repository**. Le informazioni che inserisci restano nel browser/dispositivo, non vengono spedite a GitHub. Non salvare backup, database, credenziali o appunti personali in questo repository. Il browser può cancellare l'archivio locale; esporta regolarmente backup.

## Attivazione GitHub Pages
In Settings > Pages scegli: Deploy from a branch, branch **main**, cartella **/(root)** e salva.
L'indirizzo previsto è: https://francescoj2307-bot.github.io/my-brain-mobile/

Su iPhone/iPad aprilo in Safari e usa Condividi > Aggiungi alla schermata Home.
La prima apertura richiede Internet.

## Limiti
Non è il database My Brain del Mac: questa è una versione mobile autonoma, senza sincronizzazione né collegamento al Bridge Mac. Non è crittografata a livello applicativo e conserva dati distinti in ogni browser/dispositivo. Il filtro Gatekeeper è manuale, non AI.


## Compatibilità con codice ufficiale Mac (22 ottobre 2026)

Il sorgente Mac allegato dall'utente è **My Brain v0.5**, strutturato come AppKit/WKWebView + server Python + database SQLite e Bridge locale autenticato.

GitHub Pages non supporta il server Python e il database SQLite. La versione mobile rimane quindi una PWA autonoma:
- ha la mappa allineata ai cinque domini ufficiali: Apprendimento, Progetti, Obiettivi, Decisioni, Evoluzione;
- include **Importa export Mac** in alto: carica *sul solo dispositivo* un JSON ottenuto dal pulsante “Export My Brain” dell'app Mac;
- legge le entità ufficiali (projects, goals, knowledge, decisions, ideas, signals, actions, timeline_events, skills e skill_evidence) e le rende ricercabili nella PWA;
- conserva una copia immutata dell'export Mac in IndexedDB per un successivo salvataggio tramite **Esporta originale Mac**;
- mantiene separate le note create precedentemente sulla PWA.

**Non si tratta della sincronizzazione live con il Mac**. Non include il Bridge server, il Gatekeeper AI o la persistenza SQLite. Le entità importate sono rappresentate nel formato della PWA: le modifiche sul telefono non vengono inviate al Mac. I contenuti risiedono in locale in IndexedDB/localStorage non crittografati a livello applicativo: proteggere il dispositivo e fare backup. Su Safari la memoria locale può essere cancellata o svuotata dal sistema. Alcuni export molto grandi possono superare la quota localStorage: in tal caso l'importazione viene rifiutata senza sostituire i dati esistenti.
