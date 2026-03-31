/**
 * Contract for entities that can be persisted.
 *
 * @template T - The entity type
 */
export interface Saveable<T> {
  /**
   * Persists an existing entity.
   *
   * @param entity - The entity to save
   */
  save(entity: T): Promise<void>
}
