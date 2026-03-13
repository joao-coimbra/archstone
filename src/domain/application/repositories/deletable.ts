/**
 * Contract for entities that can be deleted.
 *
 * @template T - The entity type
 */
export interface Deletable<T> {
  /**
   * Deletes an entity from the repository.
   *
   * @param entity - The entity to delete
   */
  delete(entity: T): Promise<void>
}