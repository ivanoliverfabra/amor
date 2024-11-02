"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Notification } from "@prisma/client";
import {
  Bell,
  GithubIcon,
  Loader2,
  LogIn,
  LogOut,
  Paperclip,
  Plus,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DropzoneOptions } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createGroup } from "~/actions/group";
import {
  getNotifications,
  markNotificationsRead,
} from "~/actions/notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { AspectRatio } from "./ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { buttonVariants } from "./ui/button";
import {
  FileInput,
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
} from "./ui/file-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { TagsInput } from "./ui/tags-input";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="fixed bottom-4 left-4 z-50">
      <div className="relative">
        <div className="bg-card rounded-full p-2">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <img
                src="/icons/android-icon-48x48.png"
                alt="Amor"
                className="w-12 h-12 hover:rotate-12 transition-transform duration-300"
              />
            </Link>
            <div className="flex gap-x-2 ml-auto">
              {session?.user?.id && (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="bg-primary/90 hover:bg-primary text-primary-foreground px-2 md:px-4 py-2 rounded-full transition-colors">
                        <span className="hidden md:block">create group</span>
                        <span className="md:hidden">
                          <Plus className="w-6 h-6" />
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Group</DialogTitle>
                        <DialogDescription>
                          Create a new group to share with your friends.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogContent>
                        <NewGroupForm />
                      </DialogContent>
                    </DialogContent>
                  </Dialog>
                  <Avatar>
                    <AvatarImage src={session?.user.image || ""} />
                    <AvatarFallback>
                      {session?.user.name?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </>
              )}
              <button
                className="flex items-center space-x-2 bg-primary/90 hover:bg-primary text-primary-foreground p-2 rounded-full transition-colors"
                onClick={() =>
                  session?.user?.id ? signOut() : signIn("discord")
                }
              >
                {session?.user?.id ? (
                  <LogOut className="w-6 h-6" />
                ) : (
                  <LogIn className="w-6 h-6" />
                )}
              </button>
            </div>
            <Link
              href="https://www.github.com/ivanoliverfabra/amor"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="bg-primary/90 hover:bg-primary text-primary-foreground p-2 rounded-full transition-colors">
                <GithubIcon className="w-6 h-6" />
              </button>
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link href="/admin">
                <button className="bg-primary/90 hover:bg-primary text-primary-foreground p-2 rounded-full transition-colors">
                  admin
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
      {session?.user?.id && <Notifications />}
    </nav>
  );
}

const formSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
  images: z
    .array(
      z.instanceof(File).refine((file) => file.size < 4 * 1024 * 1024, {
        message: "file size must be less than 4MB",
      })
    )
    .min(2, {
      message: "at least 2 files is required",
    })
    .max(4, {
      message: "maximum 4 files are allowed",
    }),
});

function NewGroupForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tags: [],
      images: [],
    },
  });

  const dropzone = {
    multiple: true,
    maxFiles: 4,
    maxSize: 4 * 1024 * 1024,
  } satisfies DropzoneOptions;

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const formData = new FormData();
    for (const file of data.images || []) {
      formData.append("files", file);
    }

    const isSuccessful = await createGroup(
      {
        name: data.name,
        tags: data.tags,
      },
      formData
    );

    if (isSuccessful) {
      form.reset();
      toast.success("successfully created a new group");
    } else {
      toast.error("failed to create a new group");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                this is the title of your group, make it catchy!
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>tags</FormLabel>
              <FormControl>
                <TagsInput value={field.value} onValueChange={field.onChange} />
              </FormControl>
              <FormDescription>
                These are the tags that will help others find you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FileUploader
                value={field.value}
                onValueChange={field.onChange}
                dropzoneOptions={dropzone}
                reSelect={true}
              >
                <FileInput
                  className={cn(
                    buttonVariants({
                      size: "icon",
                    }),
                    "size-8"
                  )}
                >
                  <Paperclip className="size-4" />
                  <span className="sr-only">Select your files</span>
                </FileInput>
                {field.value && field.value.length > 0 && (
                  <FileUploaderContent className="p-2  w-full -ml-3 rounded-b-none rounded-t-md flex-row gap-2 ">
                    {field.value.map((file, i) => (
                      <FileUploaderItem
                        key={i}
                        index={i}
                        aria-roledescription={`file ${i + 1} containing ${
                          file.name
                        }`}
                        className="p-0 size-20"
                      >
                        <AspectRatio className="size-full">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="object-cover rounded-md size-full"
                          />
                        </AspectRatio>
                      </FileUploaderItem>
                    ))}
                  </FileUploaderContent>
                )}
              </FileUploader>
            </FormItem>
          )}
        />
        <button
          type="submit"
          className="bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-full transition-colors flex gap-x-2"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              creating group
            </>
          ) : (
            "create group"
          )}
        </button>
      </form>
    </Form>
  );
}

function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="fixed top-4 right-4 bg-primary/90 hover:bg-primary text-primary-foreground px-2 md:px-4 py-2 rounded-full transition-colors">
          {notifications.length > 0 && (
            <div className="absolute top-0 right-0 -mt-0.5 -mr-0.5 bg-red-500 rounded-full w-3.5 h-3.5" />
          )}
          <span className="hidden md:block">notifications</span>
          <span className="md:hidden">
            <Bell className="w-6 h-6" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            Here are your latest notifications.
          </DialogDescription>
        </DialogHeader>
        {notifications.length > 0 ? (
          <>
            <ul className="space-y-4">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="bg-card p-4 rounded-md flex justify-between items-center"
                >
                  <p>{notification.message}</p>
                  {notification.actionUrl !== "" && (
                    <Link
                      href={notification.actionUrl}
                      className="bg-primary/90 hover:bg-primary text-primary-foreground px-2 md:px-2.5 py-1 rounded-full transition-colors"
                    >
                      view
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <button
              className="bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-full transition-colors"
              onClick={async () => {
                await markNotificationsRead();
                setNotifications([]);
              }}
            >
              mark as read
            </button>
          </>
        ) : (
          <p>There are no notifications to show.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
