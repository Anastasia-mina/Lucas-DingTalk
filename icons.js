/* 署名 Lucas · 禁止二改、二传及商用。 */
const paths = {
    message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5H4l-2 2v-9a9 9 0 1 1 19-1.5Z"/><path d="M7 10h10M7 14h6"/>',
    contacts: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17v-1a4 4 0 0 1 8 0v1M2 7h3M2 12h3M2 17h3"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 3h12l4 4v14H4Z"/><path d="M15 3v5h5M8 12h8M8 16h6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    settings: '<path d="m9 3-1 3-3 1 1 4-1 4 3 1 1 3h6l1-3 3-1-1-4 1-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    moon: '<path d="M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
    back: '<path d="m14 5-7 7 7 7"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    link: '<path d="m9 15 6-6M7 14l-2 2a3.5 3.5 0 0 0 5 5l4-4M10 7l4-4a3.5 3.5 0 0 1 5 5l-2 2"/>',
    history: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7M12 7v6l4 2"/>',
    pin: '<path d="m8 3 8 0-1 6 3 3v2H6v-2l3-3ZM12 14v7"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M8 8h.01M16 8h.01"/>',
    folder: '<path d="M3 6h7l2 2h9v12H3Z"/>',
    lightning: '<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
};
export function icon(name) { return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.apps}</svg>`; }
export const logo = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#1687ff"/><path d="m9 11 22 5-10 6 5 2-12 10 3-10-6-2 9-4-11-4Z" fill="white"/></svg>';
