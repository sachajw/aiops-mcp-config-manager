import { useState, useEffect } from 'react';

export interface BreakpointValues {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1200
} as const;

export const useResponsive = (): BreakpointValues => {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mobile = windowWidth < BREAKPOINTS.MOBILE;
  const tablet = windowWidth >= BREAKPOINTS.MOBILE && windowWidth < BREAKPOINTS.DESKTOP;
  const desktop = windowWidth >= BREAKPOINTS.DESKTOP;

  return {
    mobile,
    tablet, 
    desktop,
    isMobile: mobile,
    isTablet: tablet,
    isDesktop: desktop
  };
};

export default useResponsive;