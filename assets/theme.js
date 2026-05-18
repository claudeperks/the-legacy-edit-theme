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
