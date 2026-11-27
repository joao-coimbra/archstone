import { describe, expect, it } from "bun:test"
import { ValueObject } from "./value-object"

interface BoxProps {
  a: number
  b?: number
  n?: number | null
  when?: Date
}

class Box extends ValueObject<BoxProps> {
  static from(props: BoxProps) {
    return new Box(props)
  }
}

class Id {
  readonly #value: string

  constructor(value: string) {
    this.#value = value
  }

  toValue(): string {
    return this.#value
  }
}

class WithId extends ValueObject<{ id: Id }> {
  static from(id: Id) {
    return new WithId({ id })
  }
}

class Bag extends ValueObject<{ value: unknown }> {
  static from(value: unknown) {
    return new Bag({ value })
  }
}

describe("ValueObject", () => {
  it("treats the same attributes as equal regardless of key order", () => {
    const left = Box.from({ a: 1, b: 2 })
    const right = Box.from({ b: 2, a: 1 })

    expect(left.equals(right)).toBe(true)
  })

  it("treats an explicit undefined attribute as different from a missing one", () => {
    const missing = Box.from({ a: 1 })
    const explicit = Box.from({ a: 1, b: undefined })

    expect(missing.equals(explicit)).toBe(false)
  })

  it("does not treat NaN as null", () => {
    const nan = Box.from({ a: 1, n: Number.NaN })
    const nul = Box.from({ a: 1, n: null })

    expect(nan.equals(nul)).toBe(false)
    expect(nan.equals(Box.from({ a: 1, n: Number.NaN }))).toBe(true)
  })

  it("compares dates by instant", () => {
    const when = new Date("2026-01-01T00:00:00.000Z")
    const left = Box.from({ a: 1, when })
    const right = Box.from({ a: 1, when: new Date(when.getTime()) })

    expect(left.equals(right)).toBe(true)
  })

  it("compares nested values that expose toValue", () => {
    const left = WithId.from(new Id("a"))
    const right = WithId.from(new Id("a"))
    const other = WithId.from(new Id("b"))

    expect(left.equals(right)).toBe(true)
    expect(left.equals(other)).toBe(false)
  })

  it("does not share the props object passed to the constructor", () => {
    const props = { a: 1 }
    const box = Box.from(props)

    props.a = 99

    expect(box.equals(Box.from({ a: 1 }))).toBe(true)
  })

  it("does not treat a date as an empty object", () => {
    const when = new Date("2026-01-01T00:00:00.000Z")

    expect(Bag.from(when).equals(Bag.from({}))).toBe(false)
  })

  it("does not treat an array as a record with the same indexes", () => {
    expect(Bag.from([1]).equals(Bag.from({ 0: 1 }))).toBe(false)
  })

  it("compares cyclic values without recursing forever", () => {
    const left: { self?: object } = {}
    const right: { self?: object } = {}
    left.self = left
    right.self = right

    expect(Bag.from(left).equals(Bag.from(right))).toBe(true)
  })
})
