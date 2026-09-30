import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
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
    if (!issuerSelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'issuers', params: { lang: 'es' } }
        });

        console.log("Consultando cargar emisores:", data);
        
        if (error) throw error;
        
        const issuers = asegurarArray(data);
        issuers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        issuers.forEach(issuer => {
            const option = document.createElement('option');
            option.value = issuer.code || issuer.id; 
            option.textContent = issuer.name || issuer.code;
            issuerSelect.appendChild(option);
        });

        // Detectar cuando el usuario cambia el país en el desplegable
        issuerSelect.addEventListener('change', (e) => {
            const issuerCode = e.target.value;
            if (issuerCode) {
                console.log("Emisor seleccionado:", issuerCode);
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

    console.log("Categorías compatibles con la API cargadas correctamente.");
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

    console.log("Subtipos fijos cargados correctamente.");
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
}

// 5. Consulta con paginación controlada por la API v3 de Numista
async function ejecutarConsultaEmisor(issuerCode) {
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const categoryValue = document.getElementById('category')?.value;
    const subTypeVal = document.getElementById('object_type')?.value; // Ej: "5" (Monedas locales)

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    try {
        let todosLosRegistros = [];
        let paginaActual = 1;
        let totalApi = 0;
        const maxPaginas = 10; // Límite de seguridad (hasta 500 registros explorados)

        // Bucle controlado para buscar y acumular páginas hasta encontrar coincidencias o agotar límite
        do {
            const params = { 
                issuer: issuerCode, 
                lang: 'es',
                count: 50,
                page: paginaActual
            };
            
            if (categoryValue) {
                params.category = categoryValue;
            }

            const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
                body: { endpoint: 'types', params: params }
            });

            if (error) throw error;

            const registrosBloque = asegurarArray(data.types || data);
            totalApi = data.count || registrosBloque.length;

            if (registrosBloque.length === 0) break;

            todosLosRegistros = todosLosRegistros.concat(registrosBloque);

            // Si ya tenemos suficientes o llegamos al final del catálogo de la API, salimos
            if (todosLosRegistros.length >= totalApi || registrosBloque.length < 50 || paginaActual >= maxPaginas) {
                break;
            }

            paginaActual++;
        } while (true);

        if (loading) loading.classList.add('hidden');

        // Filtrado exacto usando la estructura real que nos devolvió la consola: item.object_type.id
        let registrosFiltrados = todosLosRegistros;
        if (subTypeVal && subTypeVal.trim() !== "") {
            registrosFiltrados = todosLosRegistros.filter(item => {
                const idSubtipoItem = item.object_type?.id;
                return String(idSubtipoItem) === String(subTypeVal);
            });
        }

        if (registrosFiltrados.length === 0) {
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No se encontraron registros para este subtipo en las páginas exploradas.</p>';
            return;
        }

        resultsDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-card, #222); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Total encontrados con este subtipo:</strong> ${registrosFiltrados.length} (de ${totalApi} totales en Numista)</p>
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

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        console.error("Error en la consulta:", err);
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error: ${err.message}</p>`;
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
    const issuer = document.getElementById('issuer').value;
    if (issuer) ejecutarConsultaEmisor(issuer);
}
