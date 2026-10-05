// Site-authored identity is presentation only; it never supplies runtime state.
export function applySiteIdentity(site, doc = globalThis.document) {
  if (!site.identity?.title) return;
  doc.title = site.identity.title;
  doc.querySelector('#app')?.setAttribute('aria-label', site.identity.title);
  let apple = doc.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!apple) {
    apple = doc.createElement('meta'); apple.name = 'apple-mobile-web-app-title';
    doc.head.append(apple);
  }
  apple.content = site.identity.title;
  const brand = doc.querySelector('.brand-icon');
  if (brand && site.identity.icon) {
    const mark = doc.createElement('img'); mark.src = site.identity.icon;
    mark.width = 24; mark.height = 24; mark.alt = '';
    brand.replaceChildren(mark);
  }
  for (const [selector, path] of [
    ['link[rel="icon"]', site.identity.icon],
    ['link[rel="apple-touch-icon"]', site.identity.apple_touch_icon],
  ]) {
    if (path) doc.querySelector(selector)?.setAttribute('href', path);
  }
}
