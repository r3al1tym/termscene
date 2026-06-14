import { describe, it, expect } from "vitest"
import { reorderDest, reorder } from "./reorder.js"

describe("drag-reorder index math", () => {
  // the drop indicator sits at the TOP edge of the target row, so dropping "on"
  // row `to` means "insert before row `to`".
  it("downward move lands above the target row (honors the indicator)", () => {
    // [A,B,C,D], drag A onto C → user expects A inserted before C → [B,A,C,D]
    expect(reorder(["A", "B", "C", "D"], 0, 2)).toEqual(["B", "A", "C", "D"])
    expect(reorderDest(0, 2)).toBe(1)
  })

  it("upward move lands above the target row", () => {
    // [A,B,C,D], drag D onto B → [A,D,B,C]
    expect(reorder(["A", "B", "C", "D"], 3, 1)).toEqual(["A", "D", "B", "C"])
    expect(reorderDest(3, 1)).toBe(1)
  })

  it("dropping onto the row directly below is a no-op (indicator = current slot)", () => {
    // drag A onto B's top edge = "place A above B" = where A already is → no move
    expect(reorder(["A", "B", "C"], 0, 1)).toEqual(["A", "B", "C"])
  })

  it("dropping onto the last row lands ABOVE it, not past it", () => {
    // drag A onto C's top edge → above C → [B,A,C] (the bottom insert-slot appends)
    expect(reorder(["A", "B", "C"], 0, 2)).toEqual(["B", "A", "C"])
  })

  it("no-op for equal / out-of-range indices (returns a copy)", () => {
    expect(reorder(["A", "B"], 1, 1)).toEqual(["A", "B"])
    expect(reorder(["A", "B"], -1, 0)).toEqual(["A", "B"])
    expect(reorder(["A", "B"], 0, 5)).toEqual(["A", "B"])
  })
})
