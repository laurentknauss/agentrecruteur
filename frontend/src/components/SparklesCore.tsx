"use client";
import React, { useState, useEffect } from "react";
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

  const generateSparkle = (): SparkleProps => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: particleColor,
      delay: Math.random() * 2,
      scale: Math.random() * (maxSize - minSize) + minSize,
      lifespan: Math.random() * 10 + 10,
    };
  };

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
    const sparkleCount = Math.floor(particleDensity / 100);
    const newSparkles = Array.from({ length: sparkleCount }, generateSparkle);
    setSparkles(newSparkles);

    const interval = setInterval(() => {
      setSparkles((current) =>
        current.map((sparkle) => ({ ...sparkle, ...generateSparkle() }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [particleDensity]);

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