document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const waitlistForm = document.getElementById('waitlistForm');
    const waitingListContainer = document.getElementById('waitingList');
    const estimatedTimeEl = document.getElementById('estimatedTime');
    
    // Elementos de la ventana modal
    const modal = document.getElementById('seatClientModal');
    const modalClientName = document.getElementById('modalClientName');
    const modalTableGrid = document.getElementById('modalTableGrid');
    const closeModalBtn = modal.querySelector('.modal-close');
    const cancelSeatBtn = document.getElementById('cancelSeatBtn');
    const confirmSeatBtn = document.getElementById('confirmSeatBtn');

    let currentClientId = null;

    // --- FUNCIONES ASÍNCRONAS ---

    async function loadWaitingList() {
        try {
            const response = await fetch('/KitchenLink/src/api/get_waiting_list.php');
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            const clients = await response.json();
            waitingListContainer.innerHTML = '';
            if (clients.length > 0) {
                clients.forEach(client => waitingListContainer.appendChild(createClientCard(client)));
            } else {
                waitingListContainer.innerHTML = '<p style="text-align: center; color: #888;">No hay nadie en la lista de espera.</p>';
            }
            updateEstimatedTime(clients.length);
        } catch (error) {
            console.error("Error al cargar la lista de espera:", error);
            waitingListContainer.innerHTML = '<p style="color: red; text-align: center;">No se pudo cargar la lista.</p>';
        }
    }

    async function addClientToList(event) {
        event.preventDefault();
        const formData = new FormData(waitlistForm);
        try {
            const response = await fetch('/KitchenLink/src/api/add_to_waitlist.php', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                waitlistForm.reset();
                loadWaitingList();
            } else {
                alert('Error: ' + (result.message || 'No se pudo agregar al cliente.'));
            }
        } catch (error) {
            console.error('Error al agregar cliente:', error);
            alert('Error de conexión. Inténtelo de nuevo.');
        }
    }
    
    async function archiveClientAsCancelled(clientId) {
        if (!confirm('¿Marcar este cliente como cancelado y moverlo al historial?')) return;
        try {
            const response = await fetch('/KitchenLink/src/api/archive_from_waitlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: clientId, status: 'cancelled' })
            });
            const result = await response.json();
            if (result.success) {
                loadWaitingList(); 
            } else {
                alert('Error: ' + (result.message || 'No se pudo archivar al cliente.'));
            }
        } catch (error) {
            console.error('Error al archivar cliente:', error);
            alert('Error de conexión al intentar archivar.');
        }
    }

    async function openSeatClientModal(clientId, clientName) {
        currentClientId = clientId;
        modalClientName.textContent = clientName;
        modalTableGrid.innerHTML = '<p>Cargando mesas...</p>';
        modal.style.display = 'flex';

        try {
            const response = await fetch('/KitchenLink/src/api/get_current_available_tables.php');
            const data = await response.json();
            modalTableGrid.innerHTML = '';
            if (data.success && data.tables.length > 0) {
                data.tables.forEach(table => {
                    const tableBox = document.createElement('div');
                    tableBox.className = 'modal-table-box';
                    tableBox.textContent = table.table_name;
                    tableBox.dataset.tableId = table.id;
                    modalTableGrid.appendChild(tableBox);
                });
            } else {
                modalTableGrid.innerHTML = '<p style="color: #888;">No hay mesas disponibles en este momento.</p>';
            }
        } catch (error) {
            console.error("Error al cargar mesas:", error);
            modalTableGrid.innerHTML = '<p style="color: red;">Error al cargar las mesas.</p>';
        }
    }

    function closeSeatClientModal() {
        modal.style.display = 'none';
        currentClientId = null;
    }

    async function confirmAndSeatClient() {
        const selectedTables = modalTableGrid.querySelectorAll('.modal-table-box.selected');
        if (selectedTables.length === 0) {
            alert('Por favor, seleccione al menos una mesa.');
            return;
        }

        const tableIds = Array.from(selectedTables).map(el => el.dataset.tableId);

        try {
            const response = await fetch('/KitchenLink/src/api/seat_client.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: currentClientId, table_ids: tableIds })
            });
            const result = await response.json();
            if (result.success) {
                alert('¡Cliente sentado con éxito!');
                closeSeatClientModal();
                loadWaitingList();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error("Error al sentar al cliente:", error);
            alert('Hubo un error de conexión al intentar sentar al cliente.');
        }
    }

    // --- FUNCIONES AUXILIARES ---
    
    function createClientCard(client) {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.dataset.clientId = client.id;
        card.dataset.clientName = client.customer_name;
        const avatarLetter = client.customer_name.charAt(0).toUpperCase();
        const phoneHtml = client.customer_phone ? `<div class="details phone"><i class="fas fa-phone-alt"></i> ${client.customer_phone}</div>` : '';
        card.innerHTML = `
            <div class="client-info">
                <div class="client-avatar">${avatarLetter}</div>
                <div class="client-details">
                    <div class="name">${client.customer_name}</div>
                    <div class="details"><i class="fas fa-users"></i> Mesa para ${client.number_of_people}</div>
                    ${phoneHtml}
                </div>
            </div>
            <div class="client-actions">
                <button class="btn-seat" title="Sentar cliente"><i class="fas fa-check"></i></button>
                <button class="btn-cancel" title="Cancelar registro"><i class="fas fa-times"></i></button>
            </div>
        `;
        return card;
    }
    
    function updateEstimatedTime(clientCount) {
        const averageTimePerGroup = 15;
        const estimatedMinutes = clientCount * averageTimePerGroup;
        estimatedTimeEl.textContent = `${estimatedMinutes} min`;
    }

    // --- EVENT LISTENERS ---
    
    const nameInput = waitlistForm.querySelector('input[name="customer_name"]');
    const peopleInput = waitlistForm.querySelector('input[name="number_of_people"]');
    const phoneInput = waitlistForm.querySelector('input[name="customer_phone"]');

    // Validar Nombre (solo letras y espacios)
    nameInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    });

    // Validar N° de Personas y Teléfono (solo números)
    const allowOnlyNumbers = (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    };
    peopleInput.addEventListener('input', allowOnlyNumbers);
    phoneInput.addEventListener('input', allowOnlyNumbers);

    // Listener específico para el teléfono para truncar a 10 dígitos
    phoneInput.addEventListener('input', (e) => {
        if (e.target.value.length > 10) {
            e.target.value = e.target.value.slice(0, 10);
        }
    });
    
    waitlistForm.addEventListener('submit', addClientToList);

    waitingListContainer.addEventListener('click', (e) => {
        const seatButton = e.target.closest('.btn-seat');
        const cancelButton = e.target.closest('.btn-cancel');
        
        if (seatButton) {
            const card = seatButton.closest('.client-card');
            openSeatClientModal(card.dataset.clientId, card.dataset.clientName);
        }
        if (cancelButton) {
            archiveClientAsCancelled(cancelButton.closest('.client-card').dataset.clientId);
        }
    });

    closeModalBtn.addEventListener('click', closeSeatClientModal);
    cancelSeatBtn.addEventListener('click', closeSeatClientModal);
    confirmSeatBtn.addEventListener('click', confirmAndSeatClient);

    modalTableGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-table-box')) {
            e.target.classList.toggle('selected');
        }
    });

    // --- INICIALIZACIÓN ---
    loadWaitingList();
});