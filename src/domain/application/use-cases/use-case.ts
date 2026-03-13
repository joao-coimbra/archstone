import type { Either } from "@/core/either"
import type { UseCaseError } from "./use-case.error"

/**
 * Represents the expected output shape of any use case.
 * Always an {@link Either} — left for errors, right for success.
 */
type UseCaseOutput = Either<UseCaseError | never, unknown | null>

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
