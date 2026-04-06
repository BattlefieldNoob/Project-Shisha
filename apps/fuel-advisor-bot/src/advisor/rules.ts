import { AdviceAction, AdviceReason, AdviceDetails } from './types'

export function calculateAdvice(stats: AdviceDetails, level: number): { action: AdviceAction, reasons: AdviceReason[] } {
    // If sample size is too small or today's price is missing, fallback to level-based logic
    if (stats.todayPrice === null || stats.sampleSize < 3) {
        let action: AdviceAction = 'WAIT'
        const reasons: AdviceReason[] = []

        if (level < 0.25) {
            action = 'FILL'
        } else if (level < 0.5) {
            action = 'HALF'
        }

        // Post-check just in case we tweak the threshold
        if (action === 'HALF' && level >= 0.5) {
            action = 'WAIT'
            reasons.push('SUFFICIENT_LEVEL_FOR_NOW')
        }

        return { action, reasons }
    }

    const reasons: AdviceReason[] = []

    const _mean = stats.mean15d!
    const stddev = stats.stddev15d || 0 // if it's 0 or null, threshold is basically mean
    const delta = stats.deltaVsMean15d!
    const trend = stats.trend3d || 0

    let action: AdviceAction = 'WAIT'

    const lowThreshold = -1 * stddev
    const highThreshold = 1 * stddev

    if (delta <= lowThreshold) {
        // Price is significantly lower than usual
        reasons.push('TODAY_PRICE_LOW_VS_HISTORY')
        if (trend < 0) reasons.push('FALLING_TREND')

        if (level < 0.8) {
            action = 'FILL'
        } else {
            action = 'HALF'
        }
    } else if (delta >= highThreshold) {
        // Price is high
        reasons.push('TODAY_PRICE_HIGH_VS_HISTORY')

        if (trend > 0) {
            reasons.push('RISING_TREND')
            if (level > 0.4) {
                action = 'WAIT'
            } else {
                action = 'MINIMUM'
            }
        } else {
            // High but maybe falling
            if (level < 0.25) {
                action = 'MINIMUM'
            } else {
                action = 'WAIT'
            }
        }
    } else {
        // Price around average
        reasons.push('NEAR_AVERAGE_STABLE')

        if (level < 0.25) {
            // Depending on how close to low threshold
            if (delta < 0) {
                action = 'FILL'
            } else {
                action = 'HALF'
            }
        } else {
            action = 'WAIT'
        }
    }

    // Post-check: do not advise to put fuel we don't need
    if (action === 'FILL' && level >= 0.9) {
        action = 'WAIT'
        reasons.push('TANK_ALREADY_FULL')
    } else if (action === 'HALF' && level >= 0.5) {
        action = 'WAIT'
        reasons.push('SUFFICIENT_LEVEL_FOR_NOW')
    } else if (action === 'MINIMUM' && level >= 0.25) {
        action = 'WAIT'
        reasons.push('SUFFICIENT_LEVEL_FOR_NOW')
    }

    return { action, reasons }
}
