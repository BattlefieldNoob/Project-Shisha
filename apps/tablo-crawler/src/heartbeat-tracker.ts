/**
 * HeartbeatTracker interface for managing heartbeat timing logic
 */
export interface HeartbeatTracker {
    /**
     * Records that a message was sent (resets the heartbeat timer)
     */
    recordMessageSent(): void;

    /**
     * Checks if a heartbeat message should be sent based on the configured interval
     * @returns true if the interval has elapsed since the last message
     */
    shouldSendHeartbeat(): boolean;

    /**
     * Calculates the number of days since the last message was sent
     * @returns number of days (floored to integer)
     */
    getDaysSinceLastMessage(): number;
}

/**
 * In-memory implementation of HeartbeatTracker
 */
export class InMemoryHeartbeatTracker implements HeartbeatTracker {
    private lastMessageTimestamp: number;
    private intervalMs: number;

    /**
     * Creates a new HeartbeatTracker
     * @param intervalDays - Number of days between heartbeat messages
     */
    constructor(intervalDays: number) {
        this.lastMessageTimestamp = Date.now();
        this.intervalMs = intervalDays * 24 * 60 * 60 * 1000;
    }

    recordMessageSent(): void {
        this.lastMessageTimestamp = Date.now();
    }

    shouldSendHeartbeat(): boolean {
        return (Date.now() - this.lastMessageTimestamp) >= this.intervalMs;
    }

    getDaysSinceLastMessage(): number {
        const diffMs = Date.now() - this.lastMessageTimestamp;
        return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }
}
