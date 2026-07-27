'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/RealtimeProvider'
import type { Task, Comment } from '@/types/api'

export function useCommentEvents(boardId: string | undefined) {
  const { socket, isConnected } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId || !isConnected) return

    function patchTask(taskId: string, boardID: string, updater: (task: Task) => Task) {
      queryClient.setQueryData<Task>(['boards', boardID, 'tasks', taskId], (old) =>
        old ? updater(old) : old
      )
    }

    function handleCreated(payload: { boardID: string; taskID: string; comment: Comment }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        comments: [...t.comments.filter((c) => c.id !== payload.comment.id), payload.comment],
      }))
    }
    function handleUpdated(payload: { boardID: string; taskID: string; comment: Comment }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        comments: t.comments.map((c) => (c.id === payload.comment.id ? payload.comment : c)),
      }))
    }
    function handleDeleted(payload: { boardID: string; taskID: string; commentID: string }) {
      patchTask(payload.taskID, payload.boardID, (t) => ({
        ...t,
        comments: t.comments.filter((c) => c.id !== payload.commentID),
      }))
    }

    socket.on('comment:created', handleCreated)
    socket.on('comment:updated', handleUpdated)
    socket.on('comment:deleted', handleDeleted)

    return () => {
      socket.off('comment:created', handleCreated)
      socket.off('comment:updated', handleUpdated)
      socket.off('comment:deleted', handleDeleted)
    }
  }, [socket, isConnected, boardId, queryClient])
}