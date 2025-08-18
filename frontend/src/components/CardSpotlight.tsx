"use client";
import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

export const CardSpotlight = ({
  children,
  radius = 350,
  color = "#262626",
  className,
  ...props
}: {
  radius?: number;
  color?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
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
        "relative h-full w-full rounded-3xl border border-neutral-800 bg-neutral-950 p-8",
        className
      )}
      onMouseMove={handleMouseMove}
      style={{
        background: "radial-gradient(circle at 50% 50%, rgba(120, 119, 198, 0.3), transparent 50%)",
      }}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {children}
    </motion.div>
  );
};