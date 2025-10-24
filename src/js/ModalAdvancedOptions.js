import { Modal } from './Modal.js';
import { TableNumberChanger } from './TableNumberChanger.js'; 
import { GuestCountChanger } from './GuestCountChanger.js'; 
import { ProductsMover } from './ProductsMover.js';
import { ProductsCanceler } from './ProductsCanceler.js';
import { ServerChanger } from './ServerChanger.js'; 

export class ModalAdvancedOptions {
    constructor(triggerButtonSelector) {
        this.triggerButton = document.querySelector(triggerButtonSelector);
        this.selectedTableElement = null; 
        this.passwordForm = document.getElementById('managerPasswordForm');
        this.passwordInput = document.getElementById('managerPasswordInput');
        this.passwordErrorMsg = document.getElementById('passwordErrorMsg');
        this.cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

        this.passwordModal = new Modal('managerPasswordModal');
        this.advancedModal = new Modal('advancedOptionsModal');
        
        this.tableNumberChanger = new TableNumberChanger(this.advancedModal);
        this.guestCountChanger = new GuestCountChanger(this.advancedModal);
        this.productsMover = new ProductsMover(this.advancedModal); 
        this.productsCanceler = new ProductsCanceler(this.advancedModal);
        this.serverChanger = new ServerChanger(this.advancedModal); 
    }

    initialize() {
        if (!this.triggerButton) return;
        this._setupEventListeners();
        this._setupTabs();
    }

    // NUEVO: Método para formatear la entrada de la contraseña en tiempo real.
    _formatPasswordInput() {
        // Elimina cualquier caracter de espacio en blanco.
        this.passwordInput.value = this.passwordInput.value.replace(/\s/g, '');
    }

    _setupEventListeners() {
        this.triggerButton.addEventListener('click', () => {
            this.selectedTableElement = document.querySelector('.table-btn.selected');
            if (this.selectedTableElement) {
                this.passwordInput.value = '';
                this.passwordErrorMsg.style.display = 'none';
                this.passwordModal.open();
                this.passwordInput.focus();
            } else {
                alert('Por favor, seleccione una mesa antes de usar las opciones avanzadas.');
            }
        });

        // MODIFICADO: Añadimos un listener para el evento 'input'
        // Esto llama a _formatPasswordInput cada vez que el usuario escribe algo.
        this.passwordInput.addEventListener('input', () => this._formatPasswordInput());

        this.passwordForm.addEventListener('submit', e => this._handlePasswordVerification(e));
        this.cancelPasswordBtn.addEventListener('click', () => this.passwordModal.close());
        
        this.advancedModal.modalElement.addEventListener('modal:closed', () => this._disposeAdvancedOptions());
    }

    async _handlePasswordVerification(event) {
        event.preventDefault();
        this.passwordErrorMsg.style.display = 'none';
        
        // La validación en tiempo real asegura que aquí no lleguen espacios.
        const password = this.passwordInput.value;

        try {
            const res = await fetch('/KitchenLink/src/api/orders/auth/verify_manager.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password }) // Enviamos el valor ya limpio
            });
            const result = await res.json();

            if (result.success) {
                this.passwordModal.close();
                this._prepareAdvancedOptions(); 
                this.advancedModal.open();
            } else {
                this.passwordErrorMsg.textContent = result.message || 'Contraseña incorrecta.';
                this.passwordErrorMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Error de verificación:', error);
            this.passwordErrorMsg.textContent = 'Error de conexión.';
            this.passwordErrorMsg.style.display = 'block';
        }
    }
    
    _prepareAdvancedOptions() {
        if (!this.selectedTableElement) return;
        
        const tableNumberElement = this.selectedTableElement.querySelector('.table-number');
        const tableNumber = tableNumberElement ? tableNumberElement.textContent : 'Desconocida';
        const mainTitle = this.advancedModal.modalElement.querySelector('h3');
        mainTitle.textContent = `Opciones Avanzadas (Mesa ${tableNumber})`;

        const currentOrderID = null; 
        const currentServerName = this.selectedTableElement.dataset.serverName || ''; 

        this.tableNumberChanger.initialize(tableNumber, currentOrderID);
        this.guestCountChanger.initialize(tableNumber); 
        this.productsMover.initialize(tableNumber); 
        this.productsCanceler.initialize(tableNumber); 
        this.serverChanger.initialize(tableNumber, currentServerName); 
    }
    
    _disposeAdvancedOptions() {
        // Asumiendo que las clases tienen un método dispose para limpiar listeners
        if (this.tableNumberChanger.dispose) this.tableNumberChanger.dispose();
        if (this.guestCountChanger.dispose) this.guestCountChanger.dispose();
        if (this.productsMover.dispose) this.productsMover.dispose();
        if (this.productsCanceler.dispose) this.productsCanceler.dispose();
        if (this.serverChanger.dispose) this.serverChanger.dispose();
        
        this.selectedTableElement = null;
    }

    _setupTabs() {
        const menuItems = document.querySelectorAll('.advanced-options-menu .menu-item');
        const contentTabs = document.querySelectorAll('.advanced-options-content .content-tab');
        
        if (!document.querySelector('.advanced-options-menu .menu-item.active')) {
            menuItems[0]?.classList.add('active');
            document.querySelector(menuItems[0]?.getAttribute('href'))?.classList.add('active');
        }

        menuItems.forEach(menuItem => {
            menuItem.addEventListener('click', e => {
                e.preventDefault();
                menuItems.forEach(item => item.classList.remove('active'));
                contentTabs.forEach(tab => tab.classList.remove('active'));
                
                menuItem.classList.add('active');
                const targetSelector = menuItem.getAttribute('href');
                if (targetSelector) {
                    document.querySelector(targetSelector)?.classList.add('active');
                }
            });
        });
    }
}