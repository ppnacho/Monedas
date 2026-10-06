import { supabaseClient } from './supabaseClient.js';

let coleccionGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando vista de Colección Privada...");
    cargarColeccionPrivada();

    const filterInput = document.getElementById('filterPrivada');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            filtrarYRenderizarColeccion(e.target.value);
        });
    }
});

async function cargarColeccionPrivada() {
    const loading = document.getElementById('loadingPrivada');
    const resultsDiv = document.getElementById('resultsPrivada');

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        // Consultamos la tabla coleccion_monedas en Supabase
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

function filtrarYRenderizarColeccion(textoBusqueda) {
    const texto = textoBusqueda.toLowerCase().trim();
    if (!texto) {
        renderizarPiezas(coleccionGlobal);
        return;
    }

    const filtradas = coleccionGlobal.filter(item => {
        const idStr = String(item.numista_id || '');
        const tituloStr = String(item.title || item.nombre || '').toLowerCase();
        const emisorStr = String(item.issuer || '').toLowerCase();

        return idStr.includes(texto) || tituloStr.includes(texto) || emisorStr.includes(texto);
    });

    renderizarPiezas(filtradas);
}

function renderizarPiezas(piezas) {
    const resultsDiv = document.getElementById('resultsPrivada');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';

    if (piezas.length === 0) {
        resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">No se encontraron piezas en tu colección con ese criterio.</p>';
        return;
    }

    piezas.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'item';

        const numistaId = item.numista_id || 'N/A';
        const titulo = item.title || item.nombre || `Pieza Numista #${numistaId}`;
        const emisor = item.issuer || 'Desconocido';
        const anios = item.rango_anios || item.years || 'No especificado';
        const categoria = item.category || 'Moneda';
        const imgStored = item.img_stored === true;

        let imagenesHtml = '';

        // REQUISITO: Si img_stored es true, cogemos las imágenes exclusivamente del Storage.
        // Si es false, no se cargan imágenes y sirve de aviso para ejecutar el script de Python.
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
            // Indicador visual de que falta sincronizar con Python
            imagenesHtml = `<div style="width: 100%; height: 140px; background: #333; display: flex; align-items: center; justify-content: center; text-align: center; padding: 10px; border-radius: 4px; color: #ffc107; font-size: 0.85rem; font-weight: bold;">
                ⚠️ Pendiente sincronizar imágenes (Ejecutar Python)
            </div>`;
        }

        card.innerHTML = `
            <div class="coin-images">${imagenesHtml}</div>
            <div class="coin-info">
                <h3 class="coin-title">[#${index + 1}] ${titulo}</h3>
                <p class="coin-meta">
                    ID Numista: <strong>${numistaId}</strong> | Emisor: <strong>${emisor}</strong> | Años: <strong>${anios}</strong><br>
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
