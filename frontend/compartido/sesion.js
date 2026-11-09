"use strict";
window.sesionImperio = (() => {
  let actual = null;
  const acceso = "../inicio de sesion/index.html";
  async function solicitar(ruta, opciones = {}) {
    const respuesta = await fetch("/api" + ruta, {
      ...opciones,
      headers: opciones.method ? { "Content-Type": "application/json" } : {}
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      if (respuesta.status === 401 && ruta !== "/login" && ruta !== "/sesion") location.replace(acceso);
      throw Object.assign(new Error(datos.error || "No se pudo completar la solicitud."), { status: respuesta.status });
    }
    return datos;
  }
  const lista = solicitar("/sesion").then(sesion => {
    actual = sesion;
    return actual;
  }).catch(error => {
    if (error.status !== 401) {
      const aviso = document.createElement("p");
      aviso.setAttribute("role", "alert");
      aviso.textContent = "No se pudo verificar la sesión. Revisa la conexión y vuelve a cargar la página.";
      document.querySelector("main")?.prepend(aviso);
      return null;
    }
    if (document.body.dataset.modulo) location.replace(acceso);
    return null;
  });
  return {
    lista, solicitar,
    leer: () => actual,
    async cerrar() {
      await solicitar("/logout", { method: "POST", body: "{}" });
      sessionStorage.removeItem("imperioVistaEmpleado");
      location.replace(acceso);
    }
  };
})();
