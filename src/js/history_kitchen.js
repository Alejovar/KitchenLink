/*******************************************************
* /src/js/history_kitchen.js - Lógica para el Historial de Cocina
********************************************************/

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const clockContainer = document.getElementById('liveClockContainer');
    const historyGrid = document.getElementById('kitchenHistoryGrid');
    const datePicker = document.getElementById('historyDate');
    
    // --- ENDPOINT DE LA API ---
    const API_ENDPOINT = '/KitchenLink/src/api/kitchen/get_kitchen_history.php';

    // --- FUNCIONES ---

    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockContainer.textContent = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' }) + ` ${hours}:${minutes}:${seconds}`;
    }

    async function fetchAndDisplayHistory(date) {
        historyGrid.innerHTML = '<p class="loading-msg">Cargando historial...</p>';
        try {
            const response = await fetch(`${API_ENDPOINT}?date=${date}`);
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Fallo en la API.');
            
            const groupedOrders = groupItemsByLote(data.production_items);
            renderHistoryItems(groupedOrders);

        } catch (error) {
            console.error('Error al cargar el historial:', error);
            historyGrid.innerHTML = `<p class="error-msg">Error: No se pudo cargar el historial.</p>`;
        }
    }

    function renderHistoryItems(groupedOrders) {
        historyGrid.innerHTML = ''; 
        if (!groupedOrders || groupedOrders.length === 0) {
            historyGrid.innerHTML = '<p class="no-orders">No se encontró producción para esta fecha.</p>';
            return;
        }
        groupedOrders.forEach(orderGroup => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'production-card history-card';
            cardWrapper.innerHTML = createHistoryCardHtml(orderGroup);
            historyGrid.appendChild(cardWrapper);
        });
    }

    function createHistoryCardHtml(orderGroup) {
        const entryDate = new Date(orderGroup.added_at);
        const entryTime = entryDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let itemsListHtml = '';
        let totalItems = 0;
        const sortedTimes = Object.keys(orderGroup.times).sort((a, b) => a - b);

        sortedTimes.forEach(time => {
            itemsListHtml += `<div class="time-separator">--- Tiempo ${time} ---</div>`;
            orderGroup.times[time].forEach(item => {
                totalItems += item.quantity;
                const notesHtml = item.special_notes ? `<span class="item-notes">(${item.special_notes})</span>` : '';
                itemsListHtml += `
                    <div class="product-item status-listo">
                        <span class="product-qty">${item.quantity}x</span>
                        <span class="product-name">${item.product_name} ${notesHtml}</span>
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
            <div class="card-body">
                ${itemsListHtml}
            </div>
            <div class="card-footer">
                <span class="item-status">
                    COMPLETADO (${totalItems}/${totalItems})
                </span>
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
                    order_id: item.order_id,
                    table_number: item.table_number,
                    server_name: item.server_name,
                    added_at: item.added_at,
                    times: {},
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
    
    // --- INICIALIZACIÓN Y EVENTOS ---

    // 1. Establecer la fecha de hoy y el límite máximo
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.max = today; // ✅ ¡AQUÍ ESTÁ EL CAMBIO!

    // 2. Cargar los datos del día de hoy al entrar a la página
    fetchAndDisplayHistory(today);

    // 3. Añadir un listener para que, cuando el usuario cambie la fecha, se recarguen los datos
    datePicker.addEventListener('change', () => {
        fetchAndDisplayHistory(datePicker.value);
    });

    // 4. Iniciar y actualizar el reloj
    updateClock();
    setInterval(updateClock, 1000);
});