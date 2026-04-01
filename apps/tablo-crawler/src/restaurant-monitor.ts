import { AppConfig } from './config.js';
import { TABLO_API_SUCCESS_CODE, TabloClient, TavoloDetails } from './http.js';
import { MonitoringNotifier } from './monitoring-notifier.js';
import { RestaurantLoader } from './restaurant-loader.js';
import { MonitoringState, RestaurantTableState, StateChange, StateManager } from './state-manager.js';

export interface RestaurantMonitorConfig extends AppConfig {
    restaurantIdsFilePath: string;
    stateFilePath: string;
    monitoringIntervalSeconds: number;
}

export interface RestaurantMonitor {
    startMonitoring(config: RestaurantMonitorConfig): Promise<void>;
    performScan(): Promise<void>;
    processChanges(changes: StateChange[]): Promise<void>;
}

export class ContinuousRestaurantMonitor implements RestaurantMonitor {
    private isRunning = false;
    private currentConfig?: RestaurantMonitorConfig;
    private monitoredRestaurants: string[] = [];
    private previousState?: MonitoringState;

    constructor(
        private tabloClient: TabloClient,
        private restaurantLoader: RestaurantLoader,
        private stateManager: StateManager,
        private notifier: MonitoringNotifier
    ) { }

    async startMonitoring(config: RestaurantMonitorConfig): Promise<void> {
        // Validate configuration
        this.validateConfig(config);

        this.currentConfig = config;
        this.isRunning = true;

        console.log('🚀 Starting restaurant monitoring service...');
        console.log(`📁 Restaurant IDs file: ${config.restaurantIdsFilePath}`);
        console.log(`💾 State file: ${config.stateFilePath}`);
        console.log(`⏱️  Scan interval: ${config.monitoringIntervalSeconds} seconds`);
        console.log(`📅 Days to scan: ${config.daysToScan}`);
        console.log(`🔗 API base URL: ${config.baseUrl}`);

        // Set up graceful shutdown handlers
        this.setupShutdownHandlers();

        try {
            // Load monitored restaurant IDs
            try {
                this.monitoredRestaurants = await this.restaurantLoader.loadRestaurantIds(config.restaurantIdsFilePath);
            } catch (error) {
                console.error('❌ Failed to load restaurant IDs:', error);
                console.warn('⚠️  Continuing with empty restaurant list');
                this.monitoredRestaurants = [];
            }

            if (this.monitoredRestaurants.length === 0) {
                console.warn('⚠️  No restaurant IDs to monitor. Service will continue but no notifications will be sent.');
            } else {
                console.log(`🏪 Monitoring ${this.monitoredRestaurants.length} restaurants: ${this.monitoredRestaurants.join(', ')}`);
            }

            // Load previous state
            try {
                this.previousState = await this.stateManager.loadState(config.stateFilePath);
                this.previousState.monitoredRestaurants = this.monitoredRestaurants; // Update monitored restaurants list
            } catch (error) {
                console.error('❌ Failed to load state file:', error);
                console.warn('⚠️  Starting with fresh state');
                this.previousState = {
                    tables: {},
                    monitoredUsers: [],
                    lastScanTime: new Date().toISOString(),
                    suspiciousTables: {},
                    knownTableIds: [],
                    restaurantTables: {},
                    monitoredRestaurants: this.monitoredRestaurants
                };
            }

            // Send startup notification
            if (this.monitoredRestaurants.length > 0) {
                try {
                    await this.notifier.sendRestaurantMonitoringStartedNotification(
                        this.monitoredRestaurants,
                        config
                    );
                    console.log('✅ Startup notification sent');
                } catch (error) {
                    console.error('❌ Failed to send startup notification:', error);
                    console.warn('⚠️  Continuing with monitoring despite notification failure');
                }
            }

            // Print initialization complete divider
            console.log('');
            console.log('═'.repeat(80));
            console.log('🎯 INITIALIZATION COMPLETE - STARTING RESTAURANT MONITORING LOOP');
            console.log('═'.repeat(80));
            console.log('');

            // Start monitoring loop
            await this.runMonitoringLoop();

        } catch (error) {
            console.error('❌ Fatal error in restaurant monitoring service:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async performScan(): Promise<void> {
        if (!this.currentConfig) {
            throw new Error('Monitoring not started - call startMonitoring first');
        }

        console.log('─'.repeat(60));
        console.log(`🔍 Starting restaurant scan at ${new Date().toLocaleString()}...`);
        console.log('─'.repeat(60));

        try {
            // Scan all monitored restaurants
            const currentState = await this.scanRestaurantTables();

            // Compare with previous state to detect changes
            const changes = this.stateManager.compareRestaurantStates(
                this.previousState!,
                currentState,
                this.currentConfig.gracePeriodScans
            );

            if (changes.length > 0) {
                console.log(`📊 Detected ${changes.length} restaurant changes`);
                await this.processChanges(changes);
            } else {
                console.log('✅ No restaurant changes detected');
            }

            // Save current state and update previous state
            try {
                await this.stateManager.saveState(currentState, this.currentConfig.stateFilePath);
                this.previousState = currentState;
            } catch (saveError) {
                console.error('❌ Failed to save state file:', saveError);
                console.warn('⚠️  State not persisted, but monitoring will continue with in-memory state');
                // Update in-memory state even if save failed
                this.previousState = currentState;
            }

            console.log(`✅ Restaurant scan completed at ${new Date().toLocaleString()}`);
            console.log('─'.repeat(60));

        } catch (error) {
            console.error('❌ Error during restaurant scan:', error);
            // Don't throw - we want to continue monitoring despite individual scan failures
        }
    }

    async processChanges(changes: StateChange[]): Promise<void> {
        for (const change of changes) {
            try {
                console.log(`📢 Processing restaurant change: ${change.type} for table ${change.tableId}`);

                switch (change.type) {
                    case 'restaurant_table_created':
                        await this.handleRestaurantTableCreated(change);
                        break;
                    case 'restaurant_participant_joined':
                        await this.handleRestaurantParticipantJoined(change);
                        break;
                    case 'restaurant_participant_left':
                        await this.handleRestaurantParticipantLeft(change);
                        break;
                    case 'restaurant_table_cancelled':
                        await this.notifier.sendRestaurantTableCancelledNotification(change);
                        break;
                    case 'restaurant_table_finished':
                        await this.notifier.sendRestaurantTableFinishedNotification(change);
                        break;
                    default:
                        console.warn(`Unknown restaurant change type: ${change.type}`);
                }
            } catch (error) {
                console.error(`❌ Error processing restaurant change ${change.type} for table ${change.tableId}:`, error);
                // Continue processing other changes even if one fails
            }
        }
    }

    private async runMonitoringLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                await this.performScan();
            } catch (error) {
                console.error('❌ Error in restaurant monitoring loop:', error);
                // Continue monitoring despite errors
            }

            if (this.isRunning) {
                console.log(`⏳ Waiting ${this.currentConfig!.monitoringIntervalSeconds} seconds until next scan...`);
                await this.sleep(this.currentConfig!.monitoringIntervalSeconds * 1000);
            }
        }
    }

    private async scanRestaurantTables(): Promise<MonitoringState> {
        const restaurantTables: Record<string, RestaurantTableState> = {};
        let successfulScans = 0;
        let failedScans = 0;

        // Scan tables for each monitored restaurant across multiple days
        for (const restaurantId of this.monitoredRestaurants) {
            console.log(`🏪 Scanning restaurant ${restaurantId}...`);

            for (let dayOffset = 0; dayOffset < this.currentConfig!.daysToScan; dayOffset++) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

                try {
                    const tables = await this.scanSingleRestaurant(restaurantId, dateStr);

                    for (const table of tables) {
                        restaurantTables[table.idTavolo] = table;
                    }

                    successfulScans++;

                    // Add small delay between day scans
                    await this.sleep(100);

                } catch (error) {
                    failedScans++;
                    console.error(`❌ Error scanning restaurant ${restaurantId} for ${dateStr}:`, error);
                    console.log(`⚠️  Continuing with other restaurants/days...`);
                    // Continue with other days/restaurants
                }
            }

            // Add delay between restaurant scans
            await this.sleep(200);
        }

        console.log(`📊 Found ${Object.keys(restaurantTables).length} tables across ${this.monitoredRestaurants.length} monitored restaurants`);
        console.log(`📈 Scan statistics: ${successfulScans} successful, ${failedScans} failed`);

        return {
            tables: this.previousState?.tables || {},
            monitoredUsers: this.previousState?.monitoredUsers || [],
            lastScanTime: new Date().toISOString(),
            suspiciousTables: this.previousState?.suspiciousTables || {},
            knownTableIds: this.previousState?.knownTableIds || [],
            restaurantTables,
            monitoredRestaurants: this.monitoredRestaurants
        };
    }

    private async scanSingleRestaurant(restaurantId: string, date: string): Promise<RestaurantTableState[]> {
        const tables: RestaurantTableState[] = [];

        try {
            // Get table summaries for this date
            // Note: The API doesn't support filtering by idRistorante in the request,
            // so we fetch all tables and filter afterwards
            const tablesResponse = await this.retryApiCall(
                () => this.tabloClient.getTavoliNewOrder({
                    dateTavolo: `["${date}"]`,
                    // Remove demographic filters to get ALL near tables
                    // We need to check every table to find monitored users
                    raggio: this.currentConfig?.searchRadius ?? "4",
                    lat: this.currentConfig?.latitude ?? "45.408153",
                    lng: this.currentConfig?.longitude ?? "11.875273",
                    mappa: "0",
                    page: "0",
                    orderType: "filtering",
                    itemPerPage: "50",
                }),
                `getTavoliNewOrder for ${date}`
            );

            if (tablesResponse.code !== TABLO_API_SUCCESS_CODE || !tablesResponse.tavoli) {
                console.log(`ℹ️  No tables found for ${date}`);
                return tables;
            }

            // Filter tables by restaurant ID
            const restaurantTables = tablesResponse.tavoli.filter(table =>
                table.idRistorante && table.idRistorante === restaurantId
            );

            if (restaurantTables.length === 0) {
                console.log(`ℹ️  No tables found for restaurant ${restaurantId} on ${date}`);
                return tables;
            }

            console.log(`📋 Found ${restaurantTables.length} tables for restaurant ${restaurantId} on ${date}`);

            // Get detailed information for each table
            for (const tableSummary of restaurantTables) {
                try {
                    // Skip tables that are already finished (in the past)
                    if (tableSummary.quando) {
                        const tableDateTime = new Date(tableSummary.quando);
                        const now = new Date();
                        if (tableDateTime < now) {
                            continue;
                        }
                    }

                    const tableResponse = await this.retryApiCall(
                        () => this.tabloClient.getTavolo(tableSummary.idTavolo),
                        `getTavolo for ${tableSummary.idTavolo}`,
                        2,
                        500
                    );

                    if (tableResponse.code !== TABLO_API_SUCCESS_CODE || !tableResponse.tavolo) {
                        console.warn(`⚠️  Could not get details for table ${tableSummary.idTavolo}`);
                        continue;
                    }

                    const tableDetails = tableResponse.tavolo;

                    // Determine if this is a new table or existing one
                    const previousTable = this.previousState?.restaurantTables?.[tableSummary.idTavolo];
                    const firstSeen = previousTable?.firstSeen || new Date().toISOString();

                    // Convert to RestaurantTableState format
                    const tableState: RestaurantTableState = {
                        idTavolo: tableSummary.idTavolo,
                        idRistorante: restaurantId,
                        nomeRistorante: tableDetails.nomeRistorante,
                        partecipanti: tableDetails.partecipanti.map(p => ({
                            idUtente: p.idUtente,
                            nome: p.nome,
                            cognome: p.cognome,
                            sessoMaschile: p.sessoMaschile,
                            dataDiNascita: p.dataDiNascita,
                            partecipante: p.partecipante
                        })),
                        lastUpdated: new Date().toISOString(),
                        quando: tableSummary.quando,
                        firstSeen
                    };

                    tables.push(tableState);

                    // Add small delay between API calls
                    await this.sleep(100);

                } catch (error) {
                    console.error(`❌ Error getting details for table ${tableSummary.idTavolo}:`, error);
                    console.log(`⚠️  Skipping table ${tableSummary.idTavolo} and continuing with others...`);
                    // Continue with other tables
                }
            }

        } catch (error) {
            console.error(`❌ Error scanning restaurant ${restaurantId} for ${date}:`, error);
            console.log(`⚠️  Failed to scan restaurant ${restaurantId} on ${date}, will retry on next scan cycle`);
            // Log and continue - this is handled by the caller
            throw error;
        }

        return tables;
    }

    private async handleRestaurantTableCreated(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for restaurant table created notification ${change.tableId}`,
                2,
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendRestaurantTableCreatedNotification(change, tableResponse.tavolo);
                console.log(`✅ Restaurant table created notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for restaurant table created notification: ${change.tableId}`);
                // Send notification with cached details if available
                if (change.details?.table) {
                    await this.notifier.sendRestaurantTableCreatedNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Restaurant table created notification sent with cached details for table ${change.tableId}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error handling restaurant table created for table ${change.tableId}:`, error);
            // Try with cached details as fallback
            try {
                if (change.details?.table) {
                    await this.notifier.sendRestaurantTableCreatedNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Fallback restaurant table created notification sent for table ${change.tableId}`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback restaurant table created notification failed:`, fallbackError);
            }
        }
    }

    private async handleRestaurantParticipantJoined(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for restaurant participant joined notification ${change.tableId}`,
                2,
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendRestaurantParticipantJoinedNotification(change, tableResponse.tavolo);
                console.log(`✅ Restaurant participant joined notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for restaurant participant joined notification: ${change.tableId}`);
                if (change.details?.table) {
                    await this.notifier.sendRestaurantParticipantJoinedNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Restaurant participant joined notification sent with cached details for table ${change.tableId}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error handling restaurant participant joined for table ${change.tableId}:`, error);
            try {
                if (change.details?.table) {
                    await this.notifier.sendRestaurantParticipantJoinedNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Fallback restaurant participant joined notification sent for table ${change.tableId}`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback restaurant participant joined notification failed:`, fallbackError);
            }
        }
    }

    private async handleRestaurantParticipantLeft(change: StateChange): Promise<void> {
        try {
            // Get fresh table details for the notification
            const tableResponse = await this.retryApiCall(
                () => this.tabloClient.getTavolo(change.tableId),
                `getTavolo for restaurant participant left notification ${change.tableId}`,
                2,
                500
            );

            if (tableResponse.code === TABLO_API_SUCCESS_CODE && tableResponse.tavolo) {
                await this.notifier.sendRestaurantParticipantLeftNotification(change, tableResponse.tavolo);
                console.log(`✅ Restaurant participant left notification sent for table ${change.tableId}`);
            } else {
                console.warn(`⚠️  Could not get fresh table details for restaurant participant left notification: ${change.tableId}`);
                if (change.details?.table) {
                    await this.notifier.sendRestaurantParticipantLeftNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Restaurant participant left notification sent with cached details for table ${change.tableId}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error handling restaurant participant left for table ${change.tableId}:`, error);
            try {
                if (change.details?.table) {
                    await this.notifier.sendRestaurantParticipantLeftNotification(change, this.convertToTavoloDetails(change.details.table));
                    console.log(`✅ Fallback restaurant participant left notification sent for table ${change.tableId}`);
                }
            } catch (fallbackError) {
                console.error(`❌ Fallback restaurant participant left notification failed:`, fallbackError);
            }
        }
    }

    private convertToTavoloDetails(tableState: RestaurantTableState): TavoloDetails {
        return {
            nomeRistorante: tableState.nomeRistorante,
            partecipanti: tableState.partecipanti.map(p => ({
                idUtente: p.idUtente,
                nome: p.nome,
                cognome: p.cognome,
                sessoMaschile: p.sessoMaschile,
                dataDiNascita: p.dataDiNascita,
                partecipante: p.partecipante
            })),
            quando: tableState.quando
        };
    }

    private setupShutdownHandlers(): void {
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n🛑 Received ${signal}, shutting down restaurant monitoring gracefully...`);
            this.isRunning = false;

            try {
                if (this.previousState && this.currentConfig) {
                    console.log('💾 Saving final state...');
                    await this.stateManager.saveState(this.previousState, this.currentConfig.stateFilePath);
                    console.log('✅ State saved successfully');
                }
            } catch (error) {
                console.error('❌ Error saving state during shutdown:', error);
            }

            console.log('👋 Restaurant monitoring service stopped');
            process.exit(0);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private validateConfig(config: RestaurantMonitorConfig): void {
        if (!config.authToken) {
            throw new Error('❌ Missing authentication token. Set TABLO_AUTH_TOKEN or use --auth-token');
        }

        if (!config.baseUrl) {
            throw new Error('❌ Missing API base URL. Set API_BASE_URL or use --api-base-url');
        }

        if (config.monitoringIntervalSeconds < 10) {
            console.warn('⚠️  Warning: Scan interval is very short (<10s). This may cause API rate limiting.');
        }

        if (config.daysToScan < 1) {
            throw new Error('❌ Days to scan must be at least 1');
        }

        console.log('✅ Restaurant monitoring configuration validated successfully');
    }

    private async retryApiCall<T>(
        apiCall: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, lastError.message);
                    throw lastError;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }
}

/**
 * Factory function to create a RestaurantMonitor with all dependencies
 */
export function createRestaurantMonitor(
    tabloClient: TabloClient,
    restaurantLoader: RestaurantLoader,
    stateManager: StateManager,
    notifier: MonitoringNotifier
): RestaurantMonitor {
    return new ContinuousRestaurantMonitor(tabloClient, restaurantLoader, stateManager, notifier);
}
