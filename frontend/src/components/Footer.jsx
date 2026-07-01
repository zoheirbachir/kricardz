import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-clay">
                <span className="text-white font-bold text-base">K</span>
              </div>
              <span className="font-display font-semibold text-2xl text-white">Kri<span className="text-primary-400">Car</span></span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">{t('footer.tagline')}</p>
            <div className="flex gap-3 mt-4">
              {['facebook','instagram','twitter'].map(s => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-primary-500 transition-colors">
                  <span className="text-xs font-bold">{s[0].toUpperCase()}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.links')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="hover:text-primary-400 transition-colors">{t('nav.search')}</Link></li>
              <li><Link to="/agencies" className="hover:text-primary-400 transition-colors">{t('nav.agencies')}</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary-400 transition-colors">{t('nav.howItWorks')}</Link></li>
              <li><Link to="/trust" className="hover:text-primary-400 transition-colors">{t('nav.trust')}</Link></li>
              <li><Link to="/about" className="hover:text-primary-400 transition-colors">{t('nav.about')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary-400 transition-colors">{t('nav.contact')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-primary-400 transition-colors">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-400 transition-colors">{t('footer.privacy')}</Link></li>
            </ul>
            <div className="mt-4 p-3.5 bg-gray-800 rounded-xl text-xs">
              <p className="text-gray-200 font-semibold mb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Support 24/7
              </p>
              <p><a href="tel:0673590224" className="hover:text-primary-400 transition-colors">0673590224</a></p>
              <p><a href="mailto:Kricar.services@gmail.com" className="hover:text-primary-400 transition-colors">Kricar.services@gmail.com</a></p>
              <p className="text-gray-400">Alger, Algérie</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-xs text-center">
          © {year} KriCar. {t('footer.rights')}.
        </div>
      </div>
    </footer>
  );
}
