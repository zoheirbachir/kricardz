import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useToast } from '../context/ToastContext';

const TYPES = ['sedan','suv','van','sport','4x4'];
const FEATURES_LIST = ['Climatisation','GPS','Bluetooth','USB','Caméra recul','4x4','Toit ouvrant','Cuir','Siège bébé'];

export default function AddCar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [wilayas, setWilayas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', brand: '', model: '', year: new Date().getFullYear(), type: 'sedan',
    wilaya: '', city: '', price_per_day: '', description: '',
    seats: 5, transmission: 'manual', fuel: 'essence', features: [],
    caution: '', km_per_day: '', extra_km_price: '', with_driver: false,
    weekly_price: '', monthly_price: '', video_url: '',
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => { api.get('/wilayas').then(r => setWilayas(r.data)); }, []);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));
  const toggleFeature = (f) => setForm(prev => ({
    ...prev,
    features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
  }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'features') v.forEach(feat => fd.append('features', feat));
        else fd.append(k, v);
      });
      images.forEach(img => fd.append('images', img));
      const res = await api.post('/cars', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ type: 'success', message: 'Annonce publiée avec succès !' });
      navigate(`/cars/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.error || t('common.error');
      setError(msg);
      toast({ type: 'error', message: msg });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dashboard/owner" className="btn-ghost rtl:flex-row-reverse">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Retour
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900">Publier une annonce</h1>
      </div>

      <form onSubmit={handle} className="space-y-5">
        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Informations de base</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre de l'annonce</label>
            <input className="input" required placeholder="Ex: Renault Logan 2022 — Alger" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Marque</label>
              <input className="input" required placeholder="Renault" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modèle</label>
              <input className="input" required placeholder="Logan" value={form.model} onChange={e => set('model', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Année</label>
              <input type="number" className="input" required min={2000} max={2026} value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('home.type_label')}</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(tp => <option key={tp} value={tp}>{t(`types.${tp}`)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Location & price */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Localisation & Tarif</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('home.wilaya_label')}</label>
              <select className="input" required value={form.wilaya} onChange={e => set('wilaya', e.target.value)}>
                <option value="">Choisir...</option>
                {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
              <input className="input" placeholder="Hydra" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix par jour (DA)</label>
            <input type="number" className="input" required min={1000} placeholder="Ex: 5000" value={form.price_per_day} onChange={e => set('price_per_day', e.target.value)} />
          </div>
        </div>

        {/* Specs */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Caractéristiques</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Places</label>
              <input type="number" className="input" min={2} max={9} value={form.seats} onChange={e => set('seats', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Transmission</label>
              <select className="input" value={form.transmission} onChange={e => set('transmission', e.target.value)}>
                <option value="manual">{t('car.manual')}</option>
                <option value="automatic">{t('car.automatic')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Carburant</label>
              <select className="input" value={form.fuel} onChange={e => set('fuel', e.target.value)}>
                <option value="essence">{t('car.essence')}</option>
                <option value="diesel">{t('car.diesel')}</option>
                <option value="electric">{t('car.electric')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('car.features')}</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES_LIST.map(f => (
                <button key={f} type="button" onClick={() => toggleFeature(f)}
                  className={`badge text-sm py-1.5 px-3 cursor-pointer transition-colors ${form.features.includes(f) ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>
                  {form.features.includes(f) && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Décrivez votre véhicule..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        {/* Rental terms */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Conditions de location</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Caution (DA)</label>
              <input type="number" min={0} className="input" placeholder="Ex: 20000" value={form.caution} onChange={e => set('caution', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conducteur</label>
              <select className="input" value={form.with_driver ? '1' : '0'} onChange={e => set('with_driver', e.target.value === '1')}>
                <option value="0">{t('car.without_driver')}</option>
                <option value="1">{t('car.with_driver')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Km inclus / jour</label>
              <input type="number" min={0} className="input" placeholder="Ex: 200" value={form.km_per_day} onChange={e => set('km_per_day', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix km supp. (DA)</label>
              <input type="number" min={0} className="input" placeholder="Ex: 20" value={form.extra_km_price} onChange={e => set('extra_km_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tarif / semaine (DA) <span className="text-gray-400 font-normal">— optionnel</span></label>
              <input type="number" min={0} className="input" placeholder="Ex: 50000" value={form.weekly_price} onChange={e => set('weekly_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tarif / mois (DA) <span className="text-gray-400 font-normal">— optionnel</span></label>
              <input type="number" min={0} className="input" placeholder="Ex: 160000" value={form.monthly_price} onChange={e => set('monthly_price', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lien vidéo (YouTube ou mp4) <span className="text-gray-400 font-normal">— optionnel</span></label>
            <input type="url" className="input" placeholder="https://youtube.com/watch?v=..." value={form.video_url} onChange={e => set('video_url', e.target.value)} />
          </div>
        </div>

        {/* Photos */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Photos</h2>
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-sm text-gray-500">Cliquez pour ajouter des photos (max 8)</p>
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((p, i) => (
                <img key={i} src={p} alt="" className="w-full h-20 object-cover rounded-lg" />
              ))}
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? t('common.loading') : 'Publier l\'annonce'}
        </button>
      </form>
    </div>
  );
}
