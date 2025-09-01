(function () {
  // ---------- Original: consulta por DPI o casa ----------
  const dpi = document.getElementById("dpi");
  const casa = document.getElementById("casa");
  const btn  = document.getElementById("btnBuscar");
  const res  = document.getElementById("resultado");
  const btnLimpiar = document.getElementById("btnLimpiar");

  async function ejecutarConsulta(dpiVal, casaVal) {
    res.innerHTML = "";

    const qDpi  = (dpiVal ?? dpi.value).trim();
    const qCasa = (casaVal ?? casa.value).trim();

    if (!qDpi && !qCasa) {
      res.textContent = "Ingrese un DPI o un Número de casa.";
      return;
    }

    const inq = await getInquilino({
      dpi:  qDpi  || null,
      casa: qCasa ? Number(qCasa) : null
    });

    if (!inq) {
      res.textContent = "No se encontró inquilino.";
      return;
    }

    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes  = hoy.getMonth() + 1;
    const estado = await getEstadoCuota(inq.numerocasa, anio, mes);

    res.innerHTML = `
      <h3>Datos del inquilino</h3>
      <p><b>DPI:</b> ${inq.DPI || "(sin dato)"}</p>
      <p><b>Nombre:</b> ${inq.PrimerNombre || inq.primernombre || ""} ${inq.PrimerApellido || inq.primerapellido || ""}</p>
      <p><b>Número de casa:</b> ${inq.NumeroCasa || inq.numerocasa || "(?)"}</p>

      <h3>Estado de cuota del mes</h3>
      <p><b>Estado:</b> ${estado.estado}</p>
      ${estado.fecha ? `<p><b>Fecha de pago:</b> ${estado.fecha}</p>` : ""}
    `;
  }

  btn.addEventListener("click", () => ejecutarConsulta());

  btnLimpiar?.addEventListener("click", () => {
    dpi.value = "";
    casa.value = "";
    res.innerHTML = "";
    dpi.focus();
  });

  // ---------- NUEVO: lista/buscador de inquilinos ----------
  const qInput   = document.getElementById("q");
  const btnLista = document.getElementById("btnBuscarLista");
  const btnPrev  = document.getElementById("prev");
  const btnNext  = document.getElementById("next");
  const infoPag  = document.getElementById("infoPagina");
  const tbody    = document.querySelector("#tablaInq tbody");
  const btnRecargar = document.getElementById("btnRecargar");

  const PAGE_SIZE = 12;
  let page = 0;        // 0-based
  let total = 0;       // total resultados
  let currentQ = "";   // query actual

  async function cargarPagina() {
    const offset = page * PAGE_SIZE;
    const rows = await buscarInquilinos(currentQ, offset, PAGE_SIZE);
    total = await contarInquilinos(currentQ);

    // Rellenar tabla
    tbody.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      const nombre = `${r.PrimerApellido || ""}, ${r.PrimerNombre || ""}`.trim().replace(/^, /,"");
      tr.innerHTML = `
        <td>${nombre || "(sin nombre)"}</td>
        <td>${r.DPI || ""}</td>
        <td>${r.NumeroCasa ?? ""}</td>
      `;
      tr.addEventListener("click", () => {
        // Al seleccionar, llenamos el formulario y ejecutamos consulta
        dpi.value  = r.DPI || "";
        casa.value = r.NumeroCasa != null ? String(r.NumeroCasa) : "";
        ejecutarConsulta(r.DPI || "", r.NumeroCasa != null ? String(r.NumeroCasa) : "");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      tbody.appendChild(tr);
    }

    const desde = total === 0 ? 0 : (offset + 1);
    const hasta = Math.min(offset + rows.length, total);
    infoPag.textContent = `${desde}–${hasta} de ${total}`;
    btnPrev.disabled = page === 0;
    btnNext.disabled = (offset + rows.length) >= total;
  }

  async function buscar() {
    page = 0;
    currentQ = qInput.value.trim();
    await cargarPagina();
  }

  btnLista.addEventListener("click", buscar);
  btnRecargar.addEventListener("click", buscar);

  btnPrev.addEventListener("click", async () => {
    if (page === 0) return;
    page--;
    await cargarPagina();
  });

  btnNext.addEventListener("click", async () => {
    const maxPage = Math.floor((total - 1) / PAGE_SIZE);
    if (page >= maxPage) return;
    page++;
    await cargarPagina();
  });

  // Cargar primera página al abrir
  buscar();
})();
