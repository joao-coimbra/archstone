import type { EntityId } from "../entity-id"
import type { DispatchableAggregate } from "./dispatchable-aggregate"
import type { DomainEvent } from "./domain-event"

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

const handlerFailures = (results: PromiseSettledResult<void>[]): unknown[] => {
  const failures: unknown[] = []
  for (const result of results) {
    if (result.status === "rejected") {
      failures.push(result.reason)
    }
  }
  return failures
}

interface DispatchBatch {
  aggregate: DispatchableAggregate
  events: DomainEvent[]
}

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
 * await DomainEvents.dispatchEventsForAggregate(user.id)
 * ```
 */
class DomainEventsImplementation {
  private readonly handlersMap = new Map<string, DomainEventCallback[]>()
  private readonly markedAggregates = new Set<DispatchableAggregate>()
  private readonly inFlight = new WeakSet<DomainEvent>()

  /**
   * Controls whether event dispatching is active.
   *
   * Set to `false` in tests that construct aggregates but do not want
   * side-effects to run, without having to clear and re-register handlers.
   *
   * @default true
   */
  shouldRun = true as boolean

  /**
   * Marks an aggregate root to have its events dispatched.
   * Called automatically by {@link AggregateRoot.addDomainEvent}.
   *
   * @param aggregate - The aggregate to mark for dispatch
   */
  markAggregateForDispatch(aggregate: DispatchableAggregate): void {
    this.markedAggregates.add(aggregate)
  }

  /**
   * Dispatches all pending events for every marked aggregate with the given id,
   * clears their events, and removes them from the dispatch list.
   *
   * Handlers for one event run together. The events stay on the aggregate until
   * every handler for that dispatch has settled. A second dispatch started
   * while those handlers are still running does not deliver the same events
   * again. An event raised during the handlers stays pending for a later call.
   * A rejected handler rejects this call and leaves the events in place.
   *
   * When {@link shouldRun} is `false`, this returns without dispatching or
   * clearing, so a later call can still deliver the events.
   *
   * Should be called by the infrastructure layer after persisting the aggregate.
   *
   * @param id - The identifier of the aggregate to dispatch events for
   */
  async dispatchEventsForAggregate(id: EntityId): Promise<void> {
    if (!this.shouldRun) {
      return
    }
    const batches = this.claim(id)
    if (batches.length === 0) {
      return
    }
    try {
      await Promise.all(
        batches.map((batch) => this.dispatchEvents(batch.events))
      )
    } catch (error) {
      this.release(batches)
      throw error
    }
    this.finish(batches)
  }

  /**
   * Registers an event handler for a given event class name.
   *
   * @param callback - The function to invoke when the event is dispatched
   * @param eventClassName - The name of the event class to listen for
   */
  register(callback: DomainEventCallback, eventClassName: string): void {
    const handlers = this.handlersMap.get(eventClassName) ?? []
    handlers.push(callback)
    this.handlersMap.set(eventClassName, handlers)
  }

  /**
   * Removes one registered handler. The callback must be the same function
   * reference that was passed to {@link register}.
   *
   * @param callback - The function to stop invoking
   * @param eventClassName - The name of the event class it was listening for
   */
  unregister(callback: DomainEventCallback, eventClassName: string): void {
    const handlers = this.handlersMap.get(eventClassName)
    if (!handlers) {
      return
    }
    const remaining = handlers.filter((handler) => handler !== callback)
    if (remaining.length === 0) {
      this.handlersMap.delete(eventClassName)
      return
    }
    this.handlersMap.set(eventClassName, remaining)
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

  private claim(id: EntityId): DispatchBatch[] {
    const batches: DispatchBatch[] = []
    for (const aggregate of this.markedAggregatesFor(id)) {
      if (aggregate.domainEvents.length === 0) {
        this.markedAggregates.delete(aggregate)
        continue
      }
      const events = aggregate.domainEvents.filter(
        (event) => !this.inFlight.has(event)
      )
      if (events.length === 0) {
        continue
      }
      for (const event of events) {
        this.inFlight.add(event)
      }
      this.markedAggregates.delete(aggregate)
      batches.push({ aggregate, events })
    }
    return batches
  }

  private release(batches: readonly DispatchBatch[]): void {
    for (const batch of batches) {
      for (const event of batch.events) {
        this.inFlight.delete(event)
      }
      this.markedAggregates.add(batch.aggregate)
    }
  }

  private finish(batches: readonly DispatchBatch[]): void {
    for (const batch of batches) {
      for (const event of batch.events) {
        this.inFlight.delete(event)
      }
      batch.aggregate.acknowledge(batch.events)
    }
  }

  private async dispatchEvents(events: readonly DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.dispatch(event)))
  }

  private markedAggregatesFor(id: EntityId): DispatchableAggregate[] {
    const matches: DispatchableAggregate[] = []
    for (const aggregate of this.markedAggregates) {
      if (aggregate.id.equals(id)) {
        matches.push(aggregate)
      }
    }
    return matches
  }

  private async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlersMap.get(event.constructor.name)
    if (!handlers) {
      return
    }
    const callbacks = handlers.slice()
    const results = await Promise.allSettled(
      callbacks.map((handler) => Promise.resolve().then(() => handler(event)))
    )
    const failures = handlerFailures(results)
    if (failures.length === 0) {
      return
    }
    throw new AggregateError(failures, "Domain event handlers failed.")
  }
}

/**
 * Singleton instance of the domain events registry.
 * Use this to register handlers and dispatch events across the application.
 */
export const DomainEvents: DomainEventsImplementation =
  new DomainEventsImplementation()
