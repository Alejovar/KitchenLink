// /js/pending_orders.js - VERSIÓN CORREGIDA CON VALIDACIÓN DE ENTREGA

document.addEventListener('DOMContentLoaded', () => {
    const ordersGrid = document.getElementById('ordersGrid');
    const clockContainer = document.getElementById('liveClockContainer');
    
    const API_ENDPOINT = '/KitchenLink/src/api/orders/pending_orders/get_pending_orders.php'; 
    const API_DETAIL = '/KitchenLink/src/api/orders/pending_orders/get_order_details.php'; 
    const API_COMPLETE = '/KitchenLink/src/api/orders/pending_orders/mark_as_completed.php';

    const detailsPanel = document.getElementById('orderDetailsPanel');
    const closeDetailsBtn = document.getElementById('closeDetailsPanel');
    const detailItemsList = document.getElementById('detailItemsList');
    const detailFooter = document.getElementById('detailPanelFooter');

    function closeDetailModal() {
        if (detailsPanel) detailsPanel.classList.remove('active');
    }
    
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', closeDetailModal);
    }
    
    if (detailsPanel) {
        detailsPanel.addEventListener('click', (e) => {
            if (e.target === detailsPanel) {
                closeDetailModal();
            }
        });
    }

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

    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch(API_ENDPOINT + `?t=${Date.now()}`); 
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            const data = await response.json();
            if (data.error || !data.success) throw new Error(data.error || 'Fallo en la API.');
            renderOrders(data.orders_summary, data.server_time); 
        } catch (error) {
            console.error('Error al cargar órdenes:', error);
            ordersGrid.innerHTML = `<p class="error-msg">No se pudieron cargar las órdenes.</p>`;
        }
    }

    function renderOrders(ordersSummary, serverTime) {
        ordersGrid.innerHTML = ''; 
        if (!ordersSummary || ordersSummary.length === 0) {
            ordersGrid.innerHTML = '<p class="no-orders">¡Excelente! No tienes ninguna orden pendiente.</p>';
            return;
        }
        const serverNowMs = new Date(serverTime + "Z").getTime(); 
        
        ordersSummary.forEach(order => {
            const orderCard = document.createElement('div');
            const batchTimeMs = new Date(order.batch_timestamp + "Z").getTime(); 
            let timeDiffMinutes = isNaN(batchTimeMs) ? '--' : Math.round((serverNowMs - batchTimeMs) / 60000); 
            if (timeDiffMinutes < 0) timeDiffMinutes = 0; 
            
            const isReadyToCollect = order.kitchen_ready > 0 || order.bar_ready > 0;
            const cardClass = isReadyToCollect ? 'status-ready-collect' : 'status-pending-work';
            orderCard.className = `order-card ${cardClass}`;

            const getStatusHtml = (ready, totalActive, areaName) => {
                let statusClass = 'none';
                let statusText = '--'; 

                if (totalActive > 0) {
                    if (ready >= totalActive) {
                        statusClass = 'ready';
                        statusText = 'LISTO';
                    } else {
                        statusClass = 'in-progress';
                        statusText = 'PENDIENTE';
                    }
                }

                return `
                    <div class="status-item status-${statusClass}">
                        <span class="area-name">${areaName}:</span>
                        <span class="status-text">${statusText}</span>
                        <span class="status-counts">(${ready}/${totalActive})</span>
                    </div>
                `;
            };

            const kitchenStatus = getStatusHtml(order.kitchen_ready, order.total_kitchen_active, 'Cocina');
            const barStatus = getStatusHtml(order.bar_ready, order.total_bar_active, 'Barra');

            orderCard.innerHTML = `
                <div class="order-card-header">
                    <h2>Mesa ${order.table_number} (#${order.order_id})</h2>
                    <span class="time-ago">Hace ${timeDiffMinutes} min</span>
                </div>
                <div class="order-card-body">
                    <div class="area-statuses">
                        ${kitchenStatus}
                        ${barStatus}
                    </div>
                    <button class="btn-detail primary-btn" 
                            data-order-id="${order.order_id}" 
                            data-table-number="${order.table_number}"
                            data-batch-id="${order.batch_id}"
                            data-batch-time="${order.batch_timestamp}"> 
                        Ver Detalle
                    </button>
                </div>
            `;
            ordersGrid.appendChild(orderCard);
        });
    }

    ordersGrid.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-detail');
        if (button) {
            const { orderId, tableNumber, batchId, batchTime } = button.dataset;
            displayOrderDetails(orderId, tableNumber, batchId, batchTime);
        }
    });

    // ✅ FUNCIÓN MODIFICADA
    async function displayOrderDetails(orderId, tableNumber, batchId, batchTime) {
        if (!detailsPanel) return;
        detailsPanel.classList.add('active'); 
        
        document.getElementById('detailOrderId').textContent = orderId;
        document.getElementById('detailTableNumber').textContent = tableNumber;
        document.getElementById('detailBatchTime').textContent = new Date(batchTime + "Z").toLocaleTimeString();
        detailItemsList.innerHTML = '<p class="loading-msg">Cargando detalles...</p>';
        detailFooter.innerHTML = '';

        try {
            const url = `${API_DETAIL}?order_id=${orderId}&batch_id=${batchId}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            const data = await response.json();

            if (data.success) {
                renderDetailItems(data.items);
                
                if (data.items.length > 0) {
                    // ✅ LÓGICA AGREGADA: Verificar si todos los items están listos
                    const allItemsReady = data.items.every(item => item.item_status === 'LISTO');
                    
                    const completeButton = document.createElement('button');
                    completeButton.id = 'completeOrderBtn';
                    completeButton.className = 'primary-btn complete-btn';
                    completeButton.textContent = 'Marcar como Entregado';
                    
                    // ✅ LÓGICA AGREGADA: Deshabilitar el botón si no están todos listos
                    completeButton.disabled = !allItemsReady;

                    // ✅ LÓGICA AGREGADA: Añadir un tooltip para explicar por qué está deshabilitado
                    if (!allItemsReady) {
                        completeButton.title = 'Todos los productos deben estar en estado "LISTO" para entregar.';
                    }
                    
                    completeButton.addEventListener('click', () => {
                        handleCompleteOrder(orderId, batchId);
                    });
                    
                    detailFooter.appendChild(completeButton);
                }
            } else {
                detailItemsList.innerHTML = `<p class="error-msg">Error: ${data.message || 'Fallo de API.'}</p>`;
            }
        } catch (error) {
            console.error('Error al obtener detalles:', error);
            detailItemsList.innerHTML = `<p class="error-msg">Error de conexión al obtener detalles.</p>`;
        }
    }
    
    function renderDetailItems(items) {
        detailItemsList.innerHTML = '';
        if (items.length === 0) {
            detailItemsList.innerHTML = '<p>No se encontraron ítems activos en este lote.</p>';
            return;
        }

        let itemsHtml = `
            <div class="detail-item detail-header">
                <span class="item-qty">Cant.</span>
                <span class="item-name">Producto / Notas</span>
                <span class="item-time">Tiempo</span>
                <span class="item-status status-area">Área</span>
                <span class="item-status status-state">Estado</span>
            </div>
        `;

        itemsHtml += items.map(item => {
            const statusClass = item.item_status === 'LISTO' ? 'ready' : (item.item_status === 'EN_PREPARACION' ? 'preparing' : 'pending');
            const areaClass = item.preparation_area === 'BARRA' ? 'bar' : 'kitchen';
            const notesHtml = item.special_notes ? `<span class="detail-notes">(${item.special_notes})</span>` : '';
            
            return `
                <div class="detail-item detail-status-${statusClass}">
                    <span class="item-qty">${item.quantity}x</span>
                    <span class="item-name">${item.product_name} ${notesHtml}</span>
                    <span class="item-time">T${item.service_time}</span>
                    <span class="item-status status-${areaClass}">${item.preparation_area}</span>
                    <span class="item-status status-${statusClass}">${item.item_status.replace('_', ' ')}</span>
                </div>
            `;
        }).join('');
        
        detailItemsList.innerHTML = itemsHtml;
    }

    async function handleCompleteOrder(orderId, batchId) {
        const btn = document.getElementById('completeOrderBtn');
        btn.disabled = true;
        btn.textContent = 'Procesando...';

        try {
            const response = await fetch(API_COMPLETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, batch_id: batchId })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Error desconocido del servidor.');
            }

            closeDetailModal();
            fetchAndDisplayOrders();

        } catch (error) {
            alert(`Error al completar la orden: ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Marcar como Entregado';
        }
    }

    updateClock();
    setInterval(updateClock, 1000); 

    fetchAndDisplayOrders(); 
    setInterval(fetchAndDisplayOrders, 5000); 
});