# Asistente TravelIA

## Activar respuestas de IA

1. Despliega el mismo repositorio en un entorno Node.js 22.18 o posterior que ejecute `node server/assistant.mjs` y exponga la ruta `/assistant` mediante HTTPS. Shopify carga el widget desde el tema y el backend se ejecuta en ese entorno externo.
2. Configura en el servidor `OPENAI_API_KEY`, `OPENAI_MODEL` y `TRAVELIA_ORIGINS`. Usa una lista de orígenes HTTPS exactos separados por comas, por ejemplo `https://8tz27r-cj.myshopify.com` y el dominio de la tienda que realmente sirva el tema. El puerto usa `PORT` o 3000.
3. En un tema sin publicar, abre **Configuración del tema → Asistente TravelIA** y guarda la URL HTTPS completa terminada en `/assistant`.
4. Genera un itinerario, abre el chat y pregunta «¿Qué incluye mi itinerario?». Con una respuesta satisfactoria del modelo verás «Respuesta de IA». Las consultas de presupuesto muestran «Orientación de Travelia» y usan el cálculo determinista.
5. Antes de abrir el servicio al público, configura límites de gasto y una cuota de solicitudes en el proveedor y en el proxy HTTPS. El servidor aplica un límite por proceso, y CORS solo controla qué orígenes de navegador pueden leer sus respuestas. Ajusta las condiciones de privacidad de la tienda a los datos enviados.

El visitante ve un aviso antes de enviar. El historial se mantiene en memoria durante la página actual y se reinicia al generar o descartar un itinerario. El backend envía hasta 16 mensajes, destino, fechas, duración, viajeros, preferencias y jornadas al modelo con `store: false`. La clave permanece en el servidor. El planificador sigue usando reglas con la misma guía de 14 destinos.

## Presupuesto y reservas

Los importes del plan representan presupuesto declarado. El chat suma conceptos ingresados, por ejemplo «Alimentación: 60 por persona» o «Transporte: 120 grupo». Un importe por persona se multiplica por la cantidad de viajeros cuando está disponible. El promedio grupal divide el subtotal por esa misma cantidad. Los rubros faltantes quedan pendientes de consulta. La agenda enumera actividades orientativas y Shopify controla los productos comerciales.

[Referencia de Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
