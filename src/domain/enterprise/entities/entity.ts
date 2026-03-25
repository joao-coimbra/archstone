import { UniqueEntityId } from "@/core/index"

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
 *   id: UniqueEntityId
 *   name: string
 *   email: string
 *   createdAt: Date
 * }
 *
 * class User extends Entity<UserProps> {
 *   get name() { return this.props.name }
 *   get email() { return this.props.email }
 *
 *   static create(props: Optional<UserProps, "id" | "createdAt">): User {
 *     return new User(
 *       { ...props, createdAt: props.createdAt ?? new Date() },
 *       props.id ?? new UniqueEntityId(),
 *     )
 *   }
 * }
 * ```
 */
export abstract class Entity<Props> {
  private readonly _id: UniqueEntityId
  protected props: Props

  get id(): UniqueEntityId {
    return this._id
  }

  protected constructor(props: Props, id?: UniqueEntityId) {
    this._id = id ?? new UniqueEntityId()
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
