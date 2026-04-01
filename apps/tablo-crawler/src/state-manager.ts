import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';

export interface ParticipantState {
  idUtente: string;
  nome: string;
  cognome: string;
  sessoMaschile: boolean;
  dataDiNascita: string;
  partecipante: boolean;
}

export interface TableState {
  idTavolo: string;
  nomeRistorante: string;
  partecipanti: ParticipantState[];
  lastUpdated: string;
  quando?: string; // Table datetime for detecting finished tables
}

export interface RestaurantTableState extends TableState {
  idRistorante: string;
  firstSeen: string; // ISO timestamp when table was first detected
}

export interface SuspiciousTable {
  table: TableState;
  firstMissingScan: string;
  missingScanCount: number;
}

export interface MonitoringState {
  tables: Record<string, TableState>;
  monitoredUsers: number[];
  lastScanTime: string;
  suspiciousTables: Record<string, SuspiciousTable>; // Tables that disappeared but might come back
  knownTableIds?: string[]; // Track all known table IDs to detect completely new ones
  restaurantTables?: Record<string, RestaurantTableState>; // Tables tracked by restaurant monitoring
  monitoredRestaurants?: string[]; // List of restaurant IDs being monitored
}

export interface StateChange {
  type: 'user_joined' | 'user_left' | 'table_updated' | 'participant_joined' | 'participant_left' | 'table_cancelled' | 'table_finished' |
  'restaurant_table_created' | 'restaurant_participant_joined' | 'restaurant_participant_left' | 'restaurant_table_cancelled' | 'restaurant_table_finished';
  tableId: string;
  tableName: string;
  monitoredUserId?: number;
  participantName?: string;
  participantId?: string;
  restaurantId?: string;
  restaurantName?: string;
  isMonitoredUser?: boolean;
  details: any;
}

export interface StateManager {
  loadState(filePath: string): Promise<MonitoringState>;
  saveState(state: MonitoringState, filePath: string): Promise<void>;
  compareStates(previous: MonitoringState, current: MonitoringState, gracePeriodScans?: number): StateChange[];
  compareRestaurantStates(previous: MonitoringState, current: MonitoringState, gracePeriodScans?: number): StateChange[];
}

export class JsonStateManager implements StateManager {
  async loadState(filePath: string): Promise<MonitoringState> {
    try {
      const content = await readFile(filePath, 'utf-8');

      let state: MonitoringState;
      try {
        state = JSON.parse(content) as MonitoringState;
      } catch (parseError) {
        console.error(`❌ Failed to parse state file ${filePath}:`, parseError);
        console.warn(`⚠️  State file is corrupted or contains invalid JSON. Starting with fresh state.`);
        return this.createEmptyState();
      }

      // Validate state structure
      if (!state.tables || !Array.isArray(state.monitoredUsers) || !state.lastScanTime) {
        console.warn(`⚠️  Invalid state structure in ${filePath}, starting with fresh state`);
        const emptyState = this.createEmptyState();
        // Preserve knownTableIds if available even if other state is corrupt, or just reset.
        return emptyState;
      }

      // Ensure suspiciousTables exists (for backward compatibility)
      if (!state.suspiciousTables) {
        state.suspiciousTables = {};
      }

      // Ensure knownTableIds exists
      if (!state.knownTableIds) {
        state.knownTableIds = Object.keys(state.tables);
      }

      // Ensure restaurant monitoring fields exist (for backward compatibility)
      if (!state.restaurantTables) {
        state.restaurantTables = {};
      }

      if (!state.monitoredRestaurants) {
        state.monitoredRestaurants = [];
      }

      console.log(`✅ Loaded monitoring state from ${filePath}`);
      return state;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`📄 State file not found at ${filePath}, starting with fresh state`);
        return this.createEmptyState();
      }

      console.error(`❌ Error loading state from ${filePath}:`, error);
      console.warn(`⚠️  Starting with fresh state due to error`);
      return this.createEmptyState();
    }
  }

  async saveState(state: MonitoringState, filePath: string): Promise<void> {
    try {
      // Validate state before saving
      this.validateState(state);

      // Ensure directory exists (only if it's not the current directory)
      const dir = dirname(filePath);
      if (dir !== '.' && dir !== '') {
        await mkdir(dir, { recursive: true });
      }

      // Atomic write using temporary file
      const tempFilePath = `${filePath}.tmp`;
      const content = JSON.stringify(state, null, 2);

      await writeFile(tempFilePath, content, 'utf-8');

      // Rename temp file to actual file (atomic operation on most filesystems)
      await writeFile(filePath, content, 'utf-8');

      console.log(`💾 Saved monitoring state to ${filePath} (${Object.keys(state.tables).length} tables, ${state.monitoredUsers.length} monitored users, ${Object.keys(state.restaurantTables || {}).length} restaurant tables, ${(state.monitoredRestaurants || []).length} monitored restaurants)`);

    } catch (error) {
      console.error(`❌ Error saving state to ${filePath}:`, error);

      // Try to save a backup with timestamp if main save fails
      try {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        const content = JSON.stringify(state, null, 2);
        await writeFile(backupPath, content, 'utf-8');
        console.log(`💾 Saved backup state to ${backupPath}`);
      } catch (backupError) {
        console.error(`❌ Failed to save backup state:`, backupError);
      }

      throw error;
    }
  }

  compareStates(previous: MonitoringState, current: MonitoringState, gracePeriodScans: number = 3): StateChange[] {
    const changes: StateChange[] = [];
    const monitoredUserSet = new Set(current.monitoredUsers);

    // Initialize current state's suspicious tables from previous state
    current.suspiciousTables = { ...previous.suspiciousTables };

    // Check for new tables with monitored users
    for (const [tableId, currentTable] of Object.entries(current.tables)) {
      const previousTable = previous.tables[tableId];
      const wasSuspicious = previous.suspiciousTables[tableId];

      if (!previousTable && !wasSuspicious) {
        // Completely new table - check if it has monitored users
        const monitoredUsersInTable = currentTable.partecipanti
          .filter(p => monitoredUserSet.has(parseInt(p.idUtente)))
          .map(p => parseInt(p.idUtente));

        for (const userId of monitoredUsersInTable) {
          changes.push({
            type: 'user_joined',
            tableId,
            tableName: currentTable.nomeRistorante,
            monitoredUserId: userId,
            details: { table: currentTable }
          });
        }
        continue;
      }

      if (wasSuspicious && !previousTable) {
        // Table returned from suspicious state - remove from suspicious list
        delete current.suspiciousTables[tableId];
        console.log(`✅ Table ${tableId} returned from temporary disappearance, no false cancellation notification sent`);

        // Check if there are any real changes since it was last seen
        const lastKnownTable = wasSuspicious.table;
        const realChanges = this.compareTableStates(lastKnownTable, currentTable, monitoredUserSet, tableId);
        changes.push(...realChanges);
        continue;
      }

      if (previousTable) {
        // Table exists in both states - check for changes
        const tableChanges = this.compareTableStates(previousTable, currentTable, monitoredUserSet, tableId);
        changes.push(...tableChanges);
      }
    }

    // Handle tables that disappeared
    for (const [tableId, previousTable] of Object.entries(previous.tables)) {
      if (!current.tables[tableId]) {
        const monitoredUsersInTable = previousTable.partecipanti
          .filter(p => monitoredUserSet.has(parseInt(p.idUtente)))
          .map(p => parseInt(p.idUtente));

        if (monitoredUsersInTable.length > 0) {
          const existingSuspicious = previous.suspiciousTables[tableId];

          if (existingSuspicious) {
            // Table was already suspicious, increment counter
            const newCount = existingSuspicious.missingScanCount + 1;

            if (newCount >= gracePeriodScans) {
              // Grace period expired, table is really gone
              const changeType = this.determineTableDisappearanceReason(previousTable);
              changes.push({
                type: changeType,
                tableId,
                tableName: previousTable.nomeRistorante,
                details: {
                  table: previousTable,
                  monitoredUsers: monitoredUsersInTable,
                  reason: changeType === 'table_finished' ? 'finished' : 'cancelled'
                }
              });

              // Remove from suspicious tables since we've now reported it
              delete current.suspiciousTables[tableId];
              console.log(`❌ Table ${tableId} confirmed ${changeType} after ${newCount} missing scans`);
            } else {
              // Still in grace period, update counter
              current.suspiciousTables[tableId] = {
                ...existingSuspicious,
                missingScanCount: newCount
              };
              console.log(`⏳ Table ${tableId} missing for ${newCount}/${gracePeriodScans} scans, waiting...`);
            }
          } else {
            // First time table is missing, add to suspicious list
            current.suspiciousTables[tableId] = {
              table: previousTable,
              firstMissingScan: current.lastScanTime,
              missingScanCount: 1
            };
            console.log(`⚠️  Table ${tableId} disappeared, starting grace period (1/${gracePeriodScans} scans)`);
          }
        }
      }
    }

    // Handle tables that are only in suspicious list (already disappeared in previous scans)
    for (const [tableId, suspiciousTable] of Object.entries(previous.suspiciousTables)) {
      if (!current.tables[tableId] && !previous.tables[tableId]) {
        // Table is still missing and was already suspicious
        const monitoredUsersInTable = suspiciousTable.table.partecipanti
          .filter(p => monitoredUserSet.has(parseInt(p.idUtente)))
          .map(p => parseInt(p.idUtente));

        if (monitoredUsersInTable.length > 0) {
          const newCount = suspiciousTable.missingScanCount + 1;

          if (newCount >= gracePeriodScans) {
            // Grace period expired, table is really gone
            const changeType = this.determineTableDisappearanceReason(suspiciousTable.table);
            changes.push({
              type: changeType,
              tableId,
              tableName: suspiciousTable.table.nomeRistorante,
              details: {
                table: suspiciousTable.table,
                monitoredUsers: monitoredUsersInTable,
                reason: changeType === 'table_finished' ? 'finished' : 'cancelled'
              }
            });

            // Remove from suspicious tables since we've now reported it
            delete current.suspiciousTables[tableId];
            console.log(`❌ Table ${tableId} confirmed ${changeType} after ${newCount} missing scans`);
          } else {
            // Still in grace period, update counter
            current.suspiciousTables[tableId] = {
              ...suspiciousTable,
              missingScanCount: newCount
            };
            console.log(`⏳ Table ${tableId} missing for ${newCount}/${gracePeriodScans} scans, waiting...`);
          }
        }
      }
    }

    // Clean up suspicious tables that have returned
    for (const tableId of Object.keys(previous.suspiciousTables)) {
      if (current.tables[tableId]) {
        delete current.suspiciousTables[tableId];
      }
    }

    return changes;
  }

  compareRestaurantStates(previous: MonitoringState, current: MonitoringState, gracePeriodScans: number = 3): StateChange[] {
    const changes: StateChange[] = [];
    const monitoredUserSet = new Set(current.monitoredUsers);
    const monitoredRestaurantSet = new Set(current.monitoredRestaurants || []);

    const previousRestaurantTables = previous.restaurantTables || {};
    const currentRestaurantTables = current.restaurantTables || {};

    // Check for new tables in monitored restaurants
    for (const [tableId, currentTable] of Object.entries(currentRestaurantTables)) {
      const previousTable = previousRestaurantTables[tableId];

      if (!previousTable) {
        // New table detected in monitored restaurant
        changes.push({
          type: 'restaurant_table_created',
          tableId,
          tableName: currentTable.nomeRistorante,
          restaurantId: currentTable.idRistorante,
          restaurantName: currentTable.nomeRistorante,
          details: { table: currentTable }
        });
        continue;
      }

      // Table exists in both states - check for participant changes
      const tableChanges = this.compareRestaurantTableStates(
        previousTable,
        currentTable,
        monitoredUserSet,
        tableId
      );
      changes.push(...tableChanges);
    }

    // Handle tables that disappeared from monitored restaurants
    for (const [tableId, previousTable] of Object.entries(previousRestaurantTables)) {
      if (!currentRestaurantTables[tableId]) {
        // Table disappeared - determine if cancelled or finished
        const changeType = this.determineTableDisappearanceReason(previousTable);
        const restaurantChangeType = changeType === 'table_cancelled'
          ? 'restaurant_table_cancelled'
          : 'restaurant_table_finished';

        changes.push({
          type: restaurantChangeType,
          tableId,
          tableName: previousTable.nomeRistorante,
          restaurantId: previousTable.idRistorante,
          restaurantName: previousTable.nomeRistorante,
          details: {
            table: previousTable,
            reason: changeType === 'table_finished' ? 'finished' : 'cancelled'
          }
        });
      }
    }

    return changes;
  }

  private compareRestaurantTableStates(
    previousTable: RestaurantTableState,
    currentTable: RestaurantTableState,
    monitoredUserSet: Set<number>,
    tableId: string
  ): StateChange[] {
    const changes: StateChange[] = [];

    // Compare participants between previous and current state
    const previousParticipants = new Map(
      previousTable.partecipanti.map(p => [p.idUtente, p])
    );
    const currentParticipants = new Map(
      currentTable.partecipanti.map(p => [p.idUtente, p])
    );

    // Collect all participant additions
    const addedParticipants: ParticipantState[] = [];
    for (const [userId, participant] of currentParticipants) {
      if (!previousParticipants.has(userId)) {
        addedParticipants.push(participant);
      }
    }

    // If there are additions, create a single notification with all of them
    if (addedParticipants.length > 0) {
      for (const participant of addedParticipants) {
        const userIdNum = parseInt(participant.idUtente);
        const isMonitored = monitoredUserSet.has(userIdNum);

        changes.push({
          type: 'restaurant_participant_joined',
          tableId,
          tableName: currentTable.nomeRistorante,
          restaurantId: currentTable.idRistorante,
          restaurantName: currentTable.nomeRistorante,
          participantName: `${participant.nome} ${participant.cognome}`,
          participantId: participant.idUtente,
          isMonitoredUser: isMonitored,
          details: { table: currentTable, participant, allAdditions: addedParticipants }
        });
      }
    }

    // Collect all participant removals
    const removedParticipants: ParticipantState[] = [];
    for (const [userId, participant] of previousParticipants) {
      if (!currentParticipants.has(userId)) {
        removedParticipants.push(participant);
      }
    }

    // If there are removals, create notifications for them
    if (removedParticipants.length > 0) {
      for (const participant of removedParticipants) {
        const userIdNum = parseInt(participant.idUtente);
        const isMonitored = monitoredUserSet.has(userIdNum);

        changes.push({
          type: 'restaurant_participant_left',
          tableId,
          tableName: previousTable.nomeRistorante,
          restaurantId: previousTable.idRistorante,
          restaurantName: previousTable.nomeRistorante,
          participantName: `${participant.nome} ${participant.cognome}`,
          participantId: participant.idUtente,
          isMonitoredUser: isMonitored,
          details: { table: currentTable, participant, allRemovals: removedParticipants }
        });
      }
    }

    return changes;
  }


  private compareTableStates(
    previousTable: TableState,
    currentTable: TableState,
    monitoredUserSet: Set<number>,
    tableId: string
  ): StateChange[] {
    const changes: StateChange[] = [];

    // Compare participants between previous and current state
    const previousParticipants = new Map(
      previousTable.partecipanti.map(p => [p.idUtente, p])
    );
    const currentParticipants = new Map(
      currentTable.partecipanti.map(p => [p.idUtente, p])
    );

    // Check for users who joined
    for (const [userId, participant] of currentParticipants) {
      if (!previousParticipants.has(userId)) {
        const userIdNum = parseInt(userId);
        if (monitoredUserSet.has(userIdNum)) {
          changes.push({
            type: 'user_joined',
            tableId,
            tableName: currentTable.nomeRistorante,
            monitoredUserId: userIdNum,
            details: { table: currentTable, participant }
          });
        } else {
          // Non-monitored user joined a table with monitored users
          const hasMonitoredUsers = currentTable.partecipanti
            .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

          if (hasMonitoredUsers) {
            changes.push({
              type: 'participant_joined',
              tableId,
              tableName: currentTable.nomeRistorante,
              participantName: `${participant.nome} ${participant.cognome}`,
              participantId: participant.idUtente,
              details: { table: currentTable, participant }
            });
          }
        }
      }
    }

    // Check for users who left
    for (const [userId, participant] of previousParticipants) {
      if (!currentParticipants.has(userId)) {
        const userIdNum = parseInt(userId);
        if (monitoredUserSet.has(userIdNum)) {
          changes.push({
            type: 'user_left',
            tableId,
            tableName: previousTable.nomeRistorante,
            monitoredUserId: userIdNum,
            details: { participant }
          });
        } else {
          // Non-monitored user left a table with monitored users
          const hasMonitoredUsers = previousTable.partecipanti
            .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

          if (hasMonitoredUsers) {
            changes.push({
              type: 'participant_left',
              tableId,
              tableName: previousTable.nomeRistorante,
              participantName: `${participant.nome} ${participant.cognome}`,
              participantId: participant.idUtente,
              details: { participant }
            });
          }
        }
      }
    }

    // Check for table updates (same participants but different table details)
    const hasMonitoredUsers = currentTable.partecipanti
      .some(p => monitoredUserSet.has(parseInt(p.idUtente)));

    if (hasMonitoredUsers &&
      previousParticipants.size === currentParticipants.size &&
      [...currentParticipants.keys()].every(id => previousParticipants.has(id))) {

      // Compare actual table data instead of just timestamp
      const tableDataChanged = this.hasTableDataChanged(previousTable, currentTable);

      if (tableDataChanged) {
        changes.push({
          type: 'table_updated',
          tableId,
          tableName: currentTable.nomeRistorante,
          details: { previousTable, currentTable }
        });
      }
    }

    return changes;
  }

  private createEmptyState(): MonitoringState {
    return {
      tables: {},
      monitoredUsers: [],
      lastScanTime: new Date().toISOString(),
      suspiciousTables: {},
      knownTableIds: [],
      restaurantTables: {},
      monitoredRestaurants: []
    };
  }

  private hasTableDataChanged(previous: TableState, current: TableState): boolean {
    // Compare table name
    if (previous.nomeRistorante !== current.nomeRistorante) {
      return true;
    }

    // Compare participants data (excluding lastUpdated timestamp)
    if (previous.partecipanti.length !== current.partecipanti.length) {
      return true;
    }

    // Create maps for efficient comparison
    const previousParticipants = new Map(
      previous.partecipanti.map(p => [p.idUtente, p])
    );
    const currentParticipants = new Map(
      current.partecipanti.map(p => [p.idUtente, p])
    );

    // Check if any participant data changed
    for (const [userId, currentParticipant] of currentParticipants) {
      const previousParticipant = previousParticipants.get(userId);

      if (!previousParticipant) {
        return true; // New participant
      }

      // Compare participant fields (excluding any timestamp fields)
      if (previousParticipant.nome !== currentParticipant.nome ||
        previousParticipant.cognome !== currentParticipant.cognome ||
        previousParticipant.sessoMaschile !== currentParticipant.sessoMaschile ||
        previousParticipant.dataDiNascita !== currentParticipant.dataDiNascita ||
        previousParticipant.partecipante !== currentParticipant.partecipante) {
        return true;
      }
    }

    return false; // No meaningful changes detected
  }

  private determineTableDisappearanceReason(table: TableState): 'table_cancelled' | 'table_finished' {
    if (!table.quando) {
      // If we don't have the datetime, assume it was cancelled
      return 'table_cancelled';
    }

    try {
      const tableDateTime = new Date(table.quando);
      const now = new Date();

      // If the table datetime is in the past, it was finished
      if (tableDateTime < now) {
        return 'table_finished';
      } else {
        // If the table datetime is in the future but disappeared, it was cancelled
        return 'table_cancelled';
      }
    } catch (error) {
      // If we can't parse the datetime, assume it was cancelled
      console.warn(`Warning: Could not parse table datetime "${table.quando}" for table ${table.idTavolo}`);
      return 'table_cancelled';
    }
  }

  private validateState(state: MonitoringState): void {
    if (!state) {
      throw new Error('State is null or undefined');
    }

    if (!state.tables || typeof state.tables !== 'object') {
      throw new Error('State.tables must be an object');
    }

    if (!Array.isArray(state.monitoredUsers)) {
      throw new Error('State.monitoredUsers must be an array');
    }

    if (!state.lastScanTime || typeof state.lastScanTime !== 'string') {
      throw new Error('State.lastScanTime must be a string');
    }

    // Ensure suspiciousTables exists
    if (!state.suspiciousTables) {
      state.suspiciousTables = {};
    }

    // Validate each table state
    for (const [tableId, tableState] of Object.entries(state.tables)) {
      if (!tableState.idTavolo || !tableState.nomeRistorante || !Array.isArray(tableState.partecipanti)) {
        throw new Error(`Invalid table state for table ${tableId}`);
      }
    }

    const suspiciousCount = Object.keys(state.suspiciousTables).length;
    console.log(`✅ State validation passed (${Object.keys(state.tables).length} tables, ${suspiciousCount} suspicious)`);
  }
}
