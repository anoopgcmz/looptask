export const spring = {
  lift: { type: 'spring', stiffness: 500, damping: 30, mass: 0.5 },
  ghost: { type: 'spring', stiffness: 350, damping: 25, mass: 0.8 },
} as const;

export const timing = {
  settle: { duration: 0.3, ease: 'easeOut' },
  inkBar: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
} as const;
