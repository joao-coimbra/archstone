import { describe, expect, it } from "bun:test"
import { createUuidV7 } from "./uuid-v7"

const uuidV7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const compareIds = (left: string, right: string): number => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

describe("createUuidV7", () => {
  it("builds a UUID v7 from crypto without Bun", () => {
    expect(createUuidV7()).toMatch(uuidV7)
  })

  it("embeds the current time in the first 48 bits", () => {
    const before = Date.now()
    const hex = createUuidV7().replaceAll("-", "")
    const timestamp = Number.parseInt(hex.slice(0, 12), 16)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(Date.now() + 1)
  })

  it("keeps a burst of ids unique and ordered", () => {
    const ids = Array.from({ length: 5000 }, () => createUuidV7())
    const ordered = [...ids].sort(compareIds)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(ordered)
  })
})
