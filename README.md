# KitchenLink 🍽️

**KitchenLink** es un sistema de gestión web para restaurantes, diseñado para optimizar el manejo de reservaciones y la administración de listas de espera en tiempo real.  
Actualmente solo se han desarrollado las primeras funciones, pero se planea que en los próximos meses se incorporen las interfaces restantes.

La aplicación permite al personal de recepción (hostess) tener un control visual e intuitivo del estado de las mesas, agilizando el servicio y mejorando la experiencia de los clientes.

---

## ✨ Características principales

### Gestión de reservaciones
-   📅 **Creación de reservaciones:** Registra nuevas reservaciones indicando fecha, hora, número de personas, nombre del cliente y solicitudes especiales.
-   🪑 **Asignación de mesas:** Selecciona visualmente las mesas disponibles para una reservación.
-   👀 **Visualización en tiempo real:** Muestra el estado actual de todas las mesas (Disponible, Ocupado, Reservado).
-   📋 **Lista de reservaciones del día:** Consulta todas las reservaciones programadas para una fecha específica.
-   ✅ **Gestión de historial:** Confirma llegadas o cancela reservaciones, enviando los registros al historial para futuros reportes.

### Gestión de lista de espera
-   👥 **Lista de espera activa:** Añade clientes sin reservación a una lista de espera dinámica.
-   ⏱️ **Tiempo de espera estimado:** Calcula y muestra un tiempo de espera aproximado según la cantidad de grupos en lista.
-   🪑 **Asignación de mesas a clientes en espera:** Permite “sentar” a clientes seleccionando mesas disponibles; el estado se actualiza automáticamente y el cliente pasa al historial.
-   ❌ **Registro de cancelaciones:** Envía al historial a clientes que deciden no esperar.

### Administración
-   🔒 **Sistema de autenticación:** Inicio de sesión seguro para el personal autorizado (contraseñas encriptadas con `password_hash()` en PHP).
-   🛡️ **Validación de datos:** Reglas estrictas en la interfaz y en el servidor para garantizar la integridad y el formato correcto de la información (nombres, teléfonos, número de personas, horarios, etc.).

---

## 🛠️ Tecnologías utilizadas

-   **Frontend:** `HTML5`, `CSS3`, `JavaScript (Vanilla)`
-   **Backend:** `PHP`
-   **Base de datos:** `MySQL`
-   **Entorno de servidor local:** `XAMPP` (Apache + MySQL + PHP)

---

## 🚀 Instalación en local

Sigue estos pasos para ejecutar el proyecto en tu equipo.

### Prerrequisitos
-   Tener instalado un entorno como **XAMPP** o WAMP (Apache, MySQL y PHP).
-   Un navegador moderno (Chrome, Firefox, etc.).

### 1. Configuración de la base de datos
1.  Inicia **Apache** y **MySQL** desde el panel de control de XAMPP.
2.  Abre `http://localhost/phpmyadmin/`.
3.  Crea una base de datos llamada `kitchenlink_db`.
4.  Selecciónala y ve a la pestaña **SQL**.
5.  Copia y pega el código SQL del archivo `documentation/tables.txt`. Incluye las tablas y algunos registros iniciales.  
   *(Puedes modificar los registros siempre que respetes la estructura de las tablas).*

### 2. Configuración de los archivos del proyecto
1.  **Clonar repositorio:** Descarga o clona el proyecto en tu computadora.
2.  **Ubicar el proyecto:** Mueve la carpeta `KitchenLink` al directorio `htdocs` de XAMPP.  
    -   Windows: `C:/xampp/htdocs/`  
    -   Linux: `/opt/lampp/htdocs/`
3.  **Configurar conexión a la base de datos:** Edita `KitchenLink/src/php/db_connection.php`.
4.  **Ajustar credenciales:** Verifica usuario, contraseña y nombre de la base de datos (se recomienda usar `KitchenLink`).

### 3. Ejecutar
1.  Abre tu navegador.
2.  Accede a: `http://localhost/KitchenLink/login.html`

---

### Notas importantes
1. **Creación de usuarios iniciales:**  
   Para registrar un usuario, primero genera un hash de contraseña:  
   - Edita `KitchenLink/src/php/generar_hash.php` con la contraseña deseada.  
   - Ejecuta en el navegador: `http://localhost/KitchenLink/src/php/generar_hash.php`  
   - Copia el hash generado e insértalo manualmente en la base de datos junto con un nombre de usuario.
   
2. **Registro de nuevos usuarios:**  
   También puedes acceder a: `http://localhost/KitchenLink/register.html` (actualmente oculto).  
   Ingresa nombre completo, usuario, contraseña y rol.  
   El sistema encripta la contraseña automáticamente al guardar.

---

![Register.png](/documentation/images/register.png)
