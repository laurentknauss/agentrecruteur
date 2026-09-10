"use client";
import React, { useCallback, useEffect, useState } from "react";
import { motion, Variants } from "motion/react";
import { cn } from "@/lib/utils";

type SparkleProps = {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
};

const SparklesCore = (props: {
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
}) => {
  const {
    background = "transparent",
    minSize = 0.6,
    maxSize = 1.4,
    particleDensity = 1200,
    className,
    particleColor = "#FFFFFF",
  } = props;

  const [sparkles, setSparkles] = useState<SparkleProps[]>([]);

  const generateSparkle = useCallback(
    (): SparkleProps => ({
      id: Math.random().toString(36).slice(2, 11),
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: particleColor,
      delay: Math.random() * 2,
      scale: Math.random() * (maxSize - minSize) + minSize,
      lifespan: Math.random() * 10 + 10,
    }),
    [particleColor, maxSize, minSize]
  );

  const sparkleVariants: Variants = {
    initial: {
      opacity: 0,
      scale: 0,
    },
    animate: {
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  useEffect(() => {
    const sparkleCount = Math.max(0, Math.floor(particleDensity / 100));
    // Remplissage initial au premier frame (et non synchronement dans l'effet) : le premier rendu
    // client reste identique au HTML prérendu — aucun aléatoire pendant le rendu, donc aucun
    // écart d'hydratation — tout en évitant des rendus en cascade.
    const raf = requestAnimationFrame(() => {
      setSparkles(Array.from({ length: sparkleCount }, generateSparkle));
    });

    const interval = setInterval(() => {
      setSparkles((current) =>
        current.map((sparkle) => ({ ...sparkle, ...generateSparkle() }))
      );
    }, 5000);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, [particleDensity, generateSparkle]);

  return (
    <div
      className={cn("relative h-full w-full", className)}
      style={{
        background,
      }}
    >
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="pointer-events-none absolute inline-block"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            color: sparkle.color,
            fontSize: `${sparkle.scale}em`,
          }}
          variants={sparkleVariants}
          initial="initial"
          animate="animate"
          transition={{
            delay: sparkle.delay,
            duration: sparkle.lifespan,
            repeat: Infinity,
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
};

export default SparklesCore;