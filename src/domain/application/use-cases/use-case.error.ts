/**
 * Base contract for all use case errors.
 *
 * Implement this interface to define semantic, domain-aware errors
 * that can be returned as the left side of an {@link Either}.
 *
 * @example
 * ```ts
 * class UserNotFoundError implements UseCaseError {
 *   message = "User not found."
 * }
 *
 * type FindUserResult = Either<UserNotFoundError, User>
 * ```
 */
export interface UseCaseError {
  message: string
}
