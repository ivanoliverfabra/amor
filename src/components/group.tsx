"use client";

import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import { CheckIcon, DownloadIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getRandomGroup } from "~/actions/group";
import { useSettings } from "~/context/settings";
import { Group } from "~/types";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface MatchingGroupProps {
  initialGroup: Group | undefined | null;
  rollType: "random" | "redirect";
}

// Error state component
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="h-screen w-full justify-center items-center flex flex-col gap-6">
    <h2 className="text-2xl font-bold">
      oops! we couldn&apos;t find a profile picture.
    </h2>
    <p className="text-gray-500 text-lg">
      please try again or upload your own images.
    </p>
    <motion.button
      className="bg-secondary text-white px-4 py-2 rounded-md"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onRetry}
    >
      Try Again
    </motion.button>
    <IncludeUnapproved />
  </div>
);

export function MatchingGroup({ initialGroup, rollType }: MatchingGroupProps) {
  const { settings } = useSettings();
  const [group, setGroup] = useState<Group | null>(initialGroup || null);
  const [nextGroup, setNextGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextGroup = useCallback(
    async (currentId?: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const newGroup = await getRandomGroup(
          currentId,
          settings.includeUnapproved
        );
        if (!newGroup) throw new Error("Failed to fetch group");
        return newGroup;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [settings.includeUnapproved]
  );

  useEffect(() => {
    if (!initialGroup) return;
    fetchNextGroup().then((group) => setNextGroup(group));
  }, [initialGroup, fetchNextGroup]);

  const roll = useCallback(async () => {
    const newGroup = await fetchNextGroup(nextGroup?.id);
    if (newGroup) {
      if (nextGroup) {
        setGroup(nextGroup);
        setNextGroup(newGroup);
      } else {
        setGroup(newGroup);
        const next = await fetchNextGroup(newGroup.id);
        if (next) setNextGroup(next);
      }
    } else {
      setGroup(null);
      setNextGroup(null);
    }
  }, [nextGroup, fetchNextGroup]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.title = group?.name
      ? `${group.name} - amor`
      : initialGroup?.name
      ? `${initialGroup.name} - amor`
      : "amor";
  }, [group, initialGroup]);

  const rollButtonProps = useMemo(
    () => ({
      type: rollType,
      onClick: rollType === "random" ? roll : undefined,
      isLoading,
    }),
    [roll, rollType, isLoading]
  ) as RollButtonProps;

  if (error || !group) return <ErrorState onRetry={roll} />;

  return (
    <div className="h-screen w-full justify-center items-center flex flex-col gap-6">
      {/* Preload next group images */}
      <div className="hidden">
        {nextGroup?.images.map((image) => (
          <img
            src={image.url}
            alt={nextGroup.name}
            key={image.id}
            className="hidden"
          />
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">{group.name}</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {group.images.map((image, idx) => (
            <GroupImage
              title={group.name}
              url={image.url}
              key={`${image.id}-${idx}`}
              idx={idx}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {group.tags.map((tag, idx) => (
            <GroupTag tag={tag} key={idx} />
          ))}
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <RollButton {...rollButtonProps} disabled={isLoading} />
        <ShareButton {...group} />
      </div>
      <IncludeUnapproved />
    </div>
  );
}

function ShareButton(group: Group) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const url = `${window.location.origin}/${group.id}`;
      if (navigator.share) {
        const files: File[] = await Promise.all(
          group.images.map(async (image) => {
            const response = await fetch(image.url);
            const blob = await response.blob();
            return new File([blob], `${group.name}-${image.id}.png`, {
              type: "image/png",
            });
          })
        );

        await navigator.share({
          title: `Check out ${group.name} on amor`,
          url: url,
          files,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Copied link to clipboard");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      toast.error("Failed to share");
    }
  }, [group.id, group.name, group.images]);

  return (
    <motion.button
      className="bg-secondary text-white p-2 rounded-md disabled:opacity-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleShare}
      aria-label={copied ? "Copied!" : "Share"}
    >
      {copied ? (
        <CheckIcon className="w-6 h-6" />
      ) : (
        <ShareIcon className="w-6 h-6" />
      )}
    </motion.button>
  );
}

function GroupImage({
  url,
  title,
  idx,
}: {
  url: string;
  title: string;
  idx: number;
}) {
  const handleDownload = useCallback(async () => {
    try {
      const name = `${title.replace(/\s/g, "-").toLowerCase()}-${idx + 1}.png`;
      saveAs(url, name);
      toast.success("Image downloaded successfully");
    } catch {
      toast.error("Failed to download image");
    }
  }, [url, title, idx]);

  return (
    <motion.div
      className="w-32 h-32 md:w-36 md:h-36 lg:w-48 lg:h-48 overflow-hidden group relative circle-to-square select-none"
      whileHover={{ scale: 1.05 }}
      transition={{
        duration: 1,
        scale: { type: "spring", stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      <img
        src={url}
        className="w-full h-full object-cover"
        alt={`${title} - Image ${idx + 1}`}
        loading="lazy"
      />
      <motion.button
        className="absolute inset-0 bg-foreground/50 items-center justify-center flex cursor-pointer"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={handleDownload}
        aria-label="Download image"
      >
        <DownloadIcon className="text-white w-8 h-8" />
      </motion.button>
    </motion.div>
  );
}

function GroupTag({ tag }: { tag: string }) {
  return (
    <span className="bg-secondary text-white px-2 py-1 rounded-md text-xs">
      {tag}
    </span>
  );
}

type RollButtonProps = {
  type: "redirect" | "random";
  onClick?: () => void;
  disabled?: boolean;
  isLoading: boolean;
};

function RollButton({ type, onClick, disabled, isLoading }: RollButtonProps) {
  const buttonClass =
    "bg-secondary text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2";

  if (type === "redirect") {
    return (
      <Link href="/roll" aria-label="Roll for new images">
        <motion.button
          className={buttonClass}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <CheckIcon className="w-6 h-6 animate-spin" />
              rolling
            </>
          ) : (
            "roll"
          )}
        </motion.button>
      </Link>
    );
  }

  return (
    <motion.button
      className={buttonClass}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label="Roll for new images"
    >
      roll
    </motion.button>
  );
}

function IncludeUnapproved() {
  const { settings, update } = useSettings();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-unapproved"
            checked={settings.includeUnapproved}
            onCheckedChange={(checked) =>
              update(
                "includeUnapproved",
                typeof checked === "boolean" ? checked : false
              )
            }
          />
          <Label htmlFor="include-unapproved">Include unapproved groups</Label>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          Include groups that haven&apos;t been approved by the moderators yet.
          Use at your own risk.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
