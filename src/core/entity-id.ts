/**
 * Identity of a domain entity, wrapped so equality is by value.
 *
 * The library does not generate the value. The project extends this class,
 * usually as `UniqueEntityId`, and decides how a new id is created. A stored
 * id is passed in as the string already saved. Generation stays in the domain,
 * including when the database is able to assign a key.
 *
 * @example
 * ```ts
 * import { randomUUID } from "node:crypto"
 * import { EntityId } from "archstone/core"
 *
 * export class UniqueEntityId extends EntityId {
 *   constructor(value: string = randomUUID()) {
 *     super(value)
 *   }
 * }
 * ```
 */
export class EntityId {
  private readonly value: string

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
