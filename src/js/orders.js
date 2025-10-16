// /js/orders.js - VERSIÓN FINAL Y FUNCIONAL

document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS DEL DOM ---
    const tableGridContainer = document.getElementById('tableGridContainer');
    const clockContainer = document.getElementById('liveClockContainer'); // <-- Referencia para el reloj
    const fab = document.getElementById('fab');
    const modal = document.getElementById('newTableModal');
    const newTableForm = document.getElementById('newTableForm');
    const controlButtons = document.querySelectorAll('.action-btn');
    const mainContent = document.querySelector('main');
    const tableNumberError = document.getElementById('mesaNumberError');
    const clientCountError = document.getElementById('clientCountError');
    
    let selectedTable = null; // Guardará el ELEMENTO del botón seleccionado

    const API_ROUTES = {
        GET_TABLES: '/KitchenLink/src/api/orders/get_tables.php',
        CREATE_TABLE: '/KitchenLink/src/api/orders/create_table.php'
    };

    // --- FUNCIONES ---

    /**
     * Función para el reloj (versión minimalista)
     */
    function updateClock() {
        const now = new Date();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        const month = months[now.getMonth()];
        const day = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        if (clockContainer) {
            clockContainer.textContent = `${month} ${day} ${hours}:${minutes}:${seconds}`;
        }
    }

    function handleTableClick(clickedTable) {
        if (selectedTable && selectedTable !== clickedTable) {
            selectedTable.classList.remove('selected');
        }
        clickedTable.classList.toggle('selected');
        selectedTable = clickedTable.classList.contains('selected') ? clickedTable : null;
        updateControlButtons();
    }

    function updateControlButtons() {
        const shouldEnable = selectedTable !== null;
        controlButtons.forEach(button => {
            if (button.id !== 'btn-exit' && button.id !== 'btn-advanced-options') {
                button.disabled = !shouldEnable;
            }
        });
    }

    async function fetchAndRenderTables() {
        try {
            const response = await fetch(API_ROUTES.GET_TABLES);
            if (!response.ok) throw new Error('Error de red');
            const data = await response.json();

            tableGridContainer.innerHTML = ''; // Limpiar

            if (data.success && data.tables.length > 0) {
                data.tables.forEach(table => {
                    const tableButton = document.createElement('button');
                    tableButton.className = 'table-btn';
                    tableButton.dataset.tableNumber = table.table_number;

                    tableButton.innerHTML = `
                        <span class="table-number">${table.table_number}</span>
                        <div class="table-info">
                            <div class="timer">
                                <i class="fas fa-clock"></i>
                                <span>${table.minutes_occupied} min</span>
                            </div>
                            <div class="client-count">
                                <i class="fas fa-users"></i>
                                <span>${table.client_count}</span>
                            </div>
                        </div>
                    `;
                    
                    tableButton.addEventListener('click', () => handleTableClick(tableButton));
                    tableGridContainer.appendChild(tableButton);
                });
            } else {
                tableGridContainer.innerHTML = '<p class="no-tables-msg">Aún no tienes mesas asignadas.</p>';
            }
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            tableGridContainer.innerHTML = `<p class="error-msg">Error de conexión al cargar mesas.</p>`;
        }
    }
    
    // --- MANEJO DEL MODAL ---
    function closeModal() {
        modal.classList.remove('visible');
        mainContent.classList.remove('blurred');
        newTableForm.reset();
        if(tableNumberError) tableNumberError.textContent = '';
        if(clientCountError) clientCountError.textContent = '';
    }

    fab.addEventListener('click', () => {
        modal.classList.add('visible');
        mainContent.classList.add('blurred');
    });
    
    document.getElementById('cancelCreate').addEventListener('click', closeModal);

    newTableForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tableNumber = document.getElementById('mesaNumber').value;
        const clientCount = document.getElementById('clientCount').value;

        // ... (Tu lógica de validación)

        try {
            const response = await fetch(API_ROUTES.CREATE_TABLE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber, client_count: clientCount })
            });
            const data = await response.json();

            if (data.success) {
                fetchAndRenderTables(); // Recargar todas las mesas para incluir la nueva
                closeModal();
                alert(data.message || 'Mesa creada exitosamente');
            } else {
                if (tableNumberError) tableNumberError.textContent = data.message;
            }
        } catch (error) {
            if (tableNumberError) tableNumberError.textContent = 'Error de conexión.';
        }
    });

    // --- MANEJO DE BOTONES DEL FOOTER ---
    document.getElementById('btn-edit-order').addEventListener('click', () => {
        if (!selectedTable) {
            alert('Por favor, selecciona una mesa primero.');
            return;
        }
        const tableNumber = selectedTable.dataset.tableNumber;
        window.location.href = `order_interface.php?table=${tableNumber}`;
    });

    document.getElementById('btn-exit').addEventListener('click', () => {
        window.location.href = '/KitchenLink/src/php/logout.php';
    });

    // --- INICIALIZACIÓN ---
    
    // Iniciar el reloj inmediatamente y actualizarlo cada segundo
    updateClock();
    setInterval(updateClock, 1000);

    // Cargar mesas y configurar botones
    updateControlButtons();
    fetchAndRenderTables();

    // Actualizar las mesas automáticamente cada 60 segundos
    setInterval(fetchAndRenderTables, 60000);
});