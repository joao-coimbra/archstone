import type { Either, Maybe } from "@/core/index"
import type { UseCaseError } from "./use-case.error"

/**
 * Represents the expected output shape of any use case.
 *
 * Three valid shapes:
 * - `Either<Error, T>`: returns a concrete value or fails with an error
 * - `Maybe<T>`: returns an optional value when the error path is irrelevant
 * - `Nothing`: void result; covered since `Nothing extends Maybe<never>`
 */
type UseCaseOutput = Either<UseCaseError | never, unknown> | Maybe<unknown>

/**
 * Base contract for all application use cases.
 *
 * A use case orchestrates domain logic for a single application operation.
 * It receives a typed input, interacts with the domain, and returns an
 * {@link Either} — never throwing exceptions directly.
 *
 * The left side carries a {@link UseCaseError} on failure.
 * The right side carries the success value.
 *
 * @template Input - The shape of the data required to execute the use case
 * @template Output - The expected {@link Either} output, constrained to {@link UseCaseOutput}
 *
 * @example
 * ```ts
 * type Input = { userId: string }
 * type Output = Either<UserNotFoundError, User>
 *
 * class GetUserUseCase implements UseCase<Input, Output> {
 *   constructor(private userRepository: UserRepository) {}
 *
 *   async execute({ userId }: Input): Promise<Output> {
 *     const user = await this.userRepository.findById(userId)
 *     if (!user) return left(new UserNotFoundError(userId))
 *     return right(user)
 *   }
 * }
 * ```
 */
export interface UseCase<Input, Output extends UseCaseOutput> {
  execute(input: Input): Promise<Output>
}
