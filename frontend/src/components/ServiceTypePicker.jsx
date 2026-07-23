import { useTranslation } from 'react-i18next';
import { SERVICE_TYPES } from '../lib/serviceTypes';

/* Multi-select chips for the activities an agency offers. Controlled: `value` is
   an array of service_type keys, `onChange` gets the next array. */
export default function ServiceTypePicker({ value = [], onChange }) {
  const { t } = useTranslation();
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);

  return (
    <div className="flex flex-wrap gap-2">
      {SERVICE_TYPES.map(key => {
        const active = value.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            aria-pressed={active}
            className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${active
              ? 'bg-primary-500 text-white border-primary-500 shadow-clay'
              : 'bg-[var(--surface)] text-gray-600 dark:text-gray-300 border-[var(--border-strong)] hover:border-primary-400'}`}
          >
            {t(`services.${key}`)}
          </button>
        );
      })}
    </div>
  );
}
