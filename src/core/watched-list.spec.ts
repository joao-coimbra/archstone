import { describe, expect, it } from "bun:test"
import { WatchedList } from "./watched-list"

class NumberWatchedList extends WatchedList<number> {
  compareItems(a: number, b: number): boolean {
    return a === b
  }
}

describe("Watched List", () => {
  it("should be able to create a watched list with initial items", () => {
    const list = new NumberWatchedList([1, 2, 3])

    expect(list.getItems()).toHaveLength(3)
  })

  it("should be able to add new items to the list", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.add(4)

    expect(list.getItems()).toHaveLength(4)
    expect(list.getNewItems()).toEqual([4])
  })

  it("should be able to remove items from the list", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.remove(2)

    expect(list.getItems()).toHaveLength(2)
    expect(list.getRemovedItems()).toEqual([2])
  })

  it("should be able to add an item even if it was removed before", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.remove(2)
    list.add(2)

    expect(list.getItems()).toHaveLength(3)

    expect(list.getRemovedItems()).toEqual([])
    expect(list.getNewItems()).toEqual([])
  })

  it("should be able to remove an item even if it was added before", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.add(4)
    list.remove(4)

    expect(list.getItems()).toHaveLength(3)

    expect(list.getRemovedItems()).toEqual([])
    expect(list.getNewItems()).toEqual([])
  })

  it("should be able to update watched list items", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.update([1, 3, 5])

    expect(list.getRemovedItems()).toEqual([2])
    expect(list.getNewItems()).toEqual([5])
  })

  it("keeps the diff against the list it was created with", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.update([1, 3, 5])
    list.update([1, 5])

    expect(list.getItems()).toEqual([1, 5])
    expect(list.getRemovedItems()).toEqual([2, 3])
    expect(list.getNewItems()).toEqual([5])
  })

  it("does not track mutations of the array given to the constructor", () => {
    const initial = [1, 2, 3]
    const list = new NumberWatchedList(initial)

    initial.push(4)

    expect(list.getItems()).toEqual([1, 2, 3])
    expect(list.getNewItems()).toEqual([])
  })

  it("does not track mutations of the array returned by getItems", () => {
    const list = new NumberWatchedList([1])

    list.getItems().push(2)

    expect(list.getItems()).toEqual([1])
    expect(list.getNewItems()).toEqual([])
  })

  it("ignores removal of an item that is not in the list", () => {
    const list = new NumberWatchedList([1, 2, 3])

    list.remove(9)

    expect(list.getItems()).toEqual([1, 2, 3])
    expect(list.getRemovedItems()).toEqual([])
  })
})
