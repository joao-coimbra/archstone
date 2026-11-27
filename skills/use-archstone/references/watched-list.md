# WatchedList Patterns

## Rules

- Subclass `WatchedList<T>` and implement `compareItems(a, b): boolean`
- Use inside aggregates for owned collections that need change tracking
- Persist only `getNewItems()` / `getRemovedItems()` when writing diffs
- `update()` replaces the current items and recomputes the diff against the list the collection was created with
- `getItems()`, `getNewItems()`, and `getRemovedItems()` return copies
- Removing an item that is not in the list changes nothing

## API

```ts
abstract class WatchedList<T> {
  abstract compareItems(a: T, b: T): boolean
  getItems(): T[]
  getNewItems(): T[]
  getRemovedItems(): T[]
  exists(item: T): boolean
  add(item: T): void
  remove(item: T): void
  update(items: T[]): void
}
```

## Example

```ts
import { WatchedList } from "archstone/core"

class AttachmentList extends WatchedList<Attachment> {
  compareItems(a: Attachment, b: Attachment) {
    return a.id.equals(b.id)
  }

  static create(attachments: Attachment[]): AttachmentList {
    return new AttachmentList(attachments)
  }
}

const list = AttachmentList.create([existing])
list.add(newer)
list.remove(existing)

list.getNewItems() // [newer]
list.getRemovedItems() // [existing]
```
