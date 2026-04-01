# Tablo API Implementation Summary (TypeScript + Bun)

## ✅ Completed Implementation

### 1. API Integration
- Host: `https://api.tabloapp.com` ✅
- First Endpoint: `/tavoliService/getTavoliNewOrder` — extracts `idTavolo` ✅
- Second Endpoint: `/tavoliService/getTavolo` — fetches detailed information ✅
- Authentication: `X-AUTH-TOKEN` header ✅
- Query Parameters: Configurable parameters (lat, lng, range, limit) ✅

### 2. Data Extraction
- First Call: Extract `idTavolo` from tavoli list ✅
- Second Call: For each tavolo, extract:
  - `nomeRistorante` (restaurant name) ✅
  - `partecipanti` array ✅
  - For each participant: `sessoMaschile`, `nome`, `cognome`, `dataDiNascita` ✅

### 3. Architecture
- Sequential API Calls: First call gets IDs, second call iterates through each ID ✅
- CLI: Bun + Commander; tasks: `scan` and `users` ✅
- Error Handling: Exceptions with console diagnostics ✅
- Messaging: Telegram API via HTTPS POST, console fallback ✅

### 4. Configuration
- Environment Variables: `TABLO_AUTH_TOKEN`, `API_BASE_URL`, Telegram vars ✅
- CLI Flags: `--api.base.url`, `--auth.token`, `--days`, `--min-participants`, `--max-distance` ✅
- Example Values: Padova area defaults in code ✅

### 5. Output & Reporting
- Structured Reports: Formatted participant lists with statistics ✅
- Gender Statistics: Male/Female counts per tavolo ✅
- Telegram Integration: Optional notification support ✅
- Console Fallback: Works without Telegram configuration ✅

## 🔧 Technical Details

### Data Models (TypeScript)
```ts
export interface TavoliNewOrderResponse {
  code: number;
  message?: string;
  tavoli: { idTavolo: string; distanza?: string }[];
}

export interface TavoloResponse {
  code: number;
  message?: string;
  tavolo: TavoloDetails;
}

export interface TavoloDetails {
  nomeRistorante: string;
  partecipanti: Partecipante[];
}

export interface Partecipante {
  sessoMaschile: boolean;
  nome: string;
  cognome: string;
  dataDiNascita: string;
}
```

### API Flow
1. Call `getTavoliNewOrder` with location parameters
2. Extract `idTavolo` and `distanza`
3. For each `idTavolo`, call `getTavolo` to get details
4. Parse restaurant name, participants, and demographics
5. Format output; send to Telegram only if gender-balanced

### Example Configuration (env)
```bash
export API_BASE_URL=https://api.tabloapp.com
export TABLO_AUTH_TOKEN=YOUR_TABLO_AUTH_TOKEN_HERE
export TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
export TELEGRAM_CHAT_ID=YOUR_CHAT_ID
export LOGGING_ENABLED=true
```

## 🚀 Ready to Use

TabloCrawler is implemented and ready to run with Bun. Provide a valid `TABLO_AUTH_TOKEN` and use:

```bash
bun install
bun run scan
# or
bun run users -- --id-ristorante 12345 --min-partecipazioni 2
```
