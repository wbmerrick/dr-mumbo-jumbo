// Shared helpers for photo / PDF attachments sent as base64 inside the JSON body.

const MAX_FILE_B64 = 4300000; // ~3.2 MB raw; Vercel's request limit is 4.5 MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function sanitizeFile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind === 'pdf' ? 'pdf' : raw.kind === 'image' ? 'image' : null;
  const mediaType = String(raw.media_type || '');
  const data = String(raw.data || '').replace(/\s+/g, '');
  if (!kind || !data) return null;
  if (kind === 'pdf' && mediaType !== 'application/pdf') return null;
  if (kind === 'image' && !IMAGE_TYPES.includes(mediaType)) return null;
  if (data.length > MAX_FILE_B64) {
    const err = new Error('file_too_big');
    err.code = 'file_too_big';
    throw err;
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) return null;
  return { kind, mediaType, data };
}

function fileBlock(file) {
  if (file.kind === 'pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: file.mediaType, data: file.data } };
}

module.exports = { sanitizeFile, fileBlock, MAX_FILE_B64, IMAGE_TYPES };
