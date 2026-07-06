const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/* Allowed upload types. The stored extension is derived from the MIME type (a
   whitelist), NEVER from the original filename — so an attacker can't upload
   `evil.svg`/`evil.html` and have it served back and executed on our origin.
   SVG is intentionally excluded (it can carry <script>). */
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const DOC_TYPES = { ...IMAGE_TYPES, 'application/pdf': 'pdf' };

/* Build a multer instance that writes safe filenames into `dir`. */
function makeUploader({ dir, allow = IMAGE_TYPES, maxMB = 8 }) {
  fs.mkdirSync(dir, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}.${allow[file.mimetype]}`),
  });
  const fileFilter = (req, file, cb) => {
    if (allow[file.mimetype]) return cb(null, true);
    cb(new Error('Type de fichier non autorisé (images ou PDF uniquement).'));
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

module.exports = { makeUploader, uploadErrorHandler, IMAGE_TYPES, DOC_TYPES };
