import { motion, useScroll, useSpring } from 'framer-motion';

/* Thin clay progress bar that tracks page scroll (fixed at the very top). */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-1 bg-primary-500 origin-left z-[60]"
      aria-hidden="true"
    />
  );
}

/* ── Shared easing & springs ── */
export const easeOut = [0.22, 1, 0.36, 1];
export const spring = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 };
export const softSpring = { type: 'spring', stiffness: 170, damping: 22 };

/* ── Reusable variants ── */
export const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show:   { opacity: 1, scale: 1, transition: spring },
};

export const wordUp = {
  hidden: { opacity: 0, y: '0.5em' },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

/* Stagger container factory */
export const staggerContainer = (stagger = 0.08, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

/**
 * Reveal — fade/slide content in when it scrolls into view.
 * Honors reduced-motion via the app-level <MotionConfig reducedMotion="user">.
 */
export function Reveal({
  children, variants = fadeUp, className, as = 'div',
  once = true, amount = 0.2, ...rest
}) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * StaggerGroup — reveal children one after another on scroll.
 * Wrap items in <motion.div variants={fadeUp}> or use the `item` export.
 */
export function StaggerGroup({
  children, className, stagger = 0.08, delayChildren = 0,
  once = true, amount = 0.15, ...rest
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* Word-by-word animated headline */
export function AnimatedHeading({ text, className, stagger = 0.06, delay = 0.05 }) {
  const words = String(text).split(' ');
  return (
    <motion.h1
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}>
          <motion.span style={{ display: 'inline-block' }} variants={wordUp} aria-hidden="true">
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}
