# UseCase + Either / Maybe Patterns

## Rules

- Implement `UseCase<Input, Output>`
- Output is `Either<UseCaseError, Value>` **or** `Maybe<Value>` — **never throw**
- Error classes must `implement UseCaseError` (requires `message: string`) — not `extends Error`
- `Findable.findById` returns `Maybe` — use `.isNothing()` / `.value`, never `if (!user)`
- Prefer `attempt(() => Email.create(...))` (from `archstone/core`) over bare `try/catch` when wrapping throwing factories
- Inject repositories via constructor typed as the **interface**

## Example

```ts
import type { UseCase, UseCaseError } from "archstone/domain/application"
import { type Either, attempt, left, right } from "archstone/core"

class UserNotFoundError implements UseCaseError {
  message = "User not found."
}

class InvalidEmailError implements UseCaseError {
  message = "Invalid email address."
}

type Input = { userId: string; newEmail: string }
type Output = Either<UserNotFoundError | InvalidEmailError, User>

class UpdateUserEmailUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {} // interface, not concrete

  async execute({ userId, newEmail }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    if (user.isNothing()) return left(new UserNotFoundError())

    const emailResult = attempt(() => Email.create(newEmail))
    if (emailResult.isLeft()) return left(new InvalidEmailError())

    user.value.updateEmail(emailResult.value)
    await this.repo.save(user.value)
    return right(user.value)
  }
}
```

## Common Mistakes

```ts
// ❌ extends Error
class UserNotFoundError extends Error {} // implement UseCaseError instead

// ❌ throwing
if (!user) throw new Error("not found") // return left(new UserNotFoundError())

// ❌ treating Maybe as null
const user = await this.repo.findById(userId)
if (!user) return left(new UserNotFoundError()) // always false
if (user.isNothing()) return left(new UserNotFoundError()) // correct

// ❌ concrete repo
constructor(private repo: PrismaUserRepository) {} // use the interface
```
