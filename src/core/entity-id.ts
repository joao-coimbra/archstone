// biome-ignore-all lint/style/noExcessiveClassesPerFile: withDefault() returns its own constructor

/**
 * Identity of a domain entity, wrapped so equality is by value.
 *
 * `EntityId` and `withDefault(fn)` ship in 1.6.0.
 *
 * `new EntityId()` stores no id: `toValue()` is `undefined`, so the insert
 * omits the column and the database assigns the key. `new EntityId(value)`
 * stores that string. A blank string throws. `null` is the wrong signal for
 * a missing key: most drivers write NULL and the database default does not
 * run.
 *
 * `withDefault(fn)` returns the {@link EntityId} class. Omitting the
 * argument stores `fn()`. Passing a string stores that string.
 *
 * @example
 * ```ts
 * import { EntityId } from "archstone/core"
 *
 * const uuidv7 = (): string => {
 *   const generate = globalThis.Bun?.randomUUIDv7
 *   if (generate === undefined) {
 *     throw new Error("UniqueEntityId requires a UUID v7 generator.")
 *   }
 *   return generate()
 * }
 *
 * export const UniqueEntityId = EntityId.withDefault(uuidv7)
 * ```
 */
export class EntityId {
  private readonly value: string | undefined

  /**
   * Returns the {@link EntityId} class, filling a missing id with `generate()`.
   */
  static withDefault(generate: () => string): typeof EntityId {
    return class extends EntityId {
      constructor(value?: string) {
        super(value === undefined ? generate() : value)
      }
    }
  }

  constructor(value?: string) {
    if (value !== undefined && value.trim() === "") {
      throw new Error("EntityId cannot be blank.")
    }
    this.value = value
  }

  /**
   * Returns the identifier as a primitive string.
   * `undefined` means the id was not assigned.
   */
  toValue(): string | undefined {
    return this.value
  }

  /**
   * Returns the string representation of the identifier.
   * An unassigned id is an empty string.
   */
  toString(): string {
    return this.value ?? ""
  }

  /**
   * Compares this identifier with another by value equality.
   * An unassigned id is not equal to any id, including another unassigned one.
   *
   * @param id - The identifier to compare against
   * @returns `true` if both identifiers have the same string value
   */
  equals(id: EntityId): boolean {
    if (id === this) {
      return true
    }
    if (this.value === undefined || id.toValue() === undefined) {
      return false
    }
    return id.toValue() === this.value
  }
}

const bunUuidV7 = (): string => {
  const generate = globalThis.Bun?.randomUUIDv7
  if (generate === undefined) {
    throw new Error(
      "UniqueEntityId requires Bun.randomUUIDv7. This constructor will be removed in 2.0. Use EntityId.withDefault in the project."
    )
  }
  return generate()
}

/**
 * @deprecated `UniqueEntityId` is deprecated and will be removed in 2.0.
 * Until then `new UniqueEntityId()` still generates a UUID v7 with
 * `Bun.randomUUIDv7`, and `new UniqueEntityId(value)` stores that string.
 * New code does not import `UniqueEntityId` from Archstone. The project
 * defines its own constructor with {@link EntityId.withDefault}.
 * {@link EntityId} and {@link EntityId.withDefault} ship in 1.6.0.
 */
export const UniqueEntityId: typeof EntityId = EntityId.withDefault(bunUuidV7)

/**
 * @deprecated `UniqueEntityId` is deprecated and will be removed in 2.0.
 * Until then `new UniqueEntityId()` still generates a UUID v7 with
 * `Bun.randomUUIDv7`, and `new UniqueEntityId(value)` stores that string.
 * New code does not import `UniqueEntityId` from Archstone. The project
 * defines its own constructor with {@link EntityId.withDefault}.
 * {@link EntityId} and {@link EntityId.withDefault} ship in 1.6.0.
 */
export type UniqueEntityId = EntityId
