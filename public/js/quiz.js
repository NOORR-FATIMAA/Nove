// Shade & Size Finder — a short client-side quiz that builds a products.html
// query string from the answers. No backend involved.

function initQuiz() {
  const trigger = document.getElementById('quizTrigger');
  const overlay = document.getElementById('quizModal');
  const closeBtn = document.getElementById('quizCloseBtn');
  const form = document.getElementById('quizForm');
  if (!trigger || !overlay || !form) return;

  function handleKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal() {
    overlay.classList.add('open');
    document.addEventListener('keydown', handleKeydown);
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.removeEventListener('keydown', handleKeydown);
    trigger.focus();
  }

  trigger.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = form.quizType.value;
    const search = form.quizVibe.value;
    const inStock = form.quizStock.value;
    const budget = form.quizBudget.value;

    const params = { type, search, inStock };

    if (budget) {
      const [min, max] = budget.split('-');
      if (min) params.minPrice = min;
      if (max) params.maxPrice = max;
    }

    window.location.href = `/products.html${qs(params)}`;
  });
}

document.addEventListener('DOMContentLoaded', initQuiz);
