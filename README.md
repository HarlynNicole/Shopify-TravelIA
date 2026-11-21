# Shopify-TravelIA

Travelia ayuda a organizar viajes por el Perú según destino, fecha, duración, compañía, intereses y presupuesto. Este repositorio público guarda los módulos originales de Travelia para Shopify Online Store 2.0.

## Planificador

La sección `sections/travelia-planner.liquid` presenta seis pasos con validación y progreso. Los archivos `assets/travelia-planner.js` y `assets/travelia-itinerary.js` gestionan el formulario y calculan una propuesta diaria en el navegador. El presupuesto mostrado se deriva del monto indicado por la persona. Las actividades son orientativas y la tienda gestiona las experiencias comerciales por separado.

## Previsualización en Shopify

1. Trabaja con una copia local del borrador Horizon de la tienda.
2. Copia los archivos de `assets/`, `sections/` y `templates/` de este repositorio a sus carpetas correspondientes en la copia.
3. Desde la raíz del tema completo, ejecuta `shopify theme check` y luego `shopify theme dev --store 8tz27r-cj.myshopify.com` con una sesión autorizada. Para probar la plantilla, crea o selecciona una página de prueba y elige la plantilla `travelia-planificador` en un entorno borrador. También se puede agregar la sección desde el editor visual.
4. Configura el enlace de experiencias hacia una colección publicada. El valor predeterminado conduce al catálogo general de Shopify.

La integración oficial de GitHub requiere una rama con el tema completo en la raíz. Este repositorio guarda los módulos originales, por lo que se usa junto con el borrador. Consulta la [integración oficial de Shopify](https://shopify.dev/docs/storefronts/themes/tools/github) para comprobar los requisitos de sincronización.

## Alcance

Este avance implementa el planificador basado en reglas. El informe académico usó ejemplos simulados para el resultado, el marketplace y el carrito. Quedan por desarrollar y verificar las adaptaciones comerciales y las páginas restantes. Una integración posterior con IA requiere un servicio de backend que mantenga las claves fuera del tema.
