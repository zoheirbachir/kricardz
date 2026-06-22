import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

/* Photoreal frames generated for this scene (midnight-blue luxury sedan) — bundled in /public/hero */
const IMG_EXTERIOR = '/hero/exterior.png';
const IMG_INTERIOR = '/hero/interior.png';
const IMG_ENGINE = '/hero/engine.png';

export default function ScrollExperience({ heightVh = 420 }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.35 });

  const extScale = useTransform(p, [0, 0.4], [1, 2.6]);
  const extOpacity = useTransform(p, [0.28, 0.4], [1, 0]);

  const intScale = useTransform(p, [0.3, 0.72], [1.2, 1.9]);
  const intOpacity = useTransform(p, [0.32, 0.44, 0.6, 0.7], [0, 1, 1, 0]);

  const engScale = useTransform(p, [0.64, 1], [1.2, 1.5]);
  const engOpacity = useTransform(p, [0.66, 0.78], [0, 1]);

  const cap1 = useTransform(p, [0, 0.05, 0.24, 0.3], [0, 1, 1, 0]);
  const cap1y = useTransform(p, [0, 0.3], [0, -40]);
  const cap2 = useTransform(p, [0.34, 0.42, 0.56, 0.62], [0, 1, 1, 0]);
  const cap3 = useTransform(p, [0.68, 0.76, 1], [0, 1, 1]);
  const hint = useTransform(p, [0, 0.05], [1, 0]);

  return (
    <section ref={ref} className="relative bg-black" style={{ height: `${heightVh}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center bg-black">
        {/* Photo layers */}
        <motion.div style={{ scale: extScale, opacity: extOpacity, transformOrigin: '62% 45%' }} className="absolute inset-0 will-change-transform">
          <img src={IMG_EXTERIOR} alt="Vue extérieure de la berline" className="w-full h-full object-cover" loading="eager" />
        </motion.div>
        <motion.div style={{ scale: intScale, opacity: intOpacity }} className="absolute inset-0 will-change-transform">
          <img src={IMG_INTERIOR} alt="Habitacle de la voiture" className="w-full h-full object-cover" />
        </motion.div>
        <motion.div style={{ scale: engScale, opacity: engOpacity }} className="absolute inset-0 will-change-transform">
          <img src={IMG_ENGINE} alt="Compartiment moteur" className="w-full h-full object-cover" />
        </motion.div>

        {/* Readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40 pointer-events-none" />

        {/* Captions */}
        <div className="absolute inset-x-0 bottom-28 flex justify-center px-6 text-center pointer-events-none">
          <motion.div style={{ opacity: cap1, y: cap1y }} className="absolute">
            <p className="text-primary-400 font-semibold tracking-[0.25em] uppercase text-sm mb-3">KriCar</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-lg">Votre prochaine voiture</h2>
            <p className="text-white/70 mt-3 text-lg drop-shadow">Faites défiler pour l'explorer de l'intérieur.</p>
          </motion.div>
          <motion.div style={{ opacity: cap2 }} className="absolute">
            <p className="text-primary-400 font-semibold tracking-[0.25em] uppercase text-sm mb-3">L'habitacle</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-lg">Montez à bord</h2>
            <p className="text-white/70 mt-3 text-lg drop-shadow">Un intérieur pensé pour chaque trajet.</p>
          </motion.div>
          <motion.div style={{ opacity: cap3 }} className="absolute pointer-events-auto">
            <p className="text-primary-400 font-semibold tracking-[0.25em] uppercase text-sm mb-3">Sous le capot</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-lg">La puissance, révélée</h2>
            <p className="text-white/70 mt-3 mb-6 text-lg drop-shadow">Des véhicules entretenus, prêts à rouler.</p>
            <Link to="/search" className="btn-primary text-base px-7 py-3 inline-flex">Voir les véhicules</Link>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div style={{ opacity: hint }} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest uppercase">Défiler</span>
          <motion.svg animate={{ y: [0, 8, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </motion.svg>
        </motion.div>

        {/* Progress bar */}
        <motion.div style={{ scaleX: p }} className="absolute bottom-0 left-0 h-1 w-full origin-left bg-primary-500" />
      </div>
    </section>
  );
}
