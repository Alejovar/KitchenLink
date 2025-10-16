// /js/pending_orders.js - VERSIÓN SINCRONIZADA CON EL RELOJ DE orders.js

document.addEventListener('DOMContentLoaded', () => {
    const ordersGrid = document.getElementById('ordersGrid');
    const clockContainer = document.getElementById('liveClockContainer');

    // --- Lógica del Reloj (idéntica a la de orders.js) ---
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

    // --- Lógica para obtener y mostrar órdenes ---
    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch('/KitchenLink/src/api/orders/pending_orders/get_pending_orders.php');
            if (!response.ok) throw new Error('Error de red al obtener las órdenes.');
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            renderOrders(data);

        } catch (error) {
            console.error('Error:', error);
            ordersGrid.innerHTML = '<p class="no-orders">No se pudieron cargar las órdenes. Inténtalo de nuevo más tarde.</p>';
        }
    }

    function renderOrders(data) {
        ordersGrid.innerHTML = ''; // Limpiar la vista

        if (!data.orders || data.orders.length === 0) {
            ordersGrid.innerHTML = '<p class="no-orders">¡Excelente! No tienes ninguna orden pendiente.</p>';
            return;
        }

        const serverNow = new Date(data.server_time);

        data.orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';

            const orderTime = new Date(order.order_time);
            const timeDiffMinutes = Math.round((serverNow - orderTime) / 60000);
            
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<li><span class="quantity">${item.quantity}x</span>${item.name}</li>`;
            });

            orderCard.innerHTML = `
                <div class="order-card-header">
                    <h2>Mesa ${order.table_number}</h2>
                    <span class="time-ago">Hace ${timeDiffMinutes} min</span>
                </div>
                <div class="order-card-body">
                    <ul>${itemsHtml}</ul>
                </div>
            `;
            ordersGrid.appendChild(orderCard);
        });
    }

    // --- Inicialización ---
    updateClock();
    setInterval(updateClock, 1000); // Actualiza el reloj cada segundo

    fetchAndDisplayOrders(); // Carga las órdenes la primera vez
    setInterval(fetchAndDisplayOrders, 5000); // Refresca las órdenes cada 5 segundos
});
