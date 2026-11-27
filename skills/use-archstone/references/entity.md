# Entity & AggregateRoot Patterns

## Rules

- Extend `Entity<Props>` for identity-only entities
- Extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- Identity is the **second constructor argument** (`id: EntityId`) — do **not** put `id` inside `Props`. `Entity` does not generate one
- Use `Optional<T, K>` for auto-generated fields in props (e.g. `"createdAt"`)
- `EntityId.create()` returns `undefined`. Omit the key on insert and the database assigns it. Do not use `null`: an explicit NULL skips the database default. A blank string throws. A stored row passes `new EntityId(row.id)`
- Extend `EntityId` in the project as `UniqueEntityId` and override `create()` to return a generated id. The entity factory uses `id ?? UniqueEntityId.create()`
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

export class UniqueEntityId extends EntityId {
  static override create(): UniqueEntityId {
    return new UniqueEntityId(uuidv7())
  }
}
```

`EntityId.create()` stays `undefined`. `UniqueEntityId.create()` replaces that result with a UUID v7. Replace `uuidv7()` with the generator the project wants.

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
      id ?? UniqueEntityId.create()
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
      id ?? UniqueEntityId.create()
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
