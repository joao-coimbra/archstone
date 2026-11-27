import { describe, expect, it } from "bun:test"
import { UniqueEntityId } from "./unique-entity-id"

const uuidV7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

describe("UniqueEntityId", () => {
  it("generates a UUID v7 when no value is given", () => {
    const id = new UniqueEntityId()

    expect(id.toValue()).toMatch(uuidV7)
    expect(id.toString()).toBe(id.toValue())
  })

  it("keeps a provided identifier", () => {
    const id = new UniqueEntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")

    expect(id.toValue()).toBe("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
  })

  it("rejects a blank identifier", () => {
    expect(() => new UniqueEntityId("")).toThrow(
      "UniqueEntityId cannot be blank."
    )
    expect(() => new UniqueEntityId("   ")).toThrow(
      "UniqueEntityId cannot be blank."
    )
  })

  it("compares identifiers by their string value", () => {
    const left = new UniqueEntityId("same")
    const right = new UniqueEntityId("same")
    const other = new UniqueEntityId("other")

    expect(left.equals(right)).toBe(true)
    expect(left.equals(other)).toBe(false)
  })
})
