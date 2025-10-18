// /js/pending_orders.js - VERSIÓN SINCRONIZADA CON ESTADO POR ÁREA Y PANEL LATERAL

document.addEventListener('DOMContentLoaded', () => {
    const ordersGrid = document.getElementById('ordersGrid');
    const clockContainer = document.getElementById('liveClockContainer');
    
    // Rutas de API
    const API_ENDPOINT = '/KitchenLink/src/api/orders/pending_orders/get_pending_orders.php'; 
    const API_DETAIL = '/KitchenLink/src/api/orders/pending_orders/get_order_details.php'; 

    // Referencias del Panel Lateral
    const detailsPanel = document.getElementById('orderDetailsPanel');
    
    // 🟢 CORRECCIÓN CLAVE: Selecciona el botón de cierre por su ID
    const closeDetailsBtn = document.getElementById('closeDetailsPanel');
    
    const detailItemsList = document.getElementById('detailItemsList');

    // Función para cerrar el panel lateral
    function closeDetailModal() {
        if (detailsPanel) detailsPanel.classList.remove('active');
    }
    
    // 🟢 CORRECCIÓN: Asigna el listener al botón de cierre usando su ID
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', closeDetailModal);
    }
    
    // Permite cerrar el modal haciendo clic en el fondo oscuro
    if (detailsPanel) {
        detailsPanel.addEventListener('click', (e) => {
            if (e.target === detailsPanel) {
                closeDetailModal();
            }
        });
    }

    // --- Lógica del Reloj ---
    // ... (El resto del código JavaScript sin cambios)
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

    // --- Función Principal: Obtener y Mostrar Órdenes ---
    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch(API_ENDPOINT + `?t=${Date.now()}`); 
            
            if (!response.ok) {
                 const errorText = await response.text(); 
                 throw new Error(`Error de red: ${response.status} ${response.statusText}. Respuesta del servidor: ${errorText.substring(0, 100)}...`);
            }
            
            const data = await response.json();
            
            if (data.error || !data.success) {
                 throw new Error(data.error || 'Fallo en la API.');
            }
            
            renderOrders(data.orders_summary, data.server_time); 

        } catch (error) {
            console.error('Error al cargar órdenes:', error);
            ordersGrid.innerHTML = `<p class="error-msg">No se pudieron cargar las órdenes. Detalle: ${error.message}</p>`;
        }
    }

    function renderOrders(ordersSummary, serverTime) {
        ordersGrid.innerHTML = ''; 

        if (!ordersSummary || ordersSummary.length === 0) {
            ordersGrid.innerHTML = '<p class="no-orders">¡Excelente! No tienes ninguna orden pendiente.</p>';
            return;
        }

        const serverNowMs = new Date(serverTime).getTime(); 

        ordersSummary.forEach(order => {
            const orderCard = document.createElement('div');
            
            const batchTimeMs = new Date(order.batch_timestamp).getTime(); 

            let timeDiffMinutes = isNaN(batchTimeMs) 
                ? '--' 
                : Math.round((serverNowMs - batchTimeMs) / 60000); 
            
            if (timeDiffMinutes < 0) timeDiffMinutes = 0; 

            const isReadyToCollect = order.kitchen_ready > 0 || order.bar_ready > 0;
            const cardClass = isReadyToCollect ? 'status-ready-collect' : 'status-pending-work';
            
            orderCard.className = `order-card ${cardClass}`;

            const getStatusHtml = (ready, pending, totalActive, areaName) => {
                if (totalActive === 0) return '';
                
                const statusClass = ready > 0 ? 'ready' : (pending > 0 ? 'in-progress' : 'completed');
                const statusText = ready > 0 ? 'LISTO' : (pending > 0 ? 'PENDIENTE' : 'COMPLETADO');
                const pendingCount = totalActive - ready;
                
                return `
                    <div class="status-item status-${statusClass}">
                        <span class="area-name">${areaName}:</span>
                        <span class="status-text">${statusText}</span>
                        <span class="status-counts">(${pendingCount}/${totalActive})</span>
                    </div>
                `;
            };

            const kitchenStatus = getStatusHtml(order.kitchen_ready, order.kitchen_pending, order.total_kitchen_active, 'Cocina');
            const barStatus = getStatusHtml(order.bar_ready, order.bar_pending, order.total_bar_active, 'Barra');


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
                            data-batch-time="${order.batch_timestamp}">
                        Ver Detalle
                    </button>
                </div>
            `;
            ordersGrid.appendChild(orderCard);
        });
        
        // --- ASIGNACIÓN DE LISTENER DELEGADO ---
        ordersGrid.addEventListener('click', function handler(e) {
            const button = e.target.closest('.btn-detail');
            if (button) {
                ordersGrid.removeEventListener('click', handler); 
                
                const { orderId, tableNumber, batchTime } = button.dataset;
                displayOrderDetails(orderId, tableNumber, batchTime);
            }
        }, { once: true });
    }

    // --- Lógica del Panel de Detalles ---
    async function displayOrderDetails(orderId, tableNumber, batchTime) {
        if (!detailsPanel) return;

        detailsPanel.classList.add('active'); 
        
        // Referencias de cabecera
        const detailOrderIdRef = document.getElementById('detailOrderId');
        const detailTableNumberRef = document.getElementById('detailTableNumber');
        const detailBatchTimeRef = document.getElementById('detailBatchTime');

        detailOrderIdRef.textContent = orderId;
        detailTableNumberRef.textContent = tableNumber;
        
        // Formato de hora legible (usando la hora del batch)
        detailBatchTimeRef.textContent = new Date(batchTime).toLocaleTimeString(); 
        detailItemsList.innerHTML = '<p class="loading-msg">Cargando detalles...</p>';

        try {
            const encodedBatchTime = encodeURIComponent(batchTime);
            const url = `${API_DETAIL}?order_id=${orderId}&batch_timestamp=${encodedBatchTime}`;
            
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            
            const data = await response.json();

            if (data.success) {
                if (data.items.length === 0 && data.message) {
                    detailItemsList.innerHTML = `<p class="error-msg">${data.message}</p>`;
                } else {
                    renderDetailItems(data.items);
                }
            } else {
                detailItemsList.innerHTML = `<p class="error-msg">Error: ${data.message || 'Fallo de API.'}</p>`;
            }
        } catch (error) {
            console.error('Error al obtener detalles de orden:', error);
            detailItemsList.innerHTML = `<p class="error-msg">Error de conexión al obtener detalles. Detalle: ${error.message}</p>`;
        }
    }
    
    function renderDetailItems(items) {
        // ... (Tu función renderDetailItems sin cambios)
        detailItemsList.innerHTML = '';
        if (items.length === 0) {
            detailItemsList.innerHTML = '<p>No se encontraron ítems activos en este lote.</p>';
            return;
        }

        // Estructura de encabezados de la lista de detalles
        let itemsHtml = `
            <div class="detail-item detail-header">
                <span class="item-qty">Cant.</span>
                <span class="item-name">Producto / Notas</span>
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
                    <span class="item-status status-${areaClass}">${item.preparation_area}</span>
                    <span class="item-status status-${statusClass}">${item.item_status}</span>
                </div>
            `;
        }).join('');
        
        detailItemsList.innerHTML = itemsHtml;
    }

    // --- INICIALIZACIÓN ---
    updateClock();
    setInterval(updateClock, 1000); 

    fetchAndDisplayOrders(); 
    setInterval(fetchAndDisplayOrders, 5000); 
});