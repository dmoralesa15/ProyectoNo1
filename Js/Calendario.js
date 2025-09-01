// Js/Calendario.js
(function () {
  'use strict';

  const cal       = document.getElementById('calendario');
  const titulo    = document.getElementById('tituloMes');
  const btnPrev   = document.getElementById('prevMes');
  const btnNext   = document.getElementById('nextMes');
  const ulEventos = document.getElementById('lista-eventos');

  const NOMBRES_MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  let hoy  = new Date();
  let anio = hoy.getFullYear();
  let mes  = hoy.getMonth() + 1; // 1..12

  btnPrev?.addEventListener('click', () => { mes--; if (mes === 0)  { mes = 12; anio--; } render(); });
  btnNext?.addEventListener('click', () => { mes++; if (mes === 13) { mes = 1;  anio++; } render(); });

  // Normaliza 100%: pasa todas las claves a minúsculas y toma solo las que usamos
  function normalizaEvento(e) {
    const low = {};
    for (const k in e) low[k.toLowerCase()] = e[k];
    return {
      fecha:       low.fecha,
      titulo:      low.titulo,
      descripcion: low.descripcion
    };
  }

  async function render() {
    titulo.textContent = `${NOMBRES_MESES[mes - 1]} ${anio}`;

    const primerDia    = new Date(anio, mes - 1, 1);
    const ultimoDia    = new Date(anio, mes, 0);
    const diasEnMes    = ultimoDia.getDate();
    const primerSemana = (primerDia.getDay() + 6) % 7; // Lunes=0

    // 1) Traer eventos
    let eventos = [];
    try {
      const raw = await getEventosPorMes(anio, mes);
      eventos = Array.isArray(raw) ? raw.map(normalizaEvento) : [];
      console.log('[CAL] eventos crudos:', raw);
      console.log('[CAL] eventos normalizados:', eventos);
    } catch (err) {
      console.error('[CAL] Error obteniendo eventos:', err);
      eventos = [];
    }

    // 2) Mapear por día
    const mapa = {};
    for (const ev of eventos) {
      if (!ev?.fecha) continue;                         // defensivo
      const d = Number(String(ev.fecha).slice(8, 10));  // 'YYYY-MM-DD' -> 'DD'
      (mapa[d] ||= []).push(ev);
    }

    // 3) Pintar cabecera + celdas
    cal.innerHTML = '';
    cal.classList.add('cal-grid');

    ['L','M','X','J','V','S','D'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-head';
      h.textContent = d;
      cal.appendChild(h);
    });

    for (let i = 0; i < primerSemana; i++) {
      const vac = document.createElement('div');
      vac.className = 'cal-cell cal-empty';
      cal.appendChild(vac);
    }

    for (let d = 1; d <= diasEnMes; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';

      const n = document.createElement('div');
      n.className = 'cal-daynum';
      n.textContent = d;
      cell.appendChild(n);

      if (mapa[d]?.length) {
        for (const ev of mapa[d]) {
          const badge = document.createElement('div');
          badge.className = 'cal-badge';
          badge.title = ev.descripcion || '';
          badge.textContent = ev.titulo || '(sin título)';
          cell.appendChild(badge);
        }
        cell.classList.add('cal-has');
      }

      cal.appendChild(cell);
    }

    // 4) Lista inferior
    ulEventos.innerHTML = '';
    for (const ev of eventos) {
      const li = document.createElement('li');
      li.textContent = `${ev.fecha}: ${ev.titulo} – ${ev.descripcion ?? ''}`;
      ulEventos.appendChild(li);
    }
  }

  render();
})();
