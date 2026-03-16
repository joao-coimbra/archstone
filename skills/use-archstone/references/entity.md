# Entity & AggregateRoot Patterns

## Rules

- Extend `Entity<Props>` for identity-only entities
- Extend `AggregateRoot<Props>` for entities that raise domain events
- Always use a static `create()` factory — constructor stays `protected`
- Include `id` as an optional field in `Props` and pass it as the second constructor argument
- Use `Optional<T, K>` for auto-generated fields (e.g. `'id' | 'createdAt'`)
- Use `UniqueEntityId` — never a plain `string`

## Entity Example

```ts
import { Entity } from 'archstone/domain/enterprise'
import { UniqueEntityId, type Optional } from 'archstone/core'

interface ProductProps {
  name: string
  price: number
  createdAt: Date
}

class Product extends Entity<ProductProps> {
  get name()  { return this.props.name }
  get price() { return this.props.price }

  static create(props: Optional<ProductProps, 'createdAt'>, id?: UniqueEntityId): Product {
    return new Product(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId(),
    )
  }
}
```

## AggregateRoot Example

```ts
import { AggregateRoot } from 'archstone/domain/enterprise'
import { UniqueEntityId, type Optional } from 'archstone/core'

interface OrderProps {
  customerId: UniqueEntityId
  total: number
  createdAt: Date
}

class Order extends AggregateRoot<OrderProps> {
  get customerId() { return this.props.customerId }
  get total()      { return this.props.total }

  static create(props: Optional<OrderProps, 'createdAt'>, id?: UniqueEntityId): Order {
    const order = new Order(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id ?? new UniqueEntityId(),
    )
    order.addDomainEvent(new OrderCreatedEvent(order))
    return order
  }
}
```

## Common Mistakes

```ts
// ❌ plain class
class Order { id: string }

// ❌ id not passed as second constructor arg
return new Order(props) // id goes as second arg: new Order(props, id)

// ❌ string id
interface OrderProps { id: string } // use UniqueEntityId
```
