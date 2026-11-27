/**
 * Identity of a domain entity, wrapped so equality is by value.
 *
 * `create()` returns `undefined`. That means the id is absent, so the insert
 * omits the column and the database assigns the key. `null` is the wrong
 * signal: most drivers write NULL and the database default does not run.
 *
 * A project subclass overrides `create()` and returns a generated id, such as
 * a UUID v7. A stored id is still `new EntityId(row.id)`.
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
 * export class UniqueEntityId extends EntityId {
 *   static override create(): UniqueEntityId {
 *     return new UniqueEntityId(uuidv7())
 *   }
 * }
 * ```
 */
export class EntityId {
  private readonly value: string

  /**
   * Returns `undefined` so persistence can leave the key to the database.
   * Override this in a subclass to generate an id instead.
   */
  static create(): EntityId | undefined {
    return undefined
  }

  constructor(value: string) {
    if (value.trim() === "") {
      throw new Error("EntityId cannot be blank.")
    }
    this.value = value
  }

  /**
   * Returns the identifier as a primitive string.
   * Useful for serialization and database persistence.
   */
  toValue(): string {
    return this.value
  }

  /**
   * Returns the string representation of the identifier.
   */
  toString(): string {
    return this.value
  }

  /**
   * Compares this identifier with another by value equality.
   *
   * @param id - The identifier to compare against
   * @returns `true` if both identifiers have the same value
   */
  equals(id: EntityId): boolean {
    return id.toValue() === this.value
  }
}

/**
 * @deprecated `UniqueEntityId` is the same constructor as {@link EntityId}.
 * `create()` returns `undefined`. Extend `EntityId` in the project and
 * override `create()` to generate an id.
 */
export const UniqueEntityId: typeof EntityId = EntityId

/**
 * @deprecated Use {@link EntityId}. Override `create()` in a project subclass to generate an id.
 */
export type UniqueEntityId = EntityId
