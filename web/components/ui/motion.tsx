"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "motion/react";
import {
  useCallback,
} from "react";

import { cn } from "@/lib/utils";

/** A consistent, transform-and-opacity-only entrance transition. */
const entranceTransition: Transition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
};

const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** Variants exposed for custom children inside StaggerContainer. */
export const animationVariants = {
  fade: fadeVariants,
  fadeUp: fadeUpVariants,
} as const;

type EntranceProps = HTMLMotionProps<"div"> & {
  /** Delay in seconds before the element enters. */
  delay?: number;
  /** Viewport amount required to start the animation. */
  viewportAmount?: number;
};

/** Fades content in once it enters the viewport. */
export function FadeIn({
  children,
  delay = 0,
  viewportAmount = 0.2,
  transition,
  ...props
}: EntranceProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      variants={fadeVariants}
      transition={transition ?? { ...entranceTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Fades content in while moving it upward by a small, GPU-friendly transform. */
export function FadeUp({
  children,
  delay = 0,
  viewportAmount = 0.2,
  transition,
  ...props
}: EntranceProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      variants={fadeUpVariants}
      transition={transition ?? { ...entranceTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type StaggerContainerProps = HTMLMotionProps<"div"> & {
  /** Delay between each child animation, in seconds. */
  stagger?: number;
  /** Delay before the first child animation, in seconds. */
  delayChildren?: number;
  viewportAmount?: number;
};

/**
 * Coordinates children using `hidden` and `visible` variants. Pair with
 * StaggerItem or custom Motion children using animationVariants.
 */
export function StaggerContainer({
  children,
  stagger = 0.08,
  delayChildren = 0,
  viewportAmount = 0.15,
  variants,
  ...props
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerVariants: Variants = variants ?? {
    hidden: {},
    visible: {
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { staggerChildren: stagger, delayChildren },
    },
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type StaggerItemProps = HTMLMotionProps<"div"> & {
  /** Uses a simple fade instead of the default fade-up entrance. */
  variant?: "fade" | "fadeUp";
};

/** A child item controlled by the nearest StaggerContainer. */
export function StaggerItem({
  children,
  variant = "fadeUp",
  transition,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={variant === "fade" ? fadeVariants : fadeUpVariants}
      transition={transition ?? entranceTransition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type AnimatedSectionProps = HTMLMotionProps<"section"> & {
  delay?: number;
  viewportAmount?: number;
};

/** A semantic section wrapper with a restrained fade-up reveal. */
export function AnimatedSection({
  children,
  delay = 0,
  viewportAmount = 0.15,
  transition,
  ...props
}: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: viewportAmount }}
      variants={fadeUpVariants}
      transition={transition ?? { ...entranceTransition, delay }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export type MagneticButtonProps = HTMLMotionProps<"button"> & {
  /** Maximum pointer pull in pixels. Keep small to preserve button intent. */
  strength?: number;
  className?: string;
};

/**
 * A button that gently follows a nearby pointer. It only animates x/y/scale and
 * resets immediately for people who prefer reduced motion.
 */
export function MagneticButton({
  children,
  className,
  strength = 0.18,
  onPointerMove,
  onPointerLeave,
  ...props
}: MagneticButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.25 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.25 });

  const handlePointerMove = useCallback<NonNullable<HTMLMotionProps<"button">["onPointerMove"]>>(
    (event) => {
      onPointerMove?.(event);
      if (shouldReduceMotion) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      x.set((event.clientX - bounds.left - bounds.width / 2) * strength);
      y.set((event.clientY - bounds.top - bounds.height / 2) * strength);
    },
    [onPointerMove, shouldReduceMotion, strength, x, y],
  );

  const handlePointerLeave = useCallback<NonNullable<HTMLMotionProps<"button">["onPointerLeave"]>>(
    (event) => {
      onPointerLeave?.(event);
      x.set(0);
      y.set(0);
    },
    [onPointerLeave, x, y],
  );

  return (
    <motion.button
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={shouldReduceMotion ? undefined : { x: springX, y: springY }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export type RevealTextProps = Omit<HTMLMotionProps<"span">, "children"> & {
  children: string;
  /** Set to false when the text is already above the fold. */
  once?: boolean;
  stagger?: number;
};

/** Reveals each word with only opacity and vertical transform changes. */
export function RevealText({
  children,
  className,
  once = true,
  stagger = 0.045,
  ...props
}: RevealTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = children.trim().split(/\s+/);

  return (
    <motion.span
      aria-label={children}
      className={cn("inline", className)}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once, amount: 0.25 }}
      variants={{
        hidden: {},
        visible: {
          transition: shouldReduceMotion ? { duration: 0 } : { staggerChildren: stagger },
        },
      }}
      {...props}
    >
      {words.map((word, index) => (
        <span className="inline-block overflow-hidden align-bottom" key={`${word}-${index}`}>
          <motion.span
            aria-hidden="true"
            className="inline-block"
            variants={fadeUpVariants}
            transition={entranceTransition}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : null}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export type HoverCardProps = HTMLMotionProps<"div">;

/** A reusable card interaction that avoids layout-triggering animated properties. */
export function HoverCard({ children, transition, ...props }: HoverCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -6, scale: 1.01 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={transition ?? { type: "spring", stiffness: 320, damping: 24 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
