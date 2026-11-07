// Shared behaviour for every "Add to my setup" button on a page.
import { load, toggleCapability } from '../lib/setup-store';
import { auth, track } from '../integrations/index';
export function wireAddButtons() {
  const paint = () => {
    const have = new Set(load().capabilities);
    document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((b) => {
      const on = have.has(b.dataset.add!); b.setAttribute('aria-pressed', String(on));
      const s = b.querySelector('span'); if (s) s.textContent = on ? 'In my setup' : 'Add to my setup';
    });
  };
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-add]'); if (!b) return;
    const on = toggleCapability(b.dataset.add!); auth.persistAccountCopy(); paint();
    track(on ? 'capability_added' : 'capability_removed', { id: b.dataset.add });
  });
  paint(); window.addEventListener('setup:change', paint);
}
