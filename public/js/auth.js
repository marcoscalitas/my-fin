document.addEventListener('DOMContentLoaded', () => {
    const authError = document.getElementById('auth-error');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    async function api(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na requisição');
        return data;
    }

    function showError(msg) {
        authError.textContent = msg;
        authError.style.display = 'block';
    }

    // Se já está autenticado, redireciona para o dashboard
    fetch('/api/auth/me')
        .then(res => { if (res.ok) window.location.href = '/'; })
        .catch(() => {});

    // Login
    if (loginForm) {
        loginForm.onsubmit = async e => {
            e.preventDefault();
            authError.style.display = 'none';

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                await api('/api/auth/login', { email, password });
                window.location.href = '/';
            } catch (err) {
                showError(err.message);
            }
        };
    }

    // Register
    if (registerForm) {
        registerForm.onsubmit = async e => {
            e.preventDefault();
            authError.style.display = 'none';

            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            try {
                await api('/api/auth/register', { name, email, password });
                window.location.href = '/';
            } catch (err) {
                showError(err.message);
            }
        };
    }
});
