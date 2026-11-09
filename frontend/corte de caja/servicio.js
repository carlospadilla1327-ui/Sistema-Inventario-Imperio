"use strict";
// Cambiar a "api" únicamente cuando el backend implemente el contrato documentado.
window.configuracionCaja = { modo: "demo", urlApi: "/api" };
window.servicioCaja = (() => {
  const claveTurnos = "imperioTurnosDemoV1";
  const claveCortes = "imperioCortesDemoV1";
  function leerLista(clave) {
    const lista = JSON.parse(localStorage.getItem(clave) || "[]");
    if (!Array.isArray(lista)) throw new Error("Formato inválido en los datos de caja.");
    return lista;
  }
  function sesionActual() {
    const sesion=sesionImperio.leer();
    if (!sesion) throw new Error("La sesión terminó. Vuelve a iniciar sesión.");
    return sesion;
  }
  function esDuena() {
    return sesionActual().rol === "duena" && sessionStorage.getItem("imperioVistaEmpleado") !== "true";
  }
  async function solicitar(ruta, opciones={}) {
    const respuesta=await fetch(configuracionCaja.urlApi+ ruta, {
      credentials:"include", ...opciones,
      headers:{"Content-Type":"application/json",...opciones.headers}
    });
    if (!respuesta.ok) throw new Error("La API no pudo completar la solicitud ("+respuesta.status+").");
    return respuesta.json();
  }
  function turnosDemo() {
    const sesion=sesionActual();
    const turnos=leerLista(claveTurnos);
    if (!turnos.some(t=>t.id===sesion.turnoId)) {
      turnos.push({id:sesion.turnoId,usuario:sesion.usuario,rol:sesion.rol,
        inicio:sesion.inicioTurno || new Date().toISOString(),estado:"abierto"});
      localStorage.setItem(claveTurnos,JSON.stringify(turnos));
    }
    return turnos;
  }
  function autorizarTurno(id) {
    const turno=turnosDemo().find(t=>t.id===id);
    if (!turno || (!esDuena() && id!==sesionActual().turnoId)) throw new Error("No tienes acceso a ese turno.");
    return turno;
  }
  async function resumenDemo(id) {
    const turno=autorizarTurno(id);
    const actividad = id===sesionActual().turnoId
      ? await sesionImperio.solicitar("/actividad-turno")
      : leerLista(claveCortes).find(corte=>corte.turno.id===id);
    if (!actividad) throw new Error("No hay un resumen local de este turno.");
    return {turno,
      entradas:actividad.entradas,salidas:actividad.salidas,mermas:actividad.mermas,ventas:0,efectivo:0,
      pendientes:["Ventas","Efectivo en caja"]};
  }
  return {
    esDuena,
    async listarTurnos() {
      if (configuracionCaja.modo==="api") return solicitar("/caja/turnos");
      const actual=sesionActual().turnoId;
      return turnosDemo().filter(t=>t.id===actual).reverse();
    },
    async obtenerResumen(id) {
      if (configuracionCaja.modo==="api") return solicitar("/caja/turnos/"+encodeURIComponent(id)+"/resumen");
      return resumenDemo(id);
    },
    async listarCortes() {
      if (configuracionCaja.modo==="api") return solicitar("/caja/cortes");
      if (!esDuena()) return [];
      return leerLista(claveCortes).sort((a,b)=>b.generadoEn.localeCompare(a.generadoEn));
    },
    async generarResumen(id) {
      if (configuracionCaja.modo==="api") return solicitar("/caja/cortes", {
        method:"POST", body:JSON.stringify({turnoId:id})
      });
      const resumen=await resumenDemo(id);
      const cortes=leerLista(claveCortes);
      const anterior=cortes.find(c=>c.turno.id===id);
      const corte={...resumen,id:anterior?.id || crypto.randomUUID(),generadoEn:new Date().toISOString()};
      // Un resumen por turno: volver a generar actualiza la instantánea.
      const siguientes=cortes.filter(c=>c.turno.id!==id);
      siguientes.push(corte);
      localStorage.setItem(claveCortes,JSON.stringify(siguientes));
      return corte;
    }
  };
})();
