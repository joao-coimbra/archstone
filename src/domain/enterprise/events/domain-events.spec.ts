import { describe, expect, it, mock } from "bun:test"
import type { UniqueEntityId } from "@/core/unique-entity-id.ts"
import { AggregateRoot } from "../entities/aggregate-root.ts"
import type { DomainEvent } from "./domain-event.ts"
import { DomainEvents } from "./domain-events.ts"

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
}

describe("Domain Events", () => {
  it("should be able to dispatch and listen to events", () => {
    const callbackSpy = mock()

    // Subscriber registered (listening to the "response created" event)
    DomainEvents.register(callbackSpy, CustomAggregateCreated.name)

    // Creating a response but WITHOUT saving to database
    const aggregate = CustomAggregate.create()

    // Ensuring the event was created but NOT dispatched
    expect(aggregate.domainEvents).toHaveLength(1)

    // Saving the response to the database, which triggers the event
    DomainEvents.dispatchEventsForAggregate(aggregate.id)

    // The subscriber listens to the event and does what it needs with the data
    expect(callbackSpy).toHaveBeenCalled()

    expect(aggregate.domainEvents).toHaveLength(0)
  })
})
