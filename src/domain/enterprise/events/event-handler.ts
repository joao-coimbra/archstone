/**
 * Base contract for all event handlers.
 *
 * An event handler is responsible for subscribing to domain events
 * and executing side effects in response — such as sending emails,
 * updating read models, or triggering external integrations.
 *
 * All handlers must implement {@link setupSubscriptions} to register
 * their callbacks in the {@link DomainEvents} registry.
 *
 * @example
 * ```ts
 * class OnUserCreated implements EventHandler {
 *   constructor(private readonly mailer: Mailer) {}
 *
 *   setupSubscriptions(): void {
 *     DomainEvents.register(
 *       (event) => this.sendWelcomeEmail(event as UserCreatedEvent),
 *       UserCreatedEvent.name,
 *     )
 *   }
 *
 *   private async sendWelcomeEmail(event: UserCreatedEvent): Promise<void> {
 *     await this.mailer.send(event.user.email)
 *   }
 * }
 * ```
 */
export interface EventHandler {
  /**
   * Registers all event subscriptions for this handler.
   * Should be called once during application bootstrap.
   */
  setupSubscriptions(): void
}