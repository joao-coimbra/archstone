import type { UniqueEntityId } from "@/core/unique-entity-id"

/**
 * Base contract for all domain events.
 *
 * A domain event represents something meaningful that happened in the domain.
 * Events are raised by aggregate roots and dispatched after successful persistence,
 * enabling decoupled side effects such as notifications, projections, and integrations.
 *
 * @example
 * ```ts
 * class UserCreatedEvent implements DomainEvent {
 *   occurredAt = new Date()
 *
 *   constructor(private readonly user: User) {}
 *
 *   getAggregateId(): UniqueEntityId {
 *     return this.user.id
 *   }
 * }
 * ```
 */
export interface DomainEvent {
  /**
   * Returns the identifier of the aggregate root that raised this event.
   */
  getAggregateId(): UniqueEntityId

  /**
   * The date and time when the event occurred.
   */
  occurredAt: Date
}