# My Brain Mobile — app principale

La radice dell'app adesso presenta il frontend ufficiale My Brain v0.5 del Mac, adattato a iPhone/iPad. Il progetto originale Mac non viene modificato.

## Installazione
Apri https://francescoj2307-bot.github.io/my-brain-mobile/ da Safari. Se l'icona è già sulla Home, chiudi e riapri la stessa app dopo la pubblicazione. Non eliminare i dati del browser prima di un backup.

## Sicurezza dei dati
- Il repository GitHub contiene solo codice, non memorie, backup o credenziali.
- Memorie sul dispositivo: IndexedDB mybrain-official-mobile-v1.
- Se il database nuovo non esiste, eventuali memorie nella vecchia PWA vengono migrate senza cancellarne la copia originale.
- Per caricare le memorie Mac usa Export My Brain sul Mac, poi Importa Mac sull'iPad. L'importazione Mac sostituisce i dati iPad presenti: prima esporta un backup.
- Non è abilitata la sincronizzazione automatica con il Mac: backend Python, SQLite, Bridge e Gatekeeper avanzato non sono eseguiti nella PWA.
