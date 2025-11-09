// /js/orders.js - VERSIÓN FINAL INTEGRADA Y FUNCIONAL (con alerta visual)

import { ModalAdvancedOptions } from './ModalAdvancedOptions.js';

// 💡 CAMBIO: Esta es la ÚNICA función principal, y es 'async'
document.addEventListener('DOMContentLoaded', async () => {

    // <<<--- INICIO DE LA VERIFICACIÓN DE TURNO --- >>>
    // 1. VERIFICACIÓN DE TURNO INICIAL
    try {
        // Reutilizamos el API que ya existe
        const response = await fetch('/KitchenLink/src/api/cashier/history_reports/get_shift_status.php');
        const data = await response.json();

        if (!data.success || data.status === 'CLOSED') {
            // ¡Turno cerrado!
            alert("El turno de caja ha sido cerrado. La sesión se cerrará.");
            // Redirigimos al logout para limpiar la sesión
            window.location.href = '/KitchenLink/src/php/logout.php';
            return; // Detenemos la carga del resto del script
        }

    } catch (error) {
        // Error grave de conexión
        document.body.innerHTML = "<h1>Error fatal al verificar el estado del turno.</h1>";
        return; // Detenemos la carga
    }
    // --- 👆 FIN DE LA VERIFICACIÓN 👆 ---
    
    
    // --- EL RESTO DE TU CÓDIGO ORIGINAL VA AQUÍ ---
    const tableGridContainer = document.getElementById('tableGridContainer');
    const clockContainer = document.getElementById('liveClockContainer');
    const fab = document.getElementById('fab');
    const modal = document.getElementById('newTableModal');
    const newTableForm = document.getElementById('newTableForm');
    const controlButtons = document.querySelectorAll('.action-btn');
    const mainContent = document.querySelector('main');
    
    const inputTableNumber = document.getElementById('mesaNumber');
    const inputClientCount = document.getElementById('clientCount');
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
                    
                    // 💡 LÓGICA DE ALERTA VISUAL: Si el pre_bill_status es REQUESTED
                    if (table.pre_bill_status === 'REQUESTED') {
                        tableButton.classList.add('prebill-requested'); 
                    }
                    
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

    // =======================================================
    // LÓGICA DE VALIDACIÓN 
    // =======================================================
    
    function formatNumericInput(input, maxLength) {
        if (!input) return;
        let value = input.value;
        let numericValue = value.replace(/[^0-9]/g, '');

        // Si el valor después de limpiar es exactamente "0", lo borramos.
        if (numericValue === '0') {
            numericValue = '';
        }
        
        if (numericValue.length > maxLength) {
            numericValue = numericValue.slice(0, maxLength);
        }
        
        input.value = numericValue;
    }
    
    if (inputTableNumber) {
        inputTableNumber.addEventListener('input', () => {
            formatNumericInput(inputTableNumber, 4);
        });
    }

    if (inputClientCount) {
        inputClientCount.addEventListener('input', () => {
            formatNumericInput(inputClientCount, 2);
        });
    }

    // =======================================================
    // FIN DE LA LÓGICA DE VALIDACIÓN
    // =======================================================

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

    // --- INICIALIZACIÓN Y POLLING ---
    const POLLING_INTERVAL_MS = 5000; // Intervalo de 5 segundos para actualización rápida

    updateClock();
    setInterval(updateClock, 1000);
    updateControlButtons();
    
    // 1. Carga inicial
    fetchAndRenderTables(); 
    
    // 2. Polling (Actualización automática)
    setInterval(fetchAndRenderTables, POLLING_INTERVAL_MS);

    window.addEventListener('table-list-update', fetchAndRenderTables);
    const optionsManager = new ModalAdvancedOptions('#btn-advanced-options');
    optionsManager.initialize();
    
});