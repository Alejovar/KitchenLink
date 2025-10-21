/*******************************************************
* /src/js/kitchen_logic.js - Versión Completa Corregida
********************************************************/

document.addEventListener('DOMContentLoaded', () => {
    const clockContainer = document.getElementById('liveClockContainer');
    const kitchenGrid = document.getElementById('kitchenOrdersGrid');
    
    const API_ENDPOINT = '/KitchenLink/src/api/kitchen/get_kitchen_orders.php'; 
    const API_ACTION_ENDPOINT = '/KitchenLink/src/api/kitchen/update_item_status.php';

    /**
     * Parsea una fecha/hora de SQL (potencialmente en formato UTC) a un objeto Date de JS.
     * Es robusto para manejar diferentes formatos comunes.
     * @param {string | null} sqlTimestamp - El string de la fecha desde la base de datos.
     * @returns {Date} Un objeto Date. Será un Date inválido si el input es incorrecto.
     */
    function parseUTCTimestamp(sqlTimestamp) {
        if (!sqlTimestamp) return new Date(NaN);

        // Normalizar: reemplazar 'T' con espacio y quitar 'Z' o milisegundos.
        let clean = sqlTimestamp.replace('T', ' ').replace('Z', '').trim();
        clean = clean.split('.')[0]; // Eliminar milisegundos si existen.

        const parts = clean.split(' ');
        if (parts.length < 2) return new Date(NaN);

        const [datePart, timePart] = parts;
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours = 0, minutes = 0, seconds = 0] = timePart.split(':').map(Number);

        // Crear la fecha como si fuera UTC.
        const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

        return isNaN(date.getTime()) ? new Date(NaN) : date;
    }

    /**
     * Actualiza el reloj en la interfaz.
     */
    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockContainer.textContent = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' }) + ` ${hours}:${minutes}:${seconds}`;
    }

    /**
     * Envía una petición a la API para cambiar el estado de un item.
     * @param {number} detailId - El ID del detalle de la orden a actualizar.
     * @param {string} newStatus - El nuevo estado ('EN_PREPARACION', 'LISTO').
     */
    async function updateItemStatus(detailId, newStatus) {
        try {
            const response = await fetch(API_ACTION_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ detail_id: detailId, new_status: newStatus })
            });
            const data = await response.json();
            if (data.success) {
                fetchAndDisplayProductionOrders(); // Recargar las órdenes para ver el cambio.
            } else {
                alert('Error al actualizar estado: ' + data.message);
            }
        } catch (error) {
            console.error('Fallo en la conexión al actualizar:', error);
            alert('Error de conexión con el servidor.');
        }
    }

    /**
     * Obtiene las órdenes de producción desde la API y las muestra.
     */
    async function fetchAndDisplayProductionOrders() {
        try {
            const response = await fetch(API_ENDPOINT + `?t=${Date.now()}`); // Cache-busting
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            const data = await response.json();
            if (data.error || !data.success) throw new Error(data.error || 'Fallo en la API.');
            
            const groupedOrders = groupItemsByLote(data.production_items);
            // CORRECCIÓN: Ya no pasamos la hora del servidor. Usaremos la del cliente.
            renderProductionItems(groupedOrders); 

        } catch (error) {
            console.error('Error al cargar órdenes de producción:', error);
            kitchenGrid.innerHTML = `<p class="error-msg">Error: No se pudieron cargar las órdenes.</p>`;
        }
    }

    /**
     * Agrupa los items de productos por lotes (misma orden y misma hora de adición).
     * @param {Array} items - El array de productos desde la API.
     * @returns {Array} Un array de órdenes agrupadas.
     */
    function groupItemsByLote(items) {
        const grouped = {};
        items.forEach(item => {
            const loteKey = `${item.order_id}_${item.added_at}`;
            if (!grouped[loteKey]) {
                grouped[loteKey] = {
                    order_id: item.order_id, table_number: item.table_number,
                    server_name: item.server_name, server_id: item.server_id,
                    order_time: item.order_time, added_at: item.added_at, times: {},
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
    
    /**
     * Renderiza las tarjetas de producción en la parrilla de la cocina.
     * @param {Array} groupedOrders - Las órdenes ya agrupadas por lotes.
     */
    function renderProductionItems(groupedOrders) {
        // CORRECCIÓN: Usamos la hora del navegador (cliente) para los cálculos.
        const nowMs = Date.now(); 
        
        const existingCardKeys = new Set(Array.from(document.querySelectorAll('.production-card')).map(c => c.dataset.loteKey));
        const incomingCardKeys = new Set(groupedOrders.map(g => `${g.order_id}_${g.added_at}`));

        // Eliminar tarjetas que ya no vienen en los datos
        existingCardKeys.forEach(key => {
            if (!incomingCardKeys.has(key)) {
                document.querySelector(`[data-lote-key="${key}"]`)?.remove();
            }
        });

        // Actualizar o crear tarjetas nuevas
        groupedOrders.forEach(orderGroup => {
            const loteKey = `${orderGroup.order_id}_${orderGroup.added_at}`;
            const existingCard = document.querySelector(`[data-lote-key="${loteKey}"]`);
            const newCardHtml = createItemHtml(orderGroup, nowMs); // Pasamos la hora actual

            if (existingCard) {
                // Actualizar solo si el contenido cambió para evitar repintados innecesarios
                if (existingCard.innerHTML.trim() !== newCardHtml.trim()) {
                    existingCard.innerHTML = newCardHtml;
                }
            } else {
                const cardWrapper = document.createElement('div');
                cardWrapper.className = 'production-card';
                cardWrapper.dataset.loteKey = loteKey;
                cardWrapper.innerHTML = newCardHtml;
                kitchenGrid.appendChild(cardWrapper);
            }
        });

        // Mostrar mensaje si no hay órdenes
        if (kitchenGrid.childElementCount === 0) {
            kitchenGrid.innerHTML = '<p class="no-orders">¡Todas las órdenes listas!</p>';
        } else {
            kitchenGrid.querySelector('.no-orders, .loading-msg')?.remove();
        }
    }
    
    /**
     * Crea el HTML para una sola tarjeta de producción.
     * @param {object} orderGroup - El grupo de items para una tarjeta.
     * @param {number} nowMs - La hora actual en milisegundos.
     * @returns {string} El string HTML de la tarjeta.
     */
    function createItemHtml(orderGroup, nowMs) {
        const addedAtDate = parseUTCTimestamp(orderGroup.added_at);
        const addedTimeMs = addedAtDate.getTime();

        // CORRECCIÓN: El cálculo ahora usa la hora del navegador.
        let timeDiffMinutes = isNaN(addedTimeMs) ? '--' : Math.round((nowMs - addedTimeMs) / 60000); 
        if (timeDiffMinutes < 0) timeDiffMinutes = 0; // Evitar negativos por desincronización de reloj.
        
        const entryTime = !isNaN(addedTimeMs) ? addedAtDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Hora inválida';
        
        let totalPending = 0;
        let totalPreparing = 0;
        let totalItems = 0;
        let itemsListHtml = '';
        const sortedTimes = Object.keys(orderGroup.times).sort((a, b) => a - b);

        sortedTimes.forEach(time => {
            itemsListHtml += `<div class="time-separator">--- Tiempo ${time} ---</div>`;
            
            orderGroup.times[time].forEach(item => {
                totalItems++;
                if (item.item_status === 'PENDIENTE') totalPending++;
                if (item.item_status === 'EN_PREPARACION') totalPreparing++;
                
                const notesHtml = item.special_notes ? `<span class="item-notes">(${item.special_notes})</span>` : '';
                const itemStatusClass = item.item_status.toLowerCase().replace('_', '-');
                
                itemsListHtml += `
                    <div class="product-item status-${itemStatusClass}" data-detail-id="${item.detail_id}" data-status="${item.item_status}">
                        <span class="product-qty">${item.quantity}x</span>
                        <span class="product-name">${item.product_name} ${notesHtml}</span>
                        <span class="status-indicator"></span>
                    </div>
                `;
            });
        });

        const totalPendingWork = totalPending + totalPreparing;
        const consolidatedStatus = totalPreparing > 0 || (totalPending > 0 && totalItems > totalPending) ? 'EN_PREPARACION' : 'PENDIENTE';
        const statusClass = consolidatedStatus.toLowerCase().replace('_', '-');

        const invalidWarn = isNaN(addedTimeMs) ? `<div class="invalid-time-warn">⚠️ Error de hora (${orderGroup.added_at})</div>` : '';

        return `
            ${invalidWarn}
            <div class="card-header status-bg-${statusClass}">
                <span class="table-info">Mesa ${orderGroup.table_number} (#${orderGroup.order_id})</span>
                <span class="time-ago">Hace ${timeDiffMinutes} min</span>
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
                    ${consolidatedStatus.replace('_', ' ')} (${totalPendingWork}/${totalItems})
                </span>
            </div>
        `;
    }

    /**
     * Manejador de eventos para clicks en la parrilla.
     * Delega el click a los items de producto para cambiar su estado.
     */
    kitchenGrid.addEventListener('click', (e) => {
        const productItem = e.target.closest('.product-item');
        if (!productItem) return;

        const detailId = productItem.dataset.detailId;
        const currentStatus = productItem.dataset.status;

        let newStatus = null;
        if (currentStatus === 'PENDIENTE') {
            newStatus = 'EN_PREPARACION';
        } else if (currentStatus === 'EN_PREPARACION') {
            newStatus = 'LISTO';
        }
        
        if (detailId && newStatus) {
            updateItemStatus(detailId, newStatus);
        }
    });

    // --- INICIALIZACIÓN ---
    updateClock();
    setInterval(updateClock, 1000); // Actualizar el reloj cada segundo.
    
    fetchAndDisplayProductionOrders(); // Cargar órdenes inmediatamente.
    setInterval(fetchAndDisplayProductionOrders, 5000); // Recargar órdenes cada 5 segundos.
});