'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import type { Task, Assignee } from '@/types/api'

export function useAssigneeEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function patchTask(taskId: string, boardID: string, updater: (task: Task) => Task) {
      queryClient.setQueryData<Task>(['boards', boardID, 'tasks', taskId], (old) =>
        old ? updater(old) : old
      )
    }

    function handleAdded(payload: { boardID: string; taskID: string; assignee: Assignee }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        assignees: [...t.assignees.filter((a) => a.userID !== payload.assignee.userID), payload.assignee],
      }))
    }
    function handleRemoved(payload: { boardID: string; taskID: string; userID: string }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        assignees: t.assignees.filter((a) => a.userID !== payload.userID),
      }))
    }

    socket.on('assignee:added', handleAdded)
    socket.on('assignee:removed', handleRemoved)

    return () => {
      socket.off('assignee:added', handleAdded)
      socket.off('assignee:removed', handleRemoved)
    }
  }, [socket, isConnected, boardId, queryClient])
}