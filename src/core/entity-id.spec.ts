import { describe, expect, it } from "bun:test"
import { EntityId, UniqueEntityId } from "./entity-id"

describe("EntityId", () => {
  it("keeps a provided identifier", () => {
    const id = new EntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")

    expect(id.toValue()).toBe("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
    expect(id.toString()).toBe(id.toValue())
  })

  it("rejects a blank identifier", () => {
    expect(() => new EntityId("")).toThrow("EntityId cannot be blank.")
    expect(() => new EntityId("   ")).toThrow("EntityId cannot be blank.")
  })

  it("compares identifiers by their string value", () => {
    const left = new EntityId("same")
    const right = new EntityId("same")
    const other = new EntityId("other")

    expect(left.equals(right)).toBe(true)
    expect(left.equals(other)).toBe(false)
  })

  it("returns undefined so the database can assign the id", () => {
    expect(EntityId.create()).toBeUndefined()
    expect(UniqueEntityId.create()).toBeUndefined()
  })

  it("lets a subclass replace create with a generated id", () => {
    class GeneratedId extends EntityId {
      static override create(): GeneratedId {
        return new GeneratedId("generated-id")
      }
    }

    expect(GeneratedId.create().toValue()).toBe("generated-id")
  })

  it("keeps UniqueEntityId as the same constructor", () => {
    const stored = new UniqueEntityId("stored")

    expect(UniqueEntityId).toBe(EntityId)
    expect(stored).toBeInstanceOf(EntityId)
    expect(new EntityId("stored").equals(stored)).toBe(true)
  })
})
