import type { Partecipante, TavoloDetails } from "./http";
import type { ParticipantState } from "./state-manager";

export function formatDistance(d: string | undefined): string {
  const n = d ? Number(d) : 0;
  return n.toFixed(1);
}

export function formatTavoloMessage(t: TavoloDetails, dateString: string, _formattedDistance: string): string {
  const lines: string[] = [];
  lines.push(`🍽️ ${t.nomeRistorante}`);
  lines.push(`📅 Data: ${dateString}`);
  lines.push(formatTableDateTime(t.quando));
  lines.push(`👥 Partecipanti (${t.partecipanti.length}):`);
  for (const p of t.partecipanti) {
    const gender = p.sessoMaschile ? "👨" : "👩";
    lines.push(`  ${gender} ${p.nome} ${p.cognome} (${p.dataDiNascita.slice(0, 4)})`);
  }
  return lines.join("\n");
}

export function formatSummary(total: number, balanced: number, days: number): string {
  return `📊 Scansione multi-giorno completata: ${total} tavoli totali, ${balanced} con equilibrio di genere (prossimi ${days} giorni)`;
}

export function formatTableDateTime(quando?: string, prefix: string = '📅 Orario'): string {
  if (!quando) {
    return `${prefix}: Non specificato`;
  }

  try {
    const date = new Date(quando);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return `${prefix}: ${quando} (formato non valido)`;
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Rome'
    };

    const formatted = date.toLocaleDateString('it-IT', options);
    return `${prefix}: ${formatted}`;
  } catch (_error) {
    return `${prefix}: ${quando} (formato non valido)`;
  }
}

export function calculateAge(birthDate: string): number | null {
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
}

export function formatNotificationTimestamp(): string {
  return `⏰ Notification time: ${new Date().toLocaleString()}`;
}

export function formatTableParticipants(participants: Partecipante[]): string {
  if (participants.length === 0) {
    return '   (No participants)';
  }

  return participants.map(p => {
    const gender = p.sessoMaschile ? '♂️' : '♀️';
    const status = p.partecipante ? '✅' : '⏳';
    const brandText = p.isBrand ? ' 🏷️' : '';
    return `   ${status} ${gender} ${p.nome} ${p.cognome}${brandText}`;
  }).join('\n');
}

export function formatGenderStats(participants: Partecipante[]): string[] {
  const maleCount = participants.filter(p => p.sessoMaschile).length;
  const femaleCount = participants.filter(p => !p.sessoMaschile).length;

  return [
    `📊 Total participants: ${participants.length}`,
    `♂️ Male: ${maleCount}`,
    `♀️ Female: ${femaleCount}`
  ];
}

export function formatUserInfo(user: Partecipante): string {
  const gender = user.sessoMaschile ? '♂️' : '♀️';
  const age = calculateAge(user.dataDiNascita);
  const ageText = age ? ` (${age} years old)` : '';
  const brandText = user.isBrand ? ' 🏷️ Brand' : '';

  return [
    `   Name: ${user.nome} ${user.cognome}${brandText}`,
    `   Gender: ${gender}`,
    `   Birth Date: ${user.dataDiNascita}${ageText}`,
    `   Status: ${user.partecipante ? 'Confirmed participant' : 'Invited'}`
  ].join('\n');
}

export function formatParticipantInfo(participant: ParticipantState): string {
  if (!participant) {
    return '   (No participant data available)';
  }

  const gender = participant.sessoMaschile ? '♂️' : '♀️';
  const age = calculateAge(participant.dataDiNascita);
  const ageText = age ? ` (${age} years old)` : '';
  const status = participant.partecipante ? 'Confirmed participant' : 'Invited';

  return [
    `   Name: ${participant.nome} ${participant.cognome}`,
    `   Gender: ${gender}`,
    `   Birth Date: ${participant.dataDiNascita}${ageText}`,
    `   Status: ${status}`,
    `   ID: ${participant.idUtente}`
  ].join('\n');
}

export function formatTableHeader(restaurant: string, tableId: string): string[] {
  return [
    `🏪 Restaurant: ${restaurant}`,
    `📍 Table ID: ${tableId}`
  ];
}

export function formatMonitoredUsersList(users: Partecipante[], prefix: string = 'Monitored users'): string {
  if (users.length === 0) {
    return '';
  }

  const userNames = users.map(u => `${u.nome} ${u.cognome}`).join(', ');
  return `👥 ${prefix}: ${userNames}`;
}

// Convert ParticipantState array to Partecipante array for compatibility
export function convertParticipantStates(participants: ParticipantState[]): Partecipante[] {
  return participants.map(p => ({
    idUtente: p.idUtente,
    nome: p.nome || 'Unknown',
    cognome: p.cognome || '',
    sessoMaschile: p.sessoMaschile,
    dataDiNascita: p.dataDiNascita,
    partecipante: p.partecipante,
    isBrand: false
  }));
}

export function formatHeartbeatMessage(daysSinceLastMessage: number): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Rome'
  };
  const timestamp = now.toLocaleString('it-IT', options);

  const lines: string[] = [];
  lines.push('💓 Sistema Attivo - Heartbeat');
  lines.push(`🕐 Data/Ora: ${timestamp}`);
  lines.push(`📊 Giorni dall'ultimo messaggio: ${daysSinceLastMessage}`);
  lines.push('✅ Il crawler sta monitorando normalmente');

  return lines.join('\n');
}
