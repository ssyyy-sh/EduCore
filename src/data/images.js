import { OWN_PHOTOS } from '../config.js';

// Editorial photography. By default the photos come from Unsplash.
// To use your own: put the files into public/images/ and list them in OWN_PHOTOS (src/config.js).
const u = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const STOCK = {
  studentsLaptops: u('photo-1522202176988-66273c2fd55f'),
  classroom: u('photo-1509062522246-3755977927d7'),
  studyHome: u('photo-1588072432836-e10032774350', 1400),
  campus: u('photo-1541339907198-e08756dedf3f'),
  library: u('photo-1427504494785-3a9ca7044f45', 1400),
  studentLaptop: u('photo-1571260899304-425eee4c7efc', 1400),
};

const own = (file) => `${import.meta.env.BASE_URL}images/${file}`;

/** Each value is a list of sources: your own photo first (if set), the stock photo as a fallback. */
export const IMAGES = Object.fromEntries(Object.entries(STOCK).map(([key, url]) => [key, OWN_PHOTOS[key] ? [own(OWN_PHOTOS[key]), url] : [url]]));
