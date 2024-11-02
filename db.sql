create type "Role" as enum ('USER', 'ADMIN');

alter type "Role" owner to amor_owner;

create type "NotificationType" as enum ('GROUP_APPROVED', 'GROUP_REJECTED');

alter type "NotificationType" owner to amor_owner;

create table "User" (
  id text not null primary key,
  name text not null,
  email text not null,
  "emailVerified" timestamp(3),
  image text not null,
  role "Role" default 'USER' :: "Role" not null,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null
);

alter table
  "User" owner to amor_owner;

create unique index "User_email_key" on "User" (email);

create table "Account" (
  "userId" text not null references "User" on update cascade on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null,
  primary key (provider, "providerAccountId")
);

alter table
  "Account" owner to amor_owner;

create table "Session" (
  "sessionToken" text not null,
  "userId" text not null references "User" on update cascade on delete cascade,
  expires timestamp(3) not null,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null
);

alter table
  "Session" owner to amor_owner;

create unique index "Session_sessionToken_key" on "Session" ("sessionToken");

create table "Group" (
  id serial primary key,
  name text not null,
  tags text [] default ARRAY [] :: text [],
  "userId" text not null references "User" on update cascade on delete cascade,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null,
  "approvedAt" timestamp(3),
  "lastReviewedAt" timestamp(3)
);

alter table
  "Group" owner to amor_owner;

create index name_gin on "Group" (name);

create index tags_gin on "Group" (tags);

create table "Image" (
  id text not null primary key,
  "groupId" integer not null references "Group" on update cascade on delete cascade,
  url text not null,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null
);

alter table
  "Image" owner to amor_owner;

create table "Notification" (
  id text not null primary key,
  "userId" text not null references "User" on update cascade on delete cascade,
  type "NotificationType" not null,
  message text not null,
  "createdAt" timestamp(3) default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamp(3) not null,
  "actionUrl" text default '' :: text not null
);

alter table
  "Notification" owner to amor_owner;

create function set_approved_at() returns trigger language plpgsql as $ $ BEGIN IF (
  SELECT
    ROLE
  FROM
    public."User"
  WHERE
    id = NEW."userId"
) = 'ADMIN' THEN NEW."approvedAt" = NOW();

END IF;

RETURN NEW;

END;

$ $;

alter function set_approved_at() owner to amor_owner;

create trigger before_insert_group before
insert
  on "Group" for each row execute procedure set_approved_at();

create function get_random_group(
  prev_id integer DEFAULT NULL :: integer,
  include_unapproved boolean DEFAULT false
) returns TABLE(
  id integer,
  name text,
  tags text [],
  images jsonb,
  "user" jsonb
) language plpgsql as $ $ BEGIN RETURN QUERY
SELECT
  g.id,
  g.name,
  g.tags,
  jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url)) AS images,
  jsonb_build_object('id', u.id, 'name', u.name, 'image', u.image) AS "user"
FROM
  public."Group" g
  LEFT JOIN public."Image" i ON g.id = i."groupId"
  LEFT JOIN public."User" u ON g."userId" = u.id
WHERE
  (
    prev_id IS NULL
    OR g.id != prev_id
  )
  AND (
    include_unapproved
    OR g."approvedAt" IS NOT NULL
  )
GROUP BY
  g.id,
  g.name,
  g.tags,
  u.id,
  u.name,
  u.image;

END;

$ $;

alter function get_random_group(integer, boolean) owner to amor_owner;

create function create_group_approval_notification() returns trigger language plpgsql as $ $ BEGIN IF NEW."approvedAt" IS NOT NULL
AND OLD."approvedAt" IS NULL THEN
INSERT INTO
  "Notification" (
    id,
    "userId",
    type,
    "actionUrl",
    message,
    "updatedAt"
  )
VALUES
  (
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

$ $;

alter function create_group_approval_notification() owner to amor_owner;

create trigger after_group_approval
after
update
  of "approvedAt" on "Group" for each row
  when (
    new."approvedAt" IS NOT NULL
    AND old."approvedAt" IS NULL
  ) execute procedure create_group_approval_notification();