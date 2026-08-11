"use client";
import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
}: {
  radius?: number;
  color?: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  const spotlightX = useSpring(mouseX, { stiffness: 500, damping: 100 });
  const spotlightY = useSpring(mouseY, { stiffness: 500, damping: 100 });

  const background = useTransform(
    [spotlightX, spotlightY],
    ([x, y]) => `radial-gradient(${radius}px circle at ${x}px ${y}px, ${color}, transparent 40%)`
  );

  return (
    <motion.div
      className={cn(
        "relative h-full w-full rounded-3xl border border-slate-700 bg-slate-800 p-8",
        className
      )}
      onMouseMove={handleMouseMove}
      style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.18), transparent 50%)",
      }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </motion.div>
  );
};