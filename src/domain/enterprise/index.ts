/**
 * @deprecated Import `DomainEvent`, `DomainEvents`, and `EventHandler` from
 * `archstone/core` instead. `EventHandler` there is generic: `EventHandler<T>`.
 */
export {
  type DomainEvent,
  DomainEvents,
  type EventHandler,
} from "@/core/index"

export * from "./entities/index"
