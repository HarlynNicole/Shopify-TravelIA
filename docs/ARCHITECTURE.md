# Arquitectura

La base se encuentra en `layout/theme.liquid`. Los grupos de cabecera y pie enmarcan las plantillas JSON. Las secciones usan Liquid y comparten la hoja de estilos de Travelia. El planificador separa el formulario del motor de reglas. Un backend futuro puede usar el mismo contrato de diez respuestas y conservar sus credenciales en el servidor.


`assets/travelia-destinations.js` contiene la fuente de datos de la guía, el planificador y el asistente. Los bloques de Shopify vinculan fotos de la tienda y productos existentes cuando corresponda. El planificador comparte el resultado con el asistente mediante el evento `travelia:trip`, y lo retira al reiniciar el cuestionario.

El planificador recomienda por reglas. El chat puede consultar un backend para responder con IA usando los datos de la guía y el contexto de la conversación. La orientación y los cálculos de presupuesto funcionan sin el backend.
