import { describe, expect, it } from "bun:test"
import type { DomainEvent, EntityId, EventHandler } from "@/index"

class Ping implements DomainEvent {
  occurredAt = new Date()

  getAggregateId(): EntityId {
    throw new Error("not called")
  }
}

class OnPing implements EventHandler<Ping> {
  setupSubscriptions(): void {
    // The composition root calls this once when the process starts.
  }

  async handle(event: Ping): Promise<void> {
    await Promise.resolve(event.occurredAt)
  }
}

describe("public EventHandler", () => {
  it("exposes handle() from the root entry", () => {
    const handler = new OnPing()

    expect(typeof handler.handle).toBe("function")
    expect(typeof handler.setupSubscriptions).toBe("function")
  })
})
