// Tablo API constants
export const TABLO_API_SUCCESS_CODE = 0;

export interface UtentiInvitoResponse {
  code: number;
  message?: string;
  persone: PersonaInvito[];
}

export interface PersonaInvito {
  idUtente: string;
  nome: string;
  cognome: string;
  sessoMaschile?: string; // "0" | "1"
  dataDiNascita?: string;
  distanza?: string; // as string number
  posizioneCitta?: string;
  numPartecipazioni?: string;
  numInviti?: string;
}

// Tavoli (tables) models
export interface TavoliNewOrderResponse {
  code: number;
  message?: string;
  tavoli: TavoloSummary[];
}

export interface TavoloSummary {
  idPartecipanti: string[];
  idTavolo: string;
  idRistorante?: string;
  distanza?: string;
  nomeRistorante?: string;
  quando?: string;
}

export interface TavoloResponse {
  code: number;
  message?: string;
  tavolo: TavoloDetails;
}

export interface TavoloDetails {
  nomeRistorante: string;
  partecipanti: Partecipante[];
  quando?: string; // Table date and time
}

export interface Partecipante {
  idUtente: string;
  sessoMaschile: boolean;
  nome: string;
  cognome: string;
  dataDiNascita: string;
  partecipante: boolean;
  avatar?: string;
  isBrand?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
}

export class TabloClient {
  constructor(
    private baseUrl: string,
    private authToken: string,
    private retryConfig: RetryConfig = { maxRetries: 3, retryDelayMs: 1000, retryBackoffMultiplier: 2 }
  ) { }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    shouldRetry: (result: T) => boolean = () => false
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.retryDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Check if we should retry based on the result
        if (shouldRetry(result) && attempt < this.retryConfig.maxRetries) {
          console.warn(`⚠️  ${operationName} returned unexpected result, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
          await this.sleep(delay);
          delay *= this.retryConfig.retryBackoffMultiplier;
          continue;
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          console.warn(`⚠️  ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${lastError.message}`);
          await this.sleep(delay);
          delay *= this.retryConfig.retryBackoffMultiplier;
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`);
  }

  async getNewUtentiInvitoRistorante(idRistorante: string): Promise<UtentiInvitoResponse> {
    return this.withRetry(
      async () => {
        const url = new URL(`/tavoliService/getNewUtentiInvitoRistorante`, this.baseUrl);
        url.searchParams.set("idRistorante", idRistorante);

        const res = await fetch(url, {
          method: "GET",
          headers: { "X-AUTH-TOKEN": this.authToken },
        });
        if (!res.ok) throw new Error(`API status ${res.status}`);
        return (await res.json()) as UtentiInvitoResponse;
      },
      `getNewUtentiInvitoRistorante(${idRistorante})`,
      (result) => result.code !== TABLO_API_SUCCESS_CODE
    );
  }

  async getTavoliNewOrder(params: Record<string, string>): Promise<TavoliNewOrderResponse> {
    return this.withRetry(
      async () => {
        const url = new URL(`/tavoliService/getTavoliNewOrder`, this.baseUrl);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        const res = await fetch(url, {
          method: "GET",
          headers: { "X-AUTH-TOKEN": this.authToken },
        });
        if (!res.ok) throw new Error(`API status ${res.status}`);
        return (await res.json()) as TavoliNewOrderResponse;
      },
      `getTavoliNewOrder(${params.dateTavolo || 'unknown date'})`,
      (result) => result.code !== TABLO_API_SUCCESS_CODE
    );
  }

  async getTavolo(idTavolo: string): Promise<TavoloResponse> {
    return this.withRetry(
      async () => {
        const url = new URL(`/tavoliService/getTavolo`, this.baseUrl);
        url.searchParams.set("idTavolo", idTavolo);
        const res = await fetch(url, {
          method: "GET",
          headers: { "X-AUTH-TOKEN": this.authToken },
        });
        if (!res.ok) throw new Error(`API status ${res.status}`);
        return (await res.json()) as TavoloResponse;
      },
      `getTavolo(${idTavolo})`,
      (result) => result.code !== TABLO_API_SUCCESS_CODE
    );
  }
}

export function toNumberOrNull(v?: string): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
