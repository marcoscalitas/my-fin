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

    function hideError() {
        authError.style.display = 'none';
    }

    // Se já está autenticado, redireciona para o dashboard
    fetch('/api/auth/me')
        .then(res => { if (res.ok) window.location.href = '/'; })
        .catch(() => {});

    const validatorConfig = {
        errorFieldCssClass: 'is-invalid',
        errorLabelCssClass: 'invalid-feedback',
        focusInvalidField: true,
        lockForm: true,
    };

    // Login
    if (loginForm) {
        const validator = new JustValidate('#login-form', validatorConfig);

        validator
            .addField('#login-email', [
                { rule: 'required', errorMessage: 'Email é obrigatório.' },
                { rule: 'email', errorMessage: 'Digite um email válido.' },
            ])
            .addField('#login-password', [
                { rule: 'required', errorMessage: 'Senha é obrigatória.' },
                { rule: 'minLength', value: 1, errorMessage: 'Senha é obrigatória.' },
            ])
            .onSuccess(async () => {
                hideError();

                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;

                try {
                    await api('/api/auth/login', { email, password });
                    window.location.href = '/';
                } catch (err) {
                    showError(err.message);
                }
            });
    }

    // Register
    if (registerForm) {
        const validator = new JustValidate('#register-form', validatorConfig);

        validator
            .addField('#reg-name', [
                { rule: 'required', errorMessage: 'Nome é obrigatório.' },
                { rule: 'minLength', value: 2, errorMessage: 'Nome deve ter pelo menos 2 caracteres.' },
                { rule: 'maxLength', value: 100, errorMessage: 'Nome deve ter no máximo 100 caracteres.' },
            ])
            .addField('#reg-email', [
                { rule: 'required', errorMessage: 'Email é obrigatório.' },
                { rule: 'email', errorMessage: 'Digite um email válido.' },
            ])
            .addField('#reg-password', [
                { rule: 'required', errorMessage: 'Senha é obrigatória.' },
                { rule: 'minLength', value: 8, errorMessage: 'Mínimo de 8 caracteres.' },
                { rule: 'customRegexp', value: /[A-Z]/, errorMessage: 'Deve conter pelo menos uma letra maiúscula.' },
                { rule: 'customRegexp', value: /[a-z]/, errorMessage: 'Deve conter pelo menos uma letra minúscula.' },
                { rule: 'customRegexp', value: /[0-9]/, errorMessage: 'Deve conter pelo menos um número.' },
                { rule: 'customRegexp', value: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, errorMessage: 'Deve conter pelo menos um caractere especial (!@#$%...).' },
            ])
            .onSuccess(async () => {
                hideError();

                const name = document.getElementById('reg-name').value.trim();
                const email = document.getElementById('reg-email').value.trim();
                const password = document.getElementById('reg-password').value;

                try {
                    await api('/api/auth/register', { name, email, password });
                    window.location.href = '/';
                } catch (err) {
                    showError(err.message);
                }
            });
    }
});
