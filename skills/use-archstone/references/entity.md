# Entity & AggregateRoot Patterns

## Rules

- Extend `Entity<Props>` for identity-only entities
- Extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- Identity is the **second constructor argument** (`id?: UniqueEntityId`) — do **not** put `id` inside `Props`
- Use `Optional<T, K>` for auto-generated fields in props (e.g. `"createdAt"`)
- Use `UniqueEntityId` (UUID v7 via Bun) — never a plain `string` as identity
- `id.toValue()` / `id.toString()` for the raw string; `id.equals(other)` for comparison

## Entity Example

```ts
import { Entity } from "archstone/domain/enterprise"
import { UniqueEntityId, type Optional } from "archstone/core"

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
    id?: UniqueEntityId
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
import { type DomainEvent, UniqueEntityId, type Optional } from "archstone/core"

interface OrderProps {
  customerId: UniqueEntityId
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
    id?: UniqueEntityId
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
} // use UniqueEntityId as the second constructor arg instead
```
