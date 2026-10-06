import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando vista de Colección Privada...");
    
    // Eliminamos la carga automática inicial para que no muestre resultados de entrada.
    // Dejamos el contenedor limpio o con un mensaje guía si lo deseas:
    const resultsDiv = document.getElementById('resultsPrivada');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">Introduce un criterio de búsqueda y pulsa "Filtrar colección".</p>';
    }

    const filterForm = document.getElementById('filterFormPrivada');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            consultarColeccionConFiltros();
        });
    }

    const btnReset = document.getElementById('btnResetPrivada');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            // 1. Limpiamos los inputs del formulario
            document.getElementById('qPrivada').value = '';
            document.getElementById('issuerPrivada').value = '';
            document.getElementById('yearPrivada').value = '';

            // 2. Limpiamos los resultados de la pantalla
            if (resultsDiv) {
                resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">Introduce un criterio de búsqueda y pulsa "Filtrar colección".</p>';
            }
        });
    }
});

async function consultarColeccionConFiltros() {
    const loading = document.getElementById('loadingPrivada');
    const resultsDiv = document.getElementById('resultsPrivada');

    const q = document.getElementById('qPrivada')?.value?.trim() || '';
    const issuer = document.getElementById('issuerPrivada')?.value?.trim() || '';
    const year = document.getElementById('yearPrivada')?.value?.trim() || '';

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        // Invocamos la Edge Function pasando los parámetros de filtrado
        const { data: responseData, error } = await supabaseClient.functions.invoke('col-privada', {
            body: { q, issuer, year }
        });

        if (error) throw error;

        const piezas = responseData?.data || [];
        console.log(`Se han obtenido ${piezas.length} piezas filtradas desde la Edge Function.`);

        if (loading) loading.classList.add('hidden');

        renderizarPiezas(piezas);

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        console.error("Error al consultar la colección privada:", err);
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error al consultar los datos: ${err.message}</p>`;
    }
}

function renderizarPiezas(piezas) {
    const resultsDiv = document.getElementById('resultsPrivada');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';

    if (piezas.length === 0) {
        resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">No se encontraron piezas en tu colección con estos criterios de filtrado.</p>';
        return;
    }

    // Cabecera con el total de resultados
    const contadorDiv = document.createElement('div');
    contadorDiv.style.gridColumn = '1 / -1';
    contadorDiv.style.background = 'var(--bg-card, #222)';
    contadorDiv.style.padding = '12px';
    contadorDiv.style.borderRadius = '8px';
    contadorDiv.style.marginBottom = '15px';
    contadorDiv.innerHTML = `<p><strong>Piezas encontradas:</strong> ${piezas.length}</p>`;
    resultsDiv.appendChild(contadorDiv);

    piezas.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'item';

        const numistaId = item.numista_id || 'N/A';
        const titulo = item.titulo || `Pieza Numista #${numistaId}`;
        const emisor = item.emisor || 'Desconocido';
        const anios = item.anios || 'No especificado';
        const valor = item.valor || 'N/A';
        const imgStored = item.img_stored === true;

        let imagenesHtml = '';

        // REQUISITO ESTRICTO: Si img_stored es true, se cargan del storage local. Si es false, aviso para ejecutar Python.
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
                    ID Numista: <strong>${numistaId}</strong> | Emisor: <strong>${emisor}</strong> | Años: <strong>${anios}</strong><br>
                    Valor: <strong>${valor}</strong>
                </p>
            </div>
        `;

        resultsDiv.appendChild(card);
    });
}
