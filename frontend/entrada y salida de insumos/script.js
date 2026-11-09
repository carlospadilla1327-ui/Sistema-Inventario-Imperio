"use strict";
(async () => {
  const sesion = await sesionImperio.lista;
  if (!sesion) return;
  const mensajeEstado=document.getElementById("mensajeEstado");
  const cuerpoHistorial=document.getElementById("cuerpoHistorial");
  const formularios=[document.getElementById("formularioEntrada"),document.getElementById("formularioSalida")];
  const fechaHoy=datosImperio.fechaHoy();
  let productos=[];
  let solicitudActual=0;
  function mensaje(texto,error=false) { mensajeEstado.textContent=texto;mensajeEstado.classList.toggle("error",error); }
  function actualizarUnidad(formulario) {
    const elegido=productos.find(p=>p.id===formulario.elements.producto.value);
    formulario.elements.unidad.value=elegido?.unidad || "";
    formulario.querySelector("button").disabled=!elegido || formulario.dataset.guardando==="true";
  }
  async function actualizar() {
    const numero=++solicitudActual;
    try {
      const [inventario, registros]=await Promise.all([datosImperio.leer(), sesionImperio.solicitar("/movimientos")]);
      if (numero!==solicitudActual) return;
      productos=inventario.productos;
      formularios.forEach(formulario=>{
        const seleccion=formulario.elements.producto.value;
        formulario.elements.producto.replaceChildren();
        productos.forEach(p=>formulario.elements.producto.add(new Option(p.nombre,p.id)));
        if (productos.some(p=>p.id===seleccion)) formulario.elements.producto.value=seleccion;
        actualizarUnidad(formulario);
      });
      cuerpoHistorial.replaceChildren();
      registros.forEach(m=>{
        const fila=document.createElement("tr");
        const valores=[new Date(m.registradoEn).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}),
          m.tipo==="entrada"?"Entrada":"Salida",m.producto,
          m.cantidad.toLocaleString("es-MX")+" "+m.unidad,m.detalle,m.usuario,m.fecha,m.observaciones||"—"];
        valores.forEach(texto=>{const celda=document.createElement("td");celda.textContent=texto;fila.append(celda);});
        cuerpoHistorial.append(fila);
      });
      if (!registros.length) {
        const fila=document.createElement("tr"),celda=document.createElement("td");
        celda.colSpan=8;celda.textContent="Todavía no hay movimientos registrados en este turno.";fila.append(celda);cuerpoHistorial.append(fila);
      }
      if (!productos.length) mensaje("No hay productos. La dueña debe agregarlos desde Inventario.");
    } catch(error) {
      if (numero!==solicitudActual) return;
      mensaje(error.message,true);
      formularios.forEach(f=>f.querySelector("button").disabled=true);
    }
  }
  formularios.forEach(formulario=>{
    formulario.elements.fecha.value=fechaHoy;
    formulario.elements.fecha.max=fechaHoy;
    formulario.querySelector("button").disabled=true;
    formulario.elements.producto.addEventListener("change",()=>actualizarUnidad(formulario));
    formulario.elements.detalle.addEventListener("input",()=>formulario.elements.detalle.setCustomValidity(""));
    formulario.addEventListener("submit",async evento=>{
      evento.preventDefault();
      if (formulario.dataset.guardando==="true") return;
      const campos=formulario.elements;
      campos.detalle.setCustomValidity(campos.detalle.value.trim()?"":"Completa este campo.");
      if (!formulario.reportValidity()) return;
      formulario.dataset.guardando="true";
      actualizarUnidad(formulario);
      try {
        const registro=await datosImperio.capturar("/movimientos",formulario);
        formulario.reset();campos.fecha.value=fechaHoy;
        mensaje((registro.tipo==="entrada"?"Entrada":"Salida")+" registrada. Inventario actualizado.");
        await actualizar();
      } catch(error) { mensaje(error.message,true); }
      finally { delete formulario.dataset.guardando; actualizarUnidad(formulario); }
    });
  });
  window.addEventListener("focus",actualizar);
  actualizar();
})();
