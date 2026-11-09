"use strict";
window.datosImperio = (() => {
  const solicitar = sesionImperio.solicitar;
  function fechaHoy() {
    const partes = new Intl.DateTimeFormat("en", {timeZone:"America/Monterrey", year:"numeric", month:"2-digit", day:"2-digit"})
      .formatToParts(new Date());
    const valores = Object.fromEntries(partes.map(p => [p.type, p.value]));
    return valores.year + "-" + valores.month + "-" + valores.day;
  }
  function guardarProducto(producto) {
    const ruta = producto.id ? "/productos/" + encodeURIComponent(producto.id) : "/productos";
    return solicitar(ruta, { method: producto.id ? "PUT" : "POST", body: JSON.stringify(producto) });
  }
  function capturar(ruta, formulario) {
    const campos = formulario.elements;
    const datos = {
      productoId: campos.producto.value, cantidad: Number(campos.cantidad.value),
      tipo: formulario.dataset.tipo, detalle: campos.detalle.value.trim(), fecha: campos.fecha.value,
      observaciones: campos.observaciones.value.trim()
    };
    const contenido = JSON.stringify(datos);
    const previo = formulario.dataset.solicitud;
    const solicitud = formulario.dataset.contenido === contenido && previo ? previo : crypto.randomUUID();
    formulario.dataset.contenido = contenido;
    formulario.dataset.solicitud = solicitud;
    return solicitar(ruta, { method: "POST", body: JSON.stringify({ ...datos, solicitud }) }).then(registro => {
      delete formulario.dataset.solicitud;
      return registro;
    });
  }
  return { leer: () => solicitar("/inventario"), guardarProducto, capturar, fechaHoy };
})();
