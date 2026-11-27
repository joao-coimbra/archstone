# Entity & AggregateRoot Patterns

## Rules

- Extend `Entity<Props>` for identity-only entities
- Extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- Identity is the **second constructor argument** (`id: EntityId`) — do **not** put `id` inside `Props`. `Entity` does not generate one
- Use `Optional<T, K>` for auto-generated fields in props (e.g. `"createdAt"`)
- `EntityId` from `archstone/core` only stores a string. A blank string throws. `create()` generates a new one when the caller omits the id: `id ?? new EntityId(randomUUID())`. A stored row passes `new EntityId(row.id)`. The domain owns the id even when the database can assign one
- `id.toValue()` / `id.toString()` for the raw string; `id.equals(other)` for comparison

## Entity Example

```ts
import { randomUUID } from "node:crypto"
import { Entity } from "archstone/domain/enterprise"
import { EntityId, type Optional } from "archstone/core"

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
      id ?? new EntityId(randomUUID())
    )
  }
}
```

## AggregateRoot Example

```ts
import { randomUUID } from "node:crypto"
import { AggregateRoot } from "archstone/domain/enterprise"
import { EntityId, type DomainEvent, type Optional } from "archstone/core"

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
      id ?? new EntityId(randomUUID())
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
