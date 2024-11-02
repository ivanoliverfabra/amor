"use client";

import {
  AnimatePresence,
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { approveGroup, denyGroup, getUnapprovedGroups } from "~/actions/group";
import {
  Carousel,
  CarouselMainContainer,
  CarouselNext,
  CarouselPrevious,
  CarouselThumbsContainer,
  SliderMainItem,
  SliderThumbItem,
} from "~/components/ui/carousel";
import { Group } from "~/types";

export function Admin({ groups: initialGroups }: { groups: Group[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const groups = await getUnapprovedGroups();
      setGroups(groups);
    } catch {
      toast.error("failed to fetch unapproved groups");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeCard = useCallback(
    async (id: number, swipeDirection: "left" | "right") => {
      const group = groups.find((group) => group.id === id);
      const toastId = toast.loading(
        `attempting to ${
          swipeDirection === "right" ? "approve" : "deny"
        } the group: ${group?.name}`
      );
      setDirection(swipeDirection);
      setGroups((prev) => prev.filter((group) => group.id !== id));

      if (swipeDirection === "right") {
        await approveGroup(id);
        toast.success(`successfully approved the group: ${group?.name}`, {
          id: toastId,
        });
      } else {
        await denyGroup(id);
        toast.success(`successfully denied the group: ${group?.name}`, {
          id: toastId,
        });
      }
    },
    [groups]
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen overflow-x-hidden">
      <div className="relative h-[600px] w-[400px] mx-auto">
        <div className="absolute top-0 left-0 right-0 bottom-0">
          {groups.length > 0 ? (
            <AnimatePresence>
              {groups.map((group, index) => (
                <SwipeCard
                  key={group.id}
                  group={group}
                  index={index}
                  cardsLength={groups.length}
                  removeCard={removeCard}
                  direction={direction}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="bg-secondary rounded-2xl shadow-xl p-8 text-white">
              <h2 className="text-2xl font-bold">
                woohoo! no more groups to verify
              </h2>
              <p className="mt-4">
                you&apos;ve verified all the groups that need your attention.
                great job!
              </p>
              <motion.button
                className="bg-accent text-white px-4 py-2 rounded-full mt-4"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refetch}
                disabled={loading}
              >
                {loading ? "refreshing..." : "refresh"}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SwipeCardProps {
  group: Group;
  index: number;
  cardsLength: number;
  removeCard: (id: number, direction: "left" | "right") => void;
  direction: "left" | "right" | null;
}

function SwipeCard({ group, index, cardsLength, removeCard }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipe = info.offset.x;
    const threshold = 100;

    if (Math.abs(swipe) > threshold) {
      const direction = swipe > 0 ? "right" : "left";
      setExitX(swipe > 0 ? 1000 : -1000);
      removeCard(group.id, direction);
    } else {
      x.set(0);
    }
  };

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 bottom-0 w-full h-full"
      style={{
        zIndex: cardsLength - index,
        x,
        rotate,
        scale,
      }}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: exitX,
        rotate: exitX > 0 ? 45 : -45,
        opacity: 0,
        transition: { duration: 0.2 },
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: "grabbing" }}
    >
      <motion.div
        className="relative w-full h-full bg-secondary rounded-2xl shadow-xl overflow-hidden"
        style={{ opacity }}
      >
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t h-full justify-between flex flex-col from-black/80 to-transparent text-white">
          <Carousel>
            <CarouselNext className="top-1/3 -translate-y-1/3" />
            <CarouselPrevious className="top-1/3 -translate-y-1/3" />
            <CarouselMainContainer className="h-60">
              {group.images.map((img) => (
                <SliderMainItem
                  key={`image-${img.id}`}
                  className="bg-transparent h-full"
                >
                  <img
                    src={img.url}
                    alt={group.name}
                    className="object-cover w-full h-full rounded-2xl"
                  />
                </SliderMainItem>
              ))}
            </CarouselMainContainer>
            <CarouselThumbsContainer>
              {group.images.map((img, index) => (
                <SliderThumbItem
                  key={`thumb-${img.id}`}
                  index={index}
                  className="bg-transparent"
                >
                  <img
                    src={img.url}
                    alt={group.name}
                    className="object-cover w-full h-full rounded-2xl"
                  />
                </SliderThumbItem>
              ))}
            </CarouselThumbsContainer>
          </Carousel>
          <div className="flex-1" />
          <h2 className="text-2xl font-bold mb-4">{group.name}</h2>
          <div className="flex items-center space-x-4">
            {group.tags.map((tag) => (
              <span
                key={`group-${group.id}-${tag}`}
                className="bg-primary text-white px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Like/Dislike Indicators */}
        <motion.div
          className="absolute top-8 right-8 bg-green-500 text-white px-6 py-2 rounded-full font-bold text-xl"
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
        >
          VERIFY
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 bg-red-500 text-white px-6 py-2 rounded-full font-bold text-xl"
          style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
        >
          NOPE
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
