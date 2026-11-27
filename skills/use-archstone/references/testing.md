# Testing Patterns

## Rules

- Use `bun:test` — import `describe`, `it`, `expect`, `beforeEach`, `afterEach` from `bun:test`
- Test files: `*.spec.ts` co-located with the source file they test
- Use in-memory repository implementations for use case tests — never mock databases
- Isolate `DomainEvents` between tests

## Use Case Test Example

```ts
import { beforeEach, expect, it } from "bun:test"
import { GetUserUseCase } from "./get-user"
import { InMemoryUserRepository } from "@/test/repositories/in-memory-user-repository"

let repo: InMemoryUserRepository
let useCase: GetUserUseCase

beforeEach(() => {
  repo = new InMemoryUserRepository()
  useCase = new GetUserUseCase(repo)
})

it("returns user when found", async () => {
  const user = User.create({ name: "João" })
  await repo.create(user)

  const result = await useCase.execute({ userId: user.id.toValue() })

  expect(result.isRight()).toBe(true)
  if (result.isRight()) expect(result.value).toEqual(user)
})

it("returns error when user not found", async () => {
  const result = await useCase.execute({ userId: "non-existent" })

  expect(result.isLeft()).toBe(true)
})
```

## Domain Event Isolation

```ts
import { DomainEvents } from "archstone/core"

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
  DomainEvents.shouldRun = true
})

// Skip dispatch and keep the events on the aggregate:
// DomainEvents.shouldRun = false
```
