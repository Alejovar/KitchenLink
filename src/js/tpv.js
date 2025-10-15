\// Variable para almacenar la mesa actualmente seleccionada
let selectedTable = null;

// Rutas a los endpoints PHP (AJAX)
const API_ROUTES = {
    API_PRODUCT_URL: '/KitchenLink/src/api/orders/tpv/get_products_by_category.php',
    API_MODIFIER_URL: '/KitchenLink/src/api/orders/tpv/get_product_modifiers.php',
    API_SEND_ORDER: '/KitchenLink/src/api/orders/tpv/send_order.php'
};

// Referencias del DOM
const categoryList = document.getElementById('categoryList');
const productGrid = document.getElementById('productGrid');
const orderItems = document.getElementById('orderItems');
const orderTotalElement = document.getElementById('orderTotal');
const sendOrderBtn = document.getElementById('sendOrderBtn');
const quantitySelector = document.getElementById('quantitySelector');
const addTimeBtn = document.getElementById('addTimeBtn');
const commentModal = document.getElementById('commentModal');
const commentModalItemName = document.getElementById('commentModalItemName');
const commentInput = document.getElementById('commentInput');
const commentItemIndex = document.getElementById('commentItemIndex');
const saveCommentBtn = document.getElementById('saveCommentBtn');
const cancelCommentBtn = document.getElementById('cancelCommentBtn');
const closeCommentModalBtn = commentModal.querySelector('.close-btn');
const modifierModal = document.getElementById('modifierModal');
const modalProductName = document.getElementById('modalProductName');
const modifierGroupName = document.getElementById('modifierGroupName');
const modifierOptions = document.getElementById('modifierOptions');
const closeModifierModalBtn = modifierModal.querySelector('.close-btn');

// Variables de estado
const tableNumber = parseInt(new URLSearchParams(window.location.search).get('table')) || 0;
let currentOrder = [];
let currentProduct = null;
let timeCounter = 1;
let lastItemWasTime = false;
const LOCK_TIME_MS = 60000; // 1 minuto

// --- Lógica de Orden y Precios ---

function updateOrderTotal() {
    const total = currentOrder.filter(item => item.type === 'product').reduce((sum, item) => sum + item.price, 0);
    orderTotalElement.textContent = `$${total.toFixed(2)}`;
}

function renderOrderSummary() {
    orderItems.innerHTML = '';
    if (currentOrder.length === 0) {
        orderItems.innerHTML = '<p class="text-center">Aún no hay productos.</p>';
        updateOrderTotal();
        return;
    }

    currentOrder.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        
        // La editabilidad se decide por cada item individualmente
        const isItemEditable = !item.sentTimestamp || (Date.now() - item.sentTimestamp < LOCK_TIME_MS);
        const removeButtonHTML = `<button class="btn-remove" data-index="${index}">&times;</button>`;

        if (item.type === 'time') {
            itemDiv.className = 'order-time-separator';
            // Los tiempos siempre se pueden borrar por simplicidad, no afectan la comanda
            itemDiv.innerHTML = `<span>${item.name}</span> ${removeButtonHTML}`;
        } else if (item.type === 'product') {
            itemDiv.className = 'order-item';
            itemDiv.dataset.index = index;
            const commentHTML = (item.comment && item.comment.trim() !== '') ? `<span class="item-comment"><i class="fas fa-sticky-note"></i> ${item.comment}</span>` : '';
            itemDiv.innerHTML = `
                <div class="item-details"><span class="item-name">${item.name}</span>${commentHTML}</div>
                <span class="item-price">$${item.price.toFixed(2)}</span>
                ${isItemEditable ? removeButtonHTML : '<span class="item-locked"><i class="fas fa-lock"></i></span>'}
            `;
        }
        orderItems.appendChild(itemDiv);
    });
    
    // Si hay items ya enviados, el botón siempre es de 'Actualizar'
    const hasSentItems = currentOrder.some(item => item.sentTimestamp);
    if (hasSentItems) {
        sendOrderBtn.textContent = 'Actualizar Orden';
    } else {
        sendOrderBtn.textContent = 'Enviar a Cocina';
    }
    sendOrderBtn.disabled = false;
    updateOrderTotal();
}

function addItemToOrder(item) {
    // Los items nuevos no tienen 'sentTimestamp', lo que los hace editables por defecto.
    currentOrder.push({ ...item, type: 'product', comment: '' });
    lastItemWasTime = false;
    renderOrderSummary();
}

async function sendOrderToKitchen() {
    const productsToSend = currentOrder.filter(item => item.type === 'product');
    if (productsToSend.length === 0) {
        alert('No hay productos en la orden para enviar.');
        return;
    }
    sendOrderBtn.disabled = true;
    sendOrderBtn.textContent = 'Enviando...';

    try {
        const response = await fetch(API_ROUTES.API_SEND_ORDER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_number: tableNumber, items: currentOrder })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Error desconocido.');

        alert('¡Orden enviada/actualizada!');
        
        const now = Date.now();
        // A todos los items que no tenían fecha de envío, se les asigna la actual.
        currentOrder.forEach(item => {
            if (item.type === 'product' && !item.sentTimestamp) {
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
function renderProducts(products, productGrid) {
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
            renderProducts(data.products, productGrid);
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
            renderModifiers(data.modifiers, modifierOptions);
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
function renderModifiers(modifiers, targetElement) {
    targetElement.innerHTML = '';
    modifiers.forEach(mod => {
        const label = document.createElement('label');
        label.className = 'modifier-option';
        label.innerHTML = `<input type="radio" name="modifier-choice" value="${mod.modifier_id}" data-price="${mod.modifier_price}">${mod.modifier_name} ${parseFloat(mod.modifier_price) > 0 ? `(+$${parseFloat(mod.modifier_price).toFixed(2)})` : ''}`;
        targetElement.appendChild(label);
    });
}

// --- Event Listeners y Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos iniciales
    let initialItems = [];
    const dataElement = document.getElementById('initialOrderData');
    if (dataElement) {
        try {
            const data = JSON.parse(dataElement.textContent);
            if (data && data.items) initialItems = data.items;
        } catch (e) { console.error("Error al parsear datos iniciales:", e); }
    }

    // 2. Establecer el estado inicial
    if (initialItems.length > 0) {
        currentOrder.push({ type: 'time', name: '--- Tiempo 1 ---' });
        currentOrder.push(...initialItems);
        timeCounter = 2;
    } else {
        currentOrder.push({ type: 'time', name: '--- Tiempo 1 ---' });
        timeCounter = 2;
        lastItemWasTime = true;
    }
    
    // 3. Asignar todos los listeners
    sendOrderBtn.addEventListener('click', sendOrderToKitchen);

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
        modifierModal.style.display = 'none';
        currentProduct = null;
    });

    addTimeBtn.addEventListener('click', () => {
        if (lastItemWasTime) { alert('Debes agregar al menos un producto antes de agregar otro tiempo.'); return; }
        currentOrder.push({ type: 'time', name: `--- Tiempo ${timeCounter} ---` });
        timeCounter++;
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
        const itemElement = e.target.closest('.order-item');

        if (removeBtn) {
            // La validación de si se puede borrar ya se hizo al mostrar o no el botón
            const indexToRemove = parseInt(removeBtn.dataset.index);
            if (isNaN(indexToRemove) || !currentOrder[indexToRemove]) return;
            const itemToRemove = currentOrder[indexToRemove];
            currentOrder.splice(indexToRemove, 1);
            
            const hasProductsLeft = currentOrder.some(item => item.type === 'product');
            if (!hasProductsLeft) {
                currentOrder = [{ type: 'time', name: '--- Tiempo 1 ---' }];
                timeCounter = 2; lastItemWasTime = true;
            } else if(itemToRemove.type === 'time') {
                let tempTimeCounter = 1;
                currentOrder.forEach(item => { if (item.type === 'time') { item.name = `--- Tiempo ${tempTimeCounter} ---`; tempTimeCounter++; } });
                timeCounter = tempTimeCounter;
            }
            renderOrderSummary();
            return;
        }

        if (itemElement) {
            const index = parseInt(itemElement.dataset.index);
            if (isNaN(index) || !currentOrder[index]) return;

            const item = currentOrder[index];
            const isItemEditable = !item.sentTimestamp || (Date.now() - item.sentTimestamp < LOCK_TIME_MS);

            if (isItemEditable && item.type === 'product') {
                commentModalItemName.textContent = item.name;
                commentInput.value = item.comment || '';
                commentItemIndex.value = index;
                commentModal.style.display = 'flex';
                commentInput.focus();
            }
        }
    });

    // 4. Carga inicial de la UI
    const firstCategory = document.querySelector('.category-item');
    if (firstCategory) {
        handleCategoryClick(firstCategory.dataset.categoryId, firstCategory);
    }
    renderOrderSummary();
});