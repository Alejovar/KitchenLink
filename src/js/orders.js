// /js/orders.js - VERSIÓN FINAL INTEGRADA Y FUNCIONAL

// =======================================================
// AÑADIDO: Importamos la clase al principio del archivo
import { ModalAdvancedOptions } from './ModalAdvancedOptions.js';
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENCIAS DEL DOM ---
    const tableGridContainer = document.getElementById('tableGridContainer');
    const clockContainer = document.getElementById('liveClockContainer');
    const fab = document.getElementById('fab');
    const modal = document.getElementById('newTableModal');
    const newTableForm = document.getElementById('newTableForm');
    const controlButtons = document.querySelectorAll('.action-btn'); // Ahora solo incluye los dos botones restantes
    const mainContent = document.querySelector('main');
    const tableNumberError = document.getElementById('mesaNumberError');
    const clientCountError = document.getElementById('clientCountError');
    
    let selectedTable = null;

    const API_ROUTES = {
        GET_TABLES: '/KitchenLink/src/api/orders/get_tables.php',
        CREATE_TABLE: '/KitchenLink/src/api/orders/create_table.php'
    };

    // --- FUNCIONES ---
    function updateClock() {
        const now = new Date();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const month = months[now.getMonth()];
        const day = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        if (clockContainer) clockContainer.textContent = `${month} ${day} ${hours}:${minutes}:${seconds}`;
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
        
        // 🚨 CÓDIGO LIMPIADO: Ya que solo quedan dos botones, simplemente los deshabilitamos.
        // No necesitamos el if (button.id !== 'btn-exit') porque 'btn-exit' fue eliminado del HTML.
        controlButtons.forEach(button => {
            button.disabled = !shouldEnable;
        });
    }

    async function fetchAndRenderTables() {
        const currentSelectionNumber = selectedTable ? selectedTable.dataset.tableNumber : null; 
        selectedTable = null; 

        try {
            const response = await fetch(API_ROUTES.GET_TABLES);
            if (!response.ok) throw new Error('Error de red al cargar mesas.');
            const data = await response.json();
            
            tableGridContainer.innerHTML = '';
            
            if (data.success && data.tables.length > 0) {
                data.tables.forEach(table => {
                    const tableButton = document.createElement('button');
                    tableButton.className = 'table-btn';
                    tableButton.dataset.tableNumber = table.table_number;
                    tableButton.innerHTML = `
                        <span class="table-number">${table.table_number}</span>
                        <div class="table-info">
                            <div class="timer"><i class="fas fa-clock"></i><span>${table.minutes_occupied} min</span></div>
                            <div class="client-count"><i class="fas fa-users"></i><span>${table.client_count}</span></div>
                        </div>`;
                    tableButton.addEventListener('click', () => handleTableClick(tableButton));
                    tableGridContainer.appendChild(tableButton);

                    if (currentSelectionNumber && table.table_number == currentSelectionNumber) {
                        handleTableClick(tableButton); 
                    }
                });
            } else {
                tableGridContainer.innerHTML = '<p class="no-tables-msg">Aún no tienes mesas asignadas.</p>';
            }
            updateControlButtons();
        } catch (error) {
            console.error('Error al cargar mesas:', error);
            tableGridContainer.innerHTML = `<p class="error-msg">Error de conexión al cargar mesas.</p>`;
        }
    }
    
    function closeModal() {
        modal.classList.remove('visible');
        mainContent.classList.remove('blurred');
        newTableForm.reset();
        if (tableNumberError) tableNumberError.textContent = '';
        if (clientCountError) clientCountError.textContent = '';
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
        try {
            const response = await fetch(API_ROUTES.CREATE_TABLE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_number: tableNumber, client_count: clientCount })
            });
            const data = await response.json();
            if (data.success) {
                fetchAndRenderTables();
                closeModal();
            } else {
                if (tableNumberError) tableNumberError.textContent = data.message;
            }
        } catch (error) {
            if (tableNumberError) tableNumberError.textContent = 'Error de conexión.';
        }
    });

    document.getElementById('btn-edit-order').addEventListener('click', () => {
        if (!selectedTable) {
            alert('Por favor, selecciona una mesa primero.');
            return;
        }
        const tableNumber = selectedTable.dataset.tableNumber;
        window.location.href = `order_interface.php?table=${tableNumber}`;
    });

    // El botón 'btn-exit' fue eliminado del HTML, pero mantenemos el listener si el elemento es re-añadido.
    // document.getElementById('btn-exit').addEventListener('click', () => {
    //     window.location.href = '/KitchenLink/src/php/logout.php';
    // });

    // --- INICIALIZACIÓN ---
    updateClock();
    setInterval(updateClock, 1000);

    updateControlButtons();
    fetchAndRenderTables(); 
    setInterval(fetchAndRenderTables, 60000);

    // =======================================================
    // LISTENER DE RECARGA: Carga los datos cuando TableNumberChanger dispara el evento
    window.addEventListener('table-list-update', fetchAndRenderTables);
    // =======================================================
    
    // =======================================================
    // Inicialización de la lógica de opciones avanzadas
    const optionsManager = new ModalAdvancedOptions('#btn-advanced-options');
    optionsManager.initialize();
    // =======================================================
});