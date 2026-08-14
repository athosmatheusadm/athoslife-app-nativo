// Stub mínimo do @capgo/capacitor-health (só o que o app usa).
// Reflete a API pública documentada. No ambiente do dev, o pacote real
// do npm fornece os tipos completos; este stub existe só para o typecheck
// rodar aqui, onde a rede não instala o pacote.
declare module '@capgo/capacitor-health' {
  export type HealthDataType = 'steps' | 'distance' | 'calories' | 'weight'

  export interface AvailabilityResult {
    available: boolean
    platform?: 'ios' | 'android' | 'web'
    reason?: string
  }
  export interface AuthorizationOptions {
    read?: HealthDataType[]
    write?: HealthDataType[]
  }
  export interface AuthorizationStatus {
    readAuthorized: HealthDataType[]
    readDenied: HealthDataType[]
    writeAuthorized: HealthDataType[]
    writeDenied: HealthDataType[]
  }
  export interface QueryAggregatedOptions {
    dataType: HealthDataType
    startDate?: string
    endDate?: string
    bucket?: 'hour' | 'day' | 'week' | 'month'
    aggregation?: 'sum' | 'average' | 'min' | 'max'
  }
  export interface AggregatedSample {
    value: number
    startDate: string
    endDate: string
  }
  export interface QueryAggregatedResult {
    samples: AggregatedSample[]
  }

  export const Health: {
    isAvailable(): Promise<AvailabilityResult>
    requestAuthorization(o: AuthorizationOptions): Promise<void>
    checkAuthorization(o: AuthorizationOptions): Promise<AuthorizationStatus>
    queryAggregated(o: QueryAggregatedOptions): Promise<QueryAggregatedResult>
    openHealthConnectSettings(): Promise<void>
  }
}
