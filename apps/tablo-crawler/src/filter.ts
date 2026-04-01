import type { TavoloDetails } from "./http";

export function hasMinimumParticipants(t: TavoloDetails, min: number): boolean {
  return t.partecipanti.length >= min;
}

export function isWithinDistance(distanza: string | undefined, maxKm: number): boolean {
  const d = distanza ? Number(distanza) : Number.POSITIVE_INFINITY;
  return d <= maxKm;
}

export function hasGenderBalance(t: TavoloDetails): boolean {
  const male = t.partecipanti.filter(p => p.sessoMaschile).length;
  const female = t.partecipanti.length - male;
  return Math.abs(male - female) <= 1;
}
