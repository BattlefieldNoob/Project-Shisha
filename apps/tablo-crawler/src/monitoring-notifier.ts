import {
    convertParticipantStates,
    formatGenderStats,
    formatMonitoredUsersList,
    formatNotificationTimestamp,
    formatParticipantInfo,
    formatTableDateTime,
    formatTableHeader,
    formatTableParticipants,
    formatUserInfo
} from './format';
import { Partecipante, TavoloDetails } from './http';
import { MessageService } from './message';
import { ParticipantState, StateChange } from './state-manager';

export interface MonitoringNotifier extends MessageService {
    sendUserJoinedNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
    sendUserLeftNotification(change: StateChange): Promise<void>;
    sendParticipantChangeNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
    sendTableUpdateNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void>;
    sendTableCancelledNotification(change: StateChange): Promise<void>;
    sendTableFinishedNotification(change: StateChange): Promise<void>;
    sendTableFinishedNotification(change: StateChange): Promise<void>;
    sendNewFemaleTableNotification(tableDetails: TavoloDetails): Promise<void>;
    sendMonitoringStartedNotification(monitoredUsers: number[], config: any): Promise<void>;

    // Restaurant monitoring notification methods
    sendRestaurantMonitoringStartedNotification(monitoredRestaurants: string[], config: any): Promise<void>;
    sendRestaurantTableCreatedNotification(change: StateChange, table: TavoloDetails): Promise<void>;
    sendRestaurantParticipantJoinedNotification(change: StateChange, table: TavoloDetails): Promise<void>;
    sendRestaurantParticipantLeftNotification(change: StateChange, table: TavoloDetails): Promise<void>;
    sendRestaurantTableCancelledNotification(change: StateChange): Promise<void>;
    sendRestaurantTableFinishedNotification(change: StateChange): Promise<void>;
}


export class DetailedMonitoringNotifier implements MonitoringNotifier {
    constructor(private messageService: MessageService) { }

    async send(text: string): Promise<void> {
        return this.messageService.send(text);
    }

    async sendUserJoinedNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const monitoredUser = tableDetails.partecipanti.find(p =>
            parseInt(p.idUtente) === change.monitoredUserId
        );

        if (!monitoredUser) {
            console.warn(`Monitored user ${change.monitoredUserId} not found in table details`);
            return;
        }

        const message = this.formatUserJoinedMessage(change, tableDetails, monitoredUser);
        await this.messageService.send(message);
    }

    async sendUserLeftNotification(change: StateChange): Promise<void> {
        const participant = change.details?.participant as ParticipantState;
        const table = change.details?.table;

        const message = [
            `🚪 MONITORED USER LEFT TABLE`,
            ``,
            `👤 User: ${participant?.nome || 'Unknown'} ${participant?.cognome || ''}`,
            ...formatTableHeader(change.tableName, change.tableId),
            table?.quando ? formatTableDateTime(table.quando, '📅 Orario tavolo') : '📅 Orario tavolo: Non disponibile',
            formatNotificationTimestamp()
        ].join('\n');

        await this.messageService.send(message);
    }

    async sendParticipantChangeNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const isJoined = change.type === 'participant_joined';
        const emoji = isJoined ? '➕' : '➖';
        const action = isJoined ? 'JOINED' : 'LEFT';

        const participant = change.details?.participant as ParticipantState;
        const participantInfo = formatParticipantInfo(participant);

        const monitoredUsers = this.getMonitoredUsersInTable(tableDetails, change);
        const monitoredUsersList = formatMonitoredUsersList(monitoredUsers, 'Monitored users at table');

        const messageParts = [
            `${emoji} PARTICIPANT ${action} MONITORED TABLE`,
            ``,
            `👤 Participant Details:`,
            participantInfo,
            ...formatTableHeader(change.tableName, change.tableId),
            formatTableDateTime(tableDetails.quando, '📅 Orario tavolo')
        ];

        if (monitoredUsersList) {
            messageParts.push(monitoredUsersList);
        }

        messageParts.push(
            ``,
            `📊 Current table status:`,
            formatTableParticipants(tableDetails.partecipanti),
            formatNotificationTimestamp()
        );

        await this.messageService.send(messageParts.join('\n'));
    }

    async sendTableUpdateNotification(change: StateChange, tableDetails: TavoloDetails): Promise<void> {
        const monitoredUsers = this.getMonitoredUsersInTable(tableDetails, change);
        const monitoredUsersList = formatMonitoredUsersList(monitoredUsers);

        const messageParts = [
            `🔄 TABLE UPDATED`,
            ``,
            ...formatTableHeader(change.tableName, change.tableId),
            formatTableDateTime(tableDetails.quando, '📅 Orario tavolo')
        ];

        if (monitoredUsersList) {
            messageParts.push(monitoredUsersList);
        }

        messageParts.push(
            ``,
            `📊 Current participants:`,
            formatTableParticipants(tableDetails.partecipanti),
            formatNotificationTimestamp()
        );

        await this.messageService.send(messageParts.join('\n'));
    }

    private formatUserJoinedMessage(change: StateChange, tableDetails: TavoloDetails, monitoredUser: Partecipante): string {
        const userInfo = formatUserInfo(monitoredUser);
        const otherParticipants = tableDetails.partecipanti.filter(p => p.idUtente !== monitoredUser.idUtente);

        return [
            `🎉 MONITORED USER JOINED TABLE`,
            ``,
            `👤 User Details:`,
            userInfo,
            ``,
            ...formatTableHeader(tableDetails.nomeRistorante, change.tableId),
            formatTableDateTime(tableDetails.quando, '📅 Orario tavolo'),
            ``,
            `👥 Other participants (${otherParticipants.length}):`,
            otherParticipants.length > 0
                ? formatTableParticipants(otherParticipants)
                : '   (No other participants)',
            ``,
            ...formatGenderStats(tableDetails.partecipanti),
            formatNotificationTimestamp()
        ].join('\n');
    }



    private getMonitoredUsersInTable(tableDetails: TavoloDetails, change: StateChange): Partecipante[] {
        // For this implementation, we'll identify monitored users by checking if they match the change's monitoredUserId
        // In a real implementation, we'd need access to the full monitored user list
        if (change.monitoredUserId) {
            const monitoredUser = tableDetails.partecipanti.find(p =>
                parseInt(p.idUtente) === change.monitoredUserId
            );
            return monitoredUser ? [monitoredUser] : [];
        }
        return [];
    }

    async sendTableCancelledNotification(change: StateChange): Promise<void> {
        const table = change.details?.table;
        const monitoredUsers = change.details?.monitoredUsers as number[] || [];

        const messageParts = [
            `❌ TABLE CANCELLED`,
            ``,
            ...formatTableHeader(change.tableName, change.tableId),
            `👥 Monitored users affected: ${monitoredUsers.length}`,
            table?.quando ? formatTableDateTime(table.quando, '📅 Orario tavolo') : '📅 Orario tavolo: Non disponibile',
            ``,
            `📊 Participants who were at the table:`,
            table?.partecipanti ? formatTableParticipants(convertParticipantStates(table.partecipanti)) : '   (No participant data available)',
            `⏰ Cancelled at: ${new Date().toLocaleString()}`
        ];

        await this.messageService.send(messageParts.filter(line => line !== '').join('\n'));
    }

    async sendTableFinishedNotification(change: StateChange): Promise<void> {
        const table = change.details?.table;
        const monitoredUsers = change.details?.monitoredUsers as number[] || [];

        const messageParts = [
            `✅ TABLE FINISHED`,
            ``,
            ...formatTableHeader(change.tableName, change.tableId),
            `👥 Monitored users who attended: ${monitoredUsers.length}`,
            table?.quando ? formatTableDateTime(table.quando, '📅 Orario tavolo') : '📅 Orario tavolo: Non disponibile',
            ``,
            `📊 Final participants:`,
            table?.partecipanti ? formatTableParticipants(convertParticipantStates(table.partecipanti)) : '   (No participant data available)',
            `⏰ Detected finished at: ${new Date().toLocaleString()}`
        ];

        await this.messageService.send(messageParts.filter(line => line !== '').join('\n'));
    }

    async sendNewFemaleTableNotification(tableDetails: TavoloDetails): Promise<void> {
        const creator = tableDetails.partecipanti[0]; // Assuming first participant is creator
        const creatorInfo = formatParticipantInfo(convertParticipantStates([creator])[0]);

        const messageParts = [
            `🌺 NEW TABLE BY FEMALE USER`,
            ``,
            `👤 Creator:`,
            creatorInfo,
            ...formatTableHeader(tableDetails.nomeRistorante, 'New'),
            formatTableDateTime(tableDetails.quando, '📅 Orario tavolo'),
            ``,
            `📊 Participants:`,
            formatTableParticipants(tableDetails.partecipanti),
            formatNotificationTimestamp()
        ];

        await this.messageService.send(messageParts.join('\n'));
    }

    async sendMonitoringStartedNotification(monitoredUsers: number[], config: any): Promise<void> {
        const userCount = monitoredUsers.length;
        const userList = userCount > 0 ? monitoredUsers.join(', ') : 'None';

        const message = [
            `🚀 MONITORING STARTED`,
            ``,
            `⏰ Started at: ${new Date().toLocaleString()}`,
            `👥 Monitored users (${userCount}): ${userList}`,
            `📅 Days to scan: ${config.daysToScan || 'N/A'}`,
            `⏱️  Scan interval: ${config.monitoringIntervalSeconds || 'N/A'} seconds`,
            `📍 Search area: ${config.latitude || 'N/A'}, ${config.longitude || 'N/A'}`,
            `🔍 Search radius: ${config.searchRadius || 'N/A'} km`,
            ``,
            `🎯 The system will now monitor table activities and send notifications when:`,
            `   • Monitored users join or leave tables`,
            `   • Other participants join/leave tables with monitored users`,
            `   • Tables get cancelled or finished`,
            `   • Table details are updated`,
            ``,
            `📱 Ready to receive notifications!`
        ].join('\n');

        await this.messageService.send(message);
    }

    async sendRestaurantMonitoringStartedNotification(monitoredRestaurants: string[], config: any): Promise<void> {
        const restaurantCount = monitoredRestaurants.length;
        const restaurantList = restaurantCount > 0
            ? (restaurantCount <= 10
                ? monitoredRestaurants.join(', ')
                : `${monitoredRestaurants.slice(0, 10).join(', ')} and ${restaurantCount - 10} more`)
            : 'None';

        const message = [
            `🏪 RESTAURANT MONITORING STARTED`,
            ``,
            `⏰ Started at: ${new Date().toLocaleString()}`,
            `🍽️  Monitored restaurants (${restaurantCount}): ${restaurantList}`,
            `📅 Days to scan: ${config.daysToScan || 'N/A'}`,
            `⏱️  Scan interval: ${config.monitoringIntervalSeconds || 'N/A'} seconds`,
            `📍 Search area: ${config.latitude || 'N/A'}, ${config.longitude || 'N/A'}`,
            `🔍 Search radius: ${config.searchRadius || 'N/A'} km`,
            ``,
            `🎯 The system will now monitor restaurant activities and send notifications when:`,
            `   • New tables are created in monitored restaurants`,
            `   • Participants join or leave tables in monitored restaurants`,
            `   • Tables get cancelled or finished`,
            `   • Monitored users appear in monitored restaurants (cross-reference)`,
            ``,
            `📱 Ready to receive restaurant notifications!`
        ].join('\n');

        await this.messageService.send(message);
    }

    async sendRestaurantTableCreatedNotification(change: StateChange, table: TavoloDetails): Promise<void> {
        try {
            const messageParts = [
                `🆕 NEW TABLE CREATED IN MONITORED RESTAURANT`,
                ``,
                `🏪 Restaurant: ${change.restaurantName}`,
                `📍 Table ID: ${change.tableId}`,
                formatTableDateTime(table.quando, '📅 Orario'),
                ``,
                `👥 Initial Participants (${table.partecipanti.length}):`,
                formatTableParticipants(table.partecipanti),
                ``,
                ...formatGenderStats(table.partecipanti),
                formatNotificationTimestamp()
            ];

            await this.messageService.send(messageParts.join('\n'));
        } catch (error) {
            console.error(`❌ Failed to send restaurant table created notification for table ${change.tableId}:`, error);
            console.log(`⚠️  Notification failed but monitoring will continue`);
        }
    }

    async sendRestaurantParticipantJoinedNotification(change: StateChange, table: TavoloDetails): Promise<void> {
        try {
            const participant = change.details?.participant as ParticipantState;
            const monitoredStatus = change.isMonitoredUser ? '🔔 Monitored User: Yes' : '🔔 Monitored User: No';
            const status = participant?.partecipante ? 'Confirmed' : 'Invited';

            const messageParts = [
                `➕ PARTICIPANT JOINED TABLE`,
                ``,
                `🏪 Restaurant: ${change.restaurantName}`,
                `📍 Table ID: ${change.tableId}`,
                ``,
                `👤 New Participant:`,
                `   ${participant?.sessoMaschile ? '♂️' : '♀️'} ${participant?.nome} ${participant?.cognome} (${status})`,
                `   ${monitoredStatus}`,
                ``,
                `👥 Current Participants (${table.partecipanti.length}):`,
                formatTableParticipants(table.partecipanti),
                ``,
                ...formatGenderStats(table.partecipanti),
                formatNotificationTimestamp()
            ];

            await this.messageService.send(messageParts.join('\n'));
        } catch (error) {
            console.error(`❌ Failed to send restaurant participant joined notification for table ${change.tableId}:`, error);
            console.log(`⚠️  Notification failed but monitoring will continue`);
        }
    }

    async sendRestaurantParticipantLeftNotification(change: StateChange, table: TavoloDetails): Promise<void> {
        try {
            const participant = change.details?.participant as ParticipantState;
            const monitoredStatus = change.isMonitoredUser ? '🔔 Monitored User: Yes' : '🔔 Monitored User: No';

            const messageParts = [
                `➖ PARTICIPANT LEFT TABLE`,
                ``,
                `🏪 Restaurant: ${change.restaurantName}`,
                `📍 Table ID: ${change.tableId}`,
                ``,
                `👤 Participant Who Left:`,
                `   ${participant?.sessoMaschile ? '♂️' : '♀️'} ${participant?.nome} ${participant?.cognome}`,
                `   ${monitoredStatus}`,
                ``,
                `👥 Remaining Participants (${table.partecipanti.length}):`,
                formatTableParticipants(table.partecipanti),
                ``,
                ...formatGenderStats(table.partecipanti),
                formatNotificationTimestamp()
            ];

            await this.messageService.send(messageParts.join('\n'));
        } catch (error) {
            console.error(`❌ Failed to send restaurant participant left notification for table ${change.tableId}:`, error);
            console.log(`⚠️  Notification failed but monitoring will continue`);
        }
    }

    async sendRestaurantTableCancelledNotification(change: StateChange): Promise<void> {
        try {
            const table = change.details?.table;

            const messageParts = [
                `❌ TABLE CANCELLED IN MONITORED RESTAURANT`,
                ``,
                `🏪 Restaurant: ${change.restaurantName}`,
                `📍 Table ID: ${change.tableId}`,
                table?.quando ? formatTableDateTime(table.quando, '📅 Scheduled time') : '📅 Scheduled time: Not available',
                ``,
                `📊 Participants who were at the table:`,
                table?.partecipanti ? formatTableParticipants(convertParticipantStates(table.partecipanti)) : '   (No participant data available)',
                `⏰ Cancelled at: ${new Date().toLocaleString()}`
            ];

            await this.messageService.send(messageParts.filter(line => line !== '').join('\n'));
        } catch (error) {
            console.error(`❌ Failed to send restaurant table cancelled notification for table ${change.tableId}:`, error);
            console.log(`⚠️  Notification failed but monitoring will continue`);
        }
    }

    async sendRestaurantTableFinishedNotification(change: StateChange): Promise<void> {
        try {
            const table = change.details?.table;

            const messageParts = [
                `✅ TABLE FINISHED IN MONITORED RESTAURANT`,
                ``,
                `🏪 Restaurant: ${change.restaurantName}`,
                `📍 Table ID: ${change.tableId}`,
                table?.quando ? formatTableDateTime(table.quando, '📅 Scheduled time') : '📅 Scheduled time: Not available',
                ``,
                `📊 Final participants:`,
                table?.partecipanti ? formatTableParticipants(convertParticipantStates(table.partecipanti)) : '   (No participant data available)',
                `⏰ Detected finished at: ${new Date().toLocaleString()}`
            ];

            await this.messageService.send(messageParts.filter(line => line !== '').join('\n'));
        } catch (error) {
            console.error(`❌ Failed to send restaurant table finished notification for table ${change.tableId}:`, error);
            console.log(`⚠️  Notification failed but monitoring will continue`);
        }
    }

}

/**
 * Factory function to create a MonitoringNotifier with the appropriate underlying MessageService
 */
export function createMonitoringNotifier(messageService: MessageService): MonitoringNotifier {
    return new DetailedMonitoringNotifier(messageService);
}
