import { COLORS, type Card, type CardColor, type CardValue, type GameAction, type GameState, type Player } from './types'

export const initialGameState: GameState = {
  players: [],
  drawPile: [],
  discardPile: [],
  currentPlayerIndex: 0,
  direction: 1,
  activeColor: null,
  hasDrawnThisTurn: false,
  winnerId: null,
  status: 'setup',
  error: null,
}

const actionValues: CardValue[] = ['skip', 'reverse', 'draw-two']
const numberValues: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function createDeck(): Card[] {
  let serial = 0
  const card = (color: CardColor | null, value: CardValue): Card => ({
    id: `${color ?? 'wild'}-${value}-${serial++}`,
    color,
    value,
  })
  const deck: Card[] = []

  COLORS.forEach((color) => {
    deck.push(card(color, '0'))
    numberValues.slice(1).forEach((value) => deck.push(card(color, value), card(color, value)))
    actionValues.forEach((value) => deck.push(card(color, value), card(color, value)))
  })
  for (let index = 0; index < 4; index += 1) {
    deck.push(card(null, 'wild'), card(null, 'wild-draw-four'))
  }
  return deck
}

export function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function withError(state: GameState, error: string): GameState {
  return { ...state, error }
}

function nextPlayerIndex(state: GameState, steps = 1): number {
  const count = state.players.length
  return (((state.currentPlayerIndex + state.direction * steps) % count) + count) % count
}

function replenishDrawPile(drawPile: Card[], discardPile: Card[]): { drawPile: Card[]; discardPile: Card[] } {
  if (drawPile.length > 0 || discardPile.length <= 1) return { drawPile, discardPile }
  const topCard = discardPile[discardPile.length - 1]
  return { drawPile: shuffle(discardPile.slice(0, -1)), discardPile: [topCard] }
}

function drawCards(state: GameState, playerIndex: number, amount: number): GameState {
  let drawPile = state.drawPile
  let discardPile = state.discardPile
  const cards: Card[] = []
  for (let index = 0; index < amount; index += 1) {
    ;({ drawPile, discardPile } = replenishDrawPile(drawPile, discardPile))
    const card = drawPile[drawPile.length - 1]
    if (!card) break
    cards.push(card)
    drawPile = drawPile.slice(0, -1)
  }
  const players = state.players.map((player, index) =>
    index === playerIndex ? { ...player, hand: [...player.hand, ...cards] } : player,
  )
  return { ...state, players, drawPile, discardPile }
}

export function canPlayCard(card: Card, topCard: Card, activeColor: CardColor, hand: Card[]): boolean {
  if (card.value === 'wild') return true
  if (card.value === 'wild-draw-four') return !hand.some((handCard) => handCard.color === activeColor)
  return card.color === activeColor || card.value === topCard.value
}

function startGame(playerNames: string[], suppliedDeck?: Card[]): GameState {
  if (playerNames.length < 2 || playerNames.length > 4) {
    return withError(initialGameState, 'UNO requires between 2 and 4 players.')
  }
  const deck = suppliedDeck ? [...suppliedDeck] : shuffle(createDeck())
  const players: Player[] = playerNames.map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    hand: deck.splice(0, 7),
  }))
  let firstCard = deck.pop()
  while (firstCard && firstCard.color === null) {
    deck.unshift(firstCard)
    firstCard = deck.pop()
  }
  if (!firstCard) return withError(initialGameState, 'The deck does not contain a starting card.')
  return {
    ...initialGameState,
    players,
    drawPile: deck,
    discardPile: [firstCard],
    activeColor: firstCard.color,
    status: 'playing',
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'START_GAME') return startGame(action.playerNames, action.deck)
  if (action.type === 'RESET_ERROR') return { ...state, error: null }
  if (state.status !== 'playing' || state.winnerId) return withError(state, 'Start a new game first.')

  const currentPlayer = state.players[state.currentPlayerIndex]
  const topCard = state.discardPile[state.discardPile.length - 1]

  if (action.type === 'PLAY_CARD') {
    const card = currentPlayer.hand.find((handCard) => handCard.id === action.cardId)
    if (!card) return withError(state, 'This card is not in your hand.')
    if (!canPlayCard(card, topCard, state.activeColor!, currentPlayer.hand)) return withError(state, 'This card cannot be played now.')
    if (card.color === null && !action.chosenColor) return withError(state, 'Choose a color for a wild card.')

    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex
        ? { ...player, hand: player.hand.filter((handCard) => handCard.id !== card.id) }
        : player,
    )
    if (players[state.currentPlayerIndex].hand.length === 0) {
      return { ...state, players, discardPile: [...state.discardPile, card], activeColor: card.color ?? action.chosenColor!, winnerId: currentPlayer.id, status: 'finished', error: null }
    }
    let nextState: GameState = {
      ...state,
      players,
      discardPile: [...state.discardPile, card],
      activeColor: card.color ?? action.chosenColor!,
      hasDrawnThisTurn: false,
      error: null,
    }
    if (card.value === 'reverse') nextState = { ...nextState, direction: (nextState.direction * -1) as 1 | -1 }
    const steps = card.value === 'skip' || (card.value === 'reverse' && players.length === 2) ? 2 : 1
    nextState = { ...nextState, currentPlayerIndex: nextPlayerIndex(nextState, steps) }
    if (card.value === 'draw-two' || card.value === 'wild-draw-four') {
      const amount = card.value === 'draw-two' ? 2 : 4
      nextState = drawCards(nextState, nextState.currentPlayerIndex, amount)
      nextState = { ...nextState, currentPlayerIndex: nextPlayerIndex(nextState) }
    }
    return nextState
  }

  if (action.type === 'DRAW_CARD') {
    if (state.hasDrawnThisTurn) return withError(state, 'You may draw only once per turn.')
    const drawnState = drawCards(state, state.currentPlayerIndex, 1)
    const drawnCard = drawnState.players[state.currentPlayerIndex].hand.at(-1)
    if (!drawnCard) return withError(state, 'There are no cards left to draw.')
    const canPlayDrawnCard = canPlayCard(drawnCard, topCard, state.activeColor!, drawnState.players[state.currentPlayerIndex].hand)
    return canPlayDrawnCard
      ? { ...drawnState, hasDrawnThisTurn: true, error: null }
      : { ...drawnState, currentPlayerIndex: nextPlayerIndex(drawnState), hasDrawnThisTurn: false, error: null }
  }

  if (action.type === 'PASS_TURN') {
    if (!state.hasDrawnThisTurn) return withError(state, 'Draw a card before passing.')
    return { ...state, currentPlayerIndex: nextPlayerIndex(state), hasDrawnThisTurn: false, error: null }
  }
  return state
}