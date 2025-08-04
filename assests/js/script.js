document.addEventListener('DOMContentLoaded', () => {
    // === Helpers & Estado ===
    const getById = id => document.getElementById(id);
    const getStorage = key => JSON.parse(localStorage.getItem(key));
    const setStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const formatCurrency = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const percentOf = (value, total) => {
        if (total <= 0) return '-';
        const percent = (value / total * 100);
        return percent % 1 === 0
            ? `${percent.toFixed(0)}%`
            : `${percent.toFixed(2)}%`;
    };

    const { salarioInput, descInput, valorInput, tabela, resumo, btn } = {
        salarioInput: getById('salario'),
        descInput: getById('descricao'),
        valorInput: getById('valor'),
        tabela: getById('tabela'),
        resumo: getById('resumo'),
        btn: getById('btn-adicionar')
    };

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

    let despesas = getStorage('despesas') || [];
    let customReserva = getStorage('customReserva');
    let customReservaLabel = getStorage('customReservaLabel') || 'Reserva';
    let customRestoLabel = getStorage('customRestoLabel') || 'Resto';
    let editIndex = null;

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
        if (next && next.classList.contains('error-msg')) {
            next.remove();
        }
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

    const saveAll = () => {
        setStorage('despesas', despesas);
        setStorage('customReserva', customReserva);
        setStorage('customReservaLabel', customReservaLabel);
        setStorage('customRestoLabel', customRestoLabel);
        const num = parseFloat(salarioInput.value);
        localStorage.setItem('salario', isNaN(num) ? '0' : num.toString());
    };

    function render() {
        tabela.innerHTML = '';
        resumo.innerHTML = '';

        const salario = parseFloat(salarioInput.value) || 0;
        saveAll();

        despesas = despesas.filter(d => d.descricao !== 'Dízimo');
        despesas.unshift({ descricao: 'Dízimo', valor: salario * 0.1 });

        const total = despesas.reduce((sum, d) => sum + d.valor, 0);
        const reserva = customReserva != null ? customReserva : (salario * 0.5);
        const resto = salario - total - reserva;

        despesas.forEach((d, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${d.descricao}</td>
                <td class="num">${formatCurrency(d.valor)}</td>
                <td class="num">${percentOf(d.valor, salario)}</td>
                <td class="action">
                  <div class="actions">
                  ${d.descricao !== 'Dízimo'
                    ? `<button class="edit" data-idx="${i}"><i class="bi bi-pencil"></i></button>
                           <button class="delete" data-idx="${i}"><i class="bi bi-trash"></i></button>`
                    : ''}
                  </div>
                </td>`;
            tabela.appendChild(tr);
        });

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
        <td class="num ${isResto ? (value >= 0 ? 'positivo' : 'negativo') : ''}"
            ${isReserva ? 'id="cell-reserva"' : ''}>
            ${formatCurrency(value)}
        </td>
        <td class="num">${percentOf(value, salario)}</td>
        <td class="action">
            ${(isReserva || isResto) ? `
                <div class="actions">
                    ${isReserva ? `
                        <button id="edit-reserva" class="edit"><i class="bi bi-pencil"></i></button>
                        <button id="save-reserva" class="save" style="display:none"><i class="bi bi-check-lg"></i></button>
                    ` : ''}
                    <button class="edit-label custom-label-btn" data-type="${type}" title="Editar texto">
                        <i class="bi bi-type"></i>
                    </button>
                </div>
            ` : ''}
        </td>`;
            resumo.appendChild(tr);
        });

        bindReservaEvents();
        bindLabelEditEvents();
    }

    function bindReservaEvents() {
        const editButton = getById('edit-reserva');
        const saveButton = getById('save-reserva');
        if (!editButton || !saveButton) return;

        editButton.onclick = () => {
            const base = parseFloat(salarioInput.value) || 0;
            const value = customReserva != null ? customReserva : (base * 0.5);
            const cell = getById('cell-reserva');
            cell.innerHTML = `<input id="input-reserva" type="number" min="0" value="${value.toFixed(2)}" style="width:100%;box-sizing:border-box;">`;
            editButton.style.display = 'none';
            saveButton.style.display = 'inline-flex';

            const inputRes = getById('input-reserva');
            inputRes.addEventListener('blur', () => {
                validateField(inputRes, [
                    { test: v => !isNaN(parseFloat(v)), message: 'Reserva deve ser numérica.' },
                    { test: v => parseFloat(v) >= 0, message: 'Reserva não pode ser negativa.' }
                ]);
            });

            inputRes.addEventListener('keydown', e => {
                if (e.key === 'Enter') saveButton.click();
            });
        };

        saveButton.onclick = () => {
            const input = getById('input-reserva');
            if (!validateField(input, [
                { test: v => !isNaN(parseFloat(v)), message: 'Reserva deve ser numérica.' },
                { test: v => parseFloat(v) >= 0, message: 'Reserva não pode ser negativa.' }
            ])) return;

            customReserva = parseFloat(input.value);
            saveAll();
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

                btn.parentElement.appendChild(saveBtn);

                const finishEdit = () => {
                    saveLabel(type, input.value);
                    saveBtn.remove();
                    btn.style.display = 'inline-flex';
                };

                input.onblur = finishEdit;
                input.onkeydown = e => {
                    if (e.key === 'Enter') finishEdit();
                };
                saveBtn.onclick = finishEdit;
            };
        });
    }

    function saveLabel(type, value) {
        if (type === 'reserva') {
            customReservaLabel = value.trim() || 'Reserva';
            setStorage('customReservaLabel', customReservaLabel);
        } else if (type === 'resto') {
            customRestoLabel = value.trim() || 'Resto';
            setStorage('customRestoLabel', customRestoLabel);
        }
        render();
    }

    btn.onclick = () => {
        const validSalario = validateField(salarioInput, validationRules.salario);
        const validDesc = validateField(descInput, validationRules.descricao);
        const validValor = validateField(valorInput, validationRules.valor);
        if (!validSalario || !validDesc || !validValor) return;

        const item = {
            descricao: descInput.value.trim(),
            valor: parseFloat(valorInput.value)
        };

        if (editIndex !== null) {
            despesas[editIndex] = item;
            editIndex = null;
            btn.textContent = 'Adicionar Despesa';
        } else {
            despesas.push(item);
        }

        saveAll();
        descInput.value = valorInput.value = '';
        render();
    };

    salarioInput.addEventListener('input', () => {
        clearErrors(salarioInput);
        render();
    });

    salarioInput.addEventListener('blur', () => validateField(salarioInput, validationRules.salario));
    descInput.addEventListener('blur', () => validateField(descInput, validationRules.descricao));
    valorInput.addEventListener('blur', () => validateField(valorInput, validationRules.valor));

    tabela.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const index = +button.dataset.idx;
        if (button.classList.contains('edit')) {
            const despesa = despesas[index];
            descInput.value = despesa.descricao;
            valorInput.value = despesa.valor;
            editIndex = index;
            btn.textContent = 'Atualizar Despesa';
        }
        if (button.classList.contains('delete')) {
            despesas.splice(index, 1);
            saveAll();
            render();
        }
    });

    const savedSalario = localStorage.getItem('salario');
    if (savedSalario !== null && !isNaN(parseFloat(savedSalario))) {
        salarioInput.value = parseFloat(savedSalario).toFixed(2);
    }

    render();
});
