const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const hasToValue = (value: object): value is { toValue(): unknown } =>
  "toValue" in value && typeof value.toValue === "function"

const arraysEqual = (
  left: readonly unknown[],
  right: readonly unknown[],
  seen: WeakMap<object, object>
): boolean => {
  if (left.length !== right.length) {
    return false
  }
  for (const [index, item] of left.entries()) {
    if (!valuesEqual(item, right[index], seen)) {
      return false
    }
  }
  return true
}

const recordsEqual = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  seen: WeakMap<object, object>
): boolean => {
  const leftKeys = Object.keys(left)
  if (leftKeys.length !== Object.keys(right).length) {
    return false
  }
  for (const key of leftKeys) {
    if (!Object.hasOwn(right, key)) {
      return false
    }
    if (!valuesEqual(left[key], right[key], seen)) {
      return false
    }
  }
  return true
}

const valuesEqual = (
  left: unknown,
  right: unknown,
  seen: WeakMap<object, object>
): boolean => {
  if (Object.is(left, right)) {
    return true
  }
  if (left instanceof Date || right instanceof Date) {
    if (!(left instanceof Date && right instanceof Date)) {
      return false
    }
    return Object.is(left.getTime(), right.getTime())
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!(Array.isArray(left) && Array.isArray(right))) {
      return false
    }
    if (seen.get(left) === right) {
      return true
    }
    seen.set(left, right)
    return arraysEqual(left, right, seen)
  }
  if (!(isRecord(left) && isRecord(right))) {
    return false
  }
  if (seen.get(left) === right) {
    return true
  }
  seen.set(left, right)
  if (
    left.constructor === right.constructor &&
    hasToValue(left) &&
    hasToValue(right)
  ) {
    return valuesEqual(left.toValue(), right.toValue(), seen)
  }
  return recordsEqual(left, right, seen)
}

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

export abstract class ValueObject<Props extends object> {
  protected props: Props

  protected constructor(props: Props) {
    this.props = { ...props }
  }

  /**
   * Compares this value object with another by deep equality of their properties.
   *
   * @param other - The value object to compare against
   * @returns `true` if both value objects have deeply equal properties
   */
  equals(other: ValueObject<Props>): boolean {
    return valuesEqual(this.props, other.props, new WeakMap())
  }
}
