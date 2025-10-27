// tpv.js - VERSIÓN FINAL CON TOTAL COMBINADO (BD + PANTALLA)

// Rutas a los endpoints PHP (AJAX)
const API_ROUTES = {
    API_PRODUCT_URL: '/KitchenLink/src/api/orders/tpv/get_products_by_category.php',
    API_MODIFIER_URL: '/KitchenLink/src/api/orders/tpv/get_product_modifiers.php',
    API_SEND_ORDER: '/KitchenLink/src/api/orders/tpv/send_order.php',
    API_SEARCH_PRODUCT: '/KitchenLink/src/api/orders/tpv/search_products.php',
    API_GET_ACTIVE_ORDER_ID: '/KitchenLink/src/api/orders/get_active_order_id.php',
    API_GET_ORDER_ITEMS: '/KitchenLink/src/api/orders/tpv/get_current_order.php'
};

// Referencias del DOM y Variables de estado
let categoryList, productGrid, orderItems, orderTotalElement, sendOrderBtn, quantitySelector, addTimeBtn,
    commentModal, commentModalItemName, commentInput, commentItemIndex, saveCommentBtn, cancelCommentBtn,
    closeCommentModalBtn, modifierModal, modalProductName, modifierGroupName, modifierOptions,
    closeModifierModalBtn, clockContainer;
let searchInput, searchDropdown;

const tableNumber = parseInt(new URLSearchParams(window.location.search).get('table')) || 0;
let currentOrder = [];
let timeCounter = 1;
let activeOrderId = 0;
let currentProduct = null;
// Variable para guardar el total que viene de la base de datos
let databaseTotal = 0;

// ----------------------------------------------------
// FUNCIONES CLAVE DE ORDEN Y TIEMPOS
// ----------------------------------------------------

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

// FUNCIÓN CORREGIDA PARA EL CÁLCULO COMBINADO
function updateOrderTotal() {
    // 1. Calcula el subtotal de los productos NUEVOS en pantalla (no enviados)
    const newItemsSubtotal = currentOrder
        .filter(item => item.type === 'product' && !item.sentTimestamp)
        .reduce((sum, item) => sum + (item.price || 0), 0);

    // 2. Suma el total de la base de datos con el subtotal de los nuevos productos
    const grandTotal = databaseTotal + newItemsSubtotal;

    // 3. Muestra el resultado
    orderTotalElement.textContent = `$${grandTotal.toFixed(2)}`;
}

async function loadInitialOrder() {
    if (tableNumber <= 0) return;

    try {
        const urlId = `${API_ROUTES.API_GET_ACTIVE_ORDER_ID}?table_number=${tableNumber}`;
        const orderIdResponse = await fetch(urlId);
        const orderIdData = await orderIdResponse.json();

        if (!orderIdData.success || !orderIdData.order_id) {
            activeOrderId = 0;
            currentOrder = [];
            databaseTotal = 0; // Si no hay orden, el total base es 0
            timeCounter = 1;
            renderOrderSummary();
            return;
        }

        activeOrderId = orderIdData.order_id;

        const itemsResponse = await fetch(`${API_ROUTES.API_GET_ORDER_ITEMS}?order_id=${activeOrderId}`);
        const data = await itemsResponse.json();

        if (!data.success) throw new Error(data.message || 'Error al obtener ítems de orden.');

        // Guarda el total que viene de la base de datos
        databaseTotal = parseFloat(data.total) || 0;
        
        const times = data.times || [];
        currentOrder = [];
        let maxTime = 0;

        times.forEach(timeBatch => {
            const displayTime = timeBatch.service_time;
            const sentTimestamp = timeBatch.items[0]?.added_at || timeBatch.items[0]?.batch_timestamp;
            maxTime = Math.max(maxTime, displayTime);

            if (timeBatch.items && timeBatch.items.length > 0) {
                currentOrder.push({
                    type: 'time',
                    name: `--- Tiempo ${displayTime} ---`,
                    sentTimestamp: new Date(sentTimestamp).getTime()
                });
                timeBatch.items.forEach(item => {
                    currentOrder.push({
                        type: 'product',
                        id: item.id, name: item.name, price: item.price,
                        quantity: 1, comment: item.comment, modifier_id: item.modifier_id,
                        sentTimestamp: new Date(sentTimestamp).getTime()
                    });
                });
            }
        });

        timeCounter = maxTime > 0 ? maxTime : 1;

    } catch (error) {
        console.error('Error al cargar la orden inicial:', error);
        currentOrder = [];
        databaseTotal = 0;
        timeCounter = 1;
    }
    renderOrderSummary();
    if (orderItems) {
        orderItems.scrollTop = orderItems.scrollHeight;
    }
}

// ----------------------------------------------------
// EL RESTO DEL CÓDIGO (SIN CAMBIOS IMPORTANTES)
// ----------------------------------------------------

function getFirstPendingTimeIndex() {
    return currentOrder.findIndex(item => item.type === 'time' && !item.sentTimestamp);
}

function addItemToOrder(item) {
    const itemToAdd = {
        ...item,
        type: 'product',
        comment: item.comment || '',
        quantity: 1,
        modifier_id: item.modifier_id || undefined
    };

    const lastPendingTimeIndex = currentOrder.findLastIndex(i => i.type === 'time' && !i.sentTimestamp);

    if (lastPendingTimeIndex === -1) {
        currentOrder.push(itemToAdd);
    } else {
        const nextTimeIndex = currentOrder.findIndex(
            (i, index) => index > lastPendingTimeIndex && i.type === 'time'
        );
        const insertionIndex = (nextTimeIndex !== -1) ? nextTimeIndex : currentOrder.length;
        currentOrder.splice(insertionIndex, 0, itemToAdd);
    }

    renderOrderSummary();
    if (orderItems) orderItems.scrollTop = orderItems.scrollHeight;
}

function renderOrderSummary() {
    if (!orderItems) return;

    currentOrder = currentOrder.filter((item, index, arr) => {
        if (item.type !== 'time') return true;
        if (item.sentTimestamp) return true;
        if (item.name.includes('Tiempo 1')) return true;

        const nextTimeIndex = arr.slice(index + 1).findIndex(i => i.type === 'time');
        const productsInBlock = nextTimeIndex === -1 ?
            arr.slice(index + 1).some(i => i.type === 'product' && !i.sentTimestamp) :
            arr.slice(index + 1, index + 1 + nextTimeIndex).some(i => i.type === 'product' && !i.sentTimestamp);

        return productsInBlock;
    });

    const hasPendingTime = currentOrder.some(i => i.type === 'time' && !i.sentTimestamp);
    if (!hasPendingTime) {
        currentOrder.push({
            type: 'time',
            name: `--- Tiempo ${timeCounter} ---`
        });
    } else {
        const lastPendingIndex = currentOrder.findLastIndex(i => i.type === 'time' && !i.sentTimestamp);
        if (lastPendingIndex !== -1) {
            currentOrder[lastPendingIndex].name = `--- Tiempo ${timeCounter} ---`;
        }
    }

    orderItems.innerHTML = '';
    currentOrder.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        const isTime = item.type === 'time';
        const isEditable = !item.sentTimestamp;

        if (isTime) {
            itemDiv.className = `order-time-separator ${isEditable ? 'time-pending' : 'time-sent'}`;
            itemDiv.innerHTML = `<span>${item.name}</span>`;
            if (!isEditable) {
                itemDiv.classList.add('time-permanent');
            } else if (item.name.includes('Tiempo 1')) {
                const nextTimeIndex = currentOrder.slice(index + 1).findIndex(i => i.type === 'time');
                const productsInBlock = nextTimeIndex === -1 ?
                    currentOrder.slice(index + 1).some(i => i.type === 'product' && !i.sentTimestamp) :
                    currentOrder.slice(index + 1, index + 1 + nextTimeIndex).some(i => i.type === 'product' && !i.sentTimestamp);
                if (!productsInBlock) itemDiv.classList.add('time-permanent');
            }
        } else {
            itemDiv.className = `order-item ${isEditable ? '' : 'locked-item'}`;
            itemDiv.dataset.index = index;
            const commentHTML = item.comment ? `<span class="item-comment"><i class="fas fa-sticky-note"></i> ${item.comment}</span>` : '';
            const displayQuantity = item.quantity && item.quantity > 1 ? `${item.quantity}x ` : '';
            itemDiv.innerHTML = `
                <div class="item-details"><span class="item-name">${displayQuantity}${item.name}</span>${commentHTML}</div>
                <span class="item-price">$${item.price.toFixed(2)}</span>
                ${isEditable ? `<button class="btn-remove" data-index="${index}">&times;</button>` : '<span class="item-locked"><i class="fas fa-lock"></i></span>'}`;
        }
        orderItems.appendChild(itemDiv);
    });

    const hasNewItems = currentOrder.some(i => i.type === 'product' && !i.sentTimestamp);
    const hasSentItems = currentOrder.some(i => i.type === 'product' && i.sentTimestamp);

    sendOrderBtn.disabled = !hasNewItems;
    sendOrderBtn.textContent = hasSentItems ? 'Actualizar Orden' : 'Enviar a Cocina';

    const pendingTimeIndex = getFirstPendingTimeIndex();
    const hasProductsInActiveTime = pendingTimeIndex !== -1 && currentOrder.slice(pendingTimeIndex + 1).some(i => i.type === 'product' && !i.sentTimestamp);
    addTimeBtn.disabled = !hasProductsInActiveTime;

    updateOrderTotal();
}

async function sendOrderToKitchen() {
    const timesMap = {};
    let current_service_time = 0;

    for (const item of currentOrder) {
        if (item.type === 'time') {
            const timeMatch = item.name.match(/Tiempo (\d+)/);
            if (timeMatch) {
                current_service_time = parseInt(timeMatch[1]);
            }
        } else if (item.type === 'product' && !item.sentTimestamp) {
            if (current_service_time > 0) {
                if (!timesMap[current_service_time]) {
                    timesMap[current_service_time] = {
                        service_time: current_service_time,
                        items: []
                    };
                }
                timesMap[current_service_time].items.push({
                    id: item.id,
                    quantity: item.quantity || 1,
                    comment: item.comment,
                    modifier_id: item.modifier_id
                });
            }
        }
    }

    const finalTimesToSend = Object.values(timesMap);

    if (finalTimesToSend.length === 0) {
        console.warn("sendOrderToKitchen fue llamada, pero no se encontraron ítems nuevos para enviar.");
        renderOrderSummary();
        return;
    }

    sendOrderBtn.disabled = true;
    sendOrderBtn.textContent = 'Enviando...';
    try {
        const response = await fetch(API_ROUTES.API_SEND_ORDER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                table_number: tableNumber,
                times: finalTimesToSend,
                order_id: activeOrderId
            })
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Error desconocido.');

        loadInitialOrder();

    } catch (error) {
        console.error('Error al enviar la orden:', error);
        alert(`Error al enviar la comanda: ${error.message}`);
        renderOrderSummary();
    }
}

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

async function handleCategoryClick(categoryId) {
    productGrid.innerHTML = '<p id="productLoading">Cargando productos...</p>';

    document.querySelectorAll('.category-item').forEach(item => {
        if (item.dataset.categoryId == categoryId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

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
        label.innerHTML = `<input type="radio" name="modifier-choice" value="${mod.modifier_id}" data-price="${mod.modifier_price}">${mod.modifier_name} ${parseFloat(mod.modifier_price).toFixed(2) > 0 ? `(+$${parseFloat(mod.modifier_price).toFixed(2)})` : ''}`;
        modifierOptions.appendChild(label);
    });
}

let searchTimeout;

function setupSearchListeners() {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length < 2) {
            searchDropdown.style.display = 'none';
            return;
        }
        searchTimeout = setTimeout(() => executeGlobalSearch(query), 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

    searchDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const productId = parseInt(item.dataset.productId);
            const price = parseFloat(item.dataset.price);
            const categoryId = parseInt(item.dataset.categoryId);

            const rawModId = item.dataset.modifierGroupId;
            const modifierGroupId = (rawModId && rawModId !== 'null' && rawModId !== '0') ? parseInt(rawModId) : null;

            const name = item.querySelector('.result-name').textContent;
            const quantity = parseInt(quantitySelector.value) || 1;

            currentProduct = {
                id: productId,
                name: name,
                price: price,
                modifierGroupId: modifierGroupId,
                quantity: quantity
            };

            handleCategoryClick(categoryId);

            if (currentProduct.modifierGroupId) {
                loadModifiers(currentProduct.modifierGroupId);
            } else {
                for (let i = 0; i < quantity; i++) {
                    addItemToOrder({
                        id: currentProduct.id,
                        name: currentProduct.name,
                        price: currentProduct.price,
                        quantity: 1,
                        modifierGroupId: currentProduct.modifierGroupId
                    });
                }
            }

            searchInput.value = '';
            searchDropdown.style.display = 'none';
        }
    });
}

async function executeGlobalSearch(query) {
    try {
        const response = await fetch(`${API_ROUTES.API_SEARCH_PRODUCT}?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            renderSearchResults(data.products);
        } else {
            searchDropdown.innerHTML = '<div class="search-result-item">No se encontraron productos.</div>';
            searchDropdown.style.display = 'block';
        }
    } catch (error) {
        searchDropdown.innerHTML = '<div class="search-result-item">Error de conexión.</div>';
        searchDropdown.style.display = 'block';
    }
}

function renderSearchResults(products) {
    searchDropdown.innerHTML = '';
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        item.dataset.productId = product.id;
        item.dataset.price = product.price;
        item.dataset.categoryId = product.category_id;
        item.dataset.modifierGroupId = product.modifier_group_id || '';

        item.innerHTML = `
            <span class="result-name">${product.name}</span>
            <span class="result-price">$${product.price.toFixed(2)}</span>
        `;
        searchDropdown.appendChild(item);
    });

    searchDropdown.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
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
    searchInput = document.getElementById('productSearchInput');
    searchDropdown = document.getElementById('searchResultsDropdown');

    updateClock();
    setInterval(updateClock, 1000);

    sendOrderBtn.addEventListener('click', sendOrderToKitchen);

    // ✨ --- BLOQUE DE VALIDACIÓN AÑADIDO --- ✨
    if (quantitySelector) {
        quantitySelector.addEventListener('input', () => {
            let value = quantitySelector.value;
            // 1. Solo permite dígitos
            value = value.replace(/[^0-9]/g, '');
            // 2. Si el valor es '0', lo borra
            if (value === '0') {
                value = '';
            }
            // 3. Limita a 2 dígitos
            if (value.length > 2) {
                value = value.substring(0, 2);
            }
            // 4. Previene que sea mayor a 99
            if (parseInt(value, 10) > 99) {
                value = '99';
            }
            quantitySelector.value = value;
        });

        quantitySelector.addEventListener('blur', () => {
            // Si el campo queda vacío o es menor a 1, lo establece en 1
            if (quantitySelector.value === '' || parseInt(quantitySelector.value, 10) < 1) {
                quantitySelector.value = '1';
            }
        });
    }
    // --- FIN DEL BLOQUE DE VALIDACIÓN ---

    categoryList.addEventListener('click', (e) => {
        const categoryItem = e.target.closest('.category-item');
        if (categoryItem) {
            e.preventDefault();
            handleCategoryClick(categoryItem.dataset.categoryId);
        }
    });

    productGrid.addEventListener('click', (e) => {
        const productBtn = e.target.closest('.product-item-btn');
        if (!productBtn) return;

        const quantity = parseInt(quantitySelector.value) || 1;

        currentProduct = {
            id: parseInt(productBtn.dataset.productId),
            name: productBtn.querySelector('.product-name').textContent,
            price: parseFloat(productBtn.dataset.price),
            modifierGroupId: parseInt(productBtn.dataset.modifierGroupId) || null,
            quantity: quantity
        };

        if (currentProduct.modifierGroupId) {
            loadModifiers(currentProduct.modifierGroupId);
        } else {
            for (let i = 0; i < quantity; i++) {
                addItemToOrder({
                    id: currentProduct.id,
                    name: currentProduct.name,
                    price: currentProduct.price,
                    quantity: 1,
                    modifierGroupId: currentProduct.modifierGroupId
                });
            }
        }
    });

    setupSearchListeners();

    document.getElementById('addModifiedItemBtn').addEventListener('click', () => {
        if (!currentProduct) return;
        const selectedRadio = modifierOptions.querySelector('input[name="modifier-choice"]:checked');
        if (!selectedRadio) {
            return;
        }

        const quantity = currentProduct.quantity;
        const modifier = {
            id: parseInt(selectedRadio.value),
            name: selectedRadio.parentNode.textContent.trim().split('(')[0].trim(),
            price: parseFloat(selectedRadio.dataset.price)
        };
        const unitPrice = currentProduct.price + modifier.price;

        for (let i = 0; i < quantity; i++) {
            const combinedItem = {
                id: currentProduct.id,
                name: `${currentProduct.name} (${modifier.name})`,
                price: unitPrice,
                modifier_id: modifier.id,
                quantity: 1
            };
            addItemToOrder(combinedItem);
        }

        modifierModal.style.display = 'none';
        currentProduct = null;
    });

    addTimeBtn.addEventListener('click', () => {
        const pendingTimes = currentOrder.filter(i => i.type === 'time' && !i.sentTimestamp);
        if (!pendingTimes.length) return;

        const activeTime = pendingTimes[pendingTimes.length - 1];
        const activeIndex = currentOrder.lastIndexOf(activeTime);
        currentOrder[activeIndex].sentTimestamp = Date.now();
        timeCounter++;
        currentOrder.push({
            type: 'time',
            name: `--- Tiempo ${timeCounter} ---`
        });
        renderOrderSummary();
        if (orderItems) orderItems.scrollTop = orderItems.scrollHeight;
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
            if (!isNaN(indexToRemove) && currentOrder[indexToRemove] && !currentOrder[indexToRemove].sentTimestamp) {
                currentOrder.splice(indexToRemove, 1);
                renderOrderSummary();
                if (orderItems) {
                    orderItems.scrollTop = orderItems.scrollHeight;
                }
            }
            return;
        }

        const itemElement = e.target.closest('.order-item');
        if (itemElement) {
            const index = parseInt(itemElement.dataset.index);
            if (isNaN(index) || !currentOrder[index]) return;
            const item = currentOrder[index];
            const isItemEditable = !item.sentTimestamp;
            if (isItemEditable && item.type === 'product') {
                commentModalItemName.textContent = item.name;
                commentInput.value = item.comment || '';
                commentItemIndex.value = index;
                commentModal.style.display = 'flex';
            }
        }
    });

    loadInitialOrder();

    const firstCategory = document.querySelector('.category-item');
    if (firstCategory) {
        handleCategoryClick(firstCategory.dataset.categoryId);
    }
});