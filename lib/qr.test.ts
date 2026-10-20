import { describe, expect, it } from "vitest"
import { qrMatrix } from "./qr"

const CODE_A = "ABCDEFGHJK23"
const CODE_B = "ZYXWVUTSRQ98"

describe("qrMatrix", () => {
  it("AC5: un código de 12 caracteres da size 21 y celdas size*size", () => {
    const { size, cells } = qrMatrix(CODE_A)
    expect(size).toBe(21)
    expect(cells).toHaveLength(21 * 21)
    expect(cells.some(Boolean)).toBe(true)
  })

  it("AC5: es determinista", () => {
    expect(qrMatrix(CODE_A)).toEqual(qrMatrix(CODE_A))
  })

  it("AC5: códigos distintos dan matrices distintas", () => {
    expect(qrMatrix(CODE_A).cells).not.toEqual(qrMatrix(CODE_B).cells)
  })

  it("AC5: los tres patrones de esquina (7x7) están presentes", () => {
    const { size, cells } = qrMatrix(CODE_A)
    const at = (r: number, c: number) => cells[r * size + c]
    for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      for (let dr = 0; dr < 7; dr++) {
        for (let dc = 0; dc < 7; dc++) {
          const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6
          const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
          expect(at(r0 + dr, c0 + dc)).toBe(ring || core)
        }
      }
    }
  })
})
