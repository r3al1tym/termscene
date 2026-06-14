// Pure index math for drag-to-reorder, extracted so it can be unit-tested without
// a DOM. The drop indicator (.row.dragover::before) sits at the TOP edge of the
// target row — i.e. "drop here lands the item ABOVE this row", insert-before-`to`.
//
// We reorder by removing the source first, then inserting. Removing index `from`
// shifts every later index down by one, so for a downward move (from < to) the
// real insertion point is `to - 1`; for an upward move it stays `to`.
export function reorderDest(from: number, to: number): number {
  return from < to ? to - 1 : to
}

/** Apply a drag-reorder to a copy of `arr` and return the new array. */
export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from === to || from >= arr.length || to >= arr.length) return arr.slice()
  const next = arr.slice()
  const [it] = next.splice(from, 1)
  next.splice(reorderDest(from, to), 0, it)
  return next
}
