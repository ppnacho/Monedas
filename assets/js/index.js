import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded disparado. Inicializando aplicación...");
    cargarEmisores();
    cargarCategoriasFijas(); 
    cargarSubtiposFijos(); // Cargamos todos los subtipos en memoria al iniciar

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        // Único punto de entrada para ejecutar la búsqueda al pulsar el botón
        searchForm.addEventListener('submit', probarConsultaEmisor);
    }

    // Configurar el evento change para el selector de categoría (solo actualiza el desplegable de subtipos visualmente)
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            console.log("Evento change en categoría detectado.");
            filtrarSubtiposPorCategoria(); // Actualizamos las opciones visibles del selector de subtipos
        });
    }
});

function asegurarArray(data) {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    if (typeof data === 'object') {
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        if (possibleArray) return possibleArray;
        return Object.values(data);
    }
    return [];
}

// 1. Cargar la lista de emisores (única llamada inicial automática permitida)
async function cargarEmisores() {
    const issuerSelect = document.getElementById('issuer');
    if (!issuerSelect) {
        console.warn("No se encontró el elemento select de emisores en el DOM.");
        return;
    }

    try {
        console.log("Invocando endpoint 'issuers' en Supabase...");
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'issuers', params: { lang: 'es' } }
        });

        console.log("Respuesta cruda de emisores:", data);
        
        if (error) throw error;
        
        const issuers = asegurarArray(data);
        issuers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        issuers.forEach(issuer => {
            const option = document.createElement('option');
            option.value = issuer.code || issuer.id; 
            option.textContent = issuer.name || issuer.code;
            issuerSelect.appendChild(option);
        });

        console.log(`Se han cargado ${issuers.length} emisores en el selector.`);

    } catch (err) {
        console.error("No se pudieron cargar los emisores:", err);
    }
}

// 2. Cargar de manera fija las 2 categorías oficiales de la API de Numista
function cargarCategoriasFijas() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">-- Todas las categorías --</option>';

    const categoriasOficiales = [
        { value: 'coin', label: 'Monedas' },
        { value: 'banknote', label: 'Billetes' }
    ];

    categoriasOficiales.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value; 
        option.textContent = cat.label; 
        categorySelect.appendChild(option);
    });

    console.log("Categorías fijas cargadas correctamente.");
}

// Lista maestra de subtipos fijos (guardada globalmente para poder filtrarla)
const objectTypesOficiales = [
    // Monedas
    { id: 1, name: 'Monedas circulantes normales', category: 'coin' },
    { id: 2, name: 'Monedas circulantes conmemorativas', category: 'coin' },
    { id: 3, name: 'Monedas no circulantes', category: 'coin' },
    { id: 47, name: 'Monedas de colección', category: 'coin' },
    { id: 154, name: 'Monedas de emergencia', category: 'coin' },
    { id: 5, name: 'Monedas locales', category: 'coin' },
    { id: 6, name: 'Monedas de ensayo', category: 'coin' },
    { id: 54, name: 'Monedas falsas de época', category: 'coin' },
    { id: 72, name: 'Protomonedas', category: 'coin' },
    // Billetes
    { id: 79, name: 'Billetes circulantes normales', category: 'banknote' },
    { id: 80, name: 'Billetes circulantes conmemorativos', category: 'banknote' },
    { id: 159, name: 'Billetes no circulantes', category: 'banknote' },
    { id: 84, name: 'Billetes locales', category: 'banknote' },
    { id: 161, name: 'Billetes de emergencia', category: 'banknote' },
    { id: 162, name: 'Billetes no emitidos', category: 'banknote' },
    { id: 89, name: 'Billetes de ensayo', category: 'banknote' },
    { id: 97, name: 'Billetes falsos de época', category: 'banknote' },
    { id: 94, name: 'Billetes para probar cajeros automáticos', category: 'banknote' }
];

// 3. Cargar de manera fija los subtipos iniciales en el selector
function cargarSubtiposFijos() {
    const subTypeSelect = document.getElementById('object_type');
    if (!subTypeSelect) return;

    subTypeSelect.innerHTML = '<option value="">-- Todos los subtipos --</option>';

    objectTypesOficiales.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub.id;
        option.textContent = sub.name;
        option.dataset.category = sub.category;
        subTypeSelect.appendChild(option);
    });

    console.log("Subtipos fijos iniciales cargados correctamente.");
}

// 4. Filtrar dinámicamente el selector de subtipos según la categoría elegida
function filtrarSubtiposPorCategoria() {
    const categorySelect = document.getElementById('category');
    const subTypeSelect = document.getElementById('object_type');
    if (!categorySelect || !subTypeSelect) return;

    const categoriaSeleccionada = categorySelect.value;
    const valorPrevio = subTypeSelect.value;

    subTypeSelect.innerHTML = '<option value="">-- Todos los subtipos --</option>';

    // Filtrar la lista maestra según corresponda
    const subtiposFiltrados = categoriaSeleccionada
        ? objectTypesOficiales.filter(sub => sub.category === categoriaSeleccionada)
        : objectTypesOficiales;

    subtiposFiltrados.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub.id;
        option.textContent = sub.name;
        option.dataset.category = sub.category;
        subTypeSelect.appendChild(option);
    });

    // Intentar mantener el subtipo seleccionado si sigue siendo válido para esta categoría
    if (valorPrevio) {
        subTypeSelect.value = valorPrevio;
        if (subTypeSelect.value === "") {
            subTypeSelect.value = "";
        }
    }
    console.log("Subtipos filtrados según categoría:", categoriaSeleccionada);
}

// 5. Consulta ejecutada unívocamente al pulsar el botón de búsqueda
async function ejecutarConsultaEmisor(issuerCode) {
    console.group("🚀 [DEBUG EXTENDIDO] INICIANDO CONSULTA DE EMISOR");
    console.log("1. Emisor recibido:", issuerCode);

    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const categoryValue = document.getElementById('category')?.value;
    const subTypeVal = document.getElementById('object_type')?.value;
    
    // Capturar campos de filtrado (Año y término de búsqueda)
    const yearValue = document.getElementById('year')?.value?.trim();
    const searchTerm = document.getElementById('q')?.value?.trim().toLowerCase() || '';

    console.log("2. Filtros activos -> Categoría:", categoryValue, "| Subtipo ID:", subTypeVal, "| Año:", yearValue, "| Término:", searchTerm);

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        let todosLosRegistros = [];
        let paginaActual = 1;
        let totalApi = 0;
        let totalPaginasEstimadas = 1;

        do {
            const params = { 
                issuer: issuerCode, 
                lang: 'es',
                count: 50,
                page: paginaActual
            };
            
            if (categoryValue && categoryValue.trim() !== "") {
                params.category = categoryValue;
            }

            const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
                body: { endpoint: 'types', params: params }
            });

            if (error) {
                console.error(`❌ Error en la página ${paginaActual}:`, error);
                throw error;
            }

            const registrosBloque = asegurarArray(data.types || data);
            totalApi = data.count || totalApi || registrosBloque.length;
            totalPaginasEstimadas = Math.ceil(totalApi / 50);

            if (registrosBloque.length === 0) break;

            todosLosRegistros = todosLosRegistros.concat(registrosBloque);

            if (todosLosRegistros.length >= totalApi || registrosBloque.length < 50) {
                break;
            }

            paginaActual++;
        } while (true);

        console.log(`3. Total acumulado final antes de filtrar: ${todosLosRegistros.length}`);

        // --- FILTRADO LOCAL ---
        let registrosFiltrados = todosLosRegistros;

        // A. Filtro por Subtipo
        if (subTypeVal !== null && subTypeVal !== undefined && subTypeVal.trim() !== "") {
            console.log(`4A. Aplicando filtro local para object_type.id === "${subTypeVal}"`);
            registrosFiltrados = registrosFiltrados.filter(item => {
                const idSubtipoItem = item.object_type?.id;
                return idSubtipoItem == subTypeVal.trim();
            });
        }

        // B. Filtro por Término de Búsqueda en el título (case-insensitive, parcial o total)
        if (searchTerm !== "") {
            console.log(`4B. Aplicando filtro por término en título: "${searchTerm}"`);
            registrosFiltrados = registrosFiltrados.filter(item => {
                const titleText = (item.title || item.name || '').toLowerCase();
                return titleText.includes(searchTerm);
            });
        }

        // C. Filtro por Año (si está informado en el formulario)
        if (yearValue && yearValue !== "") {
            console.log(`4C. Aplicando filtro por año: "${yearValue}"`);
            registrosFiltrados = registrosFiltrados.filter(item => {
                const beginYear = item.begin_year ? String(item.begin_year) : '';
                const endYear = item.end_year ? String(item.end_year) : '';
                const issueYear = item.year ? String(item.year) : '';
                
                return beginYear === yearValue || endYear === yearValue || issueYear === yearValue || 
                       (item.title && item.title.includes(yearValue));
            });
        }

        console.log(`5. Total tras aplicar todos los filtros: ${registrosFiltrados.length}`);

        if (loading) loading.classList.add('hidden');

        if (registrosFiltrados.length === 0) {
            console.warn("⚠️ No hay registros que mostrar tras el filtro.");
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: orange;">No se encontraron registros para esta selección.</p>';
            console.groupEnd();
            return;
        }

        resultsDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-card, #222); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Total filtrados:</strong> ${registrosFiltrados.length} | <strong>Total global descargado:</strong> ${totalApi}</p>
            </div>
        `;

        registrosFiltrados.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item';
            
            const title = item.title || item.name || 'Sin título';
            const id = item.type_id || item.id || 'N/A';
            const cat = item.category || 'N/A';
            const subName = item.object_type?.name || 'N/A';

            const minYear = item.min_year || '';
            const maxYear = item.max_year || '';
            const rangoAnios = (minYear || maxYear) ? `${minYear} - ${maxYear}` : 'No especificado';
            const emisorNombre = item.issuer?.name || 'Desconocido';

            const imgObverse = item.obverse_thumbnail || '';
            const imgReverse = item.reverse_thumbnail || '';
            
            let imagenesHtml = '';
            if (imgObverse) {
                imagenesHtml += `<img src="${imgObverse}" alt="${title} - Anverso" title="Anverso">`;
            }
            if (imgReverse) {
                imagenesHtml += `<img src="${imgReverse}" alt="${title} - Reverso" title="Reverso">`;
            }
            if (!imgObverse && !imgReverse) {
                imagenesHtml = `<img src="https://via.placeholder.com/105?text=Sin+Imagen" alt="Sin Imagen">`;
            }

            card.innerHTML = `
                <div class="coin-images">
                    ${imagenesHtml}
                </div>
                <div class="coin-info">
                    <h3 class="coin-title">[#${index + 1}] ${title}</h3>
                    <p class="coin-meta">
                        ID Numista: <strong>${id}</strong> | Emisor: <strong>${emisorNombre}</strong> | Años: <strong>${rangoAnios}</strong><br>
                        Categoría: <strong>${cat}</strong> | Subtipo: <strong>${subName}</strong>
                    </p>
                    <div style="margin-top: 10px;">
                        <button class="btn-add-collection" data-id="${id}" style="padding: 6px 12px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Añadir a la colección
                        </button>
                    </div>
                </div>
            `;
            resultsDiv.appendChild(card);
        });

        // Event listener para los botones de añadir a la colección
        resultsDiv.querySelectorAll('.btn-add-collection').forEach(button => {
            button.addEventListener('click', (e) => {
                const typeId = e.target.getAttribute('data-id');
                console.log(`Botón pulsado para añadir a la colección la pieza ID: ${typeId}`);
                // Próximamente: Llamada a la Edge Function para consultar detalle y guardar en Supabase
            });
        });

        console.log("✅ Renderizado finalizado con éxito.");

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        console.error("❌ Error crítico en ejecutarConsultaEmisor:", err);
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error: ${err.message}</p>`;
    } finally {
        console.groupEnd();
    }
}

function probarConsultaEmisor(e) {
    e.preventDefault();
    console.log("Formulario enviado mediante botón de búsqueda.");
    const issuer = document.getElementById('issuer').value;
    if (issuer) {
        ejecutarConsultaEmisor(issuer);
    } else {
        alert("Por favor, selecciona al menos un emisor (país).");
    }
}
