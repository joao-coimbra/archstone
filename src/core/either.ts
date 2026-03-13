/**
 * Represents the left side of an {@link Either} — conventionally used for
 * failure or error values.
 *
 * @template L - The type of the failure value
 * @template R - The type of the success value
 */
export class Left<L, R> {
  readonly value: L

  constructor(value: L) {
    this.value = value
  }

  isRight(): this is Right<L, R> {
    return false
  }

  isLeft(): this is Left<L, R> {
    return true
  }
}

/**
 * Represents the right side of an {@link Either} — conventionally used for
 * success values.
 *
 * @template L - The type of the failure value
 * @template R - The type of the success value
 */
export class Right<L, R> {
  readonly value: R

  constructor(value: R) {
    this.value = value
  }

  isRight(): this is Right<L, R> {
    return true
  }

  isLeft(): this is Left<L, R> {
    return false
  }
}

/**
 * A discriminated union that represents a value of one of two possible types.
 *
 * Commonly used as a type-safe alternative to throwing exceptions — the left
 * side carries an error, and the right side carries a success value.
 *
 * Use the {@link left} and {@link right} helper functions to construct values,
 * and `isLeft()` / `isRight()` to narrow the type.
 *
 * @template L - The type of the failure value
 * @template R - The type of the success value
 *
 * @example
 * ```ts
 * type FindUserResult = Either<NotFoundError, User>
 *
 * function findUser(id: string): FindUserResult {
 *   const user = db.find(id)
 *   if (!user) return left(new NotFoundError("User", id))
 *   return right(user)
 * }
 *
 * const result = findUser("123")
 *
 * if (result.isLeft()) {
 *   console.error(result.value) // NotFoundError
 * } else {
 *   console.log(result.value)   // User
 * }
 * ```
 */
export type Either<L, R> = Left<L, R> | Right<L, R>

/**
 * Constructs a {@link Left} value, representing a failure.
 *
 * @param value - The error or failure value
 */
export const left = <L, R>(value: L): Either<L, R> => new Left(value)

/**
 * Constructs a {@link Right} value, representing a success.
 *
 * @param value - The success value
 */
export const right = <L, R>(value: R): Either<L, R> => new Right(value)