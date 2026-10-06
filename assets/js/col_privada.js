import { supabaseClient } from './supabaseClient.js';

let issuersPrivadaGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando vista de Colección Privada...");
    
    // 1. Cargar la lista de emisores únicos desde la base de datos local
    cargarEmisoresLocales();

    // 2. Estado inicial limpio (sin resultados automáticos)
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
            // Limpiar inputs del formulario
            document.getElementById('qPrivada').value = '';
            document.getElementById('issuerPrivadaInput').value = '';
            document.getElementById('issuerPrivada').value = '';
            document.getElementById('yearPrivada').value = '';

            // Limpiar resultados
            if (resultsDiv) {
                resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">Introduce un criterio de búsqueda y pulsa "Filtrar colección".</p>';
            }
        });
    }

    inicializarAutocompletadoEmisorPrivada();
});

// Cargar emisores únicos existentes en la colección privada local
async function cargarEmisoresLocales() {
    try {
        const { data: responseData, error } = await supabaseClient.functions.invoke('col-privada', {
            body: { action: 'get_issuers' }
        });

        if (error) throw error;

        const listaEmisores = responseData?.issuers || [];
        if (listaEmisores.length > 0) {
            issuersPrivadaGlobal = listaEmisores.map(nombre => ({ name: nombre }));
            console.log(`Se han cargado ${issuersPrivadaGlobal.length} emisores locales correctamente.`);
        } else {
            console.log("No se encontraron emisores todavía o la tabla está vacía.");
        }
    } catch (err) {
        console.error("Error al cargar emisores locales:", err);
    }
}

// Autocompletado flotante idéntico al index.js
function inicializarAutocompletadoEmisorPrivada() {
    const issuerInput = document.getElementById('issuerPrivadaInput');
    const issuerHidden = document.getElementById('issuerPrivada');
    const dropdown = document.getElementById('listaEmisoresPrivada');

    if (!issuerInput || !issuerHidden || !dropdown) return;

    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.right = '0';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.backgroundColor = '#ffffff';
    dropdown.style.color = '#000000';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '0 0 6px 6px';
    dropdown.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    dropdown.style.zIndex = '1000';

    function mostrarSugerencias(filtro = '') {
        dropdown.innerHTML = '';
        const texto = filtro.toLowerCase().trim();

        const filtrados = issuersPrivadaGlobal.filter(iss => 
            (iss.name || '').toLowerCase().includes(texto)
        );

        if (filtrados.length === 0 || (filtrados.length === 1 && filtrados[0].name.toLowerCase() === texto)) {
            dropdown.classList.add('hidden');
            return;
        }

        filtrados.slice(0, 50).forEach(issuer => {
            const div = document.createElement('div');
            div.textContent = issuer.name;
            div.style.padding = '10px 12px';
            div.style.cursor = 'pointer';
            div.style.color = '#000000';
            div.style.borderBottom = '1px solid #eee';
            
            div.addEventListener('mouseenter', () => {
                div.style.backgroundColor = '#f0f0f0';
            });
            div.addEventListener('mouseleave', () => {
                div.style.backgroundColor = '#ffffff';
            });

            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                issuerInput.value = issuer.name;
                issuerHidden.value = issuer.name;
                dropdown.classList.add('hidden');
            });

            dropdown.appendChild(div);
        });

        dropdown.classList.remove('hidden');
    }

    issuerInput.addEventListener('input', (e) => {
        issuerHidden.value = e.target.value; 
        mostrarSugerencias(e.target.value);
    });

    issuerInput.addEventListener('focus', () => {
        mostrarSugerencias(issuerInput.value);
    });

    issuerInput.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 200);
    });
}

async function consultarColeccionConFiltros() {
    const loading = document.getElementById('loadingPrivada');
    const resultsDiv = document.getElementById('resultsPrivada');

    const q = document.getElementById('qPrivada')?.value?.trim() || '';
    const issuerInputVal = document.getElementById('issuerPrivadaInput')?.value?.trim() || '';
    let issuer = document.getElementById('issuerPrivada')?.value?.trim() || issuerInputVal;
    const year = document.getElementById('yearPrivada')?.value?.trim() || '';

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        const { data: responseData, error } = await supabaseClient.functions.invoke('col-privada', {
            body: { q, issuer, year }
        });

        if (error) throw error;

        const piezas = responseData?.data || [];
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
            imagenesHtml = `<img src="https://via.placeholder.com/105?text=Sin+Imagen" alt="Sin Imagen">`;
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
