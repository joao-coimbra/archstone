/**
 * Base class for all value objects in the domain.
 *
 * A value object is an object defined entirely by its attributes — it has no
 * identity. Two value objects are considered equal if all their properties
 * are deeply equal, regardless of reference.
 *
 * Value objects should be immutable. Avoid mutating `props` directly;
 * instead, create a new instance with the updated values.
 *
 * All value objects must implement a static `create` factory method to
 * encapsulate construction and validation logic, keeping the constructor
 * protected from external instantiation.
 *
 * @template Props - The shape of the value object's properties
 *
 * @example
 * ```ts
 * interface EmailProps {
 *   value: string
 * }
 *
 * class Email extends ValueObject<EmailProps> {
 *   get value() { return this.props.value }
 *
 *   static create(email: string): Email {
 *     if (!email.includes("@")) {
 *       throw new ValidationError("Invalid email address.")
 *     }
 *
 *     return new Email({ value: email })
 *   }
 * }
 * ```
 */
export abstract class ValueObject<Props> {
  protected props: Props

  protected constructor(props: Props) {
    this.props = props
  }

  /**
   * Compares this value object with another by deep equality of their properties.
   *
   * @param other - The value object to compare against
   * @returns `true` if both value objects have deeply equal properties
   */
  equals(other: ValueObject<Props>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props)
  }
}