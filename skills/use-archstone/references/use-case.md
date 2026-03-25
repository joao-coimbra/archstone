# UseCase Patterns

## Rules

- Implement `UseCase<Input, Output>`
- Output is one of three shapes — **never throw**:
  - `Either<UseCaseError, T>` — returns a value or fails with a typed error
  - `Maybe<T>` — returns an optional value when the error path is irrelevant
  - `Nothing` — void result (command use case); `Nothing` extends `Maybe<never>`
- Error classes must `implement UseCaseError` (requires `message: string`) — not `extends Error`
- Inject repositories via constructor typed as the **interface**

## Examples

### Either — value or typed error

```ts
import type { UseCase, UseCaseError } from 'archstone/domain/application'
import type { Either } from 'archstone/core'
import { left, right } from 'archstone/core'

class UserNotFoundError implements UseCaseError {
  message = 'User not found.'
}

type Input  = { userId: string }
type Output = Either<UserNotFoundError, User>

class GetUserUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {}

  async execute({ userId }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    if (!user) return left(new UserNotFoundError())
    return right(user)
  }
}
```

### Maybe — optional result, no error path

```ts
import type { UseCase } from 'archstone/domain/application'
import type { Maybe } from 'archstone/core'
import { just, nothing } from 'archstone/core'

type Input  = { userId: string }
type Output = Maybe<User>

class FindUserUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {}

  async execute({ userId }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    return user ? just(user) : nothing()
  }
}
```

### Nothing — void / command

```ts
import type { UseCase } from 'archstone/domain/application'
import type { Nothing } from 'archstone/core'
import { nothing } from 'archstone/core'

type Input  = { userId: string }
type Output = Nothing

class DeleteUserUseCase implements UseCase<Input, Output> {
  constructor(private readonly repo: UserRepository) {}

  async execute({ userId }: Input): Promise<Output> {
    const user = await this.repo.findById(userId)
    if (user) await this.repo.delete(user)
    return nothing()
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

// ❌ null as success value — use nothing() instead
return right(null) // return nothing()
```
