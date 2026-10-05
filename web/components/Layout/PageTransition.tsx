'use client';
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants, reducedMotion } from '@/lib/motion';
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return <motion.div variants={reduce ? reducedMotion : pageVariants} initial="initial" animate="enter" exit="exit" className="hawk-page">{children}</motion.div>;
}
