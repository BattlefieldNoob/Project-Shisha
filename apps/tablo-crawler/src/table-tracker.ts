import { TavoloDetails } from './http.ts';
import { TableState, ParticipantState, StateChange } from './state-manager.ts';

export interface TableTracker {
  findMonitoredUsers(table: TavoloDetails, monitoredIds: number[]): number[];
  detectChanges(oldTable: TableState | null, newTable: TableState, monitoredIds: number[]): StateChange[];
}

export class DefaultTableTracker implements TableTracker {
  /**
   * Identifies monitored users in a table by matching idUtente against monitored user set
   */
  findMonitoredUsers(table: TavoloDetails, monitoredIds: number[]): number[] {
    const monitoredUserSet = new Set(monitoredIds);
    const foundUsers: number[] = [];
    
    for (const participant of table.partecipanti) {
      const userId = parseInt(participant.idUtente);
      if (monitoredUserSet.has(userId)) {
        foundUsers.push(userId);
      }
    }
    
    return foundUsers;
  }

  /**
   * Detects changes between old and new table states, generating structured StateChange events
   */
  detectChanges(oldTable: TableState | null, newTable: TableState, monitoredIds: number[]): StateChange[] {
    const changes: StateChange[] = [];
    const monitoredUserSet = new Set(monitoredIds);
    
    if (!oldTable) {
      // New table - check if it has monitored users
      const monitoredUsersInTable = this.findMonitoredUsers(
        { nomeRistorante: newTable.nomeRistorante, partecipanti: this.convertToPartecipanti(newTable.partecipanti) },
        monitoredIds
      );
      
      for (const userId of monitoredUsersInTable) {
        const participant = newTable.partecipanti.find(p => parseInt(p.idUtente) === userId);
        changes.push({
          type: 'user_joined',
          tableId: newTable.idTavolo,
          tableName: newTable.nomeRistorante,
          monitoredUserId: userId,
          details: { table: newTable, participant }
        });
      }
      
      return changes;
    }
    
    // Compare participants between old and new table states
    const oldParticipants = new Map(
      oldTable.partecipanti.map(p => [p.idUtente, p])
    );
    const newParticipants = new Map(
      newTable.partecipanti.map(p => [p.idUtente, p])
    );
    
    // Check for users who joined
    for (const [userId, participant] of newParticipants) {
      if (!oldParticipants.has(userId)) {
        const userIdNum = parseInt(userId);
        if (monitoredUserSet.has(userIdNum)) {
          changes.push({
            type: 'user_joined',
            tableId: newTable.idTavolo,
            tableName: newTable.nomeRistorante,
            monitoredUserId: userIdNum,
            details: { table: newTable, participant }
          });
        } else {
          // Non-monitored user joined a table with monitored users
          const hasMonitoredUsers = newTable.partecipanti
            .some(p => monitoredUserSet.has(parseInt(p.idUtente)));
          
          if (hasMonitoredUsers) {
            changes.push({
              type: 'participant_joined',
              tableId: newTable.idTavolo,
              tableName: newTable.nomeRistorante,
              participantName: `${participant.nome} ${participant.cognome}`,
              details: { table: newTable, participant }
            });
          }
        }
      }
    }
    
    // Check for users who left
    for (const [userId, participant] of oldParticipants) {
      if (!newParticipants.has(userId)) {
        const userIdNum = parseInt(userId);
        if (monitoredUserSet.has(userIdNum)) {
          changes.push({
            type: 'user_left',
            tableId: oldTable.idTavolo,
            tableName: oldTable.nomeRistorante,
            monitoredUserId: userIdNum,
            details: { participant }
          });
        } else {
          // Non-monitored user left a table with monitored users
          const hasMonitoredUsers = oldTable.partecipanti
            .some(p => monitoredUserSet.has(parseInt(p.idUtente)));
          
          if (hasMonitoredUsers) {
            changes.push({
              type: 'participant_left',
              tableId: oldTable.idTavolo,
              tableName: oldTable.nomeRistorante,
              participantName: `${participant.nome} ${participant.cognome}`,
              details: { participant }
            });
          }
        }
      }
    }
    
    // Check for table updates (same participants but different details)
    if (this.hasTableDetailsChanged(oldTable, newTable)) {
      const hasMonitoredUsers = newTable.partecipanti
        .some(p => monitoredUserSet.has(parseInt(p.idUtente)));
      
      if (hasMonitoredUsers && 
          oldParticipants.size === newParticipants.size &&
          [...newParticipants.keys()].every(id => oldParticipants.has(id))) {
        changes.push({
          type: 'table_updated',
          tableId: newTable.idTavolo,
          tableName: newTable.nomeRistorante,
          details: { previousTable: oldTable, currentTable: newTable }
        });
      }
    }
    
    return changes;
  }

  /**
   * Converts ParticipantState array to Partecipante array for API compatibility
   */
  private convertToPartecipanti(participants: ParticipantState[]) {
    return participants.map(p => ({
      idUtente: p.idUtente,
      sessoMaschile: p.sessoMaschile,
      nome: p.nome,
      cognome: p.cognome,
      dataDiNascita: p.dataDiNascita,
      partecipante: p.partecipante
    }));
  }

  /**
   * Determines if table details have changed beyond just participant changes
   */
  private hasTableDetailsChanged(oldTable: TableState, newTable: TableState): boolean {
    // Check if lastUpdated timestamp changed
    if (oldTable.lastUpdated !== newTable.lastUpdated) {
      return true;
    }
    
    // Check if restaurant name changed (unlikely but possible)
    if (oldTable.nomeRistorante !== newTable.nomeRistorante) {
      return true;
    }
    
    // Could add more detailed comparison logic here if needed
    // For now, we rely primarily on lastUpdated timestamp
    return false;
  }
}