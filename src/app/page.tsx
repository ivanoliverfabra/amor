"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Page() {
  return (
    <div className="h-screen w-full justify-center items-center flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">
        welcome to <span className="font-bold">amor</span>
      </h2>
      <p className="text-lg text-center max-w-screen-sm">
        roll for matching profile pictures for you and your significant other or
        friends. amor offers customizable designs that celebrate your unique
        connections and bring your profiles to life
      </p>
      <Link href="/roll">
        <motion.button
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          roll
        </motion.button>
      </Link>
    </div>
  );
}
