import type { Maybe } from "failcraft"

/**
 * Contract for entities that can be retrieved by their unique identifier.
 *
 * @template T - The entity type
 */
export interface Findable<T> {
  /**
   * Finds an entity by its unique identifier.
   *
   * @param id - The unique identifier of the entity
   * @returns The entity if found, `nothing()` if not found
   */
  findById(id: string): Promise<Maybe<T>>
}
