'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import type { Task, Subtask } from '@/types/api'

export function useSubtaskEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function patchTask(taskId: string, boardID: string, updater: (task: Task) => Task) {
      queryClient.setQueryData<Task>(['boards', boardID, 'tasks', taskId], (old) =>
        old ? updater(old) : old
      )
    }

    function handleCreated(payload: { boardID: string; taskID: string; subtask: Subtask }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        subtasks: [...t.subtasks.filter((s) => s.id !== payload.subtask.id), payload.subtask],
      }))
    }
    function handleUpdated(payload: { boardID: string; taskID: string; subtask: Subtask }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === payload.subtask.id ? payload.subtask : s)),
      }))
    }
    function handleDeleted(payload: { boardID: string; taskID: string; subtaskID: string }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        subtasks: t.subtasks.filter((s) => s.id !== payload.subtaskID),
      }))
    }

    socket.on('subtask:created', handleCreated)
    socket.on('subtask:updated', handleUpdated)
    socket.on('subtask:deleted', handleDeleted)

    return () => {
      socket.off('subtask:created', handleCreated)
      socket.off('subtask:updated', handleUpdated)
      socket.off('subtask:deleted', handleDeleted)
    }
  }, [socket, isConnected, boardId, queryClient])
}