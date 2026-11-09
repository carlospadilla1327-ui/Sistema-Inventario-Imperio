"use strict";
const formularioAcceso = document.getElementById("formularioAcceso");
const campoUsuario = document.getElementById("campoUsuario");
const campoContrasena = document.getElementById("campoContrasena");
const botonIniciar = document.getElementById("botonIniciar");
const botonCancelar = document.getElementById("botonCancelar");
const mensajeEstado = document.getElementById("mensajeEstado");
const inventario = "../gestion de inventario/index.html";

sesionImperio.lista.then(sesion => { if (sesion) location.replace(inventario); });
formularioAcceso.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!formularioAcceso.reportValidity()) return;
  botonIniciar.disabled = true;
  mensajeEstado.textContent = "";
  try {
    await sesionImperio.solicitar("/login", { method: "POST", body: JSON.stringify({
      usuario: campoUsuario.value.trim(), contrasena: campoContrasena.value
    }) });
    sessionStorage.removeItem("imperioVistaEmpleado");
    location.replace(inventario);
  } catch (error) {
    mensajeEstado.classList.add("error");
    mensajeEstado.textContent = error.message;
    botonIniciar.disabled = false;
  }
});
botonCancelar.addEventListener("click", () => {
  formularioAcceso.reset();
  mensajeEstado.textContent = "";
  campoUsuario.focus();
});
