import { TabloClient, toNumberOrNull } from "./http";

function getArg(opts: string[], key: string): string | undefined {
  const idx = opts.indexOf(key);
  if (idx >= 0 && idx + 1 < opts.length) return opts[idx + 1];
  for (const o of opts) {
    if (o.startsWith(key + "=")) return o.split("=")[1];
  }
  return undefined;
}

export async function usersCmd(args: string[]) {
  const baseUrl = getArg(args, "--api.base.url") || Bun.env.API_BASE_URL || "https://api.tabloapp.com";
  const token = getArg(args, "--auth.token") || Bun.env.TABLO_AUTH_TOKEN;
  const idRistorante = getArg(args, "--id-ristorante");
  const minPartStr = getArg(args, "--min-partecipazioni");
  const minPart = minPartStr ? Number(minPartStr) : 0;

  if (!token) throw new Error("missing auth token (--auth.token or TABLO_AUTH_TOKEN)");
  if (!idRistorante) throw new Error("--id-ristorante is required");

  const client = new TabloClient(baseUrl, token, {
    maxRetries: Number(Bun.env.MAX_RETRIES ?? 3),
    retryDelayMs: Number(Bun.env.RETRY_DELAY_MS ?? 1000),
    retryBackoffMultiplier: Number(Bun.env.RETRY_BACKOFF_MULTIPLIER ?? 2)
  });
  const resp = await client.getNewUtentiInvitoRistorante(idRistorante);

  let users = resp.persone;
  if (minPart > 0) {
    users = users.filter((p) => (toNumberOrNull(p.numPartecipazioni) ?? 0) >= minPart);
  }

  for (const u of users) {
    const birth = u.dataDiNascita?.slice(0, 4) ?? "????";
    const dist = toNumberOrNull(u.distanza);
    const distStr = dist != null ? dist.toFixed(2) : "-";
    const part = toNumberOrNull(u.numPartecipazioni);
    console.log(`• ${u.nome} ${u.cognome} (${birth}) | part=${part ?? "?"} | dist=${distStr}km`);
  }
  console.log(`Users found: ${resp.persone.length} (filtered=${users.length})`);
}
