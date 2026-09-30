import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded disparado. Inicializando aplicación...");
    cargarEmisores();
    cargarCategoriasFijas(); 
    cargarSubtiposFijos(); // Cargamos todos los subtipos en memoria al iniciar

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', probarConsultaEmisor);
    }

    // Configurar el evento change para el selector de categoría
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            console.log("Evento change en categoría detectado.");
            filtrarSubtiposPorCategoria(); // Actualizamos las opciones visibles del selector de subtipos
            
            const issuer = document.getElementById('issuer').value;
            if (issuer) {
                ejecutarConsultaEmisor(issuer);
            }
        });
    }

    // Evento change para el selector de subtipos
    const subTypeSelect = document.getElementById('object_type');
    if (subTypeSelect) {
        subTypeSelect.addEventListener('change', () => {
            console.log("Evento change en subtipo detectado.");
            const issuer = document.getElementById('issuer').value;
            if (issuer) {
                ejecutarConsultaEmisor(issuer);
            }
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

// 1. Cargar la lista de emisores y configurar el evento 'change'
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

        // Detectar cuando el usuario cambia el país en el desplegable
        issuerSelect.addEventListener('change', (e) => {
            const issuerCode = e.target.value;
            if (issuerCode) {
                console.log("Emisor cambiado en el select:", issuerCode);
                ejecutarConsultaEmisor(issuerCode);
            } else {
                limpiarResultados();
            }
        });

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

// 5. Consulta con paginación dinámica total (sin límites artificiales) y trazas completas
async function ejecutarConsultaEmisor(issuerCode) {
    console.group("🚀 [DEBUG EXTENDIDO] INICIANDO CONSULTA DE EMISOR");
    console.log("1. Emisor recibido:", issuerCode);

    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const categoryValue = document.getElementById('category')?.value;
    const subTypeVal = document.getElementById('object_type')?.value;

    console.log("2. Filtros activos -> Categoría:", categoryValue, "| Subtipo ID buscado:", subTypeVal);

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

        // --- CHIVATO DE SUBTIPOS DISPONIBLES ---
        // Esto te mostrará en la consola un resumen de qué object_type.id vienen en los datos reales
        const subtiposEncontrados = {};
        todosLosRegistros.forEach(item => {
            if (item.object_type) {
                const id = item.object_type.id;
                const name = item.object_type.name;
                subtiposEncontrados[id] = { name: name, count: (subtiposEncontrados[id]?.count || 0) + 1 };
            } else {
                subtiposEncontrados['SIN_OBJECT_TYPE'] = (subtiposEncontrados['SIN_OBJECT_TYPE'] || 0) + 1;
            }
        });
        console.log("🔍 Subtipos reales presentes en estos 3253 registros:", subtiposEncontrados);
        // ----------------------------------------

        // Filtrado local por subtipo
        let registrosFiltrados = todosLosRegistros;
        if (subTypeVal !== null && subTypeVal !== undefined && subTypeVal.trim() !== "") {
            console.log(`4. Aplicando filtro local para object_type.id === "${subTypeVal}"`);
            registrosFiltrados = todosLosRegistros.filter(item => {
                const idSubtipoItem = item.object_type?.id;
                // Probamos comparación flexible por si acaso viene como número o string
                return idSubtipoItem == subTypeVal.trim();
            });
            console.log(`5. Total tras filtrado por subtipo: ${registrosFiltrados.length}`);
        } else {
            console.log("4. No se aplica filtro de subtipo (viene vacío).");
        }

        if (registrosFiltrados.length === 0) {
            console.warn("⚠️ No hay registros que mostrar tras el filtro.");
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: orange;">No se encontraron registros para esta selección en todo el catálogo del emisor.</p>';
            console.groupEnd();
            return;
        }

        resultsDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-card, #222); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Total filtrados:</strong> ${registrosFiltrados.length} | <strong>Total global descargado de Numista:</strong> ${totalApi} (${paginaActual} páginas recorridas)</p>
            </div>
        `;

        registrosFiltrados.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item';
            
            const title = item.title || item.name || 'Sin título';
            const id = item.type_id || item.id || 'N/A';
            const img = item.obverse_thumbnail || 'https://via.placeholder.com/105?text=Sin+Imagen';
            const cat = item.category || 'N/A';
            const subName = item.object_type?.name || 'N/A';

            card.innerHTML = `
                <div class="coin-images">
                    <img src="${img}" alt="${title}">
                </div>
                <div class="coin-info">
                    <h3 class="coin-title">[#${index + 1}] ${title}</h3>
                    <p class="coin-meta">ID Numista: ${id} | Categoría: <strong>${cat}</strong> | Subtipo: <strong>${subName}</strong></p>
                    <pre style="font-size: 0.75em; background: rgba(0,0,0,0.3); padding: 5px; overflow-x: auto;">${JSON.stringify(item, null, 2)}</pre>
                </div>
            `;
            resultsDiv.appendChild(card);
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

function limpiarResultados() {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
}

function probarConsultaEmisor(e) {
    e.preventDefault();
    console.log("Formulario enviado mediante submit.");
    const issuer = document.getElementById('issuer').value;
    if (issuer) {
        ejecutarConsultaEmisor(issuer);
    }
}
