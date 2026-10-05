import type { Variants } from 'framer-motion';
export const pageVariants: Variants = { initial: { opacity: 0, y: 8 }, enter: { opacity: 1, y: 0, transition: { duration: .2, ease: 'easeOut' } }, exit: { opacity: 0, y: -4, transition: { duration: .15 } } };
export const modalVariants: Variants = { initial: { opacity: 0, scale: .96, y: 4 }, enter: { opacity: 1, scale: 1, y: 0, transition: { duration: .18 } }, exit: { opacity: 0, scale: .96, transition: { duration: .12 } } };
export const drawerVariants: Variants = { initial: { x: '100%' }, enter: { x: 0, transition: { duration: .2 } }, exit: { x: '100%', transition: { duration: .15 } } };
export const saveBarVariants: Variants = { initial: { opacity: 0, y: 16 }, enter: { opacity: 1, y: 0, transition: { duration: .18 } }, exit: { opacity: 0, y: 16, transition: { duration: .12 } } };
export const staggerContainer: Variants = { enter: { transition: { staggerChildren: .03 } } };
export const staggerItem = pageVariants;
export const reducedMotion: Variants = { initial: { opacity: 1 }, enter: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0 } } };
