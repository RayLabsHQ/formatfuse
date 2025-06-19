import React from 'react';
import { motion } from 'framer-motion';

type Props = { className?: string };

const AnimatedLogo: React.FC<Props> = ({ className }) => {
  // Stagger animation for pixel blocks
  const pixelVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.6 + i * 0.03,
        duration: 0.3,
        ease: 'backOut'
      }
    })
  };

  return (
    <motion.svg
      className={className}
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      {/* White background */}
      <rect width="1000" height="1000" fill="white"/>
      
      <defs>
        <linearGradient id="paint0_linear_486_489" x1="516.081" y1="151" x2="516.081" y2="610.604" gradientUnits="userSpaceOnUse">
          <stop stopColor="#942DE6" />
          <stop offset="1" stopColor="#4F27D8" />
        </linearGradient>
      </defs>

      {/* Document shape */}
      <motion.path
        d="M315 151.883C330.6 150.283 502.833 151.217 587 151.883C591.5 151.883 601.2 152.984 604 157.383C606.8 161.783 688.5 242.55 729 282.383C732 285.717 738.3 293.983 739.5 300.383C740.7 306.783 740 367.717 739.5 397.383C738.167 402.55 732.5 413.083 720.5 413.883C708.5 414.683 529.833 414.217 442 413.883L441.938 413.892C438.08 414.395 429.981 415.45 426.5 427.883V480.383H669C673.167 481.717 681.9 486.684 683.5 495.883C685.1 505.083 684.167 564.717 683.5 593.383C682 598.883 677 609.983 669 610.383C661 610.783 532.667 610.55 469.5 610.383H292V576.001H327V541.001H292V175.883C293.167 168.55 299.4 153.483 315 151.883ZM372 325.001C366.477 325.001 362 329.478 362 335.001C362 340.523 366.477 345.001 372 345.001H542C547.523 345.001 552 340.523 552 335.001C552 329.478 547.523 325.001 542 325.001H372ZM595 279.383C597.4 298.583 613 303.383 620.5 303.383H714.5L595 183.883V279.383ZM372 261.001C366.477 261.001 362 265.478 362 271.001C362 276.523 366.477 281.001 372 281.001H520C525.523 281.001 530 276.523 530 271.001C530 265.478 525.523 261.001 520 261.001H372Z"
        fill="url(#paint0_linear_486_489)"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: { 
            pathLength: 1, 
            opacity: 1,
            transition: {
              pathLength: { duration: 1.5, ease: "easeInOut" },
              opacity: { duration: 0.5 }
            }
          }
        }}
      />

      {/* Pixel blocks - animated individually */}
      <motion.g>
        {/* Row 1 */}
        <motion.rect x="432" y="541" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={0} />
        <motion.rect x="397" y="576" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={1} />
        <motion.rect x="432" y="576" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={2} />
        <motion.rect x="397" y="541" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={3} />
        <motion.rect x="362" y="541" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={4} />
        <motion.rect x="327" y="576" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={5} />
        <motion.rect x="362" y="576" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={6} />
        <motion.rect x="327" y="541" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={7} />
        <motion.rect x="292" y="576" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={8} />
        
        {/* Row 2 */}
        <motion.rect x="432" y="611" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={9} />
        <motion.rect x="397" y="646" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={10} />
        <motion.rect x="432" y="646" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={11} />
        <motion.rect x="397" y="611" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={12} />
        <motion.rect x="362" y="611" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={13} />
        <motion.rect x="362" y="646" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={14} />
        <motion.rect x="327" y="611" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={15} />
        <motion.rect x="292" y="646" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={16} />
        
        {/* Row 3 */}
        <motion.rect x="432" y="681" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={17} />
        <motion.rect x="432" y="716" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={18} />
        <motion.rect x="397" y="681" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={19} />
        <motion.rect x="327" y="716" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={20} />
        <motion.rect x="467" y="750" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={21} />
        <motion.rect x="502" y="681" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={22} />
        <motion.rect x="397" y="750" width="35" height="35" fill="#7034E3" variants={pixelVariants} custom={23} />
        <motion.rect x="432" y="820" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={24} />
        <motion.rect x="327" y="785" width="35" height="35" fill="#5227D9" variants={pixelVariants} custom={25} />
      </motion.g>
    </motion.svg>
  );
};

export default AnimatedLogo;