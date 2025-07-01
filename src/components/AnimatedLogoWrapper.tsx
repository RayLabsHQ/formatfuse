import React, { useState, useImperativeHandle, forwardRef } from "react";
import AnimatedLogo from "./AnimatedLogo";

interface AnimatedLogoWrapperProps {
  className?: string;
}

interface AnimatedLogoWrapperRef {
  replay: () => void;
}

const AnimatedLogoWrapper = forwardRef<
  AnimatedLogoWrapperRef,
  AnimatedLogoWrapperProps
>(({ className }, ref) => {
  const [key, setKey] = useState(0);

  useImperativeHandle(ref, () => ({
    replay: () => {
      setKey((prev) => prev + 1);
    },
  }));

  return <AnimatedLogo key={key} className={className} />;
});

AnimatedLogoWrapper.displayName = "AnimatedLogoWrapper";

export default AnimatedLogoWrapper;
export type { AnimatedLogoWrapperRef };
