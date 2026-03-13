import { describe, expect, it } from "bun:test"
import { type Either, left, right } from "./either.ts"

function doSomeThing(shouldSuccess: boolean): Either<string, number> {
  if (shouldSuccess) {
    return right(10)
  }

  return left("error")
}

describe("Either", () => {
  it("should be able to return a success result", () => {
    const result = doSomeThing(true)

    expect(result.isRight()).toBeTrue()
    expect(result.isLeft()).toBeFalse()
  })

  it("should be able to return a error result", () => {
    const result = doSomeThing(false)

    expect(result.isLeft()).toBeTrue()
    expect(result.isRight()).toBeFalse()
  })
})
