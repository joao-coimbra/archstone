# Layer Rules

## core/

Zero domain knowledge. Contains only pure language utilities and the domain-events bus.

Exports: `Either`, `left`, `right`, `Maybe`, `just`, `nothing`, `maybe`, `attempt`, `from`, `ValueObject`, `EntityId` and `EntityId.withDefault(fn)` (ship in 1.6.0), `UniqueEntityId` (deprecated, still generates a UUID v7 with `Bun.randomUUIDv7`, will be removed in 2.0; new code does not import it), `WatchedList`, `Optional`, `DomainEvent`, `DomainEvents`, `EventHandler`

## domain/enterprise/

Pure domain model. No framework or infrastructure dependencies.

Contains: `Entity`, `AggregateRoot` (and domain types that extend them).

`DomainEvent` / `DomainEvents` / `EventHandler` live in `core`. Enterprise still re-exports some of them as `@deprecated` — do not use those paths in new code.

## domain/application/

Orchestration layer. Use cases and repository contracts only.

Contains: `UseCase`, `UseCaseError`, `Repository`, `Findable`, `Creatable`, `Saveable`, `Deletable`.

## Infrastructure (outside domain/)

Database adapters, HTTP handlers, ORMs, email services — all live here.

Repository implementations belong here, not in `domain/`.

## Rule

```
core/ ← no deps on domain
domain/enterprise/ ← imports from core/ only
domain/application/ ← imports from core/ and domain/enterprise/
infrastructure/ ← imports from all layers, implements domain/application/ contracts
```
