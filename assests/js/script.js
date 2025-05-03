const { salarioInput, descInput, valorInput, tabela, resumo, btn } = {
    salarioInput: document.getElementById('salario'),
    descInput: document.getElementById('descricao'),
    valorInput: document.getElementById('valor'),
    tabela: document.getElementById('tabela'),
    resumo: document.getElementById('resumo'),
    btn: document.getElementById('btn-adicionar')
};

let despesas = JSON.parse(localStorage.getItem('despesas')) || [];
let customReserva = JSON.parse(localStorage.getItem('customReserva'));
let editIndex = null;

// Funções auxiliares
const showError = (el, show) => el.style.display = show ? 'block' : 'none';
const saveStorage = () => localStorage.setItem('despesas', JSON.stringify(despesas));
const saveCustomReserva = () => localStorage.setItem('customReserva', JSON.stringify(customReserva));
const formatCurrency = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

// Renderização de tabela e resumo
function render() {
    tabela.innerHTML = '';
    resumo.innerHTML = '';

    const salario = parseFloat(salarioInput.value) || 0;
    despesas = despesas.filter(d => d.descricao !== 'Dízimo');
    const dizimo = salario * 0.1;
    despesas.unshift({ descricao: 'Dízimo', valor: dizimo });
    const total = despesas.reduce((sum, d) => sum + d.valor, 0);
    const reserva = customReserva != null ? customReserva : salario * 0.4;
    const resto = salario - total - reserva;

    // Renderiza despesas
    despesas.forEach((d, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${d.descricao}</td>
            <td class="num">${formatCurrency(d.valor)}</td>
            <td class="action">
                <div class="actions">
                ${d.descricao !== 'Dízimo' ? `<button class="edit" data-index="${i}"><i class="bi bi-pencil"></i></button><button class="delete" data-index="${i}"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </td>`;
        tabela.appendChild(tr);
    });

    // Renderiza resumo
    const items = [
        ['Salário Total', salario],
        ['Total de Despesas', total],
        ['Reserva', reserva],
        ['Resto', resto]
    ];

    items.forEach(([label, val], idx) => {
        const tr = document.createElement('tr');
        const isResto = label === 'Resto';
        const className = isResto ? (val >= 0 ? 'positivo' : 'negativo') : '';
        
        const btnReservaActions = `
        <div class="actions">
            <button id="edit-reserva" class="edit">
                <i class="bi bi-pencil"></i>
            </button>
            <button id="save-reserva" class="save" style="display:none">
                <i class="bi bi-check-lg"></i>
            </button>
        </div>`;
    
        tr.classList.add('highlight');
        tr.innerHTML = `
            <td>${label}</td>
            <td colspan="1">-</td>
            <td class="num ${className}">${formatCurrency(val)}</td>
            <td class="action">
                ${label === 'Reserva' ? btnReservaActions : ''}
            </td>`;
        resumo.appendChild(tr);
    });

    const editBtn = document.getElementById('edit-reserva');
    const saveBtn = document.getElementById('save-reserva');

    if (editBtn) editBtn.addEventListener('click', () => {
        const cell = resumo.querySelector('#cell-reserva') || resumo.children[2].children[1];
        cell.innerHTML = `<input type="number" id="input-reserva" value="${reserva.toFixed(2)}" min="0" style="width:100%;box-sizing:border-box;">`;
        editBtn.style.display = 'none'; saveBtn.style.display = 'inline-flex';
    });

    if (saveBtn) saveBtn.addEventListener('click', () => {
        const input = document.getElementById('input-reserva');
        const val = parseFloat(input.value);
        
        // Remove mensagem de erro anterior, se houver
        let error = document.getElementById('error-reserva');
        if (error) error.remove();
    
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

// Adiciona ou atualiza despesas
btn.addEventListener('click', () => {
    const desc = descInput.value.trim();
    const val = parseFloat(valorInput.value);

    showError(document.getElementById('error-descricao'), !desc);
    showError(document.getElementById('error-valor'), isNaN(val));

    if (!desc || isNaN(val)) return;

    // Verificação de reserva no valor
    if (val < 0) {
        // Exibe mensagem de erro
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

// Atualiza a renderização ao alterar o valor da reserva
const saveBtn = document.getElementById('save-reserva');
if (saveBtn) saveBtn.addEventListener('click', () => {
    const input = document.getElementById('input-reserva');
    const val = parseFloat(input.value);

    // Remove mensagem de erro anterior, se houver
    let error = document.getElementById('error-reserva');
    if (error) error.remove();

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


// Editar ou excluir despesas
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

// Atualiza a renderização ao alterar salário
salarioInput.addEventListener('input', render);
render();
