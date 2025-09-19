document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  // Regex: letras y números
  const regexAlphanumeric = /^[A-Za-z0-9]*$/; 

  if (loginForm) {
    ["user", "password"].forEach(id => {
      const input = document.getElementById(id);
      input.addEventListener("input", () => {
        // Elimina cualquier caracter que no sea letra o número
        input.value = input.value.replace(/[^A-Za-z0-9]/g, "");
        // Limita a 8 caracteres
        if (input.value.length > 12) input.value = input.value.slice(0, 12);

        loginError.textContent = "";
      });
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

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
      }
    });
  }
});
