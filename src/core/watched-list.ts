/**
 * Tracks additions and removals of items in a collection, enabling
 * efficient persistence of only what changed.
 *
 * Commonly used inside aggregate roots to manage one-to-many relationships
 * without rewriting the entire collection on every save — only new and
 * removed items are persisted.
 *
 * Subclasses must implement {@link compareItems} to define equality between items.
 *
 * @template T - The type of items in the list
 *
 * @example
 * ```ts
 * class TagList extends WatchedList<Tag> {
 *   compareItems(a: Tag, b: Tag): boolean {
 *     return a.id.equals(b.id)
 *   }
 *
 *   static create(tags: Tag[]): TagList {
 *     return new TagList(tags)
 *   }
 * }
 *
 * const tags = TagList.create([existingTag])
 *
 * tags.add(newTag)      // tracked as new
 * tags.remove(oldTag)   // tracked as removed
 *
 * tags.getNewItems()     // [newTag]
 * tags.getRemovedItems() // [oldTag]
 * ```
 */
export abstract class WatchedList<T> {
  protected currentItems: T[]
  protected initial: T[]
  protected new: T[]
  protected removed: T[]

  constructor(initialItems?: T[]) {
    this.currentItems = initialItems ?? []
    this.initial = initialItems ?? []
    this.new = []
    this.removed = []
  }

  /**
   * Defines equality between two items in the list.
   * Must be implemented by subclasses.
   *
   * @param a - First item
   * @param b - Second item
   * @returns `true` if both items are considered equal
   */
  abstract compareItems(a: T, b: T): boolean

  /**
   * Returns all current items in the list.
   */
  getItems(): T[] {
    return this.currentItems
  }

  /**
   * Returns items that were added since the list was created.
   */
  getNewItems(): T[] {
    return this.new
  }

  /**
   * Returns items that were removed since the list was created.
   */
  getRemovedItems(): T[] {
    return this.removed
  }

  /**
   * Returns whether the given item exists in the current list.
   *
   * @param item - The item to check
   */
  exists(item: T): boolean {
    return this.isCurrentItem(item)
  }

  /**
   * Adds an item to the list, tracking it as new if it wasn't in the initial set.
   * If the item was previously removed, it is restored.
   *
   * @param item - The item to add
   */
  add(item: T): void {
    if (this.isRemovedItem(item)) {
      this.removeFromRemoved(item)
    }
    if (!(this.isNewItem(item) || this.wasAddedInitially(item))) {
      this.new.push(item)
    }
    if (!this.isCurrentItem(item)) {
      this.currentItems.push(item)
    }
  }

  /**
   * Removes an item from the list, tracking it as removed if it was in the initial set.
   *
   * @param item - The item to remove
   */
  remove(item: T): void {
    this.removeFromCurrent(item)
    if (this.isNewItem(item)) {
      this.removeFromNew(item)
      return
    }
    if (!this.isRemovedItem(item)) {
      this.removed.push(item)
    }
  }

  /**
   * Replaces the entire list with a new set of items, automatically
   * computing what was added and what was removed.
   *
   * @param items - The new set of items
   */
  update(items: T[]): void {
    this.new = items.filter(
      (a) => !this.getItems().some((b) => this.compareItems(a, b))
    )
    this.removed = this.getItems().filter(
      (a) => !items.some((b) => this.compareItems(a, b))
    )
    this.currentItems = items
  }

  private isCurrentItem(item: T): boolean {
    return this.currentItems.some((v) => this.compareItems(item, v))
  }

  private isNewItem(item: T): boolean {
    return this.new.some((v) => this.compareItems(item, v))
  }

  private isRemovedItem(item: T): boolean {
    return this.removed.some((v) => this.compareItems(item, v))
  }

  private removeFromNew(item: T): void {
    this.new = this.new.filter((v) => !this.compareItems(v, item))
  }

  private removeFromCurrent(item: T): void {
    this.currentItems = this.currentItems.filter(
      (v) => !this.compareItems(item, v)
    )
  }

  private removeFromRemoved(item: T): void {
    this.removed = this.removed.filter((v) => !this.compareItems(item, v))
  }

  private wasAddedInitially(item: T): boolean {
    return this.initial.some((v) => this.compareItems(item, v))
  }
}