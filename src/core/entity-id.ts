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
 * `withDefault(fn)` returns an {@link EntityId} class whose `toValue()` is
 * `string`. Omitting the argument stores `fn()`. Passing a string stores
 * that string. The value is never `undefined`.
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
export class EntityId<Value extends string | undefined = string | undefined> {
  private readonly value: string | undefined

  /**
   * Returns an {@link EntityId} class that always has a string id.
   * A missing argument is filled with `generate()`. `toValue()` is `string`.
   */
  static withDefault(
    generate: () => string
  ): new (
    value?: string
  ) => EntityId<string> {
    return class extends EntityId<string> {
      constructor(value?: string) {
        super(value ?? generate())
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
  toValue(): Value {
    return this.value as Value
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
  equals(id: EntityId<string | undefined>): boolean {
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
export const UniqueEntityId: new (value?: string) => EntityId<string> =
  EntityId.withDefault(bunUuidV7)

/** @deprecated Removed in 2.0. Use {@link EntityId}. */
export type UniqueEntityId = EntityId<string>
