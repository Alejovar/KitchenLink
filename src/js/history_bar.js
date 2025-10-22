/*******************************************************
* /src/js/history_bar.js - VERSIÓN CON HORA CORREGIDA
********************************************************/

document.addEventListener('DOMContentLoaded', () => {
    const clockContainer = document.getElementById('liveClockContainer');
    const barHistoryGrid = document.getElementById('barHistoryGrid');
    const datePicker = document.getElementById('historyDate');
    const API_ENDPOINT = '/KitchenLink/src/api/bar/get_bar_history.php';

    // ✅ SE AÑADE LA FUNCIÓN DE CONVERSIÓN DE HORA
    function parseUTCTimestamp(sqlTimestamp) {
        if (!sqlTimestamp) return new Date(NaN);
        let clean = sqlTimestamp.replace('T', ' ').replace('Z', '').trim().split('.')[0];
        const parts = clean.split(' ');
        if (parts.length < 2) return new Date(NaN);
        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map(Number);
        // Crea la fecha como si fuera UTC, para que JS la convierta a local
        const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        return isNaN(date.getTime()) ? new Date(NaN) : date;
    }

    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockContainer.textContent = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' }) + ` ${hours}:${minutes}:${seconds}`;
    }

    async function fetchAndDisplayHistory(date) {
        barHistoryGrid.innerHTML = '<p class="loading-msg">Cargando historial...</p>';
        try {
            const response = await fetch(`${API_ENDPOINT}?date=${date}`);
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Fallo en la API.');
            const groupedOrders = groupItemsByLote(data.production_items);
            renderHistoryItems(groupedOrders);
        } catch (error) {
            console.error('Error al cargar el historial de barra:', error);
            barHistoryGrid.innerHTML = `<p class="error-msg">Error: No se pudo cargar el historial.</p>`;
        }
    }

    function renderHistoryItems(groupedOrders) {
        barHistoryGrid.innerHTML = ''; 
        if (!groupedOrders || groupedOrders.length === 0) {
            barHistoryGrid.innerHTML = '<p class="no-orders">No se encontró producción de barra para esta fecha.</p>';
            return;
        }
        groupedOrders.forEach(orderGroup => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'production-card history-card';
            cardWrapper.innerHTML = createHistoryCardHtml(orderGroup);
            barHistoryGrid.appendChild(cardWrapper);
        });
    }

    function createHistoryCardHtml(orderGroup) {
        // ✅ SE USA LA NUEVA FUNCIÓN PARA OBTENER LA FECHA CORRECTA
        const entryDate = parseUTCTimestamp(orderGroup.added_at);
        const entryTime = entryDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let itemsListHtml = '', totalItems = 0;
        const sortedTimes = Object.keys(orderGroup.times).sort((a, b) => a - b);

        sortedTimes.forEach(time => {
            itemsListHtml += `<div class="time-separator">--- Tiempo ${time} ---</div>`;
            orderGroup.times[time].forEach(item => {
                totalItems += item.quantity;
                const modifierHtml = item.modifier_name ? `<span class="item-modifier">(${item.modifier_name})</span>` : '';
                const notesHtml = item.special_notes ? `<span class="item-notes">(${item.special_notes})</span>` : '';
                itemsListHtml += `
                    <div class="product-item status-listo">
                        <span class="product-qty">${item.quantity}x</span>
                        <span class="product-name">${item.product_name} ${modifierHtml} ${notesHtml}</span>
                    </div>
                `;
            });
        });

        return `
            <div class="card-header status-bg-listo">
                <span class="table-info">Mesa ${orderGroup.table_number} (#${orderGroup.order_id})</span>
            </div>
            <div class="card-meta">
                <span>Mesero: <strong>${orderGroup.server_name}</strong></span>
                <span>Entrada: <strong>${entryTime}</strong></span>
            </div>
            <div class="card-body">${itemsListHtml}</div>
            <div class="card-footer">
                <span class="item-status">COMPLETADO (${totalItems}/${totalItems})</span>
            </div>
        `;
    }

    function groupItemsByLote(items) {
        const grouped = {};
        if (!items) return [];
        items.forEach(item => {
            const loteKey = `${item.order_id}_${item.added_at}`;
            if (!grouped[loteKey]) {
                grouped[loteKey] = {
                    order_id: item.order_id, table_number: item.table_number,
                    server_name: item.server_name, added_at: item.added_at, times: {},
                };
            }
            const time = item.service_time;
            if (!grouped[loteKey].times[time]) {
                grouped[loteKey].times[time] = [];
            }
            grouped[loteKey].times[time].push(item);
        });
        return Object.values(grouped);
    }
    
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.max = today;

    fetchAndDisplayHistory(today);
    datePicker.addEventListener('change', () => fetchAndDisplayHistory(datePicker.value));
    updateClock();
    setInterval(updateClock, 1000);
});