import { describe, expect, test } from "bun:test"
import {
  type Either,
  just,
  left,
  type Maybe,
  maybe,
  nothing,
  right,
} from "./index"

describe("Either (failcraft re-export)", () => {
  test("right() is right", () => {
    const result: Either<string, number> = right(10)
    expect(result.isRight()).toBeTrue()
    expect(result.isLeft()).toBeFalse()
  })

  test("left() is left", () => {
    const result: Either<string, number> = left("error")
    expect(result.isLeft()).toBeTrue()
    expect(result.isRight()).toBeFalse()
  })
})

describe("Maybe (failcraft re-export)", () => {
  test("just() wraps a present value", () => {
    const result: Maybe<number> = just(42)
    expect(result.isJust()).toBeTrue()
    expect(result.isNothing()).toBeFalse()
  })

  test("nothing() represents an absent value", () => {
    const result: Maybe<number> = nothing()
    expect(result.isNothing()).toBeTrue()
    expect(result.isJust()).toBeFalse()
  })

  test("maybe() wraps nullable values", () => {
    expect(maybe(null).isNothing()).toBeTrue()
    expect(maybe(undefined).isNothing()).toBeTrue()
    expect(maybe(0).isJust()).toBeTrue()
    expect(maybe("").isJust()).toBeTrue()
  })
})
