# Archstone Import Reference

Always import from the **layer entry point**. Deep imports (e.g. `archstone/core/value-object`) break dts bundling and nominal typing for consumers.

| What                                                            | Import path                    |
| --------------------------------------------------------------- | ------------------------------ |
| `Either`, `Left`, `Right`, `left`, `right`                      | `archstone/core`               |
| `Maybe`, `Just`, `Nothing`, `just`, `nothing`, `maybe`          | `archstone/core`               |
| `attempt`, `from`                                               | `archstone/core`               |
| `ValueObject`                                                   | `archstone/core`               |
| `EntityId`                                                      | `archstone/core`               |
| `UniqueEntityId` (deprecated alias of `EntityId`, no generator) | `archstone/core`               |
| `WatchedList`                                                   | `archstone/core`               |
| `Optional`                                                      | `archstone/core`               |
| `DomainEvent`, `DomainEvents`, `EventHandler`                   | `archstone/core`               |
| `Entity`, `AggregateRoot`                                       | `archstone/domain/enterprise`  |
| `UseCase`, `UseCaseError`                                       | `archstone/domain/application` |
| `Repository`, `Findable`, `Creatable`, `Saveable`, `Deletable`  | `archstone/domain/application` |

```ts
// ✅
import {
  DomainEvents,
  type EventHandler,
  type DomainEvent,
} from "archstone/core"
import { Either, left, right, just, nothing, attempt } from "archstone/core"
import { Entity, AggregateRoot } from "archstone/domain/enterprise"
import type { UseCase, Repository } from "archstone/domain/application"

// ❌ deep path — breaks dts bundling
import { ValueObject } from "archstone/core/value-object"

// ❌ EventHandler is exported from archstone/core, not from enterprise
import { DomainEvents, EventHandler } from "archstone/domain/enterprise"
```
