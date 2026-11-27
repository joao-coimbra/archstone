import type { EntityId } from "@/core/index"

/**
 * Base class for all domain entities.
 *
 * An entity is an object defined by its identity rather than its attributes.
 * Two entities are considered equal if they share the same `id`, regardless
 * of their other properties.
 *
 * All entities must implement a static `create` factory method to encapsulate
 * construction logic and keep the constructor protected.
 *
 * @template Props - The shape of the entity's properties
 *
 * @example
 * ```ts
 * interface UserProps {
 *   name: string
 *   email: string
 *   createdAt: Date
 * }
 *
 * class User extends Entity<UserProps> {
 *   get name() { return this.props.name }
 *   get email() { return this.props.email }
 *
 *   static create(props: Optional<UserProps, "createdAt">, id?: EntityId): User {
 *     return new User(
 *       { ...props, createdAt: props.createdAt ?? new Date() },
 *       id ?? new EntityId(randomUUID()),
 *     )
 *   }
 * }
 * ```
 */
export abstract class Entity<Props> {
  private readonly _id: EntityId
  protected props: Props

  get id(): EntityId {
    return this._id
  }

  protected constructor(props: Props, id: EntityId) {
    this._id = id
    this.props = props
  }

  /**
   * Compares this entity with another by identity.
   *
   * @param entity - The entity to compare against
   * @returns `true` if both entities share the same `id`
   */
  equals(entity: Entity<unknown>): boolean {
    if (entity === this) {
      return true
    }

    return entity.id.equals(this._id)
  }
}
