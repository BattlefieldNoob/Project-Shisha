# Watchtower Setup for TabloCrawler

Watchtower monitora automaticamente le immagini Docker, scarica gli aggiornamenti e riavvia i container automaticamente, inviando notifiche Telegram.

## Configurazione

### 1. Configura le credenziali Telegram nel vault

```bash
# Modifica il vault
ansible-vault edit vault.yml

# Aggiungi/modifica:
vault_telegram_bot_token: "your_bot_token_here"
vault_telegram_chat_id: "your_chat_id_here"
```

### 2. Deploy Watchtower

```bash
# Setup completo con Watchtower
ansible-playbook -i inventory.yml setup-watchtower.yml --ask-vault-pass

# Oppure deploy normale (include già Watchtower)
ansible-playbook -i inventory.yml playbook.yml --ask-vault-pass
```

## Configurazione Watchtower

### Intervallo di controllo

- **Default**: Ogni 6 ore (21600 secondi)
- **Personalizzabile** in `inventory.yml`:

```yaml
vars:
  watchtower_interval: "14400" # Ogni 4 ore
  watchtower_debug: true # Per più dettagli
```

### Immagini monitorate

Watchtower monitora solo i container con label:

- `com.centurylinklabs.watchtower.enable=true`

## Comandi utili

### Controllo manuale

```bash
# Forza aggiornamento immediato
docker exec watchtower /watchtower --run-once

# Controllo con debug
docker exec watchtower /watchtower --run-once --debug
```

### Logs

```bash
# Logs Watchtower
docker logs watchtower

# Logs TabloCrawler
docker logs tablocrawler-monitor

# Logs in tempo reale
docker logs -f watchtower
```

### Restart servizi

```bash
# Restart solo Watchtower
docker restart watchtower

# Restart tutto
docker compose -p tablocrawler restart

# Stop auto-updates temporaneamente
docker stop watchtower
```

## Notifiche Telegram

### Formato messaggio

```
🐳 Watchtower Update

Container: tablocrawler-monitor
Image: ghcr.io/tablocrawler/tablocrawler:latest
Host: pi-dev
Time: 2025-01-15 14:30:00

Container has been updated and restarted automatically.
```

### Troubleshooting

**Nessuna notifica ricevuta:**

1. Verifica bot token e chat ID
2. Controlla logs: `docker logs watchtower`
3. Test manuale: `docker exec watchtower /watchtower --run-once`

**Errori di connessione:**

1. Verifica connessione internet del Pi
2. Controlla firewall/proxy
3. Verifica accesso a ghcr.io

**Container non aggiornato:**

1. Verifica label nel docker-compose.yml
2. Restart Watchtower: `docker restart watchtower`
3. Forza aggiornamento: `docker exec watchtower /watchtower --run-once --debug`

## Configurazione avanzata

### Custom interval

```yaml
# inventory.yml
vars:
  watchtower_interval: "7200" # Ogni 2 ore
```

### Multiple chat IDs

```yaml
# vault.yml
vault_telegram_chat_id: "123456789,987654321"
```

### Disable per ambiente

```yaml
# inventory.yml - development
development:
  vars:
    watchtower_enabled: false
```

### Solo notifiche (senza auto-update)

```yaml
# inventory.yml
vars:
  watchtower_monitor_only: true # Solo notifiche, no update
```
