// Handles login, signup, forgot/reset password, and email verification pages.

function getGuestCartForMerge() {
  return getGuestCart().map((i) => ({ productId: i.productId, quantity: i.quantity }));
}

async function mergeGuestCartAfterAuth() {
  const items = getGuestCartForMerge();
  if (items.length === 0) return;
  try {
    await api.post('/cart/merge', { items });
    clearGuestCart();
  } catch (err) {
    // non-fatal
  }
}

function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  window.location.href = redirect ? decodeURIComponent(redirect) : '/index.html';
}

function wireLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await api.post('/auth/login', {
        email: form.email.value.trim(),
        password: form.password.value,
      });
      await mergeGuestCartAfterAuth();
      redirectAfterAuth();
    } catch (err) {
      showAlert(alertEl, err.message);
      submitBtn.disabled = false;
    }
  });
}

function wireSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  const alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    if (form.password.value !== form.confirmPassword.value) {
      showAlert(alertEl, 'Passwords do not match.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await api.post('/auth/register', {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        phone: form.phone ? form.phone.value.trim() : '',
      });
      await mergeGuestCartAfterAuth();
      redirectAfterAuth();
    } catch (err) {
      showAlert(alertEl, err.message);
      submitBtn.disabled = false;
    }
  });
}

function wireForgotForm() {
  const form = document.getElementById('forgotForm');
  if (!form) return;
  const alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await api.post('/auth/forgot-password', { email: form.email.value.trim() });
      showAlert(alertEl, res.message, 'success');
      form.reset();
    } catch (err) {
      showAlert(alertEl, err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function wireResetForm() {
  const form = document.getElementById('resetForm');
  if (!form) return;
  const alertEl = document.getElementById('formAlert');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    showAlert(alertEl, 'Missing or invalid reset link.');
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    if (form.password.value !== form.confirmPassword.value) {
      showAlert(alertEl, 'Passwords do not match.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await api.patch(`/auth/reset-password/${token}`, { password: form.password.value });
      showAlert(alertEl, 'Password reset! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1200);
    } catch (err) {
      showAlert(alertEl, err.message);
      submitBtn.disabled = false;
    }
  });
}

async function runVerifyEmail() {
  const container = document.getElementById('verifyStatus');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    container.textContent = 'Missing or invalid verification link.';
    return;
  }

  try {
    const res = await api.get(`/auth/verify-email/${token}`);
    container.textContent = res.message || 'Email verified successfully!';
  } catch (err) {
    container.textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  wireLoginForm();
  wireSignupForm();
  wireForgotForm();
  wireResetForm();
  runVerifyEmail();
});
