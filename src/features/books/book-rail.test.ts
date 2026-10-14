import { expect, it } from 'vitest'
import { nextRailPage, railEdges } from './book-rail'

it('pages by the visible rail width and stops at the ends', () => {
  expect(nextRailPage(0, 480, 1600, 1)).toBe(480)
  expect(nextRailPage(960, 480, 1600, 1)).toBe(1120)
  expect(nextRailPage(0, 480, 1600, -1)).toBe(0)
  expect(nextRailPage(20, 0, 1600, 1)).toBe(20)
})

it('wraps only after the last full view, so a short page still reaches the end', () => {
  expect(nextRailPage(0, 800, 1000, 1, true)).toBe(200)
  expect(nextRailPage(200, 800, 1000, 1, true)).toBe(0)
  expect(nextRailPage(0, 800, 1000, -1, true)).toBe(200)
})

it('treats a rail as ended when the leftover width is within a pixel', () => {
  expect(railEdges(0, 400, 400)).toEqual({ start: true, end: true })
  expect(railEdges(0, 400, 900)).toEqual({ start: true, end: false })
  expect(railEdges(500, 400, 900)).toEqual({ start: false, end: true })
})
