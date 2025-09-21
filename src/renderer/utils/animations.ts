/**
 * Animation utilities for Visual Workspace components
 */

export const animationDurations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
};

export const animationEasings = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Stagger animations for list items
export const staggerDelay = (index: number, baseDelay = 50) => {
  return index * baseDelay;
};

// Spring physics animations
export const springConfig = {
  tension: 170,
  friction: 26,
  mass: 1,
};

// Common animation classes
export const animationClasses = {
  fadeIn: 'animate-fadeIn',
  fadeOut: 'animate-fadeOut',
  slideIn: 'animate-slideIn',
  slideOut: 'animate-slideOut',
  scaleIn: 'animate-scaleIn',
  scaleOut: 'animate-scaleOut',
  rotateIn: 'animate-rotateIn',
  bounceIn: 'animate-bounceIn',
};

// Generate dynamic transition style
export const getTransitionStyle = (
  property = 'all',
  duration = animationDurations.normal,
  easing = animationEasings.easeInOut,
  delay = 0
) => ({
  transition: `${property} ${duration}ms ${easing} ${delay}ms`,
});

// Generate entrance animation style
export const getEntranceAnimation = (index = 0, type = 'fade') => {
  const delay = staggerDelay(index);

  switch (type) {
    case 'fade':
      return {
        animation: `fadeIn ${animationDurations.normal}ms ${animationEasings.easeOut} ${delay}ms both`,
      };
    case 'slide':
      return {
        animation: `slideInUp ${animationDurations.normal}ms ${animationEasings.easeOut} ${delay}ms both`,
      };
    case 'scale':
      return {
        animation: `scaleIn ${animationDurations.fast}ms ${animationEasings.bounce} ${delay}ms both`,
      };
    default:
      return {};
  }
};

// Hover animation helper
export const hoverAnimation = {
  scale: {
    transform: 'scale(1)',
    transition: getTransitionStyle('transform', animationDurations.fast).transition,
    '&:hover': {
      transform: 'scale(1.05)',
    },
  },
  lift: {
    transform: 'translateY(0)',
    transition: getTransitionStyle('transform', animationDurations.fast).transition,
    '&:hover': {
      transform: 'translateY(-4px)',
    },
  },
  glow: {
    boxShadow: '0 0 0 0 rgba(87, 13, 248, 0)',
    transition: getTransitionStyle('box-shadow', animationDurations.normal).transition,
    '&:hover': {
      boxShadow: '0 0 20px 5px rgba(87, 13, 248, 0.3)',
    },
  },
};