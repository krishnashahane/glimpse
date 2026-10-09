import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'

let socketInstance: Socket | null = null

export function useSocket() {
  const token = useAuthStore((s) => s.token)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) {
      socketInstance?.disconnect()
      socketInstance = null
      socketRef.current = null
      return
    }

    if (!socketInstance) {
      const socketBase = import.meta.env.VITE_SOCKET_URL || '/'
      socketInstance = io(socketBase, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    }

    socketRef.current = socketInstance

    return () => {}
  }, [token])

  return socketRef.current
}

export function getSocket(): Socket | null {
  return socketInstance
}
