import { attributeToJson, type SpanAttribute } from './attributes'
import { type Clock } from './clock'
import { type DeliverySpan } from './delivery'

export type Time = Date | number

export interface Span {
  end: (endTime?: Time) => void
}

export const enum Kind {
  Unspecified = 0,
  Internal = 1,
  Server = 2,
  Client = 3,
  Producer = 4,
  Consumer = 5
}

export interface SpanInternal {
  readonly id: string // 64 bit random string
  readonly name: string
  readonly kind: Kind
  readonly traceId: string // 128 bit random string
  readonly attributes: SpanAttributes
  readonly startTime: number // stored in the format returned from Clock.now (see clock.ts)
  endTime?: number // stored in the format returned from Clock.now (see clock.ts) - written once when 'end' is called
}

export type SpanEnded = Required<SpanInternal>

export class SpanAttributes {
  private readonly attributes: Map<string, SpanAttribute>

  constructor (initialValues: Map<string, SpanAttribute>) {
    this.attributes = initialValues
  }

  public set (name: string, value: SpanAttribute) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      this.attributes.set(name, value)
    }
  }

  public remove (name: string) {
    this.attributes.delete(name)
  }

  public toJson () {
    return Array.from(this.attributes).map(([key, value]) => attributeToJson(key, value))
  }
}

export function spanToJson (span: SpanEnded, clock: Clock): DeliverySpan {
  return {
    name: span.name,
    kind: span.kind,
    spanId: span.id,
    traceId: span.traceId,
    startTimeUnixNano: clock.toUnixTimestampNanoseconds(span.startTime).toString(),
    endTimeUnixNano: clock.toUnixTimestampNanoseconds(span.endTime).toString(),
    attributes: span.attributes.toJson()
  }
}
