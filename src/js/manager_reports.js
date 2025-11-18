// /KitchenLink/src/js/manager_reports.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicialización y Funciones de Utilidad
    const productMixResults = document.getElementById('productMixResults');
    const serviceMetricsResults = document.getElementById('serviceMetricsResults');
    const reservationMetricsResults = document.getElementById('reservationMetricsResults');
    const serviceServerSelect = document.getElementById('serviceServerSelect');
    const clockContainer = document.getElementById('liveClockContainer'); // Clock element

    // Botones
    const btnRunProductMix = document.getElementById('btnRunProductMix');
    const btnRunServiceMetrics = document.getElementById('btnRunServiceMetrics');
    const btnRunReservationMetrics = document.getElementById('btnRunReservationMetrics');
    const btnRunCancellationReport = document.getElementById('btnRunCancellationReport');
    
    // URLs API
    const API_ENDPOINT = '/KitchenLink/src/php/reports_api.php';
    
    // Función para obtener fechas en formato YYYY-MM-DD
    const formatToDateInput = (dateObj) => {
        const now = dateObj || new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Establecer fechas por defecto (últimos 7 días)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 6);

    const todayStr = formatToDateInput(today);
    const lastWeekStr = formatToDateInput(lastWeek);

    // Inicializar todos los campos de fecha
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if(input.id.includes('EndDate')) input.value = todayStr;
        else input.value = lastWeekStr;
    });

    // 💡 FUNCIÓN DE RELOJ SOLICITADA (Mes/Día Hora:Min:Seg)
    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const month = months[now.getMonth()];
        const day = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockContainer.textContent = `${month} ${day} ${hours}:${minutes}:${seconds}`;
    }
    
    // ------------------------------------------------------------------
    // 💡 INICIO DE LÓGICA PRINCIPAL (AJAX y Renderizado)
    // ------------------------------------------------------------------
    
    // Función AJAX genérica
    const fetchReport = async (action, data, resultElement) => {
        resultElement.innerHTML = '<p class="loading-message" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando reporte...</p>';
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, ...data })
            });
            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                resultElement.innerHTML = `<p class="no-results" style="color:red;"><i class="fas fa-exclamation-circle"></i> Error: ${result.message || 'Error al procesar el reporte.'}</p>`;
                return null;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            resultElement.innerHTML = `<p class="no-results" style="color:red;"><i class="fas fa-network-wired"></i> Error de red o servidor: ${error.message}</p>`;
            return null;
        }
    };

    // --- 2. Control de Pestañas ---
    const tabsContainer = document.getElementById('reportTabs');
    const tabContents = document.querySelectorAll('.report-tab-content');

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('report-tab-link')) {
            const tabId = e.target.dataset.tab;

            document.querySelectorAll('.report-tab-link').forEach(link => link.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');

            e.target.classList.add('active');
            const contentElement = document.getElementById(tabId);
            if(contentElement) contentElement.style.display = 'block';

            if (tabId === 'service-metrics') {
                loadServers();
            }
        }
    });

    // --- 3. Llenar Select de Meseros ---
    const loadServers = async () => {
        if(serviceServerSelect.options.length > 1) return;
        
        // Usamos el contenedor de métricas para mostrar spinner/error
        const servers = await fetchReport('get_servers', {}, serviceMetricsResults); 
        if (servers) {
            servers.forEach(server => {
                const option = document.createElement('option');
                option.value = server.user_id;
                option.textContent = server.user_name;
                serviceServerSelect.appendChild(option);
            });
        }
    };

    // --- 4. Reporte de Productos Más Vendidos (Product Mix) ---
    const renderProductMixTable = (data) => {
        if (!data || data.length === 0) {
            return '<p class="no-results"><i class="fas fa-box-open"></i> No se encontraron productos vendidos en el rango seleccionado.</p>';
        }

        let html = '<table class="results-table-report">';
        html += '<thead><tr><th>Producto</th><th class="numeric">Cantidad Vendida</th><th class="numeric">Total Bruto ($)</th></tr></thead>';
        html += '<tbody>';
        
        data.forEach((item, index) => {
            const rowClass = index === 0 ? 'highlight-row' : '';
            const total = parseFloat(item.total_bruto).toFixed(2);
            html += `<tr class="${rowClass}">
                        <td>${item.product_name}</td>
                        <td class="numeric">${item.total_quantity}</td>
                        <td class="numeric">$${total}</td>
                    </tr>`;
        });

        html += '</tbody></table>';
        return html;
    };

    btnRunProductMix.addEventListener('click', async () => {
        const start_date = document.getElementById('productMixStartDate').value;
        const end_date = document.getElementById('productMixEndDate').value;
        
        if (!start_date || !end_date) {
            productMixResults.innerHTML = '<p class="no-results" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Por favor, selecciona ambas fechas.</p>';
            return;
        }

        const data = await fetchReport('get_product_mix', { start_date, end_date }, productMixResults);
        if (data) {
            // Aquí iría el drawBarChart(data) si lo tuvieras implementado
            productMixResults.innerHTML = renderProductMixTable(data);
        }
    });

    // --- 5. Reporte de Cancelaciones ---
    const renderCancellationTable = (data) => {
        const totalLost = data.reduce((sum, item) => sum + parseFloat(item.lost_revenue), 0);
        if (!data || data.length === 0) {
            return '<p class="no-results"><i class="fas fa-ban"></i> No se registraron cancelaciones en el rango seleccionado.</p>';
        }
        
        let html = `
            <div style="margin-bottom: 20px; background-color: #ffebeb; padding: 15px; border-radius: 8px; border-left: 5px solid #e74c3c;">
                <h4 style="margin: 0; color: #c0392b;">Pérdida Total por Cancelaciones: <span style="font-size: 1.5em; font-weight: bold;">$${totalLost.toFixed(2)}</span></h4>
            </div>
            <table class="results-table-report">
                <thead>
                    <tr>
                        <th>Producto Cancelado</th>
                        <th>Razón</th>
                        <th class="numeric">Cantidad</th>
                        <th class="numeric">Pérdida ($)</th>
                    </tr>
                </thead>
                <tbody>`;
        
        data.forEach(item => {
            const revenue = parseFloat(item.lost_revenue).toFixed(2);
            html += `<tr>
                        <td>${item.product_name}</td>
                        <td>${item.cancellation_reason || 'Sin razón especificada'}</td>
                        <td class="numeric">${item.total_canceled_qty}</td>
                        <td class="numeric">$${revenue}</td>
                    </tr>`;
        });

        html += '</tbody></table>';
        return html;
    };

    document.getElementById('btnRunCancellationReport').addEventListener('click', async () => {
        const start_date = document.getElementById('cancellationStartDate').value;
        const end_date = document.getElementById('cancellationEndDate').value;
        
        if (!start_date || !end_date) {
            productMixResults.innerHTML = '<p class="no-results" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Selecciona ambas fechas.</p>';
            return;
        }

        const data = await fetchReport('get_cancellation_report', { start_date, end_date }, productMixResults);
        if (data) {
            productMixResults.innerHTML = renderCancellationTable(data);
        }
    });


    // --- 6. Reporte de Métricas de Servicio (Personas Atendidas) ---
    const renderServiceMetricsTable = (data, totalServed) => {
        if (!data || data.length === 0 || totalServed === 0) {
             return `<p class="no-results"><i class="fas fa-user-slash"></i> No se registraron clientes atendidos en el rango seleccionado.</p>`;
        }
        
        let html = `
            <div style="margin-bottom: 20px; background-color: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 5px solid #4CAF50;">
                <h4 style="margin: 0; color: #1b5e20;">Total de Personas Atendidas en el Período: <span style="font-size: 1.5em; font-weight: bold;">${totalServed}</span></h4>
            </div>
            <table class="results-table-report">
                <thead>
                    <tr>
                        <th>Mesero</th>
                        <th class="numeric">Personas Atendidas</th>
                        <th class="numeric">% del Total</th>
                    </tr>
                </thead>
                <tbody>`;

        data.forEach(item => {
            const percentage = totalServed > 0 ? (item.served_people / totalServed * 100).toFixed(2) : 0;
            html += `<tr>
                        <td>${item.server_name}</td>
                        <td class="numeric">${item.served_people}</td>
                        <td class="numeric">${percentage}%</td>
                    </tr>`;
        });

        html += '</tbody></table>';
        return html;
    };
    
    document.getElementById('btnRunServiceMetrics').addEventListener('click', async () => {
        const start_date = document.getElementById('serviceStartDate').value;
        const end_date = document.getElementById('serviceEndDate').value;
        const server_id = document.getElementById('serviceServerSelect').value || null; 
        
        if (!start_date || !end_date) {
            serviceMetricsResults.innerHTML = '<p class="no-results" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Por favor, selecciona ambas fechas.</p>';
            return;
        }

        const data = await fetchReport('get_service_metrics', { start_date, end_date, server_id }, serviceMetricsResults);
        
        if (data && data.metrics) {
             const totalServed = data.total_served;
             // Aquí iría el drawDoughnutChart(data.metrics, totalServed)
             serviceMetricsResults.innerHTML = renderServiceMetricsTable(data.metrics, totalServed);
        } else if (data) {
             serviceMetricsResults.innerHTML = `<p class="no-results"><i class="fas fa-user-slash"></i> No se registraron clientes atendidos en el rango seleccionado.</p>`;
        }
    });

    // --- 7. Reporte de Rotación y Ocupación (NUEVO) ---
    const renderRotationTable = (data) => {
        if (data.total_closed_tables === 0) {
            return `<p class="no-results"><i class="fas fa-clock"></i> No hay mesas cerradas en este período para calcular rotación.</p>`;
        }

        let html = `
            <div style="margin-bottom: 20px; background-color: #e6f7ff; padding: 15px; border-radius: 8px; border-left: 5px solid #3498db;">
                <h4 style="margin: 0; color: #1e40af;">Métricas de Eficiencia de Servicio</h4>
            </div>
            <table class="results-table-report">
                <thead>
                    <tr>
                        <th>Métrica</th>
                        <th class="numeric">Valor</th>
                    </tr>
                </thead>
                <tbody>`;
        
        html += `<tr class="highlight-row"><td>Tiempo Promedio de Ocupación por Mesa</td><td class="numeric">${data.avg_minutes_occupied} minutos</td></tr>`;
        html += `<tr><td>Total de Mesas Cerradas (Muestra)</td><td class="numeric">${data.total_closed_tables}</td></tr>`;

        html += '</tbody></table>';
        return html;
    };


    // Evento para el Reporte de Rotación (Se usará el mismo botón)
    document.getElementById('btnRunRotationReport').addEventListener('click', async () => {
        const start_date = document.getElementById('rotationStartDate').value;
        const end_date = document.getElementById('rotationEndDate').value;
        
        if (!start_date || !end_date) {
            document.getElementById('rotationResults').innerHTML = '<p class="no-results" style="color: orange;"><i class="fas fa-exclamation-triangle"></i> Por favor, selecciona ambas fechas.</p>';
            return;
        }
        
        const data = await fetchReport('get_table_rotation', { start_date, end_date }, document.getElementById('rotationResults'));
        
        if (data) {
             document.getElementById('rotationResults').innerHTML = renderRotationTable(data);
        }
    });


    // --- 9. Inicialización de Eventos ---
    // Aseguramos que la pestaña inicial esté marcada como activa en el JS
    const initialTab = document.querySelector('.report-tab-link.active');
    if (initialTab) {
        const tabId = initialTab.dataset.tab;
        const contentElement = document.getElementById(tabId);
        if(contentElement) contentElement.style.display = 'block';
        if (tabId === 'service-metrics') loadServers();
    }
});