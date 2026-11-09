"use strict";
(async () => {
  const sesion = await sesionImperio.lista;
  if (!sesion) return;
  const formulario = document.getElementById("formularioMerma");
  const boton = document.getElementById("registrarMerma");
  const mensaje = document.getElementById("mensajeEstado");
  const gestion = document.getElementById("gestionMermas");
  const duena = sesion.rol === "duena" && sessionStorage.getItem("imperioVistaEmpleado") !== "true";
  const hoy = datosImperio.fechaHoy();
  const campos = formulario.elements;
  let productos = [];
  let guardando = false;
  campos.fecha.value = hoy;
  campos.fecha.max = hoy;
  gestion.hidden = !duena;

  function unidad() {
    const producto = productos.find(p => p.id === campos.producto.value);
    campos.unidad.value = producto?.unidad || "";
    boton.disabled = !producto || guardando;
  }
  function dibujarHistorial({ mermas, resumen }) {
    const lista = document.getElementById("resumenMermas");
    lista.replaceChildren();
    const total = resumen.reduce((suma, r) => suma + Number(r.total), 0);
    const tarjetas = [["Total mermas", total], ...["Caducidad","Daño","Otros"].map(tipo =>
      [tipo, resumen.find(r => r.tipo === tipo)?.total ?? 0])];
    for (const [nombre, cuenta] of tarjetas) {
      const tarjeta = document.createElement("div");
      const termino = document.createElement("dt");
      const valor = document.createElement("dd");
      termino.textContent = nombre;
      valor.textContent = cuenta;
      tarjeta.append(termino, valor);
      lista.append(tarjeta);
    }
    const historial = document.getElementById("historialMermas");
    historial.replaceChildren();
    for (const merma of mermas) {
      const fila = historial.insertRow();
      for (const valor of [merma.fecha?.slice(0,10) || "—", merma.producto,
        Number(merma.cantidad).toLocaleString("es-MX") + " " + merma.unidad, merma.tipo, merma.descripcion || "—"]) {
        fila.insertCell().textContent = valor;
      }
    }
    if (!mermas.length) {
      const celda = historial.insertRow().insertCell();
      celda.colSpan = 5;
      celda.textContent = "Todavía no hay mermas registradas.";
    }
  }
  async function cargar() {
    ({ productos } = await datosImperio.leer());
    const seleccionado = campos.producto.value;
    campos.producto.replaceChildren(...productos.map(p => new Option(p.nombre, p.id)));
    if (productos.some(p => p.id === seleccionado)) campos.producto.value = seleccionado;
    unidad();
    if (duena) dibujarHistorial(await sesionImperio.solicitar("/mermas"));
  }
  campos.producto.addEventListener("change", unidad);
  formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (guardando) return;
    guardando = true;
    unidad();
    try {
      await datosImperio.capturar("/mermas", formulario);
      formulario.reset();
      campos.fecha.value = hoy;
      mensaje.textContent = "Merma registrada. Inventario actualizado.";
      try { await cargar(); }
      catch { mensaje.textContent = "Merma registrada. Recarga la página para actualizar la vista."; }
    } catch (error) {
      mensaje.textContent = error.message;
    } finally {
      guardando = false;
      unidad();
    }
  });
  try {
    await cargar();
    if (!productos.length) mensaje.textContent = "Agrega un producto en Inventario para poder registrar mermas.";
  } catch (error) { mensaje.textContent = error.message; }
})();
