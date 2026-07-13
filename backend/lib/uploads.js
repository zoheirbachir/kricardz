const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/* Allowed upload types. The stored extension is derived from the MIME type (a
   whitelist), NEVER from the original filename — so an attacker can't upload
   `evil.svg`/`evil.html` and have it served back and executed on our origin.
   SVG is intentionally excluded (it can carry <script>). */
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const DOC_TYPES = { ...IMAGE_TYPES, 'application/pdf': 'pdf' };
const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
/* Car media: photos on the `images` field, one clip on the `video` field. */
const MEDIA_TYPES = { ...IMAGE_TYPES, ...VIDEO_TYPES };

/* Fields that hold a private document (image or PDF) rather than a listing photo. */
const DOC_FIELDS = ['carte_grise_image', 'insurance_image'];
/* Fields that must be a plain image (a photo, not a video/pdf). */
const IMAGE_FIELDS = ['images', 'plate_image'];

/* Build a multer instance that writes safe filenames into `dir`.
   Pass `dirFor(file)` to route different fields to different folders (e.g. public
   listing photos vs a private car-documents folder) within one multipart request. */
function makeUploader({ dir, dirFor, allow = IMAGE_TYPES, maxMB = 8 }) {
  if (dir) fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const d = dirFor ? dirFor(file) : dir;
      try { fs.mkdirSync(d, { recursive: true }); } catch { /* ignore */ }
      cb(null, d);
    },
    filename: (req, file, cb) => cb(null, `${uuidv4()}.${allow[file.mimetype]}`),
  });
  const fileFilter = (req, file, cb) => {
    /* A file is valid only if its MIME type is allowed AND it lands on the right
       field (a video can't be smuggled in as a photo, or vice-versa). */
    const ext = allow[file.mimetype];
    if (!ext) return cb(new Error('Type de fichier non autorisé.'));
    if ((file.fieldname === 'video' || file.fieldname === 'checkin_video' || file.fieldname === 'checkout_video')
        && !VIDEO_TYPES[file.mimetype]) return cb(new Error('La vidéo doit être un fichier mp4/mov/webm.'));
    if (IMAGE_FIELDS.includes(file.fieldname) && !IMAGE_TYPES[file.mimetype]) return cb(new Error('Les photos doivent être des images (jpg, png, webp).'));
    if (DOC_FIELDS.includes(file.fieldname) && !DOC_TYPES[file.mimetype]) return cb(new Error('Le document doit être une image ou un PDF.'));
    cb(null, true);
  };
  return multer({ storage, fileFilter, limits: { fileSize: maxMB * 1024 * 1024 } });
}

/* Express error handler for multer/file-filter rejections → clean 400 instead of a 500. */
function uploadErrorHandler(err, req, res, next) {
  if (err && (err instanceof multer.MulterError || /fichier non autorisé/.test(err.message))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

/* Car upload accepts photos/videos plus PDF documents (carte grise / insurance). */
const CAR_UPLOAD_TYPES = { ...MEDIA_TYPES, 'application/pdf': 'pdf' };

module.exports = { makeUploader, uploadErrorHandler, IMAGE_TYPES, DOC_TYPES, VIDEO_TYPES, MEDIA_TYPES, CAR_UPLOAD_TYPES, DOC_FIELDS, IMAGE_FIELDS };
