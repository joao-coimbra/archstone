import { randomUUIDv7 } from "bun"

/**
 * Represents a unique identifier for a domain entity.
 *
 * Wraps a UUID v7 string, which is time-sortable and ideal for database
 * indexing. A new identifier is generated automatically if no value is provided.
 *
 * @example
 * ```ts
 * // auto-generated
 * const id = new UniqueEntityId()
 *
 * // from existing value (e.g. reconstructing from database)
 * const id = new UniqueEntityId("0195d810-5b3e-7000-8e3e-1a2b3c4d5e6f")
 * ```
 */
export class UniqueEntityId {
  private readonly value: string

  constructor(value?: string) {
    this.value = value ?? randomUUIDv7()
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
  equals(id: UniqueEntityId): boolean {
    return id.toValue() === this.value
  }
}
