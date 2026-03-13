/**
 * Contract for entities that can be created.
 *
 * @template T - The entity type
 */
export interface Creatable<T> {
  /**
   * Persists a new entity for the first time.
   *
   * @param entity - The entity to create
   */
  create(entity: T): Promise<void>
}