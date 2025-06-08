import { motion } from "framer-motion";
import type React from "react";
import { memo } from "react";

interface AnimatedLogoProps {
  isRecording: boolean;
  size?: number;
  className?: string;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ isRecording, size = 32, className = "" }) => {
  // Main shape morph variants - sphere to square
  const shapeVariants = {
    idle: {
      borderRadius: "50%", // Circle
      scale: 1,
      rotate: 0,
      transition: {
        duration: 1,
        ease: "easeInOut",
      },
    },
    recording: {
      borderRadius: ["50%", "30%", "15%", "5%", "15%", "30%", "50%"], // Subtle morph from circle to rounded square and back
      scale: [1, 1.05, 0.98, 1.08, 1],
      rotate: [0, 45, 90, 135, 180],
      transition: {
        duration: 6,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        times: [0, 0.15, 0.3, 0.5, 0.65, 0.8, 1],
      },
    },
  };
  // Pulse variants for outer glow
  const pulseVariants = {
    idle: {
      scale: 0,
      opacity: 0,
    },
    recording: {
      scale: [0, 1.5, 2],
      opacity: [0.4, 0.15, 0],
      transition: {
        duration: 2.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeOut",
      },
    },
  };

  const particles = Array.from({ length: 4 }, (_, i) => `particle-${i}`);

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      animate={isRecording ? "recording" : "idle"}
    >
      {" "}
      {/* Outer pulse rings - only visible when recording */}
      {isRecording && (
        <>
          <motion.div
            className="absolute border border-foreground/20"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
            }}
            variants={pulseVariants}
            animate="recording"
          />
          <motion.div
            className="absolute border border-foreground/10"
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
            }}
            variants={pulseVariants}
            animate="recording"
            transition={{ delay: 0.8 }}
          />
        </>
      )}{" "}
      {/* Main morphing shape */}
      <motion.div
        className="relative z-10 bg-foreground shadow-sm"
        style={{
          width: size * 0.6,
          height: size * 0.6,
        }}
        variants={shapeVariants}
        animate={isRecording ? "recording" : "idle"}
      >
        {/* Inner highlight */}
        <motion.div
          className="absolute top-1/4 left-1/4 bg-background/20 blur-[1px]"
          style={{
            width: size * 0.15,
            height: size * 0.15,
          }}
          variants={shapeVariants}
          animate={isRecording ? "recording" : "idle"}
        />
      </motion.div>{" "}
      {/* Floating particles around the morphing shape */}
      {isRecording && (
        <div className="absolute inset-0">
          {particles.map((particleId, index) => (
            <motion.div
              key={particleId}
              className="absolute h-0.5 w-0.5 rounded-full bg-foreground/40"
              style={{
                left: "50%",
                top: "50%",
                marginLeft: "-1px",
                marginTop: "-1px",
              }}
              animate={{
                x: [0, Math.cos((index * 90 * Math.PI) / 180) * (size * 0.5)],
                y: [0, Math.sin((index * 90 * Math.PI) / 180) * (size * 0.5)],
                scale: [0, 1, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: index * 0.4,
              }}
            />
          ))}
        </div>
      )}{" "}
      {/* Ambient glow effect when recording */}
      {isRecording && (
        <motion.div
          className="absolute inset-0 rounded-full bg-foreground/5 blur-md"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
};

export default memo(AnimatedLogo);
