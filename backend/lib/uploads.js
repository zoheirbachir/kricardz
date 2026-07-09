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

/* Build a multer instance that writes safe filenames into `dir`. */
function makeUploader({ dir, allow = IMAGE_TYPES, maxMB = 8 }) {
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}.${allow[file.mimetype]}`),
  });
  const fileFilter = (req, file, cb) => {
    /* A file is valid only if its MIME type is allowed AND it lands on the right
       field (a video can't be smuggled in as a photo, or vice-versa). */
    const ext = allow[file.mimetype];
    if (!ext) return cb(new Error('Type de fichier non autorisé.'));
    if (file.fieldname === 'video' && !VIDEO_TYPES[file.mimetype]) return cb(new Error('La vidéo doit être un fichier mp4/mov/webm.'));
    if (file.fieldname === 'images' && !IMAGE_TYPES[file.mimetype]) return cb(new Error('Les photos doivent être des images (jpg, png, webp).'));
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

module.exports = { makeUploader, uploadErrorHandler, IMAGE_TYPES, DOC_TYPES, VIDEO_TYPES, MEDIA_TYPES };
