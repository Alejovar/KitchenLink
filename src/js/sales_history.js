// /KitchenLink/src/js/sales_history.js

let currentShiftReport = null; // Global para guardar datos del turno

document.addEventListener('DOMContentLoaded', () => {
    
    // ... (Elementos de UI: loader, modal, tabs, clock...) ...
    const loader = document.getElementById('page-loader');
    const shiftOpenModal = document.getElementById('shiftOpenModal');
    const tabContainer = document.getElementById('mainTabs');
    const tabContents = document.querySelectorAll('.tab-content');
    const clockContainer = document.getElementById('liveClockContainer');
    const btnOpenShiftConfirm = document.getElementById('btn-open-shift-confirm');
    const startingCashInput = document.getElementById('startingCashInput');
    const btnSearchTickets = document.getElementById('btnSearchTickets');
    const searchFolioInput = document.getElementById('searchFolio');
    const searchStartDateInput = document.getElementById('searchStartDate');
    const searchEndDateInput = document.getElementById('searchEndDate');
    const ticketResultsBody = document.getElementById('ticketResultsBody');
    const selectServerReport = document.getElementById('selectServerReport');
    const btnGenerateShiftReport = document.getElementById('btnGenerateShiftReport');
    const btnGenerateServerReport = document.getElementById('btnGenerateServerReport');
    const reconStartCash = document.getElementById('reconStartCash');
    const reconCashSales = document.getElementById('reconCashSales');
    const reconCashIn = document.getElementById('reconCashIn'); 
    const reconCashOut = document.getElementById('reconCashOut'); 
    const reconExpectedTotal = document.getElementById('reconExpectedTotal');
    const reconManualTotalEl = document.getElementById('reconManualTotal');
    const reconDifferenceAmount = document.getElementById('reconDifferenceAmount');
    const reconDifferenceText = document.getElementById('reconDifferenceText');
    const manualCountInputs = document.querySelectorAll('.recon-denom');
    let manualCashTotal = 0; 

    // --- 👇 NUEVO: Elemento y Validación de Deducción ---
    const serverDeductionRateInput = document.getElementById('serverDeductionRate');

    function validatePercentageInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^0-9.]/g, ''); // Solo números y punto
        value = value.replace(/(\..*)\./g, '$1'); // Solo un punto
        if (parseFloat(value) > 1) {
            value = '1.0'; // No más de 1.0 (100%)
        }
        if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) {
             value = '0.' + value.substring(1);
        }
        input.value = value;
    }


    // --- (Funciones de inicialización, unlockUI, openNewShift, setupTabs... van aquí) ---
    async function initializePage() {
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/get_shift_status.php');
            if (!response.ok) throw new Error(`Error ${response.status}: No se pudo contactar al servidor.`);
            const data = await response.json();
            loader.style.display = 'none';
            if (data.success && data.status === 'OPEN') {
                await unlockUI(data.starting_cash);
            } else {
                shiftOpenModal.style.display = 'flex';
                tabContainer.querySelectorAll('button').forEach(tab => tab.disabled = true);
            }
        } catch (error) {
            console.error('Error al inicializar la página:', error);
            loader.innerHTML = `<i class="fas fa-times-circle"></i> Error al verificar el turno. ${error.message}`;
            loader.style.color = 'red';
        }
    }
    async function unlockUI(startingCash) { 
        shiftOpenModal.style.display = 'none'; 
        tabContainer.querySelectorAll('button').forEach(tab => tab.disabled = false); 
        setupTabs();
        await loadReconciliationData();
        loadServerList(); 
        if (clockContainer) {
            updateClock();
            setInterval(updateClock, 1000);
        }
    }
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
                await unlockUI(data.starting_cash); 
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert(`Error al abrir el turno: ${error.message}`);
            btnOpenShiftConfirm.disabled = false;
            btnOpenShiftConfirm.textContent = 'Abrir Turno';
        }
    }
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

    // --- (Lógica de Búsqueda de Tickets: searchTickets, renderTicketResults, reprintTicket... van aquí) ---
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
    function renderTicketResults(tickets) {
        ticketResultsBody.innerHTML = ''; 
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
                <td><i class="fas fa-print btn-reprint" title="Reimprimir Ticket" data-sale-id="${ticket.sale_id}"></i></td>
            `;
            tr.querySelector('.btn-reprint').addEventListener('click', reprintTicket);
            ticketResultsBody.appendChild(tr);
        });
    }
    function reprintTicket(event) {
        const saleId = event.target.dataset.saleId;
        if (!saleId) return;
        const receiptUrl = `/KitchenLink/src/php/ticket_final_template.php?sale_id=${saleId}&discount=0&cash_received=0&change=0`;
        const printWindow = window.open(receiptUrl, '_blank', 'width=700,height=800,scrollbars=yes,resizable=yes');
        if (printWindow) printWindow.focus();
        else alert("El navegador bloqueó la ventana emergente. Por favor, habilite las ventanas emergentes.");
    }

    // --- (Lógica de Arqueo y Reporte Z: loadReconciliationData, calculateReconciliation, generateShiftReportZ... van aquí) ---
    async function loadReconciliationData() {
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/get_current_shift_report.php');
            const result = await response.json();
            if (result.success) {
                currentShiftReport = result; 
                const report = result.cash_report;
                const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;
                reconStartCash.textContent = formatCurrency(report.starting_cash);
                reconCashSales.textContent = formatCurrency(report.total_cash_sales);
                reconExpectedTotal.textContent = formatCurrency(report.expected_cash_total);
                calculateReconciliation();
            } else {
                alert("Error cargando el reporte del turno: " + result.message);
            }
        } catch (error) {
            console.error('Error fatal al cargar reporte:', error);
            alert("Error de conexión al cargar el reporte del turno.");
        }
    }
    function calculateReconciliation() {
        manualCashTotal = 0; 
        manualCountInputs.forEach(input => {
            const value = parseFloat(input.dataset.value);
            const count = parseFloat(input.value) || 0;
            if(input.id === 'count-coins') manualCashTotal += count; 
            else manualCashTotal += (value * count);
        });
        reconManualTotalEl.textContent = `$${manualCashTotal.toFixed(2)}`;
        if (!currentShiftReport) return; 
        const expectedTotal = currentShiftReport.cash_report.expected_cash_total;
        const difference = manualCashTotal - expectedTotal;
        reconDifferenceAmount.textContent = `$${difference.toFixed(2)}`;
        reconDifferenceAmount.classList.remove('zero', 'over', 'short');
        if (difference > 0.01) {
            reconDifferenceAmount.classList.add('over');
            reconDifferenceText.textContent = "Sobrante";
        } else if (difference < -0.01) {
            reconDifferenceAmount.classList.add('short');
            reconDifferenceText.textContent = "Faltante";
        } else {
            reconDifferenceAmount.classList.add('zero');
            reconDifferenceText.textContent = "En Cuadre";
        }
    }
    async function loadServerList() {
        if (!selectServerReport) return; 
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/get_servers_list.php');
            const result = await response.json();
            if (result.success && result.data.length > 0) {
                selectServerReport.innerHTML = '<option value="">-- Seleccione un mesero --</option>'; 
                result.data.forEach(server => {
                    const option = document.createElement('option');
                    option.value = server.id;
                    option.textContent = server.name;
                    selectServerReport.appendChild(option);
                });
            } else {
                selectServerReport.innerHTML = '<option value="">No se encontraron meseros</option>';
            }
        } catch (error) {
            console.error('Error al cargar la lista de meseros:', error);
            selectServerReport.innerHTML = `<option value="">Error al cargar</option>`;
        }
    }
    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const dateString = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' });
        const timeString = now.toLocaleTimeString('en-US');
        clockContainer.textContent = `${dateString} ${timeString}`;
    }
    async function generateShiftReportZ() {
        if (!confirm("¿Estás seguro de que deseas cerrar el turno?\nEsta acción es IRREVERSIBLE y generará el Corte Z final.")) return;
        if (manualCashTotal === 0) {
            if (!confirm("ADVERTENCIA: No has realizado el conteo de efectivo en la pestaña 'Arqueo de Caja'. ¿Deseas cerrar el turno con un conteo de $0.00?")) return;
        }
        btnGenerateShiftReport.disabled = true;
        btnGenerateShiftReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando Turno...';
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/history_reports/close_shift.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manual_cash_total: manualCashTotal }) 
            });
            const result = await response.json();
            if (result.success) {
                localStorage.setItem('currentShiftReportData', JSON.stringify(result));
                const reportUrl = '/KitchenLink/src/php/ticket_shift_report_template.php';
                const reportWindow = window.open(reportUrl, '_blank', 'width=400,height=800');
                alert("Turno cerrado exitosamente. El sistema se recargará.");
                window.location.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(`Error grave al cerrar el turno: ${error.message}`);
            btnGenerateShiftReport.disabled = false;
            btnGenerateShiftReport.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Generar Corte Z del Turno';
        }
    }

    /**
     * --- FUNCIÓN MODIFICADA ---
     * Llama al API para obtener los totales de un mesero y muestra el ticket.
     */
    async function generateServerReport() {
        const serverId = selectServerReport.value;
        // --- 👇 NUEVO: Leer el valor del input de deducción ---
        const deductionRate = parseFloat(serverDeductionRateInput.value) || 0.0;

        if (!serverId) {
            alert("Por favor, seleccione un mesero de la lista.");
            return;
        }
        
        if (deductionRate < 0 || deductionRate > 1) {
            alert("El porcentaje de deducción debe estar entre 0.0 y 1.0 (Ej: 0.30 para 30%).");
            return;
        }

        btnGenerateServerReport.disabled = true;
        btnGenerateServerReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

        try {
            // --- 👇 NUEVO: Enviar la deducción al API ---
            const response = await fetch(`/KitchenLink/src/api/cashier/history_reports/get_server_report.php?server_id=${serverId}&deduction_rate=${deductionRate}`);
            const result = await response.json();

            if (result.success) {
                localStorage.setItem('currentServerReportData', JSON.stringify(result));
                const reportUrl = '/KitchenLink/src/php/ticket_server_report_template.php';
                const reportWindow = window.open(reportUrl, '_blank', 'width=400,height=600');
                
                if (!reportWindow) {
                    alert("El navegador bloqueó la ventana emergente. Por favor, habilite las ventanas emergentes.");
                }
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            alert(`Error al generar el reporte de mesero: ${error.message}`);
        } finally {
            btnGenerateServerReport.disabled = false;
            btnGenerateServerReport.innerHTML = '<i class="fas fa-user-tag"></i> Generar Reporte';
        }
    }

    // --- Iniciar la página ---
    initializePage();

    // --- Asignar Eventos ---
    if (btnOpenShiftConfirm) btnOpenShiftConfirm.addEventListener('click', openNewShift);
    if (btnSearchTickets) btnSearchTickets.addEventListener('click', searchTickets);
    if (btnGenerateShiftReport) btnGenerateShiftReport.addEventListener('click', generateShiftReportZ);
    if (btnGenerateServerReport) btnGenerateServerReport.addEventListener('click', generateServerReport);
    if (serverDeductionRateInput) serverDeductionRateInput.addEventListener('input', validatePercentageInput); // <-- NUEVO

    manualCountInputs.forEach(input => {
        input.addEventListener('input', calculateReconciliation);
    });
});