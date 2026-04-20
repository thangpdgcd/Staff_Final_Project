import { useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import { connectSocket } from '@/services/socket/socketClient'

export const useSocket = () => {
  const socket = useMemo((): Socket | null => connectSocket(), [])

  return { socket }
}
