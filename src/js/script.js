const container = document.getElementById("container");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

registerBtn.addEventListener("click", () => {
  container.classList.add("active");
});

loginBtn.addEventListener("click", () => {
  container.classList.remove("active");
});

// This function runs when the entire HTML document has been loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    
    // Get references to key elements in the DOM
    const dateFilter = document.getElementById('dateFilter');
    const reservationsContainer = document.getElementById('reservationsContainer');
    const reservationForm = document.getElementById('reservationForm');
    const newReservationDateInput = document.getElementById('newReservationDate');

    // API endpoints
    const GET_RESERVATIONS_API = '/api/get_reservations.php';
    const ADD_RESERVATION_API = '/api/add_reservation.php';

    /**
     * Fetches reservations for a specific date from the server and displays them.
     * @param {string} date - The date in 'YYYY-MM-DD' format.
     */
    async function fetchReservations(date) {
        if (!date) {
            reservationsContainer.innerHTML = '<p class="placeholder-text">Selecciona una fecha para ver las reservaciones.</p>';
            return;
        }

        reservationsContainer.innerHTML = '<p class="placeholder-text">Cargando...</p>';

        try {
            // Fetch data from the API
            const response = await fetch(`${GET_RESERVATIONS_API}?date=${date}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const reservations = await response.json();

            // Clear the container
            reservationsContainer.innerHTML = '';

            if (reservations.length === 0) {
                reservationsContainer.innerHTML = '<p class="placeholder-text">No hay reservaciones para esta fecha.</p>';
            } else {
                // Create and append an element for each reservation
                reservations.forEach(reservation => {
                    const item = document.createElement('div');
                    item.className = 'reservation-item';

                    // Format time for better readability
                    const timeParts = reservation.reservation_time.split(':');
                    const formattedTime = `${timeParts[0]}:${timeParts[1]}`;

                    item.innerHTML = `
                        <h4>${reservation.customer_name} - ${formattedTime}</h4>
                        <p><strong>Personas:</strong> ${reservation.number_of_guests}</p>
                        <p><strong>Teléfono:</strong> ${reservation.customer_phone || 'No especificado'}</p>
                        ${reservation.special_requests ? `<p><strong>Notas:</strong> ${reservation.special_requests}</p>` : ''}
                        <p><small>Registró: ${reservation.hostess_name}</small></p>
                    `;
                    reservationsContainer.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Error al cargar reservaciones:', error);
            reservationsContainer.innerHTML = '<p class="placeholder-text">Ocurrió un error al cargar los datos.</p>';
        }
    }

    /**
     * Handles the submission of the new reservation form.
     * @param {Event} event - The form submission event.
     */
    async function handleFormSubmit(event) {
        event.preventDefault(); // Prevent the default page reload

        const formData = new FormData(reservationForm);
        const submitButton = reservationForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registrando...';

        try {
            const response = await fetch(ADD_RESERVATION_API, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('¡Reservación registrada con éxito!');
                reservationForm.reset(); // Clear the form
                
                // Refresh the reservations list if the new reservation is for the selected date
                if (dateFilter.value === formData.get('reservation_date')) {
                    fetchReservations(dateFilter.value);
                }
                // Set the form's date input back to today
                setDefaultDates();

            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error al registrar la reservación:', error);
            alert('Ocurrió un error de conexión al registrar la reservación.');
        } finally {
            // Re-enable the button
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar reservación';
        }
    }

    /**
     * Sets the default date for the date inputs to today.
     */
    function setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        dateFilter.value = today;
        newReservationDateInput.value = today;
    }

    // --- Initial Setup ---

    // Set default dates when the page loads
    setDefaultDates();
    
    // Fetch reservations for today automatically
    fetchReservations(dateFilter.value);

    // --- Event Listeners ---

    // Listen for changes on the date filter input
    dateFilter.addEventListener('change', () => {
        fetchReservations(dateFilter.value);
    });

    // Listen for the form submission
    reservationForm.addEventListener('submit', handleFormSubmit);

});

