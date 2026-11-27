const timestampHexLength = 12
const sequenceHexLength = 3
const sequenceLimit = 16 ** sequenceHexLength
const randomByteCount = 8
const randomHexLength = 15
const variantNibbles = ["8", "9", "a", "b"] as const

let lastTimestamp = 0
let sequence = 0

const nextTime = (now: number): { timestamp: number; sequence: number } => {
  if (now > lastTimestamp) {
    lastTimestamp = now
    sequence = 0
    return { timestamp: lastTimestamp, sequence }
  }

  sequence += 1
  if (sequence === sequenceLimit) {
    lastTimestamp += 1
    sequence = 0
  }

  return { timestamp: lastTimestamp, sequence }
}

const formatUuid = (raw: string): string =>
  `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`

/**
 * UUID v7 from `crypto.getRandomValues`.
 * The same implementation runs on Bun, Node, and other Web Crypto hosts.
 */
export const createUuidV7 = (): string => {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error(
      "UniqueEntityId requires crypto.getRandomValues to generate an id."
    )
  }

  const bytes = new Uint8Array(randomByteCount)
  cryptoApi.getRandomValues(bytes)
  const { timestamp, sequence: currentSequence } = nextTime(Date.now())
  const timestampHex = timestamp
    .toString(16)
    .padStart(timestampHexLength, "0")
    .slice(-timestampHexLength)
  const sequenceHex = currentSequence
    .toString(16)
    .padStart(sequenceHexLength, "0")
  const randomHex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
  const [firstByte] = bytes
  if (firstByte === undefined) {
    throw new Error(
      "UniqueEntityId requires crypto.getRandomValues to generate an id."
    )
  }
  const variant = variantNibbles[firstByte % variantNibbles.length] ?? "8"
  const raw = `${timestampHex}7${sequenceHex}${variant}${randomHex.slice(0, randomHexLength)}`

  return formatUuid(raw)
}
