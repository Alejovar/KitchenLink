<?php
// modal_create_table.php - Contiene el HTML estilizado del modal.
?>

<div id="newTableModal" class="modal-overlay">
    <div class="modal-content">
        <h2>Crear Nueva Mesa</h2>
        <form id="newTableForm">
            
            <div class="form-group">
                <label for="mesaNumber">Número de Mesa:</label>
                <input type="number" id="mesaNumber" required min="1" max="9999"> 
                <p class="validation-message" id="mesaNumberError"></p>
            </div>
            
            <div class="form-group">
                <label for="clientCount">Número de Personas:</label>
                <input type="number" id="clientCount" required min="1" max="99"> 
                <p class="validation-message" id="clientCountError"></p>
            </div>
            
            <div class="control-buttonsmodal">
                <button type="button" class="action-btnmodal secondary-btnmodal" id="cancelCreate">Cancelar</button>
                <button type="submit" class="action-btnmodal primary-btnmodal">Crear Mesa</button>
            </div>
        </form>
    </div>
</div>