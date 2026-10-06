import { supabaseClient } from './supabaseClient.js';

let coleccionGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando vista de Colección Privada...");
    cargarColeccionPrivada();

    const filterForm = document.getElementById('filterFormPrivada');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            aplicarFiltrosAvanzados();
        });
    }

    const btnReset = document.getElementById('btnResetPrivada');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            document.getElementById('qPrivada').value = '';
            document.getElementById('issuerPrivada').value = '';
            document.getElementById('yearPrivada').value = '';
            renderizarPiezas(coleccionGlobal);
        });
    }
});

async function cargarColeccionPrivada() {
    const loading = document.getElementById('loadingPrivada');
    const resultsDiv = document.getElementById('resultsPrivada');

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        const { data, error } = await supabaseClient
            .from('coleccion_monedas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        coleccionGlobal = data || [];
        console.log(`Se han cargado ${coleccionGlobal.length} piezas de la colección privada.`);

        if (loading) loading.classList.add('hidden');

        renderizarPiezas(coleccionGlobal);

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        console.error("Error al cargar la colección privada:", err);
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error al cargar los datos: ${err.message}</p>`;
    }
}

function aplicarFiltrosAvanzados() {
    const searchTerm = document.getElementById('qPrivada')?.value?.trim().toLowerCase() || '';
    const issuerTerm = document.getElementById('issuerPrivada')?.value?.trim().toLowerCase() || '';
    const yearValue = document.getElementById('yearPrivada')?.value?.trim() || '';

    const filtradas = coleccionGlobal.filter(item => {
        // 1. Filtro por Descripción (Título) - Insensible a mayúsculas/minúsculas y coincidencia parcial
        const tituloStr = (item.title || item.nombre || '').toLowerCase();
        if (searchTerm !== "" && !tituloStr.includes(searchTerm)) {
            return false;
        }

        // 2. Filtro por País / Emisor - Insensible a mayúsculas/minúsculas y parcial
        const emisorStr = (item.issuer || '').toLowerCase();
        if (issuerTerm !== "" && !emisorStr.includes(issuerTerm)) {
            return false;
        }

        // 3. Filtro por Año (con las mismas consideraciones exactas que index.html)
        if (yearValue !== "") {
            const minYear = item.min_year ? parseInt(item.min_year, 10) : null;
            const maxYear = item.max_year ? parseInt(item.max_year, 10) : null;
            const issueYear = item.year ? parseInt(item.year, 10) : null;

            if (minYear === null && maxYear === null && issueYear === null) return false;

            const pMin = minYear !== null ? minYear : (maxYear !== null ? maxYear : issueYear);
            const pMax = maxYear !== null ? maxYear : (minYear !== null ? minYear : issueYear);

            // Formato: -AÑO (hasta el año X)
            if (yearValue.startsWith('-') && !yearValue.endsWith('-')) {
                const targetYear = parseInt(yearValue.substring(1), 10);
                if (!isNaN(targetYear) && pMin > targetYear) return false;
            }
            // Formato: AÑO- (desde el año X)
            else if (yearValue.endsWith('-') && !yearValue.startsWith('-')) {
                const targetYear = parseInt(yearValue.slice(0, -1), 10);
                if (!isNaN(targetYear) && pMax < targetYear) return false;
            }
            // Formato: AÑO-AÑO (rango)
            else if (yearValue.includes('-')) {
                const partes = yearValue.split('-');
                const startYear = parseInt(partes[0], 10);
                const endYear = parseInt(partes[1], 10);
                if (!isNaN(startYear) && !isNaN(endYear)) {
                    if (pMin > endYear || pMax < startYear) return false;
                }
            }
            // Año exacto
            else {
                const exactYear = parseInt(yearValue, 10);
                if (!isNaN(exactYear)) {
                    if (!((exactYear >= pMin && exactYear <= pMax) || (item.title && item.title.includes(yearValue)))) {
                        return false;
                    }
                } else if (item.title && !item.title.includes(yearValue)) {
                    return false;
                }
            }
        }

        return true;
    });

    renderizarPiezas(filtradas);
}

function renderizarPiezas(piezas) {
    const resultsDiv = document.getElementById('resultsPrivada');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';

    if (piezas.length === 0) {
        resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">No se encontraron piezas en tu colección con estos criterios de filtrado.</p>';
        return;
    }

    // Cabecera indicando cuántos resultados se muestran
    const contadorDiv = document.createElement('div');
    contadorDiv.style.gridColumn = '1 / -1';
    contadorDiv.style.background = 'var(--bg-card, #222)';
    contadorDiv.style.padding = '12px';
    contadorDiv.style.borderRadius = '8px';
    contadorDiv.style.marginBottom = '15px';
    contadorDiv.innerHTML = `<p><strong>Piezas encontradas:</strong> ${piezas.length} de ${coleccionGlobal.length} totales en colección</p>`;
    resultsDiv.appendChild(contadorDiv);

    piezas.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'item';

        const numistaId = item.numista_id || 'N/A';
        const titulo = item.title || item.nombre || `Pieza Numista #${numistaId}`;
        const emisor = item.issuer || 'Desconocido';
        const minYear = item.min_year || '';
        const maxYear = item.max_year || '';
        const rangoAnios = (minYear || maxYear) ? `${minYear} - ${maxYear}` : 'No especificado';
        const categoria = item.category || 'Moneda';
        const imgStored = item.img_stored === true;

        let imagenesHtml = '';

        if (imgStored) {
            let imgAnversoUrl = '';
            let imgReversoUrl = '';

            if (item.stor_anverso) {
                const { data } = supabaseClient.storage.from('monedas-img').getPublicUrl(item.stor_anverso);
                imgAnversoUrl = data.publicUrl;
            }
            if (item.stor_reverso) {
                const { data } = supabaseClient.storage.from('monedas-img').getPublicUrl(item.stor_reverso);
                imgReversoUrl = data.publicUrl;
            }

            if (imgAnversoUrl) imagenesHtml += `<img src="${imgAnversoUrl}" class="img-obverse" alt="${titulo} - Anverso" title="Anverso">`;
            if (imgReversoUrl) imagenesHtml += `<img src="${imgReversoUrl}" class="img-reverse" alt="${titulo} - Reverso" title="Reverso">`;
            
            if (!imgAnversoUrl && !imgReversoUrl) {
                imagenesHtml = `<img src="https://via.placeholder.com/105?text=Sin+Imagen" alt="Sin Imagen">`;
            }
        } else {
            imagenesHtml = `<div style="width: 100%; height: 140px; background: #333; display: flex; align-items: center; justify-content: center; text-align: center; padding: 10px; border-radius: 4px; color: #ffc107; font-size: 0.85rem; font-weight: bold;">
                ⚠️ Pendiente sincronizar imágenes (Ejecutar Python)
            </div>`;
        }

        card.innerHTML = `
            <div class="coin-images">${imagenesHtml}</div>
            <div class="coin-info">
                <h3 class="coin-title">[#${index + 1}] ${titulo}</h3>
                <p class="coin-meta">
                    ID Numista: <strong>${numistaId}</strong> | Emisor: <strong>${emisor}</strong> | Años: <strong>${rangoAnios}</strong><br>
                    Categoría: <strong>${categoria}</strong> | Estado Storage: <strong style="color: ${imgStored ? '#28a745' : '#ffc107'}">${imgStored ? 'Sincronizado' : 'Pendiente'}</strong>
                </p>
                <div style="margin-top: 10px;">
                    <span style="font-size: 0.85rem; color: ${imgStored ? '#28a745' : '#ffc107'}; font-weight: bold;">
                        ${imgStored ? '● En Colección (Con Imágenes)' : '⏳ Pendiente de proceso local'}
                    </span>
                </div>
            </div>
        `;

        resultsDiv.appendChild(card);
    });
}
