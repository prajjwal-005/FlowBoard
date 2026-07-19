import { prisma } from "@/lib/prisma";
import type { EntityType } from "@/types/api"; 
import { ActivityAction } from "@/types/index";
export async function logActivity(params: {
  boardID: string;
  userID: string;
  actorUsername: string;
  action: ActivityAction;
  entityType: EntityType;
  entityID: string;
  entityTitle: string;
}) {
  await prisma.activityLog.create({ data: params });
}