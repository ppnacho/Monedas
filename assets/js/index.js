import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    cargarEmisores();

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', probarConsultaEmisor);
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

        console.log("Consultando tipos para el emisor:", data);
        
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
                limpiarSelectores();
            }
        });

    } catch (err) {
        console.error("No se pudieron cargar los emisores:", err);
    }
}

// 2. Realizar la consulta por emisor, extraer categorías y mostrar la muestra
async function ejecutarConsultaEmisor(issuerCode) {
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    try {
        const params = { issuer: issuerCode, lang: 'es', limit: 50 };

        console.log("Consultando tipos para el emisor:", params);

        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'types', params: params }
        });

        if (error) throw error;
        if (loading) loading.classList.add('hidden');

        const registros = asegurarArray(data);

        if (registros.length === 0) {
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No se encontraron registros para este emisor.</p>';
            limpiarSelectores();
            return;
        }

        // --- PASO CLAVE: Extraer categorías únicas de la totalidad de los registros devueltos ---
        poblarSelectorCategorias(registros);

        // Mostrar muestra visual y depuración
        const muestra = registros.slice(0, 5); 

        resultsDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-card, #222); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Total de registros devueltos por la API:</strong> ${registros.length}</p>
                <p style="font-size: 0.9em; color: gray;">Categorías extraídas y cargadas en el selector superior. Mostrando los primeros 5 elementos.</p>
            </div>
        `;

        muestra.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item';
            
            const title = item.title || item.name || 'Sin título';
            const id = item.type_id || item.id || 'N/A';
            const img = item.obverse_thumbnail || 'https://via.placeholder.com/105?text=Sin+Imagen';
            const cat = item.category || 'N/A';

            card.innerHTML = `
                <div class="coin-images">
                    <img src="${img}" alt="${title}">
                </div>
                <div class="coin-info">
                    <h3 class="coin-title">[#${index + 1}] ${title}</h3>
                    <p class="coin-meta">ID Numista: ${id} | Categoría: <strong>${cat}</strong></p>
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

// 3. Función para procesar los registros y rellenar el selector de categoría de manera única
function poblarSelectorCategorias(registros) {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    // Limpiar opciones anteriores
    categorySelect.innerHTML = '<option value="">-- Todas las categorías --</option>';

    // Usar un Set para garantizar que los valores de 'category' sean únicos
    const categoriasUnicas = new Set();

    registros.forEach(item => {
        if (item.category) {
            categoriasUnicas.add(item.category);
        }
    });

    // Rellenar el selector con las categorías encontradas
    categoriasUnicas.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        // Podríamos capitalizar o formatear el texto si se desea (ej: 'coin' -> 'Coin')
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        categorySelect.appendChild(option);
    });

    console.log("Categorías únicas encontradas y cargadas:", Array.from(categoriasUnicas));
}

function limpiarSelectores() {
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- Selecciona un emisor primero --</option>';
    }
}

function probarConsultaEmisor(e) {
    e.preventDefault();
    const issuer = document.getElementById('issuer').value;
    if (issuer) ejecutarConsultaEmisor(issuer);
}
