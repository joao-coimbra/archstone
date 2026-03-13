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
   * @returns The entity if found, `null` otherwise
   */
  findById(id: string): Promise<T | null>
}
