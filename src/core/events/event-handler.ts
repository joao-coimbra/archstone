import type { DomainEvent } from "./domain-event"

/**
 * Base contract for all domain event handlers.
 *
 * An event handler is responsible for subscribing to domain events
 * and executing side effects in response — such as persisting records,
 * broadcasting WebSocket messages, sending emails, or triggering
 * external integrations.
 *
 * Implement {@link setupSubscriptions} to register callbacks in the
 * {@link DomainEvents} registry, and {@link handle} to define the
 * reaction logic for the subscribed event.
 *
 * @typeParam T - The specific {@link DomainEvent} this handler reacts to.
 *
 * @example
 * ```ts
 * class OnUserCreated implements EventHandler<UserCreatedEvent> {
 *   constructor(private readonly mailer: Mailer) {
 *     this.setupSubscriptions()
 *   }
 *
 *   setupSubscriptions(): void {
 *     DomainEvents.register(
 *       this.handle.bind(this),
 *       UserCreatedEvent.name,
 *     )
 *   }
 *
 *   async handle(event: UserCreatedEvent): Promise<void> {
 *     await this.mailer.send(event.user.email)
 *   }
 * }
 * ```
 */
export interface EventHandler<T extends DomainEvent> {
  /**
   * Registers all event subscriptions for this handler.
   *
   * Should be called once during instantiation — typically
   * in the constructor — to ensure the handler is active
   * before any events are dispatched.
   */
  setupSubscriptions(): void

  /**
   * Executes the handler logic in response to a dispatched event.
   *
   * @param event - The domain event instance that was dispatched.
   */
  handle(event: T): Promise<void>
}
