// /KitchenLink/src/js/sales_history.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Elementos de la UI ---
    const loader = document.getElementById('page-loader');
    const shiftOpenModal = document.getElementById('shiftOpenModal');
    const tabContainer = document.getElementById('mainTabs');
    const tabContents = document.querySelectorAll('.tab-content');
    const clockContainer = document.getElementById('liveClockContainer');
    
    // --- Elementos del Modal de Apertura ---
    const btnOpenShiftConfirm = document.getElementById('btn-open-shift-confirm');
    const startingCashInput = document.getElementById('startingCashInput');

    // --- NUEVO: Elementos de la Pestaña de Reimpresión ---
    const btnSearchTickets = document.getElementById('btnSearchTickets');
    const searchFolioInput = document.getElementById('searchFolio');
    const searchStartDateInput = document.getElementById('searchStartDate');
    const searchEndDateInput = document.getElementById('searchEndDate');
    const ticketResultsBody = document.getElementById('ticketResultsBody');


    /**
     * Función principal que se ejecuta al cargar la página.
     * Verifica el estado del turno.
     */
    async function initializePage() {
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/get_shift_status.php');
            if (!response.ok) throw new Error(`Error ${response.status}: No se pudo contactar al servidor.`);
            
            const data = await response.json();
            loader.style.display = 'none';

            if (data.success && data.status === 'OPEN') {
                console.log('Turno abierto. ID:', data.shift_id);
                unlockUI(data.starting_cash);
            } else {
                console.log('Turno cerrado. Mostrando modal.');
                shiftOpenModal.style.display = 'flex';
                tabContainer.querySelectorAll('button').forEach(tab => tab.disabled = true);
            }
        } catch (error) {
            console.error('Error al inicializar la página:', error);
            loader.innerHTML = `<i class="fas fa-times-circle"></i> Error al verificar el turno. ${error.message}`;
            loader.style.color = 'red';
        }
    }

    /**
     * Desbloquea la UI (cuando el turno está abierto)
     */
    function unlockUI(startingCash) {
        shiftOpenModal.style.display = 'none'; 
        tabContainer.querySelectorAll('button').forEach(tab => tab.disabled = false); 
        
        setupTabs();
        loadReconciliationData(startingCash); 
        loadServerList(); 

        if (clockContainer) {
            updateClock();
            setInterval(updateClock, 1000);
        }
    }

    /**
     * Maneja el clic en "Abrir Turno"
     */
    async function openNewShift() {
        const amount = parseFloat(startingCashInput.value);
        if (isNaN(amount) || amount < 0) {
            alert('Por favor, ingrese un monto de fondo de caja válido.');
            return;
        }

        btnOpenShiftConfirm.disabled = true;
        btnOpenShiftConfirm.textContent = 'Abriendo...';

        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/open_shift.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starting_cash: amount })
            });
            const data = await response.json();

            if (data.success) {
                unlockUI(data.starting_cash);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert(`Error al abrir el turno: ${error.message}`);
            btnOpenShiftConfirm.disabled = false;
            btnOpenShiftConfirm.textContent = 'Abrir Turno';
        }
    }

    /**
     * Configura la lógica para cambiar entre pestañas.
     */
    function setupTabs() {
        const tabs = tabContainer.querySelectorAll('.tab-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const targetContent = document.getElementById(tab.dataset.tab);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    }

    // --- NUEVO: Lógica de Búsqueda de Tickets ---
    /**
     * Llama al API para buscar tickets y poblar la tabla.
     */
    async function searchTickets() {
        const folio = searchFolioInput.value.trim();
        const startDate = searchStartDateInput.value;
        const endDate = searchEndDateInput.value;

        let queryParams = new URLSearchParams();

        if (folio) {
            queryParams.append('folio', folio);
        } else if (startDate && endDate) {
            queryParams.append('start_date', startDate);
            queryParams.append('end_date', endDate);
        } else {
            alert('Por favor, ingrese un Folio o un rango de Fechas válido.');
            return;
        }

        btnSearchTickets.disabled = true;
        btnSearchTickets.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
        ticketResultsBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Buscando...</td></tr>';

        try {
            const response = await fetch(`/KitchenLink/src/api/cashier/history_reports/search_tickets.php?${queryParams.toString()}`);
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                renderTicketResults(result.data);
            } else {
                ticketResultsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${result.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error al buscar tickets:', error);
            ticketResultsBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red;">Error: ${error.message}</td></tr>`;
        } finally {
            btnSearchTickets.disabled = false;
            btnSearchTickets.innerHTML = '<i class="fas fa-search"></i> Buscar';
        }
    }

    /**
     * Renderiza los resultados de la búsqueda en la tabla.
     */
    function renderTicketResults(tickets) {
        ticketResultsBody.innerHTML = ''; // Limpiar resultados anteriores
        const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            const paymentDate = new Date(ticket.payment_time).toLocaleString('es-MX');

            tr.innerHTML = `
                <td>${ticket.sale_id}</td>
                <td>${paymentDate}</td>
                <td>${ticket.table_number}</td>
                <td>${ticket.server_name}</td>
                <td>${ticket.cashier_name || 'N/A'}</td>
                <td>${formatCurrency(ticket.grand_total)}</td>
                <td>
                    <i class="fas fa-print btn-reprint" title="Reimprimir Ticket" data-sale-id="${ticket.sale_id}"></i>
                </td>
            `;
            // Añadir evento al botón de reimprimir
            tr.querySelector('.btn-reprint').addEventListener('click', reprintTicket);
            
            ticketResultsBody.appendChild(tr);
        });
    }

    /**
     * Abre la ventana de reimpresión del ticket final.
     */
    function reprintTicket(event) {
        const saleId = event.target.dataset.saleId;
        if (!saleId) return;

        // Abrimos el MISMO template del ticket final que ya tienes
        // Pasamos parámetros 'falsos' de cambio/descuento ya que solo es reimpresión
        const receiptUrl = `/KitchenLink/src/php/ticket_final_template.php?sale_id=${saleId}&discount=0&cash_received=0&change=0`;
        
        const printWindow = window.open(receiptUrl, '_blank', 'width=700,height=800,scrollbars=yes,resizable=yes');
        if (printWindow) {
            printWindow.focus();
        } else {
            alert("El navegador bloqueó la ventana emergente. Por favor, habilite las ventanas emergentes.");
        }
    }


    /**
     * Carga los datos en la pestaña de Arqueo.
     */
    function loadReconciliationData(startingCash) {
        document.getElementById('reconStartCash').textContent = `$${parseFloat(startingCash).toFixed(2)}`;
        // TODO: Lógica para calcular ventas en efectivo del turno
    }

    /**
     * Carga la lista de meseros en la pestaña de Reportes.
     */
    function loadServerList() {
        // TODO: Lógica para cargar meseros
        const select = document.getElementById('selectServerReport');
        select.innerHTML = '<option value="">-- Seleccione un mesero --</option>';
    }

    /**
     * Actualiza el reloj en vivo.
     */
    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const dateString = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' });
        const timeString = now.toLocaleTimeString('en-US');
        clockContainer.textContent = `${dateString} ${timeString}`;
    }

    // --- Iniciar la página ---
    initializePage();

    // --- Asignar Eventos ---
    if (btnOpenShiftConfirm) {
        btnOpenShiftConfirm.addEventListener('click', openNewShift);
    }
    // --- NUEVO: Asignar evento al botón de búsqueda ---
    if (btnSearchTickets) {
        btnSearchTickets.addEventListener('click', searchTickets);
    }
});