import { prisma } from '@/lib/prisma'
import { emitNotificationCreated } from '@/socket/emitters'
import { toNotificationEntry } from './socket/serialise'
import { NotificationType } from '@/types/index'
import { EntityType } from '@/types/api'
export async function createNotification(params: {
  userID: string      // recipient
  actorID: string      // who caused it — self-notify guard
  type: NotificationType
  message: string
  boardID: string
  entityType: EntityType
  entityID: string
}) {
  if (params.userID === params.actorID) return;

  const notification = await prisma.notification.create({
    data: {
      userID: params.userID,
      type: params.type,
      message: params.message,
      boardID: params.boardID,
      entityType: params.entityType,
      entityID: params.entityID,
    },
  })

  emitNotificationCreated(params.userID, toNotificationEntry(notification))
}