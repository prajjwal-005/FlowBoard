'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import { boardKeys } from '@/lib/queryKeys'
import type { Board, Column, ColumnBase } from '@/types/api'

export function useColumnEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function handleColumnCreated(payload: { boardID: string; column: ColumnBase }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        const withoutColumn = old.columns.filter((c) => c.id !== payload.column.id)
        const newColumn: Column = { ...payload.column, tasks: [] }
        return {
          ...old,
          columns: [...withoutColumn, newColumn].sort((a, b) => a.order - b.order),
        }
      })
    }

    function handleColumnRenamed(payload: { boardID: string; columnID: string; title: string }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map((c) =>
            c.id === payload.columnID ? { ...c, title: payload.title } : c
          ),
        }
      })
    }

    function handleColumnDeleted(payload: { boardID: string; columnID: string }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.filter((c) => c.id !== payload.columnID),
        }
      })
    }

    function handleColumnReordered(payload: { boardID: string; columns: { id: string; order: number }[] }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        const orderMap = new Map(payload.columns.map((c) => [c.id, c.order]))
        return {
          ...old,
          columns: old.columns
            .map((c) => (orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)! } : c))
            .sort((a, b) => a.order - b.order),
        }
      })
    }

    socket.on('column:created', handleColumnCreated)
    socket.on('column:renamed', handleColumnRenamed)
    socket.on('column:deleted', handleColumnDeleted)
    socket.on('column:reordered', handleColumnReordered)

    return () => {
      socket.off('column:created', handleColumnCreated)
      socket.off('column:renamed', handleColumnRenamed)
      socket.off('column:deleted', handleColumnDeleted)
      socket.off('column:reordered', handleColumnReordered)
    }
  }, [socket, isConnected, boardId, queryClient])
}