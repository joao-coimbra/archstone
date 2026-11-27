# Repository Patterns

## Rules

- Contracts are **interfaces only** — never place implementations in `domain/`
- Extend `Repository<T>` for full CRUD, or compose granular interfaces:
  - `Findable<T>` — `findById(id: string): Promise<Maybe<T>>`
  - `Creatable<T>` — `create(entity: T): Promise<void>`
  - `Saveable<T>` — `save(entity: T): Promise<void>`
  - `Deletable<T>` — `delete(entity: T): Promise<void>` — takes full entity, not an id
- Import via barrel: `archstone/domain/application`
- Implementations belong in infrastructure
- Inject as the **interface type** in use cases

## Contract Example

```ts
import type { Maybe } from "archstone/core"
import type { Creatable, Repository } from "archstone/domain/application"

// Full CRUD + custom finder (custom finders return Maybe, like findById)
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<Maybe<User>>
}

// Compose only what you need
export interface AuditRepository extends Creatable<AuditLog> {}
```

## In-Memory Implementation (for tests)

```ts
import { just, nothing } from "archstone/core"

export class InMemoryUserRepository implements UserRepository {
  public items: User[] = []

  async findById(id: string) {
    const user = this.items.find((u) => u.id.toValue() === id)
    return user ? just(user) : nothing()
  }

  async findByEmail(email: string) {
    const user = this.items.find((u) => u.email.value === email)
    return user ? just(user) : nothing()
  }

  async create(user: User) {
    this.items.push(user)
  }

  async save(user: User) {
    const i = this.items.findIndex((u) => u.id.equals(user.id))
    if (i >= 0) this.items[i] = user
  }

  async delete(user: User) {
    this.items = this.items.filter((u) => !u.id.equals(user.id))
  }
}
```

## Common Mistakes

```ts
// ❌ concrete class in use case
constructor(private repo: PrismaUserRepository) {}

// ❌ UniqueEntityId to findById
await repo.findById(user.id) // wrong
await repo.findById(user.id.toValue()) // correct

// ❌ treating Maybe as nullable
const user = await repo.findById(id)
if (!user) {
} // always false — use user.isNothing()
```
