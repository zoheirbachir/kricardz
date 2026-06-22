import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { fadeUp, spring } from '../lib/motion';

function Stars({ rating }) {
  return (
    <span className="stars flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-honey-500' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// Inline spec icons (replace emoji), Heroicons-outline style
const SeatIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12V7a2 2 0 012-2h2a2 2 0 012 2v5m-6 0h10a2 2 0 012 2v3H5a2 2 0 01-2-2v-1a2 2 0 012-2zm12 0V9a2 2 0 012-2" /></svg>;
const GearIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const FuelIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 20V6a2 2 0 012-2h6a2 2 0 012 2v14M3 20h12M14 9h2.5A1.5 1.5 0 0118 10.5V16a1.5 1.5 0 003 0V9.5L18 6M7 9h4" /></svg>;
const PinIcon = (p) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

export default function CarCard({ car }) {
  const { t } = useTranslation();
  const image = car.images?.[0];

  return (
    <motion.div variants={fadeUp} whileHover={{ y: -6 }} whileTap={{ scale: 0.99 }} transition={spring} className="h-full">
    <Link to={`/cars/${car.id}`} className="card group hover:shadow-lg block h-full">
      {/* Image */}
      <div className={`relative h-44 bg-gray-100 overflow-hidden ${car.available === false ? 'opacity-70 grayscale' : ''}`}>
        {image ? (
          <img src={image} alt={car.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 17l-2-2H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2l-2 2M8 17h8M8 17v-2m8 2v-2" />
            </svg>
          </div>
        )}
        {/* Type badge */}
        <span className="absolute top-3 left-3 badge bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
          {t(`types.${car.type}`) || car.type}
        </span>
        {/* Unavailable badge — matches the live catalog */}
        {car.available === false && (
          <span className="absolute bottom-0 inset-x-0 bg-gray-900/75 text-white text-xs font-semibold text-center py-1.5 tracking-wide">
            {t('car.unavailable')}
          </span>
        )}
        {car.verified && (
          <span className="absolute top-3 right-3 badge bg-pine-500 text-white">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base truncate mb-1">{car.title}</h3>
        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <PinIcon className="w-3.5 h-3.5" />
          {car.wilaya}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><SeatIcon className="w-3.5 h-3.5" /> {car.seats}</span>
          <span className="flex items-center gap-1"><GearIcon className="w-3.5 h-3.5" /> {t(`car.${car.transmission}`)}</span>
          <span className="flex items-center gap-1"><FuelIcon className="w-3.5 h-3.5" /> {t(`car.${car.fuel}`)}</span>
        </div>

        {/* Rating */}
        {car.rating_count > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <Stars rating={car.rating_avg} />
            <span className="text-xs text-gray-500">({car.rating_count})</span>
          </div>
        )}

        {/* Price & owner */}
        <div className="flex items-end justify-between pt-1 border-t border-gray-100">
          <div className="pt-2">
            <span className="font-display text-xl font-semibold text-gray-900">{car.price_per_day?.toLocaleString()}</span>
            <span className="text-xs text-gray-500 ml-1">{t('common.da_day')}</span>
          </div>
          {car.owner_verified && (
            <span className="text-xs text-pine-600 flex items-center gap-1 font-semibold pt-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {t('car.verified_owner')}
            </span>
          )}
        </div>
      </div>
    </Link>
    </motion.div>
  );
}
