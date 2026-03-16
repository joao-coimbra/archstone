# Repository Patterns

## Rules

- Contracts are **interfaces only** — never place implementations in `domain/`
- Extend `Repository<T>` for full CRUD, or compose granular interfaces:
  - `Findable<T>` — `findById(id: string)` — takes `string`, not `UniqueEntityId`
  - `Creatable<T>` — `create(entity: T)`
  - `Saveable<T>` — `save(entity: T)`
  - `Deletable<T>` — `delete(entity: T)` — takes full entity, not an id
- Import via barrel: `archstone/domain/application`
- Implementations belong in infrastructure
- Inject as the **interface type** in use cases

## Contract Example

```ts
import type { Repository, Creatable } from 'archstone/domain/application'

// Full CRUD + custom method
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>
}

// Compose only what you need
export interface AuditRepository extends Creatable<AuditLog> {}
```

## In-Memory Implementation (for tests)

```ts
export class InMemoryUserRepository implements UserRepository {
  public items: User[] = []

  async findById(id: string) {
    return this.items.find(u => u.id.toValue() === id) ?? null
  }

  async findByEmail(email: string) {
    return this.items.find(u => u.email.value === email) ?? null
  }

  async create(user: User)  { this.items.push(user) }

  async save(user: User) {
    const i = this.items.findIndex(u => u.id.equals(user.id))
    if (i >= 0) this.items[i] = user
  }

  async delete(user: User) {
    this.items = this.items.filter(u => !u.id.equals(user.id))
  }
}
```

## Common Mistakes

```ts
// ❌ concrete class in use case
constructor(private repo: PrismaUserRepository) {}

// ❌ UniqueEntityId to findById
await repo.findById(user.id)           // wrong
await repo.findById(user.id.toValue()) // correct
```
