let SQL;

// Inicializa SQL.js y abre la BD de /bd/residencial.db
async function initSqlJsAndLoadDB() {
  SQL = await initSqlJs({
    locateFile: file => `../Lib/sqljs/${file}`
  });

  const resp = await fetch(`../bd/residencial.db?v=${Date.now()}`, { cache: "no-store" });
  if (!resp.ok) throw new Error("No se pudo cargar bd/residencial.db");
  const buffer = await resp.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(buffer));
  return db;
}

/* ====== PORTAL ====== */
window.getNoticiasRecientes = async function () {
  const db = await initSqlJsAndLoadDB();
  const stmt = db.prepare(
    "SELECT Fecha, Noticia FROM Noticias ORDER BY Fecha DESC LIMIT 3"
  );
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  db.close();
  return out;
};

// ====== CALENDARIO ======
window.getEventosPorMes = async function (anio, mes) {
  const y  = String(anio);
  const mm = String(mes).padStart(2, "0");

  // Rango: [primer día del mes, primer día del mes siguiente)
  const desde = `${y}-${mm}-01`;
  const next  = new Date(Number(y), Number(mm) - 1 + 1, 1);
  const hasta = `${String(next.getFullYear())}-${String(next.getMonth()+1).padStart(2,"0")}-01`;

  const db = await initSqlJsAndLoadDB();

  const stmt = db.prepare(`
    SELECT Fecha, Titulo, Descripcion
    FROM Calendario
    WHERE Fecha >= ? AND Fecha < ?
    ORDER BY Fecha
  `);

  stmt.bind([desde, hasta]);

  const eventos = [];
  while (stmt.step()) eventos.push(stmt.getAsObject());
  stmt.free();
  db.close();

  console.log("[CAL] getEventosPorMes", desde, "→", hasta, "=>", eventos);
  return eventos;
};

/* ====== CONSULTA (por DPI / casa) ====== */
window.getInquilino = async function ({ dpi = null, casa = null } = {}) {
  const db = await initSqlJsAndLoadDB();

  let stmt;
  if (dpi && String(dpi).trim() !== "") {
    const dpiNorm = String(dpi).trim();
    stmt = db.prepare(`
      SELECT DPI, PrimerNombre, PrimerApellido, FechaNacimiento, NumeroCasa
      FROM Inquilino WHERE DPI = ?1
    `);
    stmt.bind([ dpiNorm ]);
  } else if (casa != null && String(casa).trim() !== "") {
    const casaNum = Number(String(casa).trim());
    stmt = db.prepare(`
      SELECT DPI, PrimerNombre, PrimerApellido, FechaNacimiento, NumeroCasa
      FROM Inquilino WHERE NumeroCasa = ?1
    `);
    stmt.bind([ casaNum ]);
  } else {
    db.close();
    return null;
  }

  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  db.close();
  console.log("[CONSULTA] getInquilino =>", row);
  return row;
};

window.getEstadoCuota = async function (numeroCasa, anio, mes) {
  const db = await initSqlJsAndLoadDB();
  const stmt = db.prepare(`
    SELECT FechaPago
    FROM PagoDeCuotas
    WHERE NumeroCasa = ?1 AND Anio = ?2 AND Mes = ?3
  `);
  stmt.bind({ 1: Number(numeroCasa), 2: Number(anio), 3: Number(mes) });

  const pago = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  db.close();

  const res = pago ? { estado: "AL DÍA", fecha: pago.FechaPago } : { estado: "PENDIENTE", fecha: null };
  console.log("[CONSULTA] getEstadoCuota", { numeroCasa, anio, mes }, "=>", res);
  return res;
};

/* ====== LISTA/BÚSQUEDA DE INQUILINOS (nuevo) ====== */
window.buscarInquilinos = async function (query = "", offset = 0, limit = 20) {
  const db = await initSqlJsAndLoadDB();

  const q = String(query || "").trim();
  const like = `%${q}%`;

  // Si no hay query, traemos los primeros por apellido/nombre
  let stmt;
  if (q === "") {
    stmt = db.prepare(`
      SELECT DPI, PrimerNombre, PrimerApellido, NumeroCasa
      FROM Inquilino
      ORDER BY PrimerApellido, PrimerNombre
      LIMIT ?1 OFFSET ?2
    `);
    stmt.bind([ Number(limit), Number(offset) ]);
  } else {
    stmt = db.prepare(`
      SELECT DPI, PrimerNombre, PrimerApellido, NumeroCasa
      FROM Inquilino
      WHERE PrimerNombre LIKE ?1
         OR PrimerApellido LIKE ?1
         OR DPI LIKE ?1
         OR CAST(NumeroCasa AS TEXT) LIKE ?1
      ORDER BY PrimerApellido, PrimerNombre
      LIMIT ?2 OFFSET ?3
    `);
    stmt.bind([ like, Number(limit), Number(offset) ]);
  }

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  db.close();
  return rows;
};

window.contarInquilinos = async function (query = "") {
  const db = await initSqlJsAndLoadDB();
  const q = String(query || "").trim();
  const like = `%${q}%`;

  let stmt;
  if (q === "") {
    stmt = db.prepare(`SELECT COUNT(*) AS total FROM Inquilino`);
    stmt.step();
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) AS total
      FROM Inquilino
      WHERE PrimerNombre LIKE ?1
         OR PrimerApellido LIKE ?1
         OR DPI LIKE ?1
         OR CAST(NumeroCasa AS TEXT) LIKE ?1
    `);
    stmt.bind([ like ]);
    stmt.step();
  }

  const total = stmt.getAsObject().total || 0;
  stmt.free();
  db.close();
  return Number(total);
};

/* ====== DEBUG OPCIONAL ====== */
window._dbgCount = async function () {
  const db = await initSqlJsAndLoadDB();
  function count(sql) {
    const s = db.prepare(sql); s.step();
    const v = s.get()[0]; s.free(); return v;
  }
  const c1 = count("SELECT COUNT(*) FROM Noticias");
  const c2 = count("SELECT COUNT(*) FROM Calendario");
  const c3 = count("SELECT COUNT(*) FROM Inquilino");
  const c4 = count("SELECT COUNT(*) FROM PagoDeCuotas");
  db.close();
  console.log("[DBG] filas => Noticias:", c1, "Calendario:", c2, "Inquilino:", c3, "PagoDeCuotas:", c4);
  return { Noticias: c1, Calendario: c2, Inquilino: c3, PagoDeCuotas: c4 };
};
