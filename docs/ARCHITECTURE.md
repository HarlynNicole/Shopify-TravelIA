# Arquitectura

La base se encuentra en `layout/theme.liquid`. Los grupos de cabecera y pie enmarcan las plantillas JSON. Las secciones usan Liquid y comparten la hoja de estilos de Travelia. El planificador separa el formulario del motor de reglas. Un backend futuro puede usar el mismo contrato de diez respuestas y conservar sus credenciales en el servidor.


La tienda aún no tiene una integración con IA. Para incorporarla se requiere un backend HTTPS controlado por Travelia, una clave almacenada en el servidor y un modelo que devuelva itinerarios con un esquema validado. El servidor debe aplicar límites de uso y devolver errores claros. La interfaz puede reutilizar el objeto de resultado que hoy genera `buildItinerary`. Solo identifica resultados como generados por IA cuando una solicitud al backend haya tenido éxito. Shopify conserva la autoridad sobre enlaces, productos, precios y disponibilidad.
