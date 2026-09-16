export const COLORS = ['red', 'yellow', 'green', 'blue'] as const
export type CardColor = (typeof COLORS)[number]
export type CardValue =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'draw-two'
  | 'wild'
  | 'wild-draw-four'

export interface Card {
  id: string
  color: CardColor | null
  value: CardValue
}

export interface Player {
  id: string
  name: string
  hand: Card[]
}

export interface GameState {
  players: Player[]
  drawPile: Card[]
  discardPile: Card[]
  currentPlayerIndex: number
  direction: 1 | -1
  activeColor: CardColor | null
  hasDrawnThisTurn: boolean
  winnerId: string | null
  status: 'setup' | 'playing' | 'finished'
  error: string | null
}

export type GameAction =
  | { type: 'START_GAME'; playerNames: string[]; deck?: Card[] }
  | { type: 'PLAY_CARD'; cardId: string; chosenColor?: CardColor }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS_TURN' }
  | { type: 'RESET_ERROR' }