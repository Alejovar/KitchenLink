// tpv.js - VERSIÓN FINAL Y DEFINITIVA

// Rutas a los endpoints PHP (AJAX)
const API_ROUTES = {
    API_PRODUCT_URL: '/KitchenLink/src/api/orders/tpv/get_products_by_category.php',
    API_MODIFIER_URL: '/KitchenLink/src/api/orders/tpv/get_product_modifiers.php',
    API_SEND_ORDER: '/KitchenLink/src/api/orders/tpv/send_order.php'
};

// Referencias del DOM (se obtendrán dentro de DOMContentLoaded)
let categoryList, productGrid, orderItems, orderTotalElement, sendOrderBtn, quantitySelector, addTimeBtn,
    commentModal, commentModalItemName, commentInput, commentItemIndex, saveCommentBtn, cancelCommentBtn,
    closeCommentModalBtn, modifierModal, modalProductName, modifierGroupName, modifierOptions,
    closeModifierModalBtn, clockContainer;

// Variables de estado
const tableNumber = parseInt(new URLSearchParams(window.location.search).get('table')) || 0;
let currentOrder = [];
let currentProduct = null;
let timeCounter = 1;
let lastItemWasTime = false;
const LOCK_TIME_MS = 60000; // 1 minuto

// Variable para la hora del servidor que usaremos para los cálculos
let serverNow = Date.now();

// --- Lógica de Reloj ---
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

// --- Lógica de Orden y Precios ---
function updateOrderTotal() {
    const total = currentOrder.filter(item => item.type === 'product').reduce((sum, item) => sum + item.price, 0);
    orderTotalElement.textContent = `$${total.toFixed(2)}`;
}

function addItemToOrder(item) {
    currentOrder.push({ ...item, type: 'product', comment: '' });
    lastItemWasTime = false;
    renderOrderSummary();
}

function renderOrderSummary() {
    orderItems.innerHTML = '';
    if (currentOrder.length === 0) {
        orderItems.innerHTML = '<p class="text-center">Aún no hay productos.</p>';
        updateOrderTotal();
        return;
    }

    // Usamos la variable serverNow para un cálculo consistente
    const now = serverNow;

    currentOrder.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        const isItemEditable = !item.sentTimestamp || (now - item.sentTimestamp < LOCK_TIME_MS);
        const removeButtonHTML = `<button class="btn-remove" data-index="${index}">&times;</button>`;

        if (item.type === 'time') {
            itemDiv.className = 'order-time-separator';
            itemDiv.innerHTML = `<span>${item.name}</span>`;
        } else if (item.type === 'product') {
            itemDiv.className = 'order-item';
            itemDiv.dataset.index = index;
            const commentHTML = (item.comment && item.comment.trim() !== '') ? `<span class="item-comment"><i class="fas fa-sticky-note"></i> ${item.comment}</span>` : '';
            itemDiv.innerHTML = `
                <div class="item-details"><span class="item-name">${item.name}</span>${commentHTML}</div>
                <span class="item-price">$${item.price.toFixed(2)}</span>
                ${isItemEditable ? removeButtonHTML : '<span class="item-locked"><i class="fas fa-lock"></i></span>'}`;
        }
        orderItems.appendChild(itemDiv);
    });

    const hasSentItems = currentOrder.some(item => typeof item.sentTimestamp === 'number');
    sendOrderBtn.textContent = hasSentItems ? 'Actualizar Orden' : 'Enviar a Cocina';
    const hasNewItems = currentOrder.some(item => !item.sentTimestamp && item.type === 'product');
    sendOrderBtn.disabled = !hasNewItems;
    updateOrderTotal();
}

async function sendOrderToKitchen() {
    const newItemsToSend = currentOrder.filter(item => !item.sentTimestamp && item.type === 'product');
    if (newItemsToSend.length === 0) {
        alert('No hay productos nuevos para enviar.');
        return;
    }
    sendOrderBtn.disabled = true;
    sendOrderBtn.textContent = 'Enviando...';
    try {
        const response = await fetch(API_ROUTES.API_SEND_ORDER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number: tableNumber, items: newItemsToSend })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Error desconocido.');

        alert('¡Orden enviada/actualizada!');
        
        const now = Date.now();
        currentOrder.forEach(item => {
            if (!item.sentTimestamp && item.type === 'product') {
                item.sentTimestamp = now;
            }
        });
        renderOrderSummary();
    } catch (error) {
        alert(`Error: ${error.message}`);
        renderOrderSummary();
    }
}

// --- Lógica de Interfaz y Productos ---
function renderProducts(products) {
    productGrid.innerHTML = '';
    if (products.length === 0) {
        productGrid.innerHTML = '<p>No hay productos en esta categoría.</p>';
        return;
    }
    products.forEach(product => {
        const button = document.createElement('button');
        button.className = 'product-item-btn';
        button.dataset.productId = product.product_id;
        button.dataset.price = product.price;
        button.dataset.modifierGroupId = product.modifier_group_id;
        button.innerHTML = `<span class="product-name">${product.name}</span><span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>`;
        productGrid.appendChild(button);
    });
}
async function handleCategoryClick(categoryId, element) {
    productGrid.innerHTML = '<p id="productLoading">Cargando productos...</p>';
    document.querySelectorAll('.category-item').forEach(item => item.classList.remove('active'));
    if (element) element.classList.add('active');
    try {
        const response = await fetch(`${API_ROUTES.API_PRODUCT_URL}?category_id=${categoryId}`);
        const data = await response.json();
        if (data.success) {
            renderProducts(data.products);
        } else {
            productGrid.innerHTML = `<p class="error">Error: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error al obtener productos:', error);
        productGrid.innerHTML = '<p class="error">Error de conexión con el servidor.</p>';
    }
}
async function loadModifiers(groupId) {
    modalProductName.textContent = currentProduct.name;
    modifierOptions.innerHTML = '<p>Cargando opciones...</p>';
    modifierModal.style.display = 'flex';
    try {
        const url = `${API_ROUTES.API_MODIFIER_URL}?group_id=${groupId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success) {
            modifierGroupName.textContent = data.group_name || 'Opción';
            renderModifiers(data.modifiers);
        } else {
            modifierGroupName.textContent = 'Error';
            modifierOptions.innerHTML = `<p class="error">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error al obtener modificadores:', error);
        modifierGroupName.textContent = 'Error:';
        modifierOptions.innerHTML = '<p class="error">Error de conexión.</p>';
    }
}
function renderModifiers(modifiers) {
    modifierOptions.innerHTML = '';
    modifiers.forEach(mod => {
        const label = document.createElement('label');
        label.className = 'modifier-option';
        label.innerHTML = `<input type="radio" name="modifier-choice" value="${mod.modifier_id}" data-price="${mod.modifier_price}">${mod.modifier_name} ${parseFloat(mod.modifier_price) > 0 ? `(+$${parseFloat(mod.modifier_price).toFixed(2)})` : ''}`;
        modifierOptions.appendChild(label);
    });
}

// --- Event Listeners y Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener todas las referencias del DOM
    categoryList = document.getElementById('categoryList');
    productGrid = document.getElementById('productGrid');
    orderItems = document.getElementById('orderItems');
    orderTotalElement = document.getElementById('orderTotal');
    sendOrderBtn = document.getElementById('sendOrderBtn');
    quantitySelector = document.getElementById('quantitySelector');
    addTimeBtn = document.getElementById('addTimeBtn');
    commentModal = document.getElementById('commentModal');
    commentModalItemName = document.getElementById('commentModalItemName');
    commentInput = document.getElementById('commentInput');
    commentItemIndex = document.getElementById('commentItemIndex');
    saveCommentBtn = document.getElementById('saveCommentBtn');
    cancelCommentBtn = document.getElementById('cancelCommentBtn');
    closeCommentModalBtn = commentModal.querySelector('.close-btn');
    modifierModal = document.getElementById('modifierModal');
    modalProductName = document.getElementById('modalProductName');
    modifierGroupName = document.getElementById('modifierGroupName');
    modifierOptions = document.getElementById('modifierOptions');
    closeModifierModalBtn = modifierModal.querySelector('.close-btn');
    clockContainer = document.getElementById('liveClockContainer');

    // 2. Iniciar reloj y actualizador de UI
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(() => {
        // Incrementamos nuestro 'reloj' local para el refresco visual.
        // No usamos Date.now() para mantener la consistencia.
        serverNow += 5000; 
        renderOrderSummary();
    }, 5000);

    // 3. Asignar todos los listeners
    sendOrderBtn.addEventListener('click', sendOrderToKitchen);

    categoryList.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) { e.preventDefault(); handleCategoryClick(categoryItem.dataset.categoryId, categoryItem); }
    });

    productGrid.addEventListener('click', (e) => {
        const productBtn = e.target.closest('.product-item-btn');
        if (!productBtn) return;
        currentProduct = {
            id: parseInt(productBtn.dataset.productId), name: productBtn.querySelector('.product-name').textContent,
            price: parseFloat(productBtn.dataset.price), modifierGroupId: parseInt(productBtn.dataset.modifierGroupId) || null
        };
        if (currentProduct.modifierGroupId) { loadModifiers(currentProduct.modifierGroupId); }
        else { const quantity = parseInt(quantitySelector.value) || 1; for (let i = 0; i < quantity; i++) addItemToOrder(currentProduct); }
    });

    document.getElementById('addModifiedItemBtn').addEventListener('click', () => {
        const selectedRadio = modifierOptions.querySelector('input[name="modifier-choice"]:checked');
        if (!selectedRadio) { alert('Por favor, selecciona una opción.'); return; }
        const modifier = { id: parseInt(selectedRadio.value), name: selectedRadio.parentNode.textContent.trim().split('(')[0].trim(), price: parseFloat(selectedRadio.dataset.price) };
        const combinedItem = { ...currentProduct, name: `${currentProduct.name} (${modifier.name})`, price: currentProduct.price + modifier.price, modifier_id: modifier.id };
        const quantity = parseInt(quantitySelector.value) || 1;
        for (let i = 0; i < quantity; i++) addItemToOrder(combinedItem);
        modifierModal.style.display = 'none'; currentProduct = null;
    });

    addTimeBtn.addEventListener('click', () => {
        if (lastItemWasTime) { alert('Debes agregar al menos un producto antes de agregar otro tiempo.'); return; }
        currentOrder.push({ type: 'time', name: `--- Tiempo ${timeCounter++} ---` });
        lastItemWasTime = true;
        renderOrderSummary();
    });

    saveCommentBtn.addEventListener('click', () => {
        const index = parseInt(commentItemIndex.value);
        if (index >= 0 && currentOrder[index]) {
            currentOrder[index].comment = commentInput.value.trim();
            renderOrderSummary();
            commentModal.style.display = 'none';
        }
    });

    [closeModifierModalBtn, closeCommentModalBtn, cancelCommentBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            modifierModal.style.display = 'none';
            commentModal.style.display = 'none';
        });
    });

    orderItems.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.btn-remove');
        if (removeBtn) {
            e.stopPropagation();
            const indexToRemove = parseInt(removeBtn.dataset.index);
            if (!isNaN(indexToRemove) && currentOrder[indexToRemove]) {
                currentOrder.splice(indexToRemove, 1);
                renderOrderSummary();
            }
            return;
        }

        const itemElement = e.target.closest('.order-item');
        if (itemElement) {
            const index = parseInt(itemElement.dataset.index);
            if (isNaN(index) || !currentOrder[index]) return;
            const item = currentOrder[index];
            
            // ======================================================================
            // === LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ ===
            // Antes usaba Date.now(), ahora usa la variable consistente 'serverNow'
            // ======================================================================
            const isItemEditable = !item.sentTimestamp || (serverNow - item.sentTimestamp < LOCK_TIME_MS);

            if (isItemEditable && item.type === 'product') {
                commentModalItemName.textContent = item.name;
                commentInput.value = item.comment || '';
                commentItemIndex.value = index;
                commentModal.style.display = 'flex';
                commentInput.focus();
            }
        }
    });

    // 4. Cargar datos iniciales
    const dataElement = document.getElementById('initialOrderData');
    if (dataElement) {
        try {
            const data = JSON.parse(dataElement.textContent);
            if (data.server_time) {
                serverNow = new Date(data.server_time).getTime();
            }
            if (data && data.items) {
                const initialItems = data.items.map(item => {
                    if (item.sentTimestamp) {
                        item.sentTimestamp = new Date(item.sentTimestamp).getTime();
                    }
                    return item;
                });
                currentOrder.push({ type: 'time', name: `--- Tiempo ${timeCounter++} ---` });
                if (initialItems.length > 0) {
                    currentOrder.push(...initialItems);
                    lastItemWasTime = false;
                } else {
                    lastItemWasTime = true;
                }
            }
        } catch (e) { console.error("Error al parsear datos iniciales:", e); }
    }

    // 5. Carga inicial de la UI
    const firstCategory = document.querySelector('.category-item');
    if (firstCategory) {
        handleCategoryClick(firstCategory.dataset.categoryId, firstCategory);
    }
    renderOrderSummary();
});