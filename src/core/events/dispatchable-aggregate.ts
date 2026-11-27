import type { UniqueEntityId } from "../unique-entity-id"
import type { DomainEvent } from "./domain-event"

export interface DispatchableAggregate {
  readonly id: UniqueEntityId
  readonly domainEvents: readonly DomainEvent[]
  clearEvents(): void
  acknowledge(events: readonly DomainEvent[]): void
}
