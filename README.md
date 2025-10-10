# KitchenLink 🍽️

**KitchenLink** es un sistema web para la gestión integral de restaurantes, diseñado para optimizar el manejo de **reservaciones**, **listas de espera**, **mesas** y **órdenes** en tiempo real.  

Actualmente el sistema **ya está desplegado y en funcionamiento** en la siguiente dirección:

🔗 [KitchenLink — Sistema en línea](https://kitchenlink.host.adellya.my.id/KitchenLink/login.html)

> Para acceder, puedes crear un usuario desde la sección **“Registrar”**.  
> ⚠️ **Nota:** Para registrar un nuevo usuario, se requiere la **contraseña de un gerente**.  
> Si deseas una cuenta de prueba o acceso de demostración, mándame DM en **Instagram: [@imalejovar](https://www.instagram.com/imalejovar)**.

---

## ✨ Características principales

### Gestión de reservaciones
- 📅 **Creación de reservaciones:** Registra nuevas reservaciones con fecha, hora, número de personas y nombre del cliente.  
- 🪑 **Asignación visual de mesas:** Selecciona mesas disponibles desde una interfaz interactiva.  
- 👀 **Estado en tiempo real:** Visualiza las mesas disponibles, ocupadas o reservadas.  
- 📋 **Listado del día:** Consulta todas las reservaciones activas según la fecha.  
- ✅ **Historial:** Guarda reservaciones confirmadas o canceladas para consulta posterior.

### Gestión de lista de espera
- 👥 **Lista dinámica:** Añade clientes sin reservación a una lista activa.  
- ⏱️ **Tiempos estimados:** Calcula automáticamente los tiempos de espera.  
- 🪑 **Asignación directa:** Permite sentar clientes de la lista a mesas disponibles.  
- ❌ **Cancelaciones:** Envía al historial a los clientes que decidan no esperar.

### Administración y autenticación
- 🔒 **Inicio de sesión seguro:** Autenticación mediante contraseñas encriptadas con `password_hash()` en PHP.  
- 🧩 **Validación estricta:** Control del formato de datos (nombres, teléfonos, horarios, etc.).  
- 👨‍💼 **Roles:** Diferenciación entre **usuarios**, con permisos independientes.

---

## 🍽️ Orders — Interfaz de Mesero (YA DISPONIBLE / En desarrollo)

La interfaz **Orders** permite a los **meseros** gestionar sus mesas y órdenes activas.  
Actualmente ya se encuentra **disponible en la versión desplegada** y continuará en desarrollo con nuevas funciones.

### Funcionalidades
- 🧾 **Gestión de mesas:** Cada mesero puede crear, editar y administrar las mesas que le correspondan.  
- 👥 **Sesiones múltiples:** Permite que varios meseros inicien sesión simultáneamente sin interferir entre sí.  
- 🔀 **Vista personalizada:** Aunque la interfaz visual es idéntica para todos, cada mesero **solo ve las mesas que él mismo creó**.  
- 💬 **Sincronización activa:** Cada acción (crear, ocupar o liberar una mesa) se refleja inmediatamente en su sesión.  
- 🚧 **Estado actual:** Implementada y funcionando, con futuras actualizaciones planeadas para gestión de pedidos y seguimiento de órdenes.

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** `HTML5`, `CSS3`, `JavaScript (Vanilla)`  
- **Backend:** `PHP`  
- **Base de datos:** `MySQL`  
- **Servidor requerido:** Hosting o servidor con soporte para **PHP + MySQL**  
- **Compatibilidad:** Funciona en cualquier entorno con Apache, Nginx o similar.

---

## 🚀 Despliegue en servidor

Si deseas desplegar **KitchenLink** por tu cuenta, sigue estos pasos:

### 1. Requisitos
- Servidor web con soporte para:  
  - **PHP 7.4+ o superior**  
  - **MySQL 5.7+ o MariaDB**  
  - Archivos estáticos (`HTML`, `CSS`, `JS`)  
- Acceso a **phpMyAdmin** o consola MySQL para importar la base de datos.

> ⚠️ **Importante:** KitchenLink **no se ejecuta en local** (XAMPP/WAMP) por defecto; requiere un **servidor web real o hosting** compatible con PHP y MySQL.

### 2. Configuración de la base de datos
1. Crea una base de datos llamada `kitchenlink_db`.  
2. Importa el contenido del archivo `documentation/tables.txt` (estructura y datos base).

### 3. Configuración del proyecto
1. Sube la carpeta `KitchenLink` al directorio público de tu hosting (`public_html`, `htdocs`, etc.).  
2. Edita `KitchenLink/src/php/db_connection.php` con tus credenciales MySQL (usuario, contraseña y nombre de la BD).  
3. Accede desde tu navegador con la URL de tu dominio:  
[https://tusitio.com/KitchenLink/login.html](https://tusitio.com/KitchenLink/login.html)

---

## 📋 Notas importantes

### Creación de usuarios iniciales
Para registrar usuarios por primera vez (modo despliegue):  
1. Edita `KitchenLink/src/php/generar_hash.php` con la contraseña deseada.  
2. Ejecuta el archivo desde el navegador:  
[https://tusitio.com/KitchenLink/src/php/generar_hash.php](https://tusitio.com/KitchenLink/src/php/generar_hash.php)  
3. Copia el hash generado e insértalo manualmente en la base de datos junto con un nombre de usuario y rol.

### Registro de nuevos usuarios
- Página de registro:  
[https://tusitio.com/KitchenLink/register.html](https://tusitio.com/KitchenLink/register.html)  
- Ingresa nombre completo, usuario, contraseña y rol.  
- El sistema encripta la contraseña automáticamente.  
- 🔑 Se requiere la **contraseña de gerente** para crear nuevos usuarios.

---

![Register.png](/documentation/interfaces/register.png)

---

## 📚 Documentación del proyecto

Toda la documentación técnica, manuales, diagramas y archivos complementarios se encuentran disponibles en la carpeta:  

`/documentation/docs/`  

Ahí se incluyen los archivos PDF correspondientes al desarrollo, configuración, estructura de la base de datos y guías de usuario. La documentación se irá ampliando conforme avanza el proyecto.

---

## 💬 Contacto y soporte

Si deseas probar el sistema, solicitar acceso o recibir ayuda para desplegarlo:  
📩 **DM a [@imalejovar](https://www.instagram.com/imalejovar)** en Instagram.

---

![logo.png](/documentation/images/logo.png)

