// /KitchenLink/src/js/cashier.js

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const clockContainer = document.getElementById('liveClockContainer');
    const openAccountsList = document.getElementById('openAccountsList');
    const accountDetailsContent = document.getElementById('accountDetailsContent');
    const btnPrintTicket = document.getElementById('btn-print-ticket');
    const btnProcessPayment = document.getElementById('btn-process-payment');
    const paymentModal = document.getElementById('paymentModal');
    const closeModalButton = paymentModal.querySelector('.close-button');
    const modalTableNumber = document.getElementById('modalTableNumber');
    const modalTotalAmount = document.getElementById('modalTotalAmount');
    const modalRemainingAmount = document.getElementById('modalRemainingAmount');
    const paymentAmountInput = document.getElementById('paymentAmountInput');
    const paymentMethodButtons = paymentModal.querySelectorAll('.method-btn');
    const cashChangeSection = document.getElementById('cashChangeSection');
    const cashReceivedInput = document.getElementById('cashReceivedInput');
    const cashChangeAmount = document.getElementById('cashChangeAmount');
    const paymentsMadeList = document.getElementById('paymentsMadeList');
    const btnFinalizePayment = document.getElementById('btn-finalize-payment');
    const totalTipSection = document.getElementById('totalTipSection');
    const modalTotalTipAmount = document.getElementById('modalTotalTipAmount');

    // --- VARIABLES DE ESTADO ---
    let selectedOrderId = null;
    let currentAccountDetails = null;
    let paymentsRegistered = [];
    let totalDue = 0;
    let discountAmount = 0;

    // --- RELOJ Y UTILIDADES ---
    function updateClock() {
        if (!clockContainer) return;
        const now = new Date();
        const dateString = now.toLocaleDateString('es-MX', { month: 'short', day: '2-digit' });
        const timeString = now.toLocaleTimeString('en-US');
        clockContainer.textContent = `${dateString} ${timeString}`;
    }
    const formatCurrency = (amount) => `$${parseFloat(amount).toFixed(2)}`;

    // --- LÓGICA DE API ---
    async function fetchOpenAccounts() {
        try {
            const response = await fetch('/KitchenLink/src/api/cashier/get_open_accounts.php');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                renderOpenAccounts(result.data);
            } else {
                openAccountsList.innerHTML = `<p class="error-message">${result.message || 'Error al cargar las cuentas.'}</p>`;
            }
        } catch (error) {
            console.error('Error al obtener cuentas abiertas:', error);
            openAccountsList.innerHTML = `<p class="error-message">No se pudo conectar con el servidor.</p>`;
        }
    }

    async function fetchAccountDetails(orderId) {
        accountDetailsContent.innerHTML = '<p>Cargando detalles...</p>';
        discountAmount = 0;
        try {
            const response = await fetch(`/KitchenLink/src/api/cashier/get_account_details.php?order_id=${orderId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                currentAccountDetails = result.data;
                renderAccountDetails(currentAccountDetails);
                btnProcessPayment.disabled = false;
                btnPrintTicket.disabled = false;
            } else {
                accountDetailsContent.innerHTML = `<p class="error-message">${result.message || 'Error al cargar los detalles.'}</p>`;
            }
        } catch (error) {
            console.error('Error al obtener detalles de la cuenta:', error);
            accountDetailsContent.innerHTML = `<p class="error-message">No se pudo conectar con el servidor.</p>`;
        }
    }

    // --- FUNCIONES DE RENDERIZADO ---
    function renderOpenAccounts(accounts) {
        openAccountsList.innerHTML = '';
        if (accounts.length === 0) {
            openAccountsList.innerHTML = '<p>No se encontraron cuentas abiertas.</p>';
            return;
        }
        accounts.forEach(account => {
            const li = document.createElement('li');
            li.className = 'account-item';
            li.dataset.orderId = account.order_id;
            li.innerHTML = `<div class="account-info"><strong>Mesa ${account.table_number}</strong><span>Atendido por: ${account.server_name}</span></div><div class="account-total">${formatCurrency(account.total_amount)}</div>`;
            li.addEventListener('click', () => {
                document.querySelectorAll('.account-item.selected').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
                selectedOrderId = account.order_id;
                fetchAccountDetails(account.order_id);
            });
            openAccountsList.appendChild(li);
        });
    }

    /**
     * ✨ CORREGIDO: El IVA ahora se calcula sobre el subtotal menos el descuento.
     */
    function renderAccountDetails(details) {
        const itemsHtml = details.items.map(item => {
            const itemTotal = item.quantity * item.price_at_order;
            const modifierHtml = item.modifier_name ? ` <span class="modifier-text">(${item.modifier_name})</span>` : '';
            const cancelledClass = item.was_cancelled ? 'cancelled' : '';
            return `<div class="item-row ${cancelledClass}"><span class="item-qty">${item.quantity}</span><span class="item-name">${item.product_name}${modifierHtml}</span><span class="item-price">${formatCurrency(item.price_at_order)}</span><span class="item-total">${formatCurrency(itemTotal)}</span></div>`;
        }).join('');

        const subtotal = parseFloat(details.subtotal);
        
        // **LÓGICA CORREGIDA**
        const taxableBase = Math.max(0, subtotal - discountAmount); // La base para el impuesto
        const tax = taxableBase * 0.16; // El IVA es sobre la base gravable
        const finalTotal = taxableBase + tax;
        
        totalDue = finalTotal;

        const removeDiscountButtonHtml = discountAmount > 0 ? `<button id="removeDiscountBtn" title="Quitar descuento">❌</button>` : '';

        const detailsHtml = `
            <div class="account-header"><h4>Orden #${details.order_id} para Mesa ${details.table_number}</h4><p>Abierta a las: ${new Date(details.order_time).toLocaleTimeString()}</p></div>
            <div class="order-items-list">${itemsHtml}</div>
            <div class="order-summary-totals">
                <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>
                <div class="discount-section">
                    <input type="text" id="discountInput" placeholder="Ej: 10% o 50">
                    <button id="applyDiscountBtn">Aplicar Descuento</button>
                </div>
                <div class="total-row discount">
                    <span>Descuento:</span>
                    <span>-${formatCurrency(discountAmount)} ${removeDiscountButtonHtml}</span>
                </div>
                <div class="total-row"><span>IVA (16%):</span><span>${formatCurrency(tax)}</span></div>
                <div class="total-row grand-total"><span>Total a Pagar:</span><span>${formatCurrency(finalTotal)}</span></div>
            </div>`;
        accountDetailsContent.innerHTML = detailsHtml;

        document.getElementById('applyDiscountBtn').addEventListener('click', applyDiscount);
        document.getElementById('discountInput').addEventListener('input', validateDiscountInput);
        if (discountAmount > 0) {
            document.getElementById('removeDiscountBtn').addEventListener('click', removeDiscount);
        }
    }

    // --- LÓGICA DE DESCUENTO ---
    function applyDiscount() {
        const input = document.getElementById('discountInput');
        const value = input.value.trim();
        const subtotal = parseFloat(currentAccountDetails.subtotal);
        let calculatedDiscount = 0;

        if (value.includes('%')) {
            const percentage = parseFloat(value.replace('%', ''));
            if (isNaN(percentage)) return;
            if (percentage > 100) {
                alert("El descuento en porcentaje no puede ser mayor al 100%.");
                input.value = "100%";
                calculatedDiscount = subtotal;
            } else {
                calculatedDiscount = (subtotal * percentage) / 100;
            }
        } else {
            const fixedAmount = parseFloat(value);
            if (isNaN(fixedAmount)) return;
            if (fixedAmount > subtotal) {
                alert("El descuento no puede ser mayor al subtotal de la cuenta.");
                input.value = subtotal.toFixed(2);
                calculatedDiscount = subtotal;
            } else {
                calculatedDiscount = fixedAmount;
            }
        }
        discountAmount = calculatedDiscount;
        renderAccountDetails(currentAccountDetails);
    }

    function removeDiscount() {
        discountAmount = 0;
        renderAccountDetails(currentAccountDetails);
    }

    // --- LÓGICA DEL MODAL DE PAGO ---
    function openPaymentModal() {
        if (!currentAccountDetails) {
            alert("Por favor, seleccione una cuenta primero.");
            return;
        }
        paymentsRegistered = [];
        [paymentAmountInput, cashReceivedInput].forEach(input => input.value = '');
        modalTableNumber.textContent = currentAccountDetails.table_number;
        modalTotalAmount.textContent = formatCurrency(totalDue);
        updatePaymentStatus();
        paymentModal.style.display = 'flex';
    }

    function closePaymentModal() {
        paymentModal.style.display = 'none';
    }

    function addPayment(method) {
        let amount = parseFloat(paymentAmountInput.value.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, ingrese un monto de pago válido.");
            return;
        }

        const totalPaid = paymentsRegistered.reduce((sum, p) => sum + p.amount, 0);
        const remaining = totalDue - totalPaid;
        let paymentAmount = amount;
        let tipAmount = 0;

        if (method.includes('Tarjeta') && amount > remaining + 0.001) {
            paymentAmount = remaining > 0 ? remaining : 0;
            tipAmount = amount - paymentAmount;
            alert(`Pago de ${formatCurrency(paymentAmount)} y propina de ${formatCurrency(tipAmount)} registrados.`);
        } else if (amount > remaining + 0.001 && method !== 'Efectivo') {
            alert(`El monto para ${method} no puede exceder el restante (${formatCurrency(remaining)}).`);
            return;
        }

        paymentsRegistered.push({ method, amount: paymentAmount, tip: tipAmount });
        paymentAmountInput.value = '';
        updatePaymentStatus();
    }

    function updatePaymentStatus() {
        const totalPaid = paymentsRegistered.reduce((sum, p) => sum + p.amount, 0);
        const remaining = totalDue - totalPaid;
        const currentTotalTip = paymentsRegistered.reduce((sum, p) => sum + p.tip, 0);

        modalRemainingAmount.textContent = formatCurrency(Math.max(0, remaining));
        
        paymentsMadeList.innerHTML = paymentsRegistered.map((p, index) => {
            return `<li>
                        <span>${p.method}:</span>
                        <div>
                            <strong>${formatCurrency(p.amount)}</strong>
                            <button class="delete-payment-btn" data-index="${index}" title="Eliminar pago">X</button>
                        </div>
                    </li>`;
        }).join('');

        const hasCashPayment = paymentsRegistered.some(p => p.method === 'Efectivo');
        cashChangeSection.style.display = hasCashPayment ? 'block' : 'none';
        if (!hasCashPayment) cashReceivedInput.value = '';

        if (currentTotalTip > 0) {
            totalTipSection.style.display = 'block';
            modalTotalTipAmount.textContent = formatCurrency(currentTotalTip);
        } else {
            totalTipSection.style.display = 'none';
        }

        btnFinalizePayment.disabled = remaining > 0.001;
        calculateChange();
    }

    function deletePayment(indexToDelete) {
        paymentsRegistered.splice(indexToDelete, 1);
        updatePaymentStatus();
    }

    function calculateChange() {
        const cashReceived = parseFloat(cashReceivedInput.value.replace(',', '.'));
        const totalCashPaid = paymentsRegistered.filter(p => p.method === 'Efectivo').reduce((sum, p) => sum + p.amount, 0);

        if (isNaN(cashReceived) && totalCashPaid <= 0) {
            cashChangeAmount.textContent = formatCurrency(0);
            return;
        }
        
        const paidWithOtherMethods = paymentsRegistered.filter(p => p.method !== 'Efectivo').reduce((sum, p) => sum + p.amount, 0);
        const dueInCash = totalDue - paidWithOtherMethods;
        const effectiveCash = cashReceived > totalCashPaid ? cashReceived : totalCashPaid;
        const change = effectiveCash - dueInCash;
        
        cashChangeAmount.textContent = formatCurrency(Math.max(0, change));
        btnFinalizePayment.disabled = effectiveCash < dueInCash - 0.001;
    }

    async function finalizePayment() {
        if (btnFinalizePayment.disabled) return;
        
        const totalTipAmount = paymentsRegistered.reduce((sum, p) => sum + p.tip, 0);
        const isCourtesy = paymentsRegistered.some(p => p.method === 'Cortesía') && (paymentsRegistered.reduce((sum, p) => sum + p.amount, 0) >= totalDue);

        const payload = {
            order_id: selectedOrderId,
            payments: paymentsRegistered.map(({ method, amount }) => ({ method, amount })),
            tip_amount_card: totalTipAmount,
            discount_amount: discountAmount,
            is_courtesy: isCourtesy
        };

        try {
            const response = await fetch('/KitchenLink/src/api/cashier/process_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.success) {
                alert(`Cuenta cerrada exitosamente. Movimiento #${result.new_sale_id}`);
                closePaymentModal();
                fetchOpenAccounts();
                accountDetailsContent.innerHTML = '<p class="placeholder-text">Seleccione una cuenta para ver los detalles.</p>';
                btnProcessPayment.disabled = true;
                btnPrintTicket.disabled = true;
            } else {
                alert('Error al cerrar la cuenta: ' + result.message);
            }
        } catch (error) {
            alert('Error de conexión al finalizar el pago.');
        }
    }

    // --- VALIDACIONES DE ENTRADA ---
    function validateNumericInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^0-9.,]/g, '');
        value = value.replace(',', '.');
        value = value.replace(/(\..*)\./g, '$1');
        if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) {
            value = value.substring(1);
        }
        if (value === '0') {
            value = '';
        }
        if (parseFloat(value) > 999999) {
            value = '999999';
        }
        input.value = value;
    }

    function validateDiscountInput(event) {
        const input = event.target;
        let value = input.value.replace(/[^0-9.,%]/g, '');
        value = value.replace(',', '.');
        value = value.replace(/%(?!$)/g, '');
        value = value.replace(/(\..*)\./g, '$1');
        if (value.startsWith('0') && value.length > 1 && !value.startsWith('0.')) {
            value = value.substring(1);
        }
        if (value === '0') {
            value = '';
        }
        input.value = value;
    }

    // --- INICIALIZACIÓN Y EVENTOS ---
    updateClock();
    setInterval(updateClock, 1000);
    fetchOpenAccounts();

    btnProcessPayment.addEventListener('click', openPaymentModal);
    closeModalButton.addEventListener('click', closePaymentModal);
    window.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    paymentMethodButtons.forEach(button => {
        button.addEventListener('click', () => addPayment(button.dataset.method));
    });

    paymentsMadeList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-payment-btn')) {
            deletePayment(parseInt(event.target.dataset.index, 10));
        }
    });

    cashReceivedInput.addEventListener('input', calculateChange);
    btnFinalizePayment.addEventListener('click', finalizePayment);

    [paymentAmountInput, cashReceivedInput].forEach(input => {
        input.addEventListener('input', validateNumericInput);
    });
});