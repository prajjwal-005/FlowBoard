'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import { boardKeys } from '@/lib/queryKeys'
import type { Board, Task, TaskBase } from '@/types/api'

export function useTaskEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function handleTaskUpdated(payload: { boardID: string; task: TaskBase }) {
      queryClient.setQueryData<Task>(
        ['boards', payload.boardID, 'tasks', payload.task.id],
        (old) => (old ? { ...old, ...payload.task } : old)
      )
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map((c) =>
            c.id === payload.task.columnID
              ? { ...c, tasks: c.tasks.map((t) => (t.id === payload.task.id ? { ...t, ...payload.task } : t)) }
              : c
          ),
        }
      })
    }

function handleTaskCreated(payload: { boardID: string; columnID: string; task: TaskBase }) {
  queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
    if (!old) return old
    return {
      ...old,
      columns: old.columns.map((c) => {
        const withoutTask = c.tasks.filter((t) => t.id !== payload.task.id)
        if (c.id === payload.columnID) {
          return { ...c, tasks: [...withoutTask, payload.task].sort((a, b) => a.order - b.order) }
        }
        return c.tasks.length === withoutTask.length ? c : { ...c, tasks: withoutTask }
      }),
    }
  })
}

function handleTaskMoved(payload: { boardID: string; fromColumnID: string; toColumnID: string; task: TaskBase }) {
  queryClient.setQueryData<Task>(
    ['boards', payload.boardID, 'tasks', payload.task.id],
    (old) => (old ? { ...old, ...payload.task } : old)
  )
  queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
    if (!old) return old
    return {
      ...old,
      columns: old.columns.map((c) => {
        const withoutTask = c.tasks.filter((t) => t.id !== payload.task.id)
        if (c.id === payload.toColumnID) {
          return { ...c, tasks: [...withoutTask, payload.task].sort((a, b) => a.order - b.order) }
        }
        return c.tasks.length === withoutTask.length ? c : { ...c, tasks: withoutTask }
      }),
    }
  })
}

    function handleTaskDeleted(payload: { boardID: string; columnID: string; taskID: string }) {
      queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
        if (!old) return old
        return {
          ...old,
          columns: old.columns.map((c) =>
            c.id === payload.columnID
              ? { ...c, tasks: c.tasks.filter((t) => t.id !== payload.taskID) }
              : c
          ),
        }
      })
      queryClient.removeQueries({ queryKey: ['boards', payload.boardID, 'tasks', payload.taskID] })
    }
    function handleTaskReordered(payload: { boardID: string; columnID: string; tasks: { id: string; order: number }[] }) {
        queryClient.setQueryData<Board>(boardKeys.detail(payload.boardID), (old) => {
            if (!old) return old
            const orderMap = new Map(payload.tasks.map((t) => [t.id, t.order]))
            return {
            ...old,
            columns: old.columns.map((c) =>
                c.id === payload.columnID
                ? {
                    ...c,
                    tasks: c.tasks
                        .map((t) => (orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id)! } : t))
                        .sort((a, b) => a.order - b.order),
                    }
                : c
            ),
            }
        })
    }

    socket.on('task:updated', handleTaskUpdated)
    socket.on('task:reordered', handleTaskReordered)
    socket.on('task:moved', handleTaskMoved)
    socket.on('task:created', handleTaskCreated)
    socket.on('task:deleted', handleTaskDeleted)

    return () => {
      socket.off('task:updated', handleTaskUpdated)
      socket.off('task:moved', handleTaskMoved)
      socket.off('task:created', handleTaskCreated)
      socket.off('task:deleted', handleTaskDeleted)
      socket.off('task:reordered', handleTaskReordered)

    }
  }, [socket, isConnected, boardId, queryClient])
}