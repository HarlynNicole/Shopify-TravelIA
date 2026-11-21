# Asistente TravelIA con Gemini

El tema Shopify incluye el chat y envía sus solicitudes HTTPS al servicio Node.js. El servidor usa el SDK oficial `@google/genai` y conserva la clave en su entorno. El planificador utiliza reglas. Con la URL del asistente sin configurar, la tienda identifica la ayuda como «Orientación de Travelia». Con una URL configurada, el chat solo muestra la etiqueta de Gemini tras una respuesta del proveedor. Si la API falla o alcanza su cuota, muestra ese estado.

## Desplegar en Render Free

1. En [Render](https://dashboard.render.com/), selecciona **New → Web Service**. Conecta GitHub y elige `HarlynNicole/Shopify-TravelIA`, rama `main`. Deja **Root Directory** vacío porque el servidor también importa archivos de `assets/`.
2. Selecciona **Node**, **Build Command** `npm ci`, **Start Command** `npm start` e **Instance Type** **Free**. El nombre del servicio puede ser `travelia-assistant`. En la configuración avanzada, usa `/healthz` como **Health Check Path**. Esta ruta verifica la configuración y jamás llama a Gemini.
3. En **Environment Variables**, configura:

   | Variable | Valor |
   | --- | --- |
   | `GEMINI_API_KEY` | Pega la clave directamente en **Value** en Render. |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
   | `TRAVELIA_ORIGINS` | `https://8tz27r-cj.myshopify.com`. Si pruebas desde otro dominio, agrega su origen exacto separado por comas, sin barra final ni ruta. |
   | `GEMINI_REQUESTS_PER_MINUTE` | Opcional. Predeterminado: 5. |
   | `GEMINI_REQUESTS_PER_DAY` | Opcional. Predeterminado: 25. |

4. Pulsa **Deploy Web Service**. Para un servicio existente, usa **Environment → Add Environment Variable → Save and deploy** para actualizar variables o **Manual Deploy → Deploy latest commit** para desplegar los últimos cambios. Guarda la clave únicamente en el panel de Render. Utiliza un proyecto de Gemini con nivel gratuito si quieres evitar cargos.
5. Abre `https://<servicio>.onrender.com/healthz`. Debe mostrar `{"provider":"gemini","configured":true}`. Esto verifica que el servidor cargó sus variables. La prueba del chat verifica la llamada a Gemini.
6. En Shopify, abre **Tienda online → Temas → Personalizar** en el tema de Travelia. En **Configuración del tema → Asistente TravelIA → URL HTTPS del asistente**, guarda `https://<servicio>.onrender.com/assistant`. Primero prueba el tema de vista previa si tienes uno con este código. Si la vista previa usa otro origen, agrégalo a `TRAVELIA_ORIGINS`.

Render Free entra en reposo tras 15 minutos sin tráfico. La primera solicitud puede tardar alrededor de un minuto. El límite de la aplicación es compartido por instancia y se reinicia si se reinicia el proceso. Los límites del proyecto de Google siguen aplicando. Google informa que los datos del nivel gratuito pueden usarse para mejorar sus productos: utiliza datos de prueba sin identificadores personales.

## Verificar respuestas reales

Genera un itinerario de al menos dos días y abre el chat. Envía cada una de estas preguntas una vez:

1. ¿Cuánto me costaría este viaje?
2. ¿Cuánto gastaría si viajo con tres personas?
3. ¿Qué actividades puedo realizar el segundo día?
4. ¿Qué pasa si agrego un día más?
5. ¿Puedes recomendarme una alternativa más económica?

Comprueba que aparezca «Respuesta de Gemini · gemini-3.5-flash-lite» y que las respuestas reflejen el destino y los días del viaje. Si en una consulta de costo aparece «Cálculo de Travelia · Gemini consultado», el servidor recibió una respuesta de Gemini pero descartó su texto por incluir cifras no verificadas. El desglose suma montos aportados por el viajero y deja los demás rubros pendientes de consulta. Puedes contrastar las llamadas con el uso del proyecto de Gemini en AI Studio.

El backend envía hasta 16 mensajes, la guía y el contexto del itinerario. Utiliza un máximo de 480 tokens de salida, un intento por pregunta y un máximo de 2400 caracteres de texto del modelo. El cliente de Shopify solo contiene la URL HTTPS. Los errores del proveedor se convierten en mensajes sin información sensible ni respuesta del proveedor en los registros.

[Secrets en Render](https://render.com/docs/configure-environment-variables) · [Render Free](https://render.com/docs/free) · [Precios de Gemini](https://ai.google.dev/gemini-api/docs/pricing)
