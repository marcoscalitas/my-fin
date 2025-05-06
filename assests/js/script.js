document.addEventListener('DOMContentLoaded', () => {
    // === Helpers & Estado ===
    const getById = id => document.getElementById(id);
    const getStorage = key => JSON.parse(localStorage.getItem(key));
    const setStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const formatCurrency = value => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const percentOf = (value, total) => total > 0 ? (value / total * 100).toFixed(2) + '%' : '-';

    const { salarioInput, descInput, valorInput, tabela, resumo, btn
    } = {
        salarioInput: getById('salario'),
        descInput: getById('descricao'),
        valorInput: getById('valor'),
        tabela: getById('tabela'),
        resumo: getById('resumo'),
        btn: getById('btn-adicionar')
    };

    // regras de validação centralizadas
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

        [['Salário Total', salario], ['Total de Despesas', total], ['Reserva', reserva], ['Resto', resto]]
            .forEach(([label, value]) => {
                const isReserva = label === 'Reserva';
                const isResto = label === 'Resto';
                const tr = document.createElement('tr');
                tr.classList.add('highlight');
                tr.innerHTML = `
                    <td>*</td>
                    <td>${label}</td>
                    <td class="num ${isResto ? (value >= 0 ? 'positivo' : 'negativo') : ''}"
                        ${isReserva ? 'id="cell-reserva"' : ''}>
                        ${formatCurrency(value)}
                    </td>
                    <td class="num">${percentOf(value, salario)}</td>
                    <td class="action">
                        ${isReserva
                        ? `<div class="actions">
                                  <button id="edit-reserva" class="edit"><i class="bi bi-pencil"></i></button>
                                  <button id="save-reserva" class="save" style="display:none"><i class="bi bi-check-lg"></i></button>
                              </div>`
                        : ''}
                    </td>`;
                resumo.appendChild(tr);
            });

        bindReservaEvents();
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

            // validação blur para reserva
            const inputRes = getById('input-reserva');
            inputRes.addEventListener('blur', () => {
                validateField(inputRes, [
                    { test: v => !isNaN(parseFloat(v)), message: 'Reserva deve ser numérica.' },
                    { test: v => parseFloat(v) >= 0, message: 'Reserva não pode ser negativa.' }
                ]);
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

    // adicionar/atualizar despesa
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

    // input em tempo real para salário
    salarioInput.addEventListener('input', () => {
        clearErrors(salarioInput);
        render();
    });

    // validação blur para todos os campos
    salarioInput.addEventListener('blur', () => validateField(salarioInput, validationRules.salario));
    descInput.addEventListener('blur', () => validateField(descInput, validationRules.descricao));
    valorInput.addEventListener('blur', () => validateField(valorInput, validationRules.valor));

    // editar e deletar despesas
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

    // carrega salário salvo
    const savedSalario = localStorage.getItem('salario');
    if (savedSalario !== null && !isNaN(parseFloat(savedSalario))) {
        salarioInput.value = parseFloat(savedSalario).toFixed(2);
    }

    render();
});
