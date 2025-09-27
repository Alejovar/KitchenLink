/**
 * Este script maneja la lógica del formulario de inicio de sesión.
 * Incluye validación de campos en tiempo real y la comunicación asíncrona
 * con el servidor para autenticar al usuario sin recargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
  
  // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
  const loginForm = document.getElementById("loginForm"); // El formulario de login.
  const loginError = document.getElementById("loginError"); // El contenedor <span> o <div> para mostrar mensajes de error.
  const submitButton = loginForm.querySelector('button[type="submit"]'); // El botón para enviar el formulario.

  // Verificamos que el formulario exista en la página antes de añadirle listeners.
  // Esto previene errores en otras páginas que no tengan este formulario.
  if (loginForm) {

    // --- VALIDACIÓN EN TIEMPO REAL ---
    const userInput = document.getElementById("user");

    // Escuchamos el evento 'input', que se dispara cada vez que el usuario escribe o borra algo.
    userInput.addEventListener("input", () => {
      // Usamos una expresión regular para eliminar cualquier caracter que NO sea una letra (mayúscula o minúscula) o un número.
      userInput.value = userInput.value.replace(/[^A-Za-z0-9]/g, "");
      
      // Si el texto supera los 12 caracteres, lo cortamos para mantener solo los primeros 12.
      if (userInput.value.length > 12) {
        userInput.value = userInput.value.slice(0, 12);
      }

      // Limpia el mensaje de error tan pronto como el usuario empieza a corregir el campo.
      loginError.textContent = "";
    });
    
    // Hacemos lo mismo para el campo de contraseña: si hay un error y el usuario empieza a escribir, lo borramos.
    document.getElementById("password").addEventListener("input", () => {
        loginError.textContent = "";
    });

    // --- MANEJO DEL ENVÍO DEL FORMULARIO ---

    // Escuchamos el evento 'submit' del formulario.
    loginForm.addEventListener("submit", async (e) => {
      // Prevenimos el comportamiento por defecto del navegador, que sería recargar la página.
      e.preventDefault();

      // --- MEJORA DE EXPERIENCIA DE USUARIO (UX) ---
      // Deshabilitamos el botón para evitar que el usuario haga clic múltiples veces mientras se procesa la petición.
      submitButton.disabled = true;
      submitButton.textContent = "Verificando..."; // Damos feedback visual al usuario.

      try {
        // Realizamos la petición `fetch` a la URL especificada en el atributo 'action' del formulario.
        const response = await fetch(loginForm.action, {
          method: "POST", // Usamos el método POST.
          body: new FormData(loginForm) // Enviamos los datos del formulario (usuario y contraseña).
        });

        // Convertimos la respuesta del servidor (que viene en formato JSON) a un objeto JavaScript.
        const result = await response.json();

        // Si el servidor nos dice que el login fue exitoso...
        if (result.success) {
          // Redirigimos al usuario al panel de control (dashboard) o a la URL que el servidor nos indique.
          window.location.href = result.redirect || "/KitchenLink/dashboard.php";
        } else {
          // Si no fue exitoso, mostramos el mensaje de error que nos envió el servidor.
          loginError.textContent = result.message || "Error en el inicio de sesión.";
        }
      } catch (error) {
        // Si ocurre un error de red (ej: el servidor está caído, no hay internet), lo capturamos aquí.
        console.error("Error en el login:", error);
        loginError.textContent = "Ocurrió un error en la conexión.";
      } finally {
        // El bloque `finally` se ejecuta SIEMPRE, tanto si hubo éxito (`try`) como si hubo un error (`catch`).
        // Es el lugar perfecto para restaurar el estado original del botón.
        submitButton.disabled = false; // Lo volvemos a habilitar.
        submitButton.textContent = "Iniciar Sesión"; // Le devolvemos su texto original.
      }
    });
  }
});