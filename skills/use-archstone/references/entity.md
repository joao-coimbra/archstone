# Entity & AggregateRoot Patterns

## Rules

- Extend `Entity<Props>` for identity-only entities
- Extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- Identity is the **second constructor argument** (`id: EntityId`) — do **not** put `id` inside `Props`. `Entity` does not generate one
- Use `Optional<T, K>` for auto-generated fields in props (e.g. `"createdAt"`)
- `EntityId` and `EntityId.withDefault(fn)` ship in 1.6.0. `new EntityId()` stores no id. `new EntityId(value)` stores that string. A blank string throws. Omitting the id on insert lets the database assign the key. Do not use `null`: an explicit NULL skips the database default
- `EntityId.withDefault(fn)` returns an `EntityId` class whose `toValue()` is `string`. Omitting the argument stores `fn()`. Passing a string stores that string. The value is never `undefined`. The project defines its own constructor with that class. The entity factory uses `id ?? new UniqueEntityId()` when `UniqueEntityId` is that constructor
- The `UniqueEntityId` exported by Archstone is deprecated and will be removed in 2.0. Until then `new UniqueEntityId()` still generates a UUID v7 with `Bun.randomUUIDv7`. New code does not import `UniqueEntityId` from Archstone
- `id.toValue()` / `id.toString()` for the raw string; `id.equals(other)` for comparison

## Project id

```ts
import { EntityId } from "archstone/core"

const uuidv7 = (): string => {
  const generate = globalThis.Bun?.randomUUIDv7
  if (generate === undefined) {
    throw new Error("UniqueEntityId requires a UUID v7 generator.")
  }
  return generate()
}

export const UniqueEntityId = EntityId.withDefault(uuidv7)
```

`new UniqueEntityId()` in this file is a UUID v7 from the function passed to `withDefault`. `new UniqueEntityId(row.id)` keeps a stored string. `new EntityId()` has no id. Replace `uuidv7` with that function. The `UniqueEntityId` exported by Archstone is a different constructor: it is deprecated and will be removed in 2.0. Until then that export still generates a UUID v7 with `Bun.randomUUIDv7`. New code does not import it.

## Entity Example

```ts
import { Entity } from "archstone/domain/enterprise"
import { type EntityId, type Optional } from "archstone/core"
import { UniqueEntityId } from "@/core/unique-entity-id"

interface ProductProps {
  name: string
  price: number
  createdAt: Date
}

class Product extends Entity<ProductProps> {
  get name() {
    return this.props.name
  }
  get price() {
    return this.props.price
  }

  static create(
    props: Optional<ProductProps, "createdAt">,
    id?: EntityId
  ): Product {
    return new Product(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId()
    )
  }
}
```

## AggregateRoot Example

```ts
import { AggregateRoot } from "archstone/domain/enterprise"
import type { DomainEvent, EntityId, Optional } from "archstone/core"
import { UniqueEntityId } from "@/core/unique-entity-id"

interface OrderProps {
  customerId: EntityId
  total: number
  createdAt: Date
}

class OrderCreatedEvent implements DomainEvent {
  occurredAt = new Date()
  constructor(public readonly order: Order) {}
  getAggregateId() {
    return this.order.id
  }
}

class Order extends AggregateRoot<OrderProps> {
  get customerId() {
    return this.props.customerId
  }
  get total() {
    return this.props.total
  }

  static create(
    props: Optional<OrderProps, "createdAt">,
    id?: EntityId
  ): Order {
    const order = new Order(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId()
    )
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

## Common Mistakes

```ts
// ❌ plain class
class Order {
  id: string
}

// ❌ id not passed as second constructor arg
return new Order(props) // id goes as second arg: new Order(props, id)

// ❌ string id in Props as identity
interface OrderProps {
  id: string
} // use EntityId as the second constructor arg instead
```
