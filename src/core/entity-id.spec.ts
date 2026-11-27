import { describe, expect, it } from "bun:test"
import { EntityId, UniqueEntityId } from "./entity-id"

describe("EntityId", () => {
  it("stores no id when the value is omitted", () => {
    const id = new EntityId()

    expect(id.toValue()).toBeUndefined()
    expect(id.toString()).toBe("")
    expect(id.equals(new EntityId())).toBe(false)
    expect(id.equals(id)).toBe(true)
  })

  it("keeps a provided identifier", () => {
    const id = new EntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")

    expect(id.toValue()).toBe("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
    expect(id.toString()).toBe("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
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

  it("uses the generator only when the value is omitted", () => {
    let calls = 0
    const GeneratedId = EntityId.generator(() => {
      calls += 1
      return `id-${calls}`
    })
    const generated = new GeneratedId()

    expect(generated.toValue()).toBe("id-1")
    expect(generated).toBeInstanceOf(EntityId)
    expect(new GeneratedId("stored").toValue()).toBe("stored")
    expect(calls).toBe(1)
    expect(new GeneratedId().equals(generated)).toBe(false)
  })

  it("rejects a blank id from the generator", () => {
    const GeneratedId = EntityId.generator(() => "  ")

    expect(() => new GeneratedId()).toThrow("EntityId cannot be blank.")
  })

  it("keeps UniqueEntityId as the same constructor", () => {
    const stored = new UniqueEntityId("stored")

    expect(UniqueEntityId).toBe(EntityId)
    expect(stored).toBeInstanceOf(EntityId)
    expect(new EntityId("stored").equals(stored)).toBe(true)
  })
})
