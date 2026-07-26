import { useCategories } from '../lib/useCategories';

/* Multi-select chips for the activities an agency offers. Controlled: `value` is
   an array of category slugs, `onChange` gets the next array. Options come from
   the admin-managed category list. */
export default function ServiceTypePicker({ value = [], onChange }) {
  const { categories, loading, label } = useCategories();
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);

  if (loading) return <div className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(c => {
        const active = value.includes(c.slug);
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => toggle(c.slug)}
            aria-pressed={active}
            className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${active
              ? 'bg-primary-500 text-white border-primary-500 shadow-clay'
              : 'bg-[var(--surface)] text-gray-600 dark:text-gray-300 border-[var(--border-strong)] hover:border-primary-400'}`}
          >
            {label(c)}
          </button>
        );
      })}
    </div>
  );
}
