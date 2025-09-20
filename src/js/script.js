document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  // Añadimos una referencia al botón de envío
  const submitButton = loginForm.querySelector('button[type="submit"]');

  if (loginForm) {
    // Aplicamos la validación solo al campo de usuario
    const userInput = document.getElementById("user");
    userInput.addEventListener("input", () => {
      // Elimina cualquier caracter que no sea letra o número
      userInput.value = userInput.value.replace(/[^A-Za-z0-9]/g, "");
      // Limita a 12 caracteres
      if (userInput.value.length > 12) {
        userInput.value = userInput.value.slice(0, 12);
      }
      // Limpia el error al empezar a escribir
      loginError.textContent = "";
    });
    
    // Limpiamos el error también al escribir la contraseña
    document.getElementById("password").addEventListener("input", () => {
        loginError.textContent = "";
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Deshabilitamos el botón y cambiamos el texto
      submitButton.disabled = true;
      submitButton.textContent = "Verificando...";

      try {
        const response = await fetch(loginForm.action, {
          method: "POST",
          body: new FormData(loginForm)
        });

        const result = await response.json();

        if (result.success) {
          window.location.href = result.redirect || "/KitchenLink/dashboard.php";
        } else {
          loginError.textContent = result.message || "Error en el inicio de sesión.";
        }
      } catch (error) {
        console.error("Error en el login:", error);
        loginError.textContent = "Ocurrió un error en la conexión.";
      } finally {
        // Este bloque se ejecuta siempre al final (éxito o error)
        // Reactivamos el botón y restauramos el texto
        submitButton.disabled = false;
        submitButton.textContent = "Iniciar Sesión";
      }
    });
  }
});