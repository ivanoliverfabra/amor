"use server";

import { auth } from "~/lib/auth";
import { db } from "~/lib/db";

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  await db.notification.deleteMany({
    where: { userId: session.user.id },
  });
}
