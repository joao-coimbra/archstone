# UseCase + Either Patterns

## Rules

- Implement `UseCase<Input, Output>`
- Output is always `Either<UseCaseError, Value>` — **never throw**
- Error classes must `implement UseCaseError` (requires `message: string`) — not `extends Error`
- Wrap value object construction in `try/catch` and return `left()`
- Inject repositories via constructor typed as the **interface**

## Example

```ts
import type { UseCase, UseCaseError } from 'archstone/domain/application'
import { Either, left, right } from 'archstone/core'

class UserNotFoundError implements UseCaseError {
  message = 'User not found.'
}

class InvalidEmailError implements UseCaseError {
  message = 'Invalid email address.'
}

type Input  = { userId: string; newEmail: string }
type Output = Either<UserNotFoundError | InvalidEmailError, User>

class UpdateUserEmailUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {} // interface, not concrete

  async execute({ userId, newEmail }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    if (!user) return left(new UserNotFoundError())

    try {
      const email = Email.create(newEmail)
      user.updateEmail(email)
    } catch {
      return left(new InvalidEmailError())
    }

    await this.repo.save(user)
    return right(user)
  }
}
```

## Common Mistakes

```ts
// ❌ extends Error
class UserNotFoundError extends Error {} // implement UseCaseError instead

// ❌ throwing
if (!user) throw new Error('not found') // return left(new UserNotFoundError())

// ❌ concrete repo
constructor(private repo: PrismaUserRepository) {} // use the interface
```
