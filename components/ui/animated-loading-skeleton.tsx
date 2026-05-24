'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

type AnimationControls = ReturnType<typeof useAnimation>;
import { Search } from 'lucide-react';
import Image from 'next/image';

/** Known-stable Unsplash architecture / construction thumbnails (images.unsplash.com). */
const CARD_IMAGES = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80&auto=format&fit=crop',
] as const;

interface GridConfig {
  numCards: number;
  cols: number;
  xBase: number;
  yBase: number;
  xStep: number;
  yStep: number;
}

interface Position {
  x: number;
  y: number;
}

function getGridConfig(width: number): GridConfig {
  const numCards = 6;
  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  return {
    numCards,
    cols,
    xBase: 40,
    yBase: 60,
    xStep: 210,
    yStep: 230,
  };
}

function generateSearchPath(config: GridConfig) {
  const { numCards, cols, xBase, yBase, xStep, yStep } = config;
  const rows = Math.ceil(numCards / cols);
  const allPositions: Position[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row * cols + col < numCards) {
        allPositions.push({
          x: xBase + col * xStep,
          y: yBase + row * yStep,
        });
      }
    }
  }

  const numRandomCards = 4;
  const shuffledPositions = [...allPositions]
    .sort(() => Math.random() - 0.5)
    .slice(0, numRandomCards);

  if (shuffledPositions.length === 0) {
    return {
      x: [xBase],
      y: [yBase],
      scale: [1.2],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: [0.4, 0, 0.2, 1] as const,
        times: [0, 1],
      },
    };
  }

  shuffledPositions.push(shuffledPositions[0]);

  return {
    x: shuffledPositions.map((pos) => pos.x),
    y: shuffledPositions.map((pos) => pos.y),
    scale: Array(shuffledPositions.length).fill(1.2),
    transition: {
      duration: shuffledPositions.length * 2,
      repeat: Infinity,
      ease: [0.4, 0, 0.2, 1] as const,
      times: shuffledPositions.map((_, i) => i / (shuffledPositions.length - 1)),
    },
  };
}

const frameVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const glowVariants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.2)',
      '0 0 35px rgba(59, 130, 246, 0.4)',
      '0 0 20px rgba(59, 130, 246, 0.2)',
    ],
    scale: [1, 1.1, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export default function AnimatedLoadingSkeleton() {
  const [windowWidth, setWindowWidth] = useState(0);
  const controls = useAnimation();

  const runSearchPath = useCallback(
    (width: number, animation: AnimationControls) => {
      const cfg = getGridConfig(width);
      void animation.start(generateSearchPath(cfg));
    },
    []
  );

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    runSearchPath(windowWidth, controls);
  }, [windowWidth, controls, runSearchPath]);

  const config = getGridConfig(windowWidth);

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg"
      variants={frameVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <motion.div
          className="absolute z-10 pointer-events-none"
          animate={controls}
          style={{ left: 24, top: 24 }}
        >
          <motion.div
            className="bg-blue-500/20 p-3 rounded-full backdrop-blur-sm"
            variants={glowVariants}
            animate="animate"
          >
            <Search className="w-6 h-6 text-blue-600" strokeWidth={2} aria-hidden />
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(config.numCards)].map((_, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-lg shadow-sm p-4 overflow-hidden"
            >
              <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md bg-gray-200">
                <Image
                  src={CARD_IMAGES[i % CARD_IMAGES.length]}
                  alt=""
                  fill
                  className="object-cover opacity-40 grayscale"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <motion.div
                  className="absolute inset-0 rounded-md bg-gray-200/80"
                  animate={{
                    opacity: [0.35, 0.65, 0.35],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <motion.div
                className="mb-2 h-3 w-3/4 rounded bg-gray-200"
                animate={{
                  backgroundColor: ['#f3f4f6', '#e5e7eb', '#f3f4f6'],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-3 w-1/2 rounded bg-gray-200"
                animate={{
                  backgroundColor: ['#f3f4f6', '#e5e7eb', '#f3f4f6'],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
