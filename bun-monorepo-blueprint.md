# Blueprint "Project Shisha" monorepo Bun + Docker + Ansible + Watchtower

Questa struttura è pensata per un contesto con **2 progetti Bun/Node**, deploy su una singola macchina piccola, un solo Watchtower globale e forte necessità di mantenere semplice il lavoro degli agenti di vibe coding. L'obiettivo è ottenere una repo prevedibile, con pochi punti di verità, bassa duplicazione e file facili da modificare automaticamente da parte di un agente.[cite:84][cite:87][cite:90][cite:99]

## Obiettivi architetturali

- Tenere **ogni app isolata** a livello di sorgenti e Compose, così il deploy resta indipendente.[cite:12][cite:92]
- Centralizzare solo ciò che è davvero condiviso: Dockerfile base, naming, script, Ansible role, stack di macchina.[cite:87][cite:92]
- Usare **una sola istanza di Watchtower** con label-based selection, così il continuous deployment non dipende da più container Watchtower concorrenti.[cite:84][cite:89][cite:91]
- Favorire una struttura che un agente possa leggere e modificare senza dover inferire troppe convenzioni implicite.[cite:87][cite:99]
- Prevedere **due strategie Docker**: una più conservativa con runtime Bun completo e una più ottimizzata con eseguibile compilato, da scegliere per progetto.[cite:117][cite:120][cite:123]

## Scelta organizzativa

La scelta consigliata è una **"Project Shisha" monorepo semplice senza Nx**, basata su Bun workspaces. Per due progetti, i workspace nativi di Bun sono sufficienti e introducono meno attrito rispetto a una toolchain più strutturata come Nx.[cite:99][cite:107]

### Perché non Nx, qui

- Il valore principale nel tuo scenario è nel deploy condiviso, non nel dependency graph avanzato.[cite:87][cite:107]
- Bun workspaces copre già bene il caso monorepo di base.[cite:99]
- Meno layer significa meno ambiguità per un agente che deve generare o correggere file rapidamente.[cite:99][cite:107]

## Struttura cartelle consigliata

```text
repo/
  README.md
  bunfig.toml
  package.json
  .gitignore
  .env.example

  apps/
    fuel-advisor-bot/
      README.md
      package.json
      bun.lock
      src/
      public/
      Dockerfile
      Dockerfile.optimized
      compose.yml
      .env.example
      deploy.vars.yml

    tablo-crawler/
      README.md
      package.json
      bun.lock
      src/
      public/
      Dockerfile
      Dockerfile.optimized
      compose.yml
      .env.example
      deploy.vars.yml

    fuel-advisor-bot/
      README.md
      package.json
      bun.lock
      src/
      public/
      Dockerfile
      Dockerfile.optimized
      compose.yml
      .env.example
      deploy.vars.yml

  packages/
    shared-config/
      package.json
      tsconfig.base.json
      eslint.config.js
    shared-lib/
      package.json
      src/

  docker/
    base/
      bun-base.Dockerfile
      bun-compile-base.Dockerfile
    scripts/
      healthcheck.sh
      entrypoint.sh

  infra/
    compose/
      watchtower.yml
      reverse-proxy.yml
      networks.yml
    env/
      machine.env.example
    docs/
      deployment-flow.md

  ansible/
    inventories/
      production/
        hosts.ini
        group_vars/
          all.yml
    playbooks/
      deploy-app.yml
      bootstrap-machine.yml
    roles/
      common/
        tasks/
          main.yml
      docker_host/
        tasks/
          main.yml
      app_deploy/
        tasks/
          main.yml
        templates/
          app-compose.yml.j2
          app-env.j2

  .github/
    workflows/
      fuel-advisor-bot-ci.yml
      tablo-crawler-ci.yml
      deploy-manual.yml
```

## Significato delle directory

| Directory   | Scopo                                        | Regola pratica                              |
| ----------- | -------------------------------------------- | ------------------------------------------- |
| `apps/`     | Contiene il codice applicativo               | Un'app = una cartella = un perimetro chiaro |
| `packages/` | Librerie o configurazioni condivise          | Crearla solo se la condivisione è reale     |
| `docker/`   | Base image e script condivisi                | Nessuna logica specifica di singola app     |
| `infra/`    | Stack di macchina e documentazione operativa | Solo componenti trasversali                 |
| `ansible/`  | Provisioning e deploy                        | Una role comune, differenze dichiarative    |

Questa separazione aiuta molto gli agenti: il codice prodotto sta in `apps`, la logica infrastrutturale sta altrove, e ogni modifica ha un posto prevedibile.[cite:87][cite:99]

## Regole per `apps/`

Ogni progetto deve essere autosufficiente dal punto di vista dell'applicazione. Un agente che lavora su `apps/fuel-advisor-bot` non dovrebbe dover attraversare tutta la repo per capire come si avvia il servizio.

### Dentro ogni app

```text
apps/fuel-advisor-bot/
  package.json
  src/
  Dockerfile
  Dockerfile.optimized
  compose.yml
  .env.example
  deploy.vars.yml
  README.md
```

### Regole

- `Dockerfile`: variante **safe**, con runtime Bun standard.[cite:123]
- `Dockerfile.optimized`: variante **optimized**, basata su `bun build --compile`, da usare solo se l'app la supporta bene.[cite:117][cite:120]
- `compose.yml`: contiene **solo** il servizio dell'app e le sue dipendenze strettamente locali.[cite:12][cite:92]
- `deploy.vars.yml`: file descrittivo letto da Ansible con le variabili del deploy.
- `README.md`: breve contratto per umani e agenti, con run/build/deploy.

## Convenzione per `deploy.vars.yml`

Ogni app dovrebbe esporre i suoi metadati di deploy in un file molto semplice e prevedibile. Questo è utile soprattutto nel vibe coding, perché l'agente non deve dedurre naming, tag o porte da punti diversi della repo.

Esempio:

```yaml
app_name: fuel-advisor-bot
container_name: fuel-advisor-bot
image_repository: ghcr.io/tuo-user/fuel-advisor-bot
image_tag: latest
app_port: 3000
host_port: 3001
watchtower_enabled: true
restart_policy: unless-stopped
env_file_name: fuel-advisor-bot.env
compose_project_name: fuel-advisor-bot
dockerfile_strategy: safe
```

### Nota su `dockerfile_strategy`

Valori ammessi:

- `safe`: usa `Dockerfile` con runtime Bun completo.[cite:123]
- `optimized`: usa `Dockerfile.optimized` con build compilata e runtime minimale.[cite:117][cite:120]

## Docker: doppia strategia consigliata

Per Bun conviene standardizzare il più possibile, ma lasciando una via conservativa e una via ottimizzata. Questo è importante perché `bun build --compile` è interessante, ma non sempre è trasparente con tutte le dipendenze o con tutti i comportamenti runtime.[cite:117][cite:125][cite:126]

## Dockerfile safe

Questa è la versione predefinita. È quella da preferire se il progetto è ancora in evoluzione, se usa dipendenze un po' particolari o se vuoi ridurre i rischi operativi.[cite:123][cite:126]

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build || true

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Quando usare il Dockerfile safe

- App in pieno vibe coding, con cambi frequenti.
- Librerie native o compatibilità incerta.
- Framework che fanno cose dinamiche a runtime.
- Situazioni in cui la priorità è far partire il servizio, non minimizzare ogni MB.[cite:123][cite:126]

## Dockerfile optimized

Questa variante usa un eseguibile compilato e punta a un runtime più piccolo. Ha senso quando l'app è abbastanza stabile e i test confermano che il comportamento è corretto anche in modalità compilata.[cite:117][cite:120]

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./src/index.ts --compile --outfile app

FROM alpine:3.20 AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/app /app/app
RUN chmod +x /app/app
USER app
EXPOSE 3000
CMD ["/app/app"]
```

### Quando usare il Dockerfile optimized

- Server HTTP semplice.
- Poche dipendenze native o nessuna.
- App stabilizzata.
- Esigenza reale di ridurre runtime image, pull time e superficie operativa.[cite:117][cite:120]

### Avvertenze importanti

- Alpine usa musl, quindi la compatibilità va verificata per progetto.[cite:112][cite:118][cite:121]
- `bun build --compile` non è ancora una garanzia assoluta per tutti gli stack reali.[cite:117][cite:125][cite:126]
- Se emergono comportamenti strani, la strategia corretta è tornare al Dockerfile safe.[cite:117][cite:123]

## Come scegliere tra safe e optimized

| Scenario                                   | Strategia                             |
| ------------------------------------------ | ------------------------------------- |
| Progetto nuovo, in continua mutazione      | `safe` [cite:123]                     |
| Progetto semplice e già abbastanza stabile | `optimized` [cite:117][cite:120]      |
| Dubbi su compatibilità native/musl         | `safe` [cite:118][cite:121][cite:126] |
| Necessità di ridurre immagine e startup    | `optimized` [cite:117][cite:120]      |

## Compose: un file per app

Ogni app ha il suo `compose.yml`. Questo resta il confine operativo principale del progetto.[cite:12][cite:92]

Esempio:

```yaml
services:
  app:
    image: ghcr.io/tuo-user/fuel-advisor-bot:latest
    container_name: fuel-advisor-bot
    restart: unless-stopped
    env_file:
      - ./.env
    ports:
      - "3001:3000"
    labels:
      com.centurylinklabs.watchtower.enable: "true"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Regole importanti

- Nessun Watchtower dentro le cartelle delle app.[cite:84][cite:89]
- Nessun reverse proxy dentro le cartelle delle app, se è condiviso da più servizi.
- Un'app non deve definire servizi appartenenti a un altro progetto.

## Stack di macchina in `infra/compose/`

Qui vanno solo i servizi condivisi dalla macchina.

### `watchtower.yml`

```yaml
services:
  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --label-enable --interval 60 --cleanup
```

Con `--label-enable`, Watchtower aggiorna solo i container esplicitamente etichettati, che è il pattern consigliato per evitare effetti collaterali e per tenere un'unica istanza globale.[cite:84][cite:91][cite:94]

## Ansible: una role comune parametrica

Il punto chiave è evitare due insiemi di playbook quasi uguali. La soluzione consigliata è una role `app_deploy` che riceve in input i dati dell'app e renderizza il Compose finale sul server.[cite:87][cite:92]

### Struttura minima

```text
ansible/
  playbooks/
    deploy-app.yml
  roles/
    app_deploy/
      tasks/main.yml
      templates/app-compose.yml.j2
      templates/app-env.j2
```

### Flusso ideale

1. Il playbook riceve `app_path=apps/fuel-advisor-bot`.
2. Legge `deploy.vars.yml`.
3. Decide quale Dockerfile usare in base a `dockerfile_strategy`.
4. Copia il `compose.yml` o genera il file da template.
5. Copia l'env file sul server.
6. Esegue `docker compose pull` e `docker compose up -d`.

### Perché questa scelta è giusta per un agente

- L'agente aggiorna pochi file noti.
- Le differenze tra app stanno in dati, non in logica duplicata.
- Un refactor del deploy tocca una role sola, non N playbook.[cite:87][cite:92]

## CI/CD consigliato

Il modello migliore qui è:

1. Push su main.
2. GitHub Actions builda l'immagine ARM compatibile e la pubblica su registry.
3. Il server ha già in esecuzione il container dell'app.
4. Watchtower rileva il nuovo tag e aggiorna solo i container con label abilitata.[cite:84][cite:89][cite:91]

### Workflow pragmatico

- `fuel-advisor-bot-ci.yml`: build e push immagine `fuel-advisor-bot`.
- `tablo-crawler-ci.yml`: build e push immagine `tablo-crawler`.
- Nessun deploy diretto da CI necessario, se vuoi affidarti a Watchtower come meccanismo di continuous deployment.[cite:91]

Se invece vuoi più controllo, la CI può lanciare anche Ansible solo per aggiornare env o compose, lasciando a Watchtower il compito di aggiornare le immagini.

## Convenzioni che aiutano il vibe coding

Per rendere la repo facile da usare da parte di un agente, conviene imporre alcune convenzioni molto rigide.

### Convenzioni consigliate

- Ogni app deve avere gli stessi file chiave: `README.md`, `Dockerfile`, `Dockerfile.optimized`, `compose.yml`, `.env.example`, `deploy.vars.yml`.
- Ogni file deve avere nomi prevedibili, senza alias creativi.
- Le variabili di deploy devono stare in un file dedicato e non sparse tra README, workflow e compose.
- I servizi condivisi devono stare solo in `infra/`.
- Gli script root devono avere nomi dichiarativi, per esempio `bun run ci:fuel-advisor-bot` oppure `bun run deploy:fuel-advisor-bot`.
- La strategia Docker scelta deve essere esplicita in `deploy.vars.yml`, mai implicita.[cite:117][cite:123]

### Cosa evitare

- File “speciali” con nomi diversi tra progetto A e B.
- Mezzo deploy in Compose e mezzo in Ansible.
- Variabili duplicate tra GitHub Actions, compose e playbook.
- Una root repo troppo magica, dove il comportamento si capisce solo leggendo 5 tool diversi.
- Impostare `optimized` come default universale prima di aver validato davvero i progetti.[cite:117][cite:126]

## `package.json` root suggerito

Esempio semplice:

```json
{
  "name": "personal-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:fuel-advisor-bot": "bun --cwd apps/fuel-advisor-bot run dev",
    "dev:tablo-crawler": "bun --cwd apps/tablo-crawler run dev",
    "build:fuel-advisor-bot": "bun --cwd apps/fuel-advisor-bot run build",
    "build:tablo-crawler": "bun --cwd apps/tablo-crawler run build",
    "test:fuel-advisor-bot": "bun --cwd apps/fuel-advisor-bot run test",
    "test:tablo-crawler": "bun --cwd apps/tablo-crawler run test"
  }
}
```

I Bun workspaces sono la base naturale per una monorepo di questo tipo e sono sufficienti per il tuo scenario iniziale.[cite:99]

## README root suggerito

Il `README.md` in root dovrebbe essere scritto come **documento per agenti** prima ancora che per umani. Deve spiegare rapidamente:

- scopo della repo;
- dove stanno le app;
- dove stanno infra e ansible;
- convenzioni obbligatorie;
- come aggiungere una nuova app;
- cosa non toccare senza motivo.

### Esempio di sezione importante

```md
## Repo contract

- Le app vivono in `apps/`.
- Ogni app deve avere `Dockerfile`, `Dockerfile.optimized`, `compose.yml`, `.env.example`, `deploy.vars.yml`.
- I servizi condivisi vivono in `infra/compose/`.
- Il deploy Ansible comune vive in `ansible/roles/app_deploy/`.
- Watchtower esiste una sola volta, in `infra/compose/watchtower.yml`.
- La strategia runtime dell'app è dichiarata in `deploy.vars.yml`.
```

## Strategia di crescita

Questa struttura è adatta adesso e scala bene per qualche progetto in più. Se in futuro nasceranno molte librerie condivise, build graph complessi o CI molto selettiva, potrà avere senso introdurre Nx; prima di quel punto, la complessità addizionale rischia di pesare più dei benefici.[cite:99][cite:107]

## Raccomandazione finale

La struttura migliore per questo scenario è:

- **"Project Shisha" monorepo semplice** con Bun workspaces;[cite:99]
- **una cartella per app** con i suoi file operativi;[cite:12][cite:92]
- **due strategie Docker**, safe e optimized, selezionabili per progetto;[cite:117][cite:120][cite:123]
- **stack di macchina separato** in `infra/compose`;[cite:84][cite:89]
- **una sola role Ansible parametrica**;[cite:87][cite:92]
- **una sola istanza Watchtower** con label enable.[cite:84][cite:91][cite:94]

Questa combinazione massimizza prevedibilità, riduce duplicazione e si presta bene a essere manipolata da agenti di vibe coding senza creare una repo eccessivamente “magica”.[cite:87][cite:99]
