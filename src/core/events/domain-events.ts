import type { UniqueEntityId } from "@/core/index.ts"
import type { AggregateRoot } from "@/domain/index.ts"
import type { DomainEvent } from "./domain-event.ts"

/**
 * Callback function invoked when a domain event is dispatched.
 *
 * The bivariant method signature allows handlers typed to a specific
 * `DomainEvent` subtype to be registered — TypeScript enforces strict
 * contravariance on function types but not on method signatures.
 */
type DomainEventCallback = {
  bivarianceHack(event: DomainEvent): Promise<void>
}["bivarianceHack"]

/**
 * Central registry and dispatcher for domain events.
 *
 * Aggregates register themselves for dispatch after raising events.
 * The infrastructure layer is responsible for calling {@link dispatchEventsForAggregate}
 * after successfully persisting an aggregate, ensuring events are only
 * dispatched after a successful transaction.
 *
 * @example
 * ```ts
 * // register a handler
 * DomainEvents.register(
 *   (event) => sendWelcomeEmail(event as UserCreatedEvent),
 *   UserCreatedEvent.name,
 * )
 *
 * // dispatch after persistence
 * await userRepository.create(user)
 * DomainEvents.dispatchEventsForAggregate(user.id)
 * ```
 */
class DomainEventsImplementation {
  private readonly handlersMap = new Map<string, DomainEventCallback[]>()
  private readonly markedAggregates = new Set<AggregateRoot<unknown>>()

  /**
   * Controls whether event dispatching is active.
   *
   * Set to `false` in tests that construct aggregates but do not want
   * side-effects to run, without having to clear and re-register handlers.
   *
   * @default true
   */
  shouldRun = true

  /**
   * Marks an aggregate root to have its events dispatched.
   * Called automatically by {@link AggregateRoot.addDomainEvent}.
   *
   * @param aggregate - The aggregate to mark for dispatch
   */
  markAggregateForDispatch(aggregate: AggregateRoot<unknown>): void {
    if (!this.findMarkedAggregateByID(aggregate.id)) {
      this.markedAggregates.add(aggregate)
    }
  }

  /**
   * Dispatches all pending events for the aggregate with the given id,
   * clears its events, and removes it from the dispatch list.
   *
   * Should be called by the infrastructure layer after persisting the aggregate.
   *
   * @param id - The identifier of the aggregate to dispatch events for
   */
  dispatchEventsForAggregate(id: UniqueEntityId): void {
    const aggregate = this.findMarkedAggregateByID(id)
    if (aggregate) {
      this.dispatchAggregateEvents(aggregate)
      aggregate.clearEvents()
      this.removeAggregateFromMarkedDispatchList(aggregate)
    }
  }

  /**
   * Registers an event handler for a given event class name.
   *
   * @param callback - The function to invoke when the event is dispatched
   * @param eventClassName - The name of the event class to listen for
   */
  register(callback: DomainEventCallback, eventClassName: string): void {
    if (!this.handlersMap.has(eventClassName)) {
      this.handlersMap.set(eventClassName, [])
    }
    this.handlersMap.get(eventClassName)?.push(callback)
  }

  /**
   * Removes all registered event handlers.
   * Useful for test isolation.
   */
  clearHandlers(): void {
    this.handlersMap.clear()
  }

  /**
   * Removes all aggregates from the dispatch list.
   * Useful for test isolation.
   */
  clearMarkedAggregates(): void {
    this.markedAggregates.clear()
  }

  private dispatchAggregateEvents(aggregate: AggregateRoot<unknown>): void {
    for (const event of aggregate.domainEvents) {
      this.dispatch(event)
    }
  }

  private removeAggregateFromMarkedDispatchList(
    aggregate: AggregateRoot<unknown>
  ) {
    this.markedAggregates.delete(aggregate)
  }

  private findMarkedAggregateByID(
    id: UniqueEntityId
  ): AggregateRoot<unknown> | undefined {
    return [...this.markedAggregates].find((a) => a.id.equals(id))
  }

  private dispatch(event: DomainEvent): void {
    if (!this.shouldRun) {
      return
    }

    const handlers = this.handlersMap.get(event.constructor.name) ?? []
    for (const handler of handlers) {
      handler(event)
    }
  }
}

/**
 * Singleton instance of the domain events registry.
 * Use this to register handlers and dispatch events across the application.
 */
export const DomainEvents: DomainEventsImplementation =
  new DomainEventsImplementation()
