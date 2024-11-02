-- Drop existing objects first to avoid conflicts
DROP TRIGGER IF EXISTS after_group_approval ON "Group";
DROP TRIGGER IF EXISTS before_insert_group ON "Group";
DROP FUNCTION IF EXISTS create_group_approval_notification();
DROP FUNCTION IF EXISTS get_random_group(INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS set_approved_at();
DROP TABLE IF EXISTS "Notification";
DROP TABLE IF EXISTS "Image";
DROP TABLE IF EXISTS "Group";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "User";
DROP TYPE IF EXISTS "NotificationType";
DROP TYPE IF EXISTS "Role";

-- Enum Types
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "NotificationType" AS ENUM ('GROUP_APPROVED', 'GROUP_REJECTED');

-- Table: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Table: Account
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider", "providerAccountId")
);

-- Table: Session
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Table: Group
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- Table: Image
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- Table: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "name_gin" ON "Group"("name");
CREATE INDEX "tags_gin" ON "Group"("tags");

-- Foreign Keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Group" ADD CONSTRAINT "Group_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Image" ADD CONSTRAINT "Image_groupId_fkey" 
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Function: set_approved_at
CREATE FUNCTION set_approved_at() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
    IF (SELECT role FROM public."User" WHERE id = NEW."userId") = 'ADMIN' THEN
        NEW."approvedAt" = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger: before_insert_group
CREATE TRIGGER before_insert_group
    BEFORE INSERT ON "Group"
    FOR EACH ROW
    EXECUTE PROCEDURE set_approved_at();

-- Function: get_random_group
CREATE FUNCTION get_random_group(
    prev_id INTEGER DEFAULT NULL::INTEGER,
    include_unapproved BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id INTEGER,
    name TEXT,
    tags TEXT[],
    images JSONB,
    "user" JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.tags,
        jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url)) AS images,
        jsonb_build_object('id', u.id, 'name', u.name, 'image', u.image) AS "user"
    FROM public."Group" g
    LEFT JOIN public."Image" i ON g.id = i."groupId"
    LEFT JOIN public."User" u ON g."userId" = u.id
    WHERE (prev_id IS NULL OR g.id != prev_id)
        AND (include_unapproved OR g."approvedAt" IS NOT NULL)
    GROUP BY g.id, g.name, g.tags, u.id, u.name, u.image;
END;
$$;

-- Function: create_group_approval_notification
CREATE FUNCTION create_group_approval_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."approvedAt" IS NOT NULL AND OLD."approvedAt" IS NULL THEN
        INSERT INTO "Notification" (
            id,
            "userId",
            type,
            "actionUrl",
            message,
            "updatedAt"
        )
        VALUES (
            gen_random_uuid(),
            NEW."userId",
            'GROUP_APPROVED',
            'https://amor.fabra.tech/' || NEW.id,
            'your group: ' || NEW.name || ' was accepted!',
            now()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger: after_group_approval
CREATE TRIGGER after_group_approval
    AFTER UPDATE OF "approvedAt" ON "Group"
    FOR EACH ROW
    WHEN (NEW."approvedAt" IS NOT NULL AND OLD."approvedAt" IS NULL)
    EXECUTE PROCEDURE create_group_approval_notification();