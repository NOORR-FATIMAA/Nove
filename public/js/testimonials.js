// Homepage "Loved by Our Customers" strip — top-rated reviews pulled from
// across all products via GET /api/reviews/featured.

function renderTestimonialCard(review) {
  const name = review.user ? review.user.name : 'Nove Customer';
  const productName = review.product ? review.product.name : '';

  return `
    <div class="testimonial-card reveal">
      <span class="stars">${starsHtml(review.rating)}</span>
      <p class="testimonial-quote">&ldquo;${escapeHtml(review.comment)}&rdquo;</p>
      <div class="testimonial-author">
        <span class="testimonial-name">${escapeHtml(name)}</span>
        ${productName ? `<span class="testimonial-product">${escapeHtml(productName)}</span>` : ''}
      </div>
    </div>
  `;
}

async function initTestimonials() {
  const row = document.getElementById('testimonialRow');
  const section = document.getElementById('testimonialsSection');
  if (!row) return;

  try {
    const res = await api.get('/reviews/featured');
    if (res.data.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = 'block';
    row.innerHTML = res.data.map(renderTestimonialCard).join('');
    if (window.NoveAnimations) window.NoveAnimations.observeReveal(row);
  } catch (err) {
    if (section) section.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', initTestimonials);
