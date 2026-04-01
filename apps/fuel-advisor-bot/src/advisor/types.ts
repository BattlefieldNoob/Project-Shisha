export type FuelType = 'GASOLINE' | 'DIESEL' // extend as needed

export interface AdviceInput {
    stationId: number
    fuelType: FuelType
    level: number // tank level between 0.0 and 1.0
}

export type AdviceAction = 'FILL' | 'HALF' | 'MINIMUM' | 'WAIT'

export type AdviceReason =
    | 'TODAY_PRICE_LOW_VS_HISTORY'
    | 'TODAY_PRICE_HIGH_VS_HISTORY'
    | 'RISING_TREND'
    | 'FALLING_TREND'
    | 'NEAR_AVERAGE_STABLE'
    | 'TANK_ALREADY_FULL'
    | 'SUFFICIENT_LEVEL_FOR_NOW'

export interface AdviceDetails {
    todayPrice: number | null
    mean15d: number | null
    stddev15d: number | null
    deltaVsMean15d: number | null
    trend3d: number | null // price(today) - price(3 days ago)
    sampleSize: number     // how many days of data we actually have
}

export interface AdviceOutput {
    action: AdviceAction
    reasons: AdviceReason[]
    details: AdviceDetails
}
