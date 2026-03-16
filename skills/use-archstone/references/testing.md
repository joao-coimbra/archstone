# Testing Patterns

## Rules

- Use `bun:test` — import `test`, `expect`, `beforeEach` from `bun:test`
- Test files: `*.spec.ts` co-located with the source file they test
- Use in-memory repository implementations for use case tests — never mock databases

## Use Case Test Example

```ts
import { test, expect, beforeEach } from 'bun:test'
import { GetUserUseCase } from './get-user'
import { InMemoryUserRepository } from '@/test/repositories/in-memory-user-repository'

let repo: InMemoryUserRepository
let useCase: GetUserUseCase

beforeEach(() => {
  repo = new InMemoryUserRepository()
  useCase = new GetUserUseCase(repo)
})

test('returns user when found', async () => {
  const user = User.create({ name: 'João' })
  await repo.create(user)

  const result = await useCase.execute({ userId: user.id.toValue() })

  expect(result.isRight()).toBe(true)
  expect(result.value).toEqual(user)
})

test('returns error when user not found', async () => {
  const result = await useCase.execute({ userId: 'non-existent' })

  expect(result.isLeft()).toBe(true)
})
```

## Domain Event Isolation

```ts
import { DomainEvents } from 'archstone/domain/enterprise'

beforeEach(() => {
  DomainEvents.clearHandlers()
  DomainEvents.clearMarkedAggregates()
})
```
