# Sistema di Retry e Grace Period

## Problema Risolto

Il sistema precedente aveva un problema: quando l'API di Tablo ritornava temporaneamente un array vuoto (probabilmente a causa di problemi temporanei del server), il sistema interpretava erroneamente che i tavoli erano stati cancellati. Poco dopo, quando l'API tornava a funzionare normalmente, i tavoli riapparivano e venivano segnalati come "nuovi", causando notifiche spurie di cancellazione e ri-creazione.

## Soluzioni Implementate

### 1. Sistema di Retry Robusto

**Configurazione:**

- `MAX_RETRIES`: Numero massimo di tentativi (default: 3)
- `RETRY_DELAY_MS`: Ritardo iniziale tra i tentativi in millisecondi (default: 1000)
- `RETRY_BACKOFF_MULTIPLIER`: Moltiplicatore per il backoff esponenziale (default: 2)

**Funzionalità:**

- Retry automatico per tutte le chiamate API
- Backoff esponenziale per evitare di sovraccaricare il server
- Retry intelligente basato sui codici di risposta dell'API
- Logging dettagliato dei tentativi e degli errori

### 2. Grace Period per Tavoli Scomparsi

**Configurazione:**

- `GRACE_PERIOD_SCANS`: Numero di scan da aspettare prima di considerare un tavolo veramente cancellato (default: 3)

**Funzionalità:**

- I tavoli che scompaiono vengono messi in una lista "sospetta" invece di essere immediatamente segnalati come cancellati
- Solo dopo N scan consecutivi senza il tavolo, viene generata la notifica di cancellazione
- Se un tavolo riappare durante il grace period, non vengono generate notifiche spurie
- Logging dettagliato dello stato dei tavoli sospetti

## Configurazione

### Variabili d'Ambiente

```bash
# Configurazione Retry
export MAX_RETRIES="3"                    # Numero massimo di tentativi
export RETRY_DELAY_MS="1000"              # Ritardo iniziale (ms)
export RETRY_BACKOFF_MULTIPLIER="2"       # Moltiplicatore backoff

# Configurazione Grace Period
export GRACE_PERIOD_SCANS="3"             # Scan da aspettare prima di segnalare cancellazione
```

### Esempi di Configurazione

**Configurazione Conservativa (meno notifiche spurie):**

```bash
export MAX_RETRIES="5"
export RETRY_DELAY_MS="2000"
export GRACE_PERIOD_SCANS="5"
```

**Configurazione Aggressiva (notifiche più rapide):**

```bash
export MAX_RETRIES="2"
export RETRY_DELAY_MS="500"
export GRACE_PERIOD_SCANS="2"
```

## Comportamento del Sistema

### Scenario 1: API Temporaneamente Non Disponibile

1. **Scan 1**: API fallisce → Retry automatico → Eventualmente successo o fallimento finale
2. Se tutti i retry falliscono, il scan viene saltato con warning
3. **Scan 2**: API funziona → Nessuna notifica spuria, sistema continua normalmente

### Scenario 2: Tavolo Scompare Temporaneamente

1. **Scan 1**: Tavolo non trovato → Aggiunto alla lista sospetti (1/3)
2. **Scan 2**: Tavolo ancora non trovato → Contatore incrementato (2/3)
3. **Scan 3**: Tavolo riappare → Rimosso dalla lista sospetti, nessuna notifica
4. **Alternativa Scan 3**: Tavolo ancora non trovato → Notifica di cancellazione (3/3)

### Scenario 3: Tavolo Veramente Cancellato

1. **Scan 1-3**: Tavolo non trovato per 3 scan consecutivi
2. **Scan 3**: Generata notifica di cancellazione definitiva
3. Tavolo rimosso dalla lista sospetti

## Logging e Debugging

Il sistema fornisce logging dettagliato per aiutare nel debugging:

```
⚠️  getTavoliNewOrder(["2024-01-15"]) returned unexpected result, retrying in 1000ms (attempt 1/4)
⚠️  Table 12345 disappeared, starting grace period (1/3 scans)
⏳ Table 12345 missing for 2/3 scans, waiting...
✅ Table 12345 returned from temporary disappearance, no false cancellation notification sent
❌ Table 67890 confirmed table_cancelled after 3 missing scans
```

## Vantaggi

1. **Riduzione Notifiche Spurie**: Elimina le false notifiche di cancellazione/ri-creazione
2. **Maggiore Affidabilità**: Gestisce meglio i problemi temporanei dell'API
3. **Configurabilità**: Permette di bilanciare velocità vs accuratezza
4. **Backward Compatibility**: Funziona con stati esistenti senza perdita di dati
5. **Logging Dettagliato**: Facilita il debugging e il monitoraggio

## Considerazioni

- **Ritardo nelle Notifiche**: Le notifiche di cancellazione arrivano dopo N scan (configurabile)
- **Memoria Aggiuntiva**: Il sistema mantiene una cache dei tavoli sospetti
- **Complessità**: Il sistema è più complesso ma più robusto

## Migrazione

Il sistema è completamente backward compatible. Gli stati esistenti vengono automaticamente aggiornati con i nuovi campi necessari.
