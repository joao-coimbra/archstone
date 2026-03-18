/** @deprecated use `archstone/core` instead */
export {
  type DomainEvent,
  DomainEvents,
} from "@/core/index.ts"

export * from "./entities/index.ts"

/**
 * @deprecated use `EventHandler` from `archstone/core` instead.
 * The new version supports generic typing via `EventHandler<T>`.
 */
export interface EventHandler {
  setupSubscriptions(): void
}
