/* 署名 Lucas · 禁止二改、二传及商用。 */
export const MODES = ['time', 'system', 'light', 'dark'];
export const defaults = { enabled: true, mode: 'time', day: '07:00', night: '19:00', pinned: [] };
export function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)); }
export function resolveMode(settings, date = new Date(), systemDark = false) {
    if (settings.mode === 'light' || settings.mode === 'dark') return settings.mode;
    if (settings.mode === 'system') return systemDark ? 'dark' : 'light';
    const minutes = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
    const day = minutes(validTime(settings.day) ? settings.day : defaults.day);
    const night = minutes(validTime(settings.night) ? settings.night : defaults.night);
    const now = date.getHours() * 60 + date.getMinutes();
    const light = day < night ? now >= day && now < night : now >= day || now < night;
    return light ? 'light' : 'dark';
}
export function normalize(input = {}) {
    const result = { ...defaults, ...input };
    if (!MODES.includes(result.mode)) result.mode = defaults.mode;
    if (!validTime(result.day)) result.day = defaults.day;
    if (!validTime(result.night) || result.day === result.night) { result.day = defaults.day; result.night = defaults.night; }
    result.pinned = Array.isArray(result.pinned) ? result.pinned.filter(x => typeof x === 'string') : [];
    result.enabled = result.enabled !== false;
    return result;
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const preview = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
