import { createContext, useContext, useReducer, type PropsWithChildren } from 'react'
import { gameReducer, initialGameState } from '../game/gameReducer'
import type { CardColor, GameState } from '../game/types'

interface GameContextValue {
  state: GameState
  startGame: (playerNames: string[]) => void
  playCard: (cardId: string, chosenColor?: CardColor) => void
  drawCard: () => void
  passTurn: () => void
  resetError: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const value: GameContextValue = {
    state,
    startGame: (playerNames) => dispatch({ type: 'START_GAME', playerNames }),
    playCard: (cardId, chosenColor) => dispatch({ type: 'PLAY_CARD', cardId, chosenColor }),
    drawCard: () => dispatch({ type: 'DRAW_CARD' }),
    passTurn: () => dispatch({ type: 'PASS_TURN' }),
    resetError: () => dispatch({ type: 'RESET_ERROR' }),
  }
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside GameProvider.')
  return context
}