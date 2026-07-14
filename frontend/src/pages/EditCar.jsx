import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { API_ORIGIN } from '../api';
import { useToast } from '../context/ToastContext';

const TYPES = ['sedan', 'suv', 'van', 'sport', '4x4', 'citadine', 'coupe', 'minivan'];
const FEATURES_LIST = ['Climatisation', 'GPS', 'Bluetooth', 'USB', 'Caméra recul', '4x4', 'Toit ouvrant', 'Cuir', 'Siège bébé'];
const mediaUrl = (p) => (p && p.startsWith('/') ? API_ORIGIN + p : p);
const isUploadedVideo = (v) => v && v.startsWith('/uploads/');

export default function EditCar() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [wilayas, setWilayas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);

  const [existingImages, setExistingImages] = useState([]); // kept previously-uploaded photos
  const [newImages, setNewImages] = useState([]);           // File[]
  const [newPreviews, setNewPreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  /* Document replacements (optional — only sent if a new file is chosen). */
  const [plateFile, setPlateFile] = useState(null);
  const [carteGriseFile, setCarteGriseFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [hasPlate, setHasPlate] = useState(false);
  const [hasCarteGrise, setHasCarteGrise] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);

  useEffect(() => { api.get('/wilayas').then(r => setWilayas(r.data)); }, []);

  useEffect(() => {
    api.get(`/cars/${id}`).then(r => {
      const c = r.data;
      setForm({
        title: c.title || '', brand: c.brand || '', model: c.model || '', year: c.year || new Date().getFullYear(),
        type: c.type || 'sedan', wilaya: c.wilaya || '', city: c.city || '',
        price_per_day: c.price_per_day ?? '', price_per_hour: c.price_per_hour ?? '', rent_mode: c.rent_mode || 'daily',
        description: c.description || '', seats: c.seats || 5, transmission: c.transmission || 'manual',
        fuel: c.fuel || 'essence', features: c.features || [], caution: c.caution ?? '',
        km_per_day: c.km_per_day ?? '', extra_km_price: c.extra_km_price ?? '', with_driver: !!c.with_driver,
        weekly_price: c.weekly_price ?? '', monthly_price: c.monthly_price ?? '',
        available: c.available !== false, video_url: isUploadedVideo(c.video_url) ? '' : (c.video_url || ''),
        registration_number: c.registration_number || '',
        unavailable_until: c.unavailable_until ? String(c.unavailable_until).slice(0, 10) : '',
        color: c.color || '',
      });
      setExistingImages(c.images || []);
      setCurrentVideo(c.video_url || null);
      setHasPlate(!!c.plate_image);
      setHasCarteGrise(!!c.carte_grise_image);
      setHasInsurance(!!c.insurance_image);
    }).catch(() => setError('Véhicule introuvable')).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleFeature = (f) => setForm(prev => ({
    ...prev,
    features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f],
  }));

  const addImages = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };
  const removeExisting = (url) => setExistingImages(imgs => imgs.filter(i => i !== url));
  const removeNew = (idx) => {
    setNewImages(imgs => imgs.filter((_, i) => i !== idx));
    setNewPreviews(ps => ps.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'features') v.forEach(feat => fd.append('features', feat));
        else fd.append(k, v);
      });
      fd.append('existing_images', JSON.stringify(existingImages));
      newImages.forEach(img => fd.append('images', img));
      if (videoFile) fd.append('video', videoFile);
      else if (removeVideo) fd.append('remove_video', 'true');
      if (plateFile) fd.append('plate_image', plateFile);
      if (carteGriseFile) fd.append('carte_grise_image', carteGriseFile);
      if (insuranceFile) fd.append('insurance_image', insuranceFile);
      await api.put(`/cars/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ type: 'success', message: 'Annonce mise à jour.' });
      navigate(`/cars/${id}`);
    } catch (err) {
      const msg = err.response?.data?.error || t('common.error');
      setError(msg); toast({ type: 'error', message: msg });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">Chargement…</div>;
  if (!form) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-500">{error || 'Véhicule introuvable'}</div>;

  const showVideo = currentVideo && !removeVideo && !videoFile;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/dashboard/owner" className="btn-ghost rtl:flex-row-reverse">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Retour
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gray-900">Modifier l'annonce</h1>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Informations de base</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre de l'annonce</label>
            <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Marque</label>
              <input className="input" required value={form.brand} onChange={e => set('brand', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Modèle</label>
              <input className="input" required value={form.model} onChange={e => set('model', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Année</label>
              <input type="number" className="input" required min={2000} max={2026} value={form.year} onChange={e => set('year', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t('home.type_label')}</label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {TYPES.map(tp => <option key={tp} value={tp}>{t(`types.${tp}`)}</option>)}
              </select></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.available} onChange={e => set('available', e.target.checked)} className="w-4 h-4" />
            Disponible à la location
          </label>
        </div>

        {/* Location & price */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Localisation & Tarif</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{t('home.wilaya_label')}</label>
              <select className="input" required value={form.wilaya} onChange={e => set('wilaya', e.target.value)}>
                <option value="">Choisir...</option>
                {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode de location</label>
            <select className="input" value={form.rent_mode} onChange={e => set('rent_mode', e.target.value)}>
              <option value="daily">À la journée</option>
              <option value="hourly">À l'heure</option>
              <option value="both">À la journée et à l'heure</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.rent_mode !== 'hourly' && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prix par jour (DA)</label>
                <input type="number" className="input" required min={1000} value={form.price_per_day} onChange={e => set('price_per_day', e.target.value)} /></div>
            )}
            {form.rent_mode !== 'daily' && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prix par heure (DA)</label>
                <input type="number" className="input" required min={100} value={form.price_per_hour} onChange={e => set('price_per_hour', e.target.value)} /></div>
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Caractéristiques</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Places</label>
              <input type="number" className="input" min={2} max={9} value={form.seats} onChange={e => set('seats', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Transmission</label>
              <select className="input" value={form.transmission} onChange={e => set('transmission', e.target.value)}>
                <option value="manual">{t('car.manual')}</option><option value="automatic">{t('car.automatic')}</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Carburant</label>
              <select className="input" value={form.fuel} onChange={e => set('fuel', e.target.value)}>
                <option value="essence">{t('car.essence')}</option><option value="diesel">{t('car.diesel')}</option><option value="electric">{t('car.electric')}</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur</label>
              <input className="input" placeholder="Ex: Noir, Blanc" value={form.color} onChange={e => set('color', e.target.value)} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('car.features')}</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES_LIST.map(f => (
                <button key={f} type="button" onClick={() => toggleFeature(f)}
                  className={`badge text-sm py-1.5 px-3 cursor-pointer transition-colors ${form.features.includes(f) ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        </div>

        {/* Rental terms + video */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Conditions & Vidéo</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Caution (DA)</label>
              <input type="number" min={0} className="input" value={form.caution} onChange={e => set('caution', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Conducteur</label>
              <select className="input" value={form.with_driver ? '1' : '0'} onChange={e => set('with_driver', e.target.value === '1')}>
                <option value="0">{t('car.without_driver')}</option><option value="1">{t('car.with_driver')}</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Km inclus / jour</label>
              <input type="number" min={0} className="input" value={form.km_per_day} onChange={e => set('km_per_day', e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prix km supp. (DA)</label>
              <input type="number" min={0} className="input" value={form.extra_km_price} onChange={e => set('extra_km_price', e.target.value)} /></div>
          </div>

          {/* Video management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vidéo du véhicule</label>
            {showVideo ? (
              <div className="flex items-center gap-3 mb-2">
                {isUploadedVideo(currentVideo)
                  ? <video src={mediaUrl(currentVideo)} className="w-40 h-24 object-cover rounded-lg bg-gray-100" controls preload="metadata" />
                  : <span className="text-sm text-gray-500 truncate">Lien : {currentVideo}</span>}
                <button type="button" onClick={() => setRemoveVideo(true)} className="text-xs text-red-600 hover:underline">Supprimer</button>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors mb-2">
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={e => setVideoFile(e.target.files[0] || null)} />
                {videoFile ? <span className="text-sm text-primary-700 font-medium">🎬 {videoFile.name}</span>
                  : <span className="text-sm text-gray-500">Téléverser une vidéo (mp4/mov, max 60 Mo)</span>}
              </label>
            )}
            {!showVideo && (
              <input type="url" className="input" placeholder="Ou un lien YouTube : https://youtube.com/watch?v=..." value={form.video_url} onChange={e => set('video_url', e.target.value)} />
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Photos</h2>
          {(existingImages.length > 0 || newPreviews.length > 0) && (
            <div className="grid grid-cols-4 gap-2">
              {existingImages.map((img) => (
                <div key={img} className="relative group">
                  <img src={mediaUrl(img)} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button type="button" onClick={() => removeExisting(img)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-red-600">✕</button>
                </div>
              ))}
              {newPreviews.map((p, i) => (
                <div key={i} className="relative group">
                  <img src={p} alt="" className="w-full h-20 object-cover rounded-lg ring-2 ring-pine-400" />
                  <button type="button" onClick={() => removeNew(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-red-600">✕</button>
                </div>
              ))}
            </div>
          )}
          <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
            <p className="text-sm text-gray-500">Cliquez pour ajouter des photos</p>
          </label>
          <p className="text-xs text-gray-400">Cliquez sur ✕ pour supprimer une photo. Les nouvelles photos ont un contour vert.</p>
        </div>

        {/* Documents & availability */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Documents & disponibilité</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro d'immatriculation</label>
            <input className="input" placeholder="Ex: 12345-116-16" value={form.registration_number} onChange={e => set('registration_number', e.target.value)} />
          </div>
          {[
            { label: 'Photo de la plaque', file: plateFile, set: setPlateFile, has: hasPlate, accept: 'image/*' },
            { label: 'Carte grise (privée)', file: carteGriseFile, set: setCarteGriseFile, has: hasCarteGrise, accept: 'image/*,application/pdf' },
            { label: 'Assurance (privée)', file: insuranceFile, set: setInsuranceFile, has: hasInsurance, accept: 'image/*,application/pdf' },
          ].map((d) => (
            <div key={d.label}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {d.label} {d.has && !d.file && <span className="text-xs text-pine-600 font-normal">✓ déjà fourni</span>}
              </label>
              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
                <input type="file" accept={d.accept} className="hidden" onChange={e => d.set(e.target.files[0] || null)} />
                {d.file
                  ? <span className="text-sm text-primary-700 font-medium">📎 {d.file.name}</span>
                  : <span className="text-sm text-gray-500">{d.has ? 'Remplacer (optionnel)' : 'Téléverser (image ou PDF)'}</span>}
              </label>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Indisponible jusqu'au <span className="text-gray-400 font-normal">— optionnel</span></label>
            <input type="date" className="input" value={form.unavailable_until} onChange={e => set('unavailable_until', e.target.value)} />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
        <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base">
          {saving ? t('common.loading') : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
