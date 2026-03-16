# Layer Rules

## core/

Zero domain knowledge. Contains only pure language utilities.

Exports: `Either`, `left`, `right`, `ValueObject`, `UniqueEntityId`, `WatchedList`, `Optional`

## domain/enterprise/

Pure domain model. No framework or infrastructure dependencies.

Contains: entities, aggregates, value objects, domain events, event handlers.

## domain/application/

Orchestration layer. Use cases and repository contracts only.

Contains: use case interfaces, use case error contracts, repository interfaces.

## Infrastructure (outside domain/)

Database adapters, HTTP handlers, ORMs, email services — all live here.

Repository implementations belong here, not in `domain/`.

## Rule

```
core/ ← no deps
domain/enterprise/ ← imports from core/ only
domain/application/ ← imports from core/ and domain/enterprise/
infrastructure/ ← imports from all layers, implements domain/application/ contracts
```
