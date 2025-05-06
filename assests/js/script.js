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

    let despesas = getStorage('despesas') || [];
    let customReserva = getStorage('customReserva');
    let editIndex = null;

    function showError(field, message) {
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

        despesas = despesas.filter(despesa => despesa.descricao !== 'Dízimo');
        despesas.unshift({ descricao: 'Dízimo', valor: salario * 0.1 });

        const total = despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
        const reserva = customReserva != null ? customReserva : (salario * 0.5);
        const resto = salario - total - reserva;

        despesas.forEach((despesa, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${despesa.descricao}</td>
          <td class="num">${formatCurrency(despesa.valor)}</td>
          <td class="num">${percentOf(despesa.valor, salario)}</td>
          <td class="action">
            <div class="actions">
              ${despesa.descricao !== 'Dízimo'
                    ? `<button class="edit" data-idx="${index}"><i class="bi bi-pencil"></i></button>
                   <button class="delete" data-idx="${index}"><i class="bi bi-trash"></i></button>`
                    : ''}
            </div>
          </td>`;
            tabela.appendChild(tr);
        });

        [['Salário Total', salario], ['Total de Despesas', total],
        ['Reserva', reserva], ['Resto', resto]].forEach(([label, value]) => {
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
        };

        saveButton.onclick = () => {
            const input = getById('input-reserva');
            if (!validateField(input, [
                { test: value => !isNaN(parseFloat(value)), message: 'Reserva deve ser numérica.' },
                { test: value => parseFloat(value) >= 0, message: 'Reserva não pode ser negativa.' }
            ])) return;

            customReserva = parseFloat(input.value);
            saveAll();
            render();
        };
    }

    btn.onclick = () => {
        const validSalario = validateField(salarioInput, [
            { test: value => value.trim() !== '', message: 'Salário é obrigatório.' },
            { test: value => !isNaN(parseFloat(value)), message: 'Salário deve ser numérico.' },
            { test: value => parseFloat(value) >= 0, message: 'Salário não pode ser negativo.' }
        ]);

        const validDesc = validateField(descInput, [
            { test: value => value.trim() !== '', message: 'Descrição é obrigatória.' }
        ]);

        const validValor = validateField(valorInput, [
            { test: value => !isNaN(parseFloat(value)), message: 'Valor numérico obrigatório.' },
            { test: value => parseFloat(value) >= 0, message: 'O valor não pode ser menor que 0.' }
        ]);

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

    salarioInput.oninput = () => clearErrors(salarioInput);

    tabela.onclick = event => {
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
    };

    const savedSalario = localStorage.getItem('salario');
    if (savedSalario !== null && !isNaN(parseFloat(savedSalario))) {
        salarioInput.value = parseFloat(savedSalario).toFixed(2);
    }
    render();
});
