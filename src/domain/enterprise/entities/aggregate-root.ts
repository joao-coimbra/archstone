import type { DomainEvent } from "../events"
import { DomainEvents } from "../events/domain-events"
import { Entity } from "./entity"

/**
 * Base class for all aggregate roots in the domain.
 *
 * An aggregate root is the entry point to an aggregate — a cluster of domain
 * objects that are treated as a single unit. It is responsible for enforcing
 * invariants and coordinating domain events within its boundary.
 *
 * Domain events are collected internally and dispatched after the aggregate
 * is persisted, ensuring side effects only occur after a successful transaction.
 *
 * @template Props - The shape of the aggregate's properties
 *
 * @example
 * ```ts
 * class User extends AggregateRoot<UserProps> {
 *   static create(props: Optional<UserProps, "id" | "createdAt">): User {
 *     const user = new User(
 *       { ...props, createdAt: props.createdAt ?? new Date() },
 *       props.id ?? new UniqueEntityId(),
 *     )
 *
 *     user.addDomainEvent(new UserCreatedEvent(user))
 *
 *     return user
 *   }
 * }
 * ```
 */
export abstract class AggregateRoot<Props> extends Entity<Props> {
  private readonly _domainEvents = new Set<DomainEvent>()

  /**
   * Returns all domain events that have been raised by this aggregate
   * and are pending dispatch.
   */
  get domainEvents(): DomainEvent[] {
    return Array.from(this._domainEvents)
  }

  /**
   * Registers a domain event to be dispatched after the aggregate is persisted.
   * Automatically marks this aggregate for dispatch in the {@link DomainEvents} registry.
   *
   * @param domainEvent - The domain event to register
   */
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.add(domainEvent)
    DomainEvents.markAggregateForDispatch(this)
  }

  /**
   * Clears all pending domain events from this aggregate.
   * Should be called by the infrastructure layer after events are dispatched.
   */
  clearEvents(): void {
    this._domainEvents.clear()
  }
}
