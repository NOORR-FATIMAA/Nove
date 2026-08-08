document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const alertEl = document.getElementById('formAlert');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await api.post('/auth/admin-login', {
        email: form.email.value.trim(),
        password: form.password.value,
      });
      if (res.data.role !== 'admin') {
        throw new Error('You do not have permission to access the admin panel.');
      }
      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      showAlert(alertEl, err.message);
      submitBtn.disabled = false;
    }
  });
});
