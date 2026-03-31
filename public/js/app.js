document.addEventListener('DOMContentLoaded', () => {
    // === Helpers ===
    const getById = id => document.getElementById(id);
    const formatCurrency = value => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const percentOf = (value, total) => {
        if (total <= 0) return '-';
        const percent = (value / total * 100);
        return percent % 1 === 0 ? `${percent.toFixed(0)}%` : `${percent.toFixed(2)}%`;
    };

    async function api(url, options = {}) {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na requisição');
        return data;
    }

    // === Elements ===
    const salarioInput = getById('salario');
    const descInput = getById('descricao');
    const valorInput = getById('valor');
    const tabela = getById('tabela');
    const resumo = getById('resumo');
    const btn = getById('btn-adicionar');
    const userGreeting = getById('user-greeting');
    const btnLogout = getById('btn-logout');
    const btnProfile = getById('btn-profile');
    const profileModal = getById('profile-modal');
    const modalClose = getById('modal-close');
    const profileMsg = getById('profile-msg');

    const validationRules = {
        salario: [
            { test: v => v.trim() !== '', message: 'Salário é obrigatório.' },
            { test: v => !isNaN(parseFloat(v)), message: 'Salário deve ser numérico.' },
            { test: v => parseFloat(v) >= 0, message: 'Salário não pode ser negativo.' }
        ],
        descricao: [
            { test: v => v.trim() !== '', message: 'Descrição é obrigatória.' }
        ],
        valor: [
            { test: v => !isNaN(parseFloat(v)), message: 'Valor numérico obrigatório.' },
            { test: v => parseFloat(v) >= 0, message: 'O valor não pode ser menor que 0.' }
        ]
    };

    // === State ===
    let despesas = [];
    let settings = { salario: 0, custom_reserva: null, custom_reserva_label: 'Reserva', custom_resto_label: 'Resto' };
    let editId = null;

    // === Validation Helpers ===
    function showError(field, message) {
        clearErrors(field);
        field.style.borderColor = 'red';
        const div = document.createElement('div');
        div.className = 'error-msg';
        div.style = 'color:red; font-size:0.9em; margin-top:4px';
        div.textContent = message;
        field.insertAdjacentElement('afterend', div);
    }

    function clearErrors(field) {
        const next = field.nextElementSibling;
        if (next && next.classList.contains('error-msg')) next.remove();
        field.style.borderColor = '';
    }

    function validateField(field, rules) {
        clearErrors(field);
        for (const { test, message } of rules) {
            if (!test(field.value)) {
                showError(field, message);
                return false;
            }
        }
        return true;
    }

    // === Logout ===
    btnLogout.onclick = async () => {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    };

    // === Load Data ===
    async function loadApp(user) {
        userGreeting.textContent = `Olá, ${user.name}`;

        const [despData, setData] = await Promise.all([
            api('/api/despesas'),
            api('/api/settings'),
        ]);

        despesas = despData.despesas;
        settings = setData.settings;
        salarioInput.value = Number(settings.salario).toFixed(2);
        render();
    }

    // === Save Settings (debounced) ===
    let saveTimer = null;
    function saveSettings() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            const salario = parseFloat(salarioInput.value) || 0;
            await api('/api/settings', {
                method: 'PUT',
                body: {
                    salario,
                    custom_reserva: settings.custom_reserva,
                    custom_reserva_label: settings.custom_reserva_label,
                    custom_resto_label: settings.custom_resto_label,
                },
            });
        }, 500);
    }

    // === Render Table ===
    function render() {
        tabela.innerHTML = '';
        resumo.innerHTML = '';

        const salario = parseFloat(salarioInput.value) || 0;
        const dizimo = salario * 0.1;

        const allDespesas = [{ id: null, descricao: 'Dízimo', valor: dizimo }, ...despesas];

        const total = allDespesas.reduce((sum, d) => sum + Number(d.valor), 0);
        const reserva = settings.custom_reserva != null ? Number(settings.custom_reserva) : (salario * 0.5);
        const resto = salario - total - reserva;

        allDespesas.forEach((d, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${d.descricao}</td>
                <td class="num">${formatCurrency(d.valor)}</td>
                <td class="num">${percentOf(Number(d.valor), salario)}</td>
                <td class="action">
                    <div class="actions">
                        ${d.id != null ? `
                            <button class="edit" data-id="${d.id}"><i class="bi bi-pencil"></i></button>
                            <button class="delete" data-id="${d.id}"><i class="bi bi-trash"></i></button>
                        ` : ''}
                    </div>
                </td>`;
            tabela.appendChild(tr);
        });

        const customReservaLabel = settings.custom_reserva_label || 'Reserva';
        const customRestoLabel = settings.custom_resto_label || 'Resto';

        [
            ['Salário Total', salario],
            ['Total de Despesas', total],
            [customReservaLabel, reserva, 'reserva'],
            [customRestoLabel, resto, 'resto']
        ].forEach(([label, value, type]) => {
            const isReserva = type === 'reserva';
            const isResto = type === 'resto';
            const tr = document.createElement('tr');
            tr.classList.add('highlight');
            tr.innerHTML = `
                <td>*</td>
                <td>
                    <span class="editable-label" id="label-${type || ''}">${label}</span>
                </td>
                <td class="num ${isResto ? (value >= 0 ? 'positivo' : 'negativo') : ''}" ${isReserva ? 'id="cell-reserva"' : ''}>
                    ${formatCurrency(value)}
                </td>
                <td class="num">${percentOf(value, salario)}</td>
                <td class="action">
                    <div class="actions vertical">
                        ${(isReserva) ? `
                            <div class="btn-group value-group">
                                <button id="edit-reserva-completo" class="edit" title="Editar reserva"><i class="bi bi-pencil"></i></button>
                                <button id="save-reserva-completo" class="save" style="display:none" title="Salvar"><i class="bi bi-check-lg"></i></button>
                            </div>
                        ` : ''}
                        ${(isResto) ? `
                            <div class="btn-group label-group">
                                <button class="edit-label custom-label-btn" data-type="${type}" title="Editar texto">
                                    <i class="bi bi-type"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </td>`;
            resumo.appendChild(tr);
        });

        bindReservaEvents();
        bindLabelEditEvents();
    }

    function bindReservaEvents() {
        const editBtn = getById('edit-reserva-completo');
        const saveBtn = getById('save-reserva-completo');
        if (!editBtn || !saveBtn) return;

        editBtn.onclick = () => {
            const base = parseFloat(salarioInput.value) || 0;
            const valorAtual = settings.custom_reserva != null ? Number(settings.custom_reserva) : (base * 0.5);
            const cell = getById('cell-reserva');
            const labelSpan = getById('label-reserva');
            const labelAtual = labelSpan.textContent.trim();

            cell.innerHTML = `<input id="input-reserva" type="number" min="0" value="${valorAtual.toFixed(2)}" style="width:100%;box-sizing:border-box;">`;
            labelSpan.innerHTML = `<input type="text" id="input-label-reserva" value="${labelAtual}" style="width:80%">`;

            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';

            const inputValor = getById('input-reserva');
            const inputLabel = getById('input-label-reserva');

            inputValor.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
            inputLabel.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });
        };

        saveBtn.onclick = () => {
            const inputValor = getById('input-reserva');
            const inputLabel = getById('input-label-reserva');

            if (!validateField(inputValor, [
                { test: v => !isNaN(parseFloat(v)), message: 'Reserva deve ser numérica.' },
                { test: v => parseFloat(v) >= 0, message: 'Reserva não pode ser negativa.' }
            ])) return;

            settings.custom_reserva = parseFloat(inputValor.value);
            settings.custom_reserva_label = inputLabel.value.trim() || 'Reserva';

            saveSettings();
            render();
        };
    }

    function bindLabelEditEvents() {
        resumo.querySelectorAll('.edit-label').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const span = resumo.querySelector(`#label-${type}`);
                const current = span.textContent.trim();
                span.innerHTML = `<input type="text" id="input-label-${type}" value="${current}" style="width:80%">`;

                const input = resumo.querySelector(`#input-label-${type}`);
                input.focus();
                btn.style.display = 'none';

                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-label';
                saveBtn.style.backgroundColor = '#28a745';
                saveBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                saveBtn.title = 'Salvar legenda';

                const group = btn.closest('.label-group');
                group.appendChild(saveBtn);

                const finishEdit = () => {
                    saveLabel(type, input.value);
                    saveBtn.remove();
                    btn.style.display = 'inline-flex';
                };

                input.onblur = finishEdit;
                input.onkeydown = e => { if (e.key === 'Enter') finishEdit(); };
                saveBtn.onclick = finishEdit;
            };
        });
    }

    function saveLabel(type, value) {
        if (type === 'reserva') {
            settings.custom_reserva_label = value.trim() || 'Reserva';
        } else if (type === 'resto') {
            settings.custom_resto_label = value.trim() || 'Resto';
        }
        saveSettings();
        render();
    }

    // === Add/Edit Despesa ===
    btn.onclick = async () => {
        const validSalario = validateField(salarioInput, validationRules.salario);
        const validDesc = validateField(descInput, validationRules.descricao);
        const validValor = validateField(valorInput, validationRules.valor);
        if (!validSalario || !validDesc || !validValor) return;

        const item = {
            descricao: descInput.value.trim(),
            valor: parseFloat(valorInput.value),
        };

        try {
            if (editId !== null) {
                const data = await api('/api/despesas', { method: 'PUT', body: { id: editId, ...item } });
                const idx = despesas.findIndex(d => d.id === editId);
                if (idx !== -1) despesas[idx] = data.despesa;
                editId = null;
                btn.textContent = 'Adicionar Despesa';
            } else {
                const data = await api('/api/despesas', { method: 'POST', body: item });
                despesas.push(data.despesa);
            }

            descInput.value = valorInput.value = '';
            render();
        } catch (err) {
            alert(err.message);
        }
    };

    // === Salário input ===
    salarioInput.addEventListener('input', () => {
        clearErrors(salarioInput);
        saveSettings();
        render();
    });

    salarioInput.addEventListener('blur', () => validateField(salarioInput, validationRules.salario));
    descInput.addEventListener('blur', () => validateField(descInput, validationRules.descricao));
    valorInput.addEventListener('blur', () => validateField(valorInput, validationRules.valor));

    // === Table Edit/Delete ===
    tabela.addEventListener('click', async event => {
        const button = event.target.closest('button');
        if (!button) return;

        const id = Number(button.dataset.id);

        if (button.classList.contains('edit')) {
            const despesa = despesas.find(d => d.id === id);
            if (!despesa) return;
            descInput.value = despesa.descricao;
            valorInput.value = Number(despesa.valor);
            editId = id;
            btn.textContent = 'Atualizar Despesa';
        }

        if (button.classList.contains('delete')) {
            try {
                await api('/api/despesas', { method: 'DELETE', body: { id } });
                despesas = despesas.filter(d => d.id !== id);
                render();
            } catch (err) {
                alert(err.message);
            }
        }
    });

    // === Check Session — redirect to login if not authenticated ===
    let currentUser = null;

    (async () => {
        try {
            const data = await api('/api/auth/me');
            currentUser = data.user;
            await loadApp(data.user);
        } catch {
            window.location.href = '/login.html';
        }
    })();

    // === PROFILE MODAL ===
    function showProfileMsg(text, type) {
        profileMsg.textContent = text;
        profileMsg.className = `profile-msg ${type}`;
        profileMsg.style.display = 'block';
        setTimeout(() => { profileMsg.style.display = 'none'; }, 4000);
    }

    // Abrir/Fechar modal
    btnProfile.onclick = () => {
        if (currentUser) {
            getById('profile-name').value = currentUser.name;
            getById('profile-email').value = currentUser.email;
        }
        profileMsg.style.display = 'none';
        profileModal.style.display = 'flex';
    };

    modalClose.onclick = () => { profileModal.style.display = 'none'; };
    profileModal.onclick = e => { if (e.target === profileModal) profileModal.style.display = 'none'; };

    // Tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            getById(tab.dataset.tab).classList.add('active');
            profileMsg.style.display = 'none';
        };
    });

    // Atualizar perfil (nome/email)
    getById('form-profile').onsubmit = async e => {
        e.preventDefault();
        const name = getById('profile-name').value.trim();
        const email = getById('profile-email').value.trim();

        if (!name || name.length < 2) return showProfileMsg('Nome deve ter pelo menos 2 caracteres.', 'error');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showProfileMsg('Email inválido.', 'error');

        try {
            const data = await api('/api/auth/update', { method: 'PUT', body: { name, email } });
            currentUser = data.user;
            userGreeting.textContent = `Olá, ${data.user.name}`;
            showProfileMsg('Perfil atualizado com sucesso!', 'success');
        } catch (err) {
            showProfileMsg(err.message, 'error');
        }
    };

    // Alterar senha
    getById('form-password').onsubmit = async e => {
        e.preventDefault();
        const currentPassword = getById('current-password').value;
        const newPassword = getById('new-password').value;

        if (!currentPassword) return showProfileMsg('Informe a senha atual.', 'error');
        if (newPassword.length < 8) return showProfileMsg('Nova senha deve ter pelo menos 8 caracteres.', 'error');
        if (!/[A-Z]/.test(newPassword)) return showProfileMsg('Deve conter pelo menos uma maiúscula.', 'error');
        if (!/[a-z]/.test(newPassword)) return showProfileMsg('Deve conter pelo menos uma minúscula.', 'error');
        if (!/[0-9]/.test(newPassword)) return showProfileMsg('Deve conter pelo menos um número.', 'error');
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) return showProfileMsg('Deve conter pelo menos um caractere especial.', 'error');

        try {
            await api('/api/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } });
            getById('current-password').value = '';
            getById('new-password').value = '';
            showProfileMsg('Senha alterada com sucesso!', 'success');
        } catch (err) {
            showProfileMsg(err.message, 'error');
        }
    };

    // Excluir conta
    getById('form-delete').onsubmit = async e => {
        e.preventDefault();
        const password = getById('delete-password').value;

        if (!password) return showProfileMsg('Informe a senha para confirmar.', 'error');
        if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação é IRREVERSÍVEL.')) return;

        try {
            await api('/api/auth/delete', { method: 'DELETE', body: { password } });
            window.location.href = '/login.html';
        } catch (err) {
            showProfileMsg(err.message, 'error');
        }
    };
});