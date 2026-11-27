import { afterEach, describe, expect, it, mock } from "bun:test"
import type { DomainEvent, UniqueEntityId } from "@/core/index"
import { DomainEvents, UniqueEntityId as EntityId } from "@/core/index"
import { AggregateRoot } from "@/domain/enterprise/index"

class CustomAggregateCreated implements DomainEvent {
  occurredAt: Date
  private readonly aggregate: CustomAggregate

  constructor(aggregate: CustomAggregate) {
    this.aggregate = aggregate
    this.occurredAt = new Date()
  }

  getAggregateId(): UniqueEntityId {
    return this.aggregate.id
  }
}

class CustomAggregate extends AggregateRoot<null> {
  static create() {
    const aggregate = new CustomAggregate(null)

    aggregate.addDomainEvent(new CustomAggregateCreated(aggregate))

    return aggregate
  }

  addAnother(): void {
    this.addDomainEvent(new CustomAggregateCreated(this))
  }

  static createWith(id: UniqueEntityId) {
    const aggregate = new CustomAggregate(null, id)

    aggregate.addDomainEvent(new CustomAggregateCreated(aggregate))

    return aggregate
  }
}

describe("Domain Events", () => {
  afterEach(() => {
    DomainEvents.clearHandlers()
    DomainEvents.clearMarkedAggregates()
    DomainEvents.shouldRun = true
  })

  it("should be able to dispatch and listen to events", async () => {
    const callbackSpy = mock()

    // Subscriber registered (listening to the "response created" event)
    DomainEvents.register(callbackSpy, CustomAggregateCreated.name)

    // Creating a response but WITHOUT saving to database
    const aggregate = CustomAggregate.create()

    // Ensuring the event was created but NOT dispatched
    expect(aggregate.domainEvents).toHaveLength(1)

    // Saving the response to the database, which triggers the event
    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    // The subscriber listens to the event and does what it needs with the data
    expect(callbackSpy).toHaveBeenCalled()

    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("should not dispatch events when shouldRun is false", async () => {
    const callbackSpy = mock()

    DomainEvents.register(callbackSpy, CustomAggregateCreated.name)
    DomainEvents.shouldRun = false

    const aggregate = CustomAggregate.create()

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(callbackSpy).not.toHaveBeenCalled()
    expect(aggregate.domainEvents).toHaveLength(1)

    DomainEvents.shouldRun = true
    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(callbackSpy).toHaveBeenCalledTimes(1)
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("keeps the event until every handler has finished", async () => {
    const aggregate = CustomAggregate.create()
    let pendingWhileHandling = 0

    DomainEvents.register(async () => {
      await Promise.resolve()
      pendingWhileHandling = aggregate.domainEvents.length
    }, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(pendingWhileHandling).toBe(1)
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("keeps the event when a handler rejects", async () => {
    const aggregate = CustomAggregate.create()

    DomainEvents.register(
      () => Promise.reject(new Error("handler failed")),
      CustomAggregateCreated.name
    )

    await expect(
      DomainEvents.dispatchEventsForAggregate(aggregate.id)
    ).rejects.toThrow("Domain event handlers failed.")
    expect(aggregate.domainEvents).toHaveLength(1)
  })

  it("does not run a handler registered during the current dispatch", async () => {
    const aggregate = CustomAggregate.create()
    let calls = 0
    const callback = (): Promise<void> => {
      calls += 1
      if (calls < 5) {
        DomainEvents.register(callback, CustomAggregateCreated.name)
      }
      return Promise.resolve()
    }

    DomainEvents.register(callback, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(calls).toBe(1)
  })

  it("dispatches every marked instance that shares an id", async () => {
    const id = new EntityId("same-id")
    const first = CustomAggregate.createWith(id)
    const second = CustomAggregate.createWith(id)
    let calls = 0

    DomainEvents.register((): Promise<void> => {
      calls += 1
      return Promise.resolve()
    }, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(id)

    expect(calls).toBe(2)
    expect(first.domainEvents).toHaveLength(0)
    expect(second.domainEvents).toHaveLength(0)
  })

  it("stops calling a handler after unregister", async () => {
    const aggregate = CustomAggregate.create()
    const callback = mock()

    DomainEvents.register(callback, CustomAggregateCreated.name)
    DomainEvents.unregister(callback, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(callback).not.toHaveBeenCalled()
  })

  it("does not run the same handlers from a second dispatch that is still in flight", async () => {
    const aggregate = CustomAggregate.create()
    let release = (): void => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0

    DomainEvents.register(async () => {
      calls += 1
      await gate
    }, CustomAggregateCreated.name)

    const first = DomainEvents.dispatchEventsForAggregate(aggregate.id)
    const second = DomainEvents.dispatchEventsForAggregate(aggregate.id)
    release()
    await first
    await second

    expect(calls).toBe(1)
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("does not re-enter when a handler dispatches the same aggregate", async () => {
    const aggregate = CustomAggregate.create()
    let calls = 0

    DomainEvents.register(async () => {
      calls += 1
      await DomainEvents.dispatchEventsForAggregate(aggregate.id)
    }, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(calls).toBe(1)
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("keeps an event raised while handlers run for a later dispatch", async () => {
    const aggregate = CustomAggregate.create()
    let calls = 0

    DomainEvents.register(async () => {
      calls += 1
      if (calls === 1) {
        aggregate.addAnother()
      }
      await Promise.resolve()
    }, CustomAggregateCreated.name)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(calls).toBe(1)
    expect(aggregate.domainEvents).toHaveLength(1)

    await DomainEvents.dispatchEventsForAggregate(aggregate.id)

    expect(calls).toBe(2)
    expect(aggregate.domainEvents).toHaveLength(0)
  })

  it("reports a synchronous handler throw as a failed dispatch", async () => {
    const aggregate = CustomAggregate.create()

    DomainEvents.register(() => {
      throw new Error("handler failed")
    }, CustomAggregateCreated.name)

    await expect(
      DomainEvents.dispatchEventsForAggregate(aggregate.id)
    ).rejects.toThrow("Domain event handlers failed.")
    expect(aggregate.domainEvents).toHaveLength(1)
  })
})
