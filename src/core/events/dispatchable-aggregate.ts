import type { EntityId } from "../entity-id"
import type { DomainEvent } from "./domain-event"

export interface DispatchableAggregate {
  readonly id: EntityId
  readonly domainEvents: readonly DomainEvent[]
  clearEvents(): void
  acknowledge(events: readonly DomainEvent[]): void
}
