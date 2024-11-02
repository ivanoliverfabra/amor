"use server";

import { z } from "zod";
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { deleteImages, uploadImages } from "~/lib/image";
import { Group } from "~/types";

const createGroupSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});

export async function createGroup(
  props: z.infer<typeof createGroupSchema>,
  formData: FormData
) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { name, tags } = createGroupSchema.parse(props);

  const imageData = await uploadImages(formData);

  const group = await db.group
    .create({
      data: {
        name,
        tags,
        images: {
          createMany: {
            data: imageData.files,
          },
        },
        user: {
          connect: {
            id: session.user.id,
          },
        },
      },
    })
    .then(() => true)
    .catch(() => false);

  return group;
}

export async function getRandomGroup(
  prevId?: number | null,
  includeUnapproved: boolean = false
): Promise<Group | undefined> {
  const group = await db.$queryRawUnsafe<Group[]>(
    `
    SELECT * FROM public.get_random_group($1::INTEGER, $2::BOOLEAN);
  `,
    prevId ?? null,
    includeUnapproved
  );

  return group[0];
}

export async function getGroup(id: number): Promise<Group | undefined> {
  const group = await db.group.findUnique({
    where: { id },
    select: {
      images: {
        select: {
          id: true,
          url: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      id: true,
      name: true,
      tags: true,
    },
  });

  return group || undefined;
}

export async function getUnapprovedGroups(): Promise<Group[]> {
  const groups = await db.group.findMany({
    where: {
      approvedAt: null,
      OR: [
        {
          lastReviewedAt: {
            lte: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
          },
        },
        {
          lastReviewedAt: null,
        },
      ],
    },
    select: {
      images: {
        select: {
          id: true,
          url: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      id: true,
      name: true,
      tags: true,
    },
  });

  return groups;
}

export async function approveGroup(id: number) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.group.update({
    where: { id },
    data: {
      approvedAt: new Date(),
      lastReviewedAt: new Date(),
    },
  });
}

export async function denyGroup(id: number) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.$transaction(async (tx) => {
    const group = await tx.group.findUnique({
      where: { id },
      select: {
        name: true,
        images: {
          select: {
            id: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    await tx.group.delete({ where: { id } });
    await deleteImages(group?.images.map((image) => image.id) || []);
    await tx.notification.create({
      data: {
        type: "GROUP_REJECTED",
        message: `your group: ${group?.name} has been rejected`,
        actionUrl: "",
        user: {
          connect: {
            id: group?.user.id,
          },
        },
      },
    });

    return true;
  });
}
