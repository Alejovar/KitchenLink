// Variable para almacenar la mesa actualmente seleccionada
let selectedTable = null;

// Rutas a los endpoints PHP (AJAX)
const API_ROUTES = {
    GET_TABLES: '/KitchenLink/src/api/orders/get_tables.php',
    CREATE_TABLE: '/KitchenLink/src/api/orders/create_table.php'
};

// Referencias del DOM
const newTableForm = document.getElementById('newTableForm');
const tableNumberInput = document.getElementById('mesaNumber');
const tableNumberError = document.getElementById('mesaNumberError');
const clientCountInput = document.getElementById('clientCount'); 
const clientCountError = document.getElementById('clientCountError'); 
const controlButtons = document.querySelectorAll('.action-btn');
const tableGridContainer = document.getElementById('tableGridContainer');
const mainContent = document.querySelector('main');


// --- 1. Lógica de Control de Mesas y Botones (Se mantienen) ---

function updateControlButtons() {
    const shouldEnable = selectedTable !== null;
    controlButtons.forEach(button => {
        if (button.id !== 'btn-exit' && button.id !== 'btn-advanced-options') {
            button.disabled = !shouldEnable;
        }
    });
}

function handleTableClick(clickedTable) {
    if (selectedTable && selectedTable !== clickedTable) {
        selectedTable.classList.remove('selected');
    }

    if (selectedTable !== clickedTable) {
        clickedTable.classList.add('selected');
        selectedTable = clickedTable;
    } else {
        clickedTable.classList.remove('selected');
        selectedTable = null;
    }
    updateControlButtons();
}

function createTableCard(number) {
    const newCard = document.createElement('div');
    newCard.classList.add('table-card', 'active');
    newCard.setAttribute('data-table-id', number);
    
    newCard.innerHTML = `
        <i class="fas fa-user-friends"></i>
        <span>${number}</span>
    `;
    
    newCard.addEventListener('click', () => {
        handleTableClick(newCard);
    });
    
    tableGridContainer.appendChild(newCard); 
}


// --- 2. Lógica de Carga Inicial (loadTables se mantiene) ---

function loadTables() {
    fetch(API_ROUTES.GET_TABLES)
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => { throw new Error(errorData.message); });
        }
        return response.json();
    })
    .then(data => {
        tableGridContainer.innerHTML = ''; 

        if (data.success && data.tables.length > 0) {
            data.tables.forEach(tableNumber => {
                createTableCard(tableNumber);
            });
        } else {
            tableGridContainer.innerHTML = '<p style="padding: 20px;">No tienes mesas asignadas. Usa el botón "+" para crear una nueva mesa.</p>';
        }
        
        const tableCards = document.querySelectorAll('.table-card');
        tableCards.forEach(card => {
            card.addEventListener('click', () => { handleTableClick(card); });
        });
    })
    .catch(error => {
        console.error('Error al cargar mesas:', error);
        tableGridContainer.innerHTML = `<p style="padding: 20px; color: red;">Error: ${error.message || 'Ocurrió un error de conexión con la API de mesas.'}</p>`;
    });
}


// --- 3. Lógica de Creación de Mesas (POST /create_table.php) ---

/**
 * Cierra el modal y remueve el efecto Gaussiano.
 */
function closeModal() {
    const modalElement = document.getElementById('newTableModal');
    
    if (modalElement) {
        modalElement.classList.remove('visible');
    }
    
    if (mainContent) {
        mainContent.classList.remove('blurred');
    }

    newTableForm.reset();
    tableNumberError.textContent = '';
    clientCountError.textContent = '';
}
document.getElementById('cancelCreate').addEventListener('click', closeModal);


// Maneja el envío del formulario: Validaciones y AJAX POST
function handleSubmitForm(e) {
    e.preventDefault();
    
    let isValid = true;
    const tableNumber = parseInt(tableNumberInput.value);
    const clientCount = parseInt(clientCountInput.value);

    tableNumberError.textContent = '';
    clientCountError.textContent = '';

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 9999) {
        tableNumberError.textContent = 'El número de mesa debe ser entre 1 y 9999.';
        isValid = false;
    }

    if (isNaN(clientCount) || clientCount < 1 || clientCount > 99) {
        clientCountError.textContent = 'El número de personas debe ser entre 1 y 99.';
        isValid = false;
    }

    if (!isValid) { return; }
    
    const dataToSend = { table_number: tableNumber, client_count: clientCount };
    
    fetch(API_ROUTES.CREATE_TABLE, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => { throw new Error(errorData.message); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            createTableCard(tableNumber);
            closeModal();
            alert(data.message);
        } else {
            tableNumberError.textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Error creating table:', error);
        tableNumberError.textContent = error.message || 'Ocurrió un error de conexión al servidor.';
    });
}


// --- 4. Inicialización (CRÍTICO: Aquí se resuelve el conflicto de botones) ---

function initializePrototype() {
    // 1. ADJUNTAR EL EVENTO SUBMIT DIRECTAMENTE AL FORMULARIO
    newTableForm.addEventListener('submit', handleSubmitForm);


    // 2. ADJUNTAR EVENTO CLICK AL FAB
    const fabButton = document.getElementById('fab');
    const modalElement = document.getElementById('newTableModal'); 

    if (fabButton && modalElement) {
        fabButton.addEventListener('click', () => {
            modalElement.classList.add('visible');
            mainContent.classList.add('blurred'); 
            
            // Limpieza al abrir
            newTableForm.reset();
            tableNumberError.textContent = '';
            clientCountError.textContent = '';
        });
    }

    // 3. Iniciar la carga de mesas
    loadTables();
    
    // 4. Asegurar que el modal esté oculto al inicio
    if (modalElement) {
        modalElement.classList.remove('visible'); 
    }
    
    // 5. Simular acciones de botones del footer (Esta lógica ahora NO toca el modal)
    controlButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.textContent;
            
            if (action === "Salir") {
                 window.location.href = '/KitchenLink/src/php/logout.php';
                 return;
            }

            if (selectedTable) {
                const tableId = selectedTable.getAttribute('data-table-id');
                alert(`Acción: "${action}" ejecutada para la Mesa ${tableId}.`);
            } else if (button.id !== 'btn-exit' && button.id !== 'btn-advanced-options') {
                alert(`Debe seleccionar una mesa para realizar la acción: "${action}".`);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initializePrototype);