// ── Upload zones ──────────────────────────────────────────────────────────────
(function () {
  // Map: zone element → FileList (accumulated)
  const zoneFiles = new WeakMap();

  function initUploadZone(zone) {
    const input    = zone.querySelector('.upload-zone__input');
    const previewContainer = zone.closest('.upload-zone-block')
                               ?.querySelector('.upload-zone__previews');
    if (!input) return;

    zoneFiles.set(zone, []);

    // Add dragover overlay element
    const dragMsg = document.createElement('div');
    dragMsg.className = 'upload-zone__dragover-msg';
    dragMsg.textContent = 'Drop files here';
    zone.appendChild(dragMsg);

    // Status line
    const status = document.createElement('p');
    status.className = 'upload-zone__status';
    zone.after(status);

    // Drag events
    zone.addEventListener('dragenter', (e) => { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-dragover');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      if (e.dataTransfer?.files?.length) addFiles(zone, input, previewContainer, status, e.dataTransfer.files);
    });

    // Native input change
    input.addEventListener('change', () => {
      if (input.files?.length) addFiles(zone, input, previewContainer, status, input.files);
    });
  }

  function addFiles(zone, input, container, status, newFiles) {
    const existing = zoneFiles.get(zone) || [];
    const combined = [...existing];

    Array.from(newFiles).forEach(file => {
      // Skip duplicates by name + size
      if (!combined.find(f => f.name === file.name && f.size === file.size)) {
        combined.push(file);
      }
    });

    zoneFiles.set(zone, combined);
    renderPreviews(zone, input, container, status, combined);
  }

  function renderPreviews(zone, input, container, status, files) {
    if (!container) return;
    container.innerHTML = '';

    files.forEach((file, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'upload-preview';

      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.alt = file.name;
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);
        wrap.appendChild(img);
      } else {
        const icon = document.createElement('div');
        icon.className = 'upload-preview__file-icon';
        const ext = file.name.split('.').pop().toUpperCase();
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${ext}</span>`;
        wrap.appendChild(icon);
      }

      const name = document.createElement('span');
      name.className = 'upload-preview__name';
      name.textContent = file.name;
      wrap.appendChild(name);

      const remove = document.createElement('button');
      remove.className = 'upload-preview__remove';
      remove.type = 'button';
      remove.innerHTML = '&times;';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => {
        const current = zoneFiles.get(zone) || [];
        const updated = current.filter((_, i) => i !== idx);
        zoneFiles.set(zone, updated);
        renderPreviews(zone, input, container, status, updated);
      });
      wrap.appendChild(remove);

      container.appendChild(wrap);
    });

    const count = files.length;
    status.textContent = count === 0 ? '' : `${count} file${count === 1 ? '' : 's'} selected`;

    // Sync a DataTransfer back to the input so the form carries the files
    try {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      input.files = dt.files;
    } catch (_) {
      // DataTransfer not supported — files still captured in zoneFiles map
    }
  }

  // Init all zones on page
  function initAll() {
    document.querySelectorAll('[data-upload-zone]').forEach(zone => initUploadZone(zone));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();

// ── Mood Board — vibe pills + upload zone ────────────────────────────────────
(function () {
  // Vibe pill selection
  document.querySelectorAll('[data-vibe-group]').forEach(group => {
    const hidden = document.getElementById('vibe-hidden');
    group.querySelectorAll('.mood-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.mood-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        if (hidden) hidden.value = pill.dataset.vibe;
      });
    });
  });

  // Mood upload drag & drop
  const zone = document.querySelector('[data-mood-zone]');
  if (zone) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-dragover'); });
    zone.addEventListener('dragleave', () => { zone.classList.remove('is-dragover'); });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      const input = zone.querySelector('.mood-upload__input');
      if (e.dataTransfer?.files?.length && input) {
        try { const dt = new DataTransfer(); Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f)); input.files = dt.files; } catch(_) {}
        renderMoodPreviews(input.files);
      }
    });
    const input = zone.querySelector('.mood-upload__input');
    if (input) input.addEventListener('change', () => renderMoodPreviews(input.files));
  }

  function renderMoodPreviews(files) {
    const container = document.getElementById('mood-previews');
    if (!container) return;
    container.innerHTML = '';
    Array.from(files).forEach((file, index) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'aspect-ratio:1;overflow:hidden;background:#1a1a1a;';
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        const reader = new FileReader();
        reader.onload = e => {
          img.src = e.target.result;
          if (index === 0) {
            const canvas = document.createElement('canvas');
            const tmp = new Image();
            tmp.onload = () => {
              const r = Math.min(900 / tmp.width, 700 / tmp.height, 1);
              canvas.width = Math.round(tmp.width * r);
              canvas.height = Math.round(tmp.height * r);
              canvas.getContext('2d').drawImage(tmp, 0, 0, canvas.width, canvas.height);
              try { sessionStorage.setItem('legacy_upload_preview', canvas.toDataURL('image/jpeg', 0.8)); } catch(_) {}
            };
            tmp.src = e.target.result;
          }
        };
        reader.readAsDataURL(file);
        wrap.appendChild(img);
      } else {
        wrap.style.cssText += 'display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(255,255,255,0.4);';
        wrap.textContent = file.name.split('.').pop().toUpperCase();
      }
      container.appendChild(wrap);
    });
  }
})();

// Mobile nav
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', siteNav.classList.contains('is-open'));
  });
}

// Cart count
function updateCartCount() {
  fetch('/cart.js')
    .then(r => r.json())
    .then(cart => {
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = cart.item_count > 0 ? `(${cart.item_count})` : '';
      });
    });
}
updateCartCount();

// Add to cart
document.querySelectorAll('.product-card__add').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const variantId = btn.dataset.variantId;
    if (!variantId) return;
    btn.textContent = 'Adding...';
    btn.disabled = true;
    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });
      btn.textContent = 'Added!';
      updateCartCount();
      setTimeout(() => { btn.textContent = 'Add'; btn.disabled = false; }, 1500);
    } catch {
      btn.textContent = 'Add';
      btn.disabled = false;
    }
  });
});
