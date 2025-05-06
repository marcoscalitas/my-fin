// Desestruturação dos elementos do DOM
const { salarioInput, descInput, valorInput, tabela, resumo, btn } = {
    salarioInput: document.getElementById('salario'),
    descInput: document.getElementById('descricao'),
    valorInput: document.getElementById('valor'),
    tabela: document.getElementById('tabela'),
    resumo: document.getElementById('resumo'),
    btn: document.getElementById('btn-adicionar')
};

// Estado inicial
let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
let customReserva = JSON.parse(localStorage.getItem('customReserva'));
let editIndex = null;

// Carrega salário salvo
const savedSalario = localStorage.getItem('salario');
if (savedSalario !== null) {
    salarioInput.value = parseFloat(savedSalario).toFixed(2);
}

// Funções auxiliares
const showError = (el, show) => el.style.display = show ? 'block' : 'none';
const saveStorage = () => localStorage.setItem('despesas', JSON.stringify(despesas));
const saveCustomReserva = () => localStorage.setItem('customReserva', JSON.stringify(customReserva));
const saveSalario = () => localStorage.setItem('salario', salarioInput.value);
const formatCurrency = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Renderização de tabela e resumo
function render() {
    tabela.innerHTML = '';
    resumo.innerHTML = '';

    const salario = parseFloat(salarioInput.value) || 0;
    saveSalario();

    despesas = despesas.filter(d => d.descricao !== 'Dízimo');
    const dizimo = salario * 0.1;
    despesas.unshift({ descricao: 'Dízimo', valor: dizimo });

    const total = despesas.reduce((sum, d) => sum + d.valor, 0);
    const reserva = (customReserva != null) ? customReserva : (salario * 0.5);
    const resto = salario - total - reserva;

    // Renderiza as despesas com percentagem
    despesas.forEach((d, i) => {
        const pct = salario > 0 ? ((d.valor / salario) * 100).toFixed(2) + '%' : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${d.descricao}</td>
        <td class="num">${formatCurrency(d.valor)}</td>
        <td class="num">${pct}</td>
        <td class="action">
          <div class="actions">
            ${d.descricao !== 'Dízimo'
                ? `<button class="edit" data-index="${i}"><i class="bi bi-pencil"></i></button>
                   <button class="delete" data-index="${i}"><i class="bi bi-trash"></i></button>`
                : ''
            }
          </div>
        </td>`;
        tabela.appendChild(tr);
    });

    // Resumo com percentagens
    const items = [
        ['Salário Total', salario],
        ['Total de Despesas', total],
        ['Reserva', reserva],
        ['Resto', resto]
    ];

    // Cabeçalho do resumo
    const rh = document.createElement('tr');
    rh.innerHTML = `
        <th colspan="5">Resumo</th>
    `;
    resumo.appendChild(rh);

    items.forEach(([label, val]) => {
        const pct = salario > 0 ? ((val / salario) * 100).toFixed(2) + '%' : '-';
        const isResto = (label === 'Resto');
        const className = isResto ? (val >= 0 ? 'positivo' : 'negativo') : '';

        const btnReservaActions = `
        <div class="actions">
          <button id="edit-reserva" class="edit" style="background:#ffc107;"><i class="bi bi-pencil"></i></button>
          <button id="save-reserva" class="save" style="display:none"><i class="bi bi-check-lg"></i></button>
        </div>`;

        const tr = document.createElement('tr');
        tr.classList.add('highlight');
        tr.innerHTML = `
        <td>*</td>
        <td>${label}</td>
        <td class="num ${className}">${formatCurrency(val)}</td>
        <td class="num">${pct}</td>
        <td class="action">${label === 'Reserva' ? btnReservaActions : ''}</td>`;
        resumo.appendChild(tr);
    });

    // Liga eventos de editar/salvar reserva
    const editReservaBtn = document.getElementById('edit-reserva');
    const saveReservaBtn = document.getElementById('save-reserva');

    if (editReservaBtn) {
        editReservaBtn.addEventListener('click', () => {
            const cell = document.getElementById('cell-reserva');
            cell.innerHTML = `<input type="number" id="input-reserva" value="${reserva.toFixed(2)}" min="0" style="width:100%;box-sizing:border-box;">`;
            editReservaBtn.style.display = 'none';
            saveReservaBtn.style.display = 'inline-flex';
        });
    }

    if (saveReservaBtn) {
        saveReservaBtn.addEventListener('click', () => {
            const input = document.getElementById('input-reserva');
            const val = parseFloat(input.value);
            const oldError = document.getElementById('error-reserva');
            if (oldError) oldError.remove();

            if (isNaN(val) || val < 0) {
                const errorMsg = document.createElement('div');
                errorMsg.id = 'error-reserva';
                errorMsg.textContent = 'A reserva não pode ser menor que 0.';
                errorMsg.style.color = 'red';
                errorMsg.style.fontSize = '0.9em';
                input.insertAdjacentElement('afterend', errorMsg);
                return;
            }

            customReserva = val;
            saveCustomReserva();
            render();
        });
    }
}

// Adiciona ou atualiza despesas
btn.addEventListener('click', () => {
    const desc = descInput.value.trim();
    const val = parseFloat(valorInput.value);

    showError(document.getElementById('error-descricao'), !desc);
    showError(document.getElementById('error-valor'), isNaN(val));

    if (!desc || isNaN(val)) return;

    if (val < 0) {
        const existing = document.getElementById('error-valor');
        if (existing) existing.remove();
        const errorMsg = document.createElement('div');
        errorMsg.id = 'error-valor';
        errorMsg.textContent = 'O valor da despesa não pode ser menor que 0.';
        errorMsg.style.color = 'red';
        errorMsg.style.fontSize = '0.9em';
        valorInput.insertAdjacentElement('afterend', errorMsg);
        return;
    }

    const item = { descricao: desc, valor: val };
    if (editIndex != null) {
        despesas[editIndex] = item;
        editIndex = null;
        btn.textContent = 'Adicionar Despesa';
    } else {
        despesas.push(item);
    }

    saveStorage();
    descInput.value = '';
    valorInput.value = '';
    render();
});

// Editar/excluir despesas
// (mesma lógica original, sem alterações)
tabela.addEventListener('click', e => {
    const bt = e.target.closest('button');
    if (!bt) return;
    const idx = +bt.dataset.index;
    if (bt.classList.contains('edit') && !bt.id) {
        const d = despesas[idx];
        descInput.value = d.descricao;
        valorInput.value = d.valor;
        editIndex = idx;
        btn.textContent = 'Atualizar Despesa';
    }
    if (bt.classList.contains('delete')) {
        despesas.splice(idx, 1);
        saveStorage();
        render();
    }
});

// Atualiza ao mudar salário
salarioInput.addEventListener('input', render);

// Renderiza inicialmente
render();
