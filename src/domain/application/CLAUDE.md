# Domain / Application Layer

**Responsibility:** Orchestration. Connects the domain model to the outside world through use cases and repository contracts. No framework code, no infrastructure — only interfaces and use case logic.

Never import from infrastructure. Only imports from `core/` and `domain/enterprise/` are allowed.

## Use Cases

Every use case implements `UseCase<Input, Output>` and returns `Either` — it never throws.

```ts
import { UseCase } from "@/domain/application/index.ts"
import { Either, left, right } from "@/core/index.ts"

type GetUserInput = { userId: string }
type GetUserOutput = Either<UserNotFoundError, User>

class GetUserUseCase implements UseCase<GetUserInput, GetUserOutput> {
  constructor(private users: UserRepository) {}

  async execute({ userId }: GetUserInput): Promise<GetUserOutput> {
    const user = await this.users.findById(userId)
    if (!user) return left(new UserNotFoundError(userId))
    return right(user)
  }
}
```

The `Output` type must be `Either<UseCaseError | never, SomeValue | null>`. Use `left` for all failure paths.

## Use Case Errors

Error classes **implement** `UseCaseError` — they do not extend `Error`.

```ts
import { UseCaseError } from "@/domain/application/index.ts"

class UserNotFoundError implements UseCaseError {
  message: string

  constructor(id: string) {
    this.message = `User "${id}" not found.`
  }
}
```

**Gotcha:** `implements UseCaseError`, not `extends Error`. The interface only requires `message: string`.

## Repository Contracts

Define repositories as interfaces only. Implementations live in infrastructure, never here.

Use the pre-built segregated contracts and compose as needed:

| Contract | Method signature |
|----------|-----------------|
| `Findable<T>` | `findById(id: string): Promise<T \| null>` |
| `Creatable<T>` | `create(entity: T): Promise<void>` |
| `Saveable<T>` | `save(entity: T): Promise<void>` |
| `Deletable<T>` | `delete(entity: T): Promise<void>` |
| `Repository<T>` | all four above |

```ts
import { Repository } from "@/domain/application/index.ts"

interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}
```

**Gotcha:** `Findable.findById()` takes a plain `string` — pass `entity.id.toValue()`, not the `UniqueEntityId` object.
**Gotcha:** `Deletable.delete()` takes the **full entity**, not an id.

## Injecting Repository into Use Cases

Use constructor injection. The concrete implementation is wired by the infrastructure layer (DI container, factory, or test setup).

```ts
// in tests
const users = new InMemoryUserRepository()
const sut = new GetUserUseCase(users)
```

Never instantiate repository implementations inside a use case.
