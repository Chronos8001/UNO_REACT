import { describe, expect, it } from 'vitest'
import { canPlayCard, gameReducer, initialGameState } from './gameReducer'
import type { Card, GameState } from './types'

const card = (id: string, color: Card['color'], value: Card['value']): Card => ({ id, color, value })

function stateWith(overrides: Partial<GameState>): GameState {
  const top = card('top', 'red', '5')
  return {
    ...initialGameState,
    status: 'playing',
    players: [
      { id: 'one', name: 'One', hand: [card('red-7', 'red', '7')] },
      { id: 'two', name: 'Two', hand: [] },
    ],
    discardPile: [top],
    drawPile: [card('draw-1', 'blue', '1'), card('draw-2', 'yellow', '2'), card('draw-3', 'green', '3'), card('draw-4', 'red', '4')],
    activeColor: 'red',
    ...overrides,
  }
}

describe('UNO game reducer', () => {
  it('allows matching colors or values but prevents an illegal wild draw four', () => {
    const top = card('top', 'red', '5')
    expect(canPlayCard(card('blue-5', 'blue', '5'), top, 'red', [])).toBe(true)
    expect(canPlayCard(card('blue-7', 'blue', '7'), top, 'red', [])).toBe(false)
    expect(canPlayCard(card('wild-4', null, 'wild-draw-four'), top, 'red', [card('red-1', 'red', '1')])).toBe(false)
  })

  it('makes the next player draw two and loses their turn', () => {
    const state = stateWith({ players: [{ id: 'one', name: 'One', hand: [card('plus-two', 'red', 'draw-two'), card('spare', 'blue', '1')] }, { id: 'two', name: 'Two', hand: [] }] })
    const result = gameReducer(state, { type: 'PLAY_CARD', cardId: 'plus-two' })
    expect(result.players[1].hand).toHaveLength(2)
    expect(result.currentPlayerIndex).toBe(0)
  })

  it('reverses direction and skips the opponent in a two-player game', () => {
    const state = stateWith({ players: [{ id: 'one', name: 'One', hand: [card('reverse', 'red', 'reverse'), card('spare', 'blue', '1')] }, { id: 'two', name: 'Two', hand: [] }] })
    const result = gameReducer(state, { type: 'PLAY_CARD', cardId: 'reverse' })
    expect(result.direction).toBe(-1)
    expect(result.currentPlayerIndex).toBe(0)
  })
})