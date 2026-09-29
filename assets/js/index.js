// Importa el cliente configurado desde tu módulo
import { supabaseClient } from './supabaseClient.js';

// Event listener cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    cargarEmisores();
    cargarCategorias();
    cargarTiposMedalla();

    // Control dinámico: mostrar u ocultar el selector de medallas según la categoría elegida
    const categorySelect = document.getElementById('category');
    const medalContainer = document.getElementById('medal-container');
    
    if (categorySelect && medalContainer) {
        categorySelect.addEventListener('change', (e) => {
            // Si la categoría seleccionada es 'medal', mostramos el desplegable de sus 10 tipos
            if (e.target.value === 'medal') {
                medalContainer.style.display = 'block';
            } else {
                medalContainer.style.display = 'none';
                document.getElementById('medal_type').value = ''; // Resetea si cambia de categoría
            }
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', buscarMonedas);
    }
});

// 1. Cargar emisores dinámicamente
async function cargarEmisores() {
    const issuerSelect = document.getElementById('issuer');
    if (!issuerSelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'issuers', params: { lang: 'es' } }
        });

        if (error) throw error;

        const issuers = Array.isArray(data) ? data : (data.issuers || data.results || []);
        issuers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        issuers.forEach(issuer => {
            const option = document.createElement('option');
            option.value = issuer.code || issuer.id; 
            option.textContent = issuer.name || issuer.code;
            issuerSelect.appendChild(option);
        });
    } catch (err) {
        console.error("No se pudieron cargar los emisores:", err);
    }
}

// 2. Cargar categorías generales dinámicamente (coins, medals, tokens, banknotes)
async function cargarCategorias() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'object_types', params: { lang: 'es' } } // Endpoint v3 para tipos de objetos
        });

        if (error) throw error;

        const categories = Array.isArray(data) ? data : (data.object_types || data.categories || data.results || []);

        categories.forEach(cat => {
            const option = document.createElement('option');
            // Adaptado a la estructura de la v3 (ej. cat.code o cat.id)
            option.value = cat.code || cat.name?.toLowerCase(); 
            option.textContent = cat.name || cat.code;
            categorySelect.appendChild(option);
        });
    } catch (err) {
        console.error("No se pudieron cargar las categorías:", err);
    }
}

// 3. Cargar los 10 tipos específicos de medallas dinámicamente
async function cargarTiposMedalla() {
    const medalTypeSelect = document.getElementById('medal_type');
    if (!medalTypeSelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'medal_types', params: { lang: 'es' } } // Endpoint v3 para subcategorías de medallas
        });

        if (error) throw error;

        const medalTypes = Array.isArray(data) ? data : (data.medal_types || data.types || data.results || []);

        medalTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.code || type.id;
            option.textContent = type.name || type.code;
            medalTypeSelect.appendChild(option);
        });
    } catch (err) {
        console.error("No se pudieron cargar los tipos de medallas:", err);
    }
}

async function buscarMonedas(e) {
    e.preventDefault(); 

    const query = document.getElementById('q').value.trim();
    const issuer = document.getElementById('issuer').value;
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    const category = document.getElementById('category') ? document.getElementById('category').value : '';
    const medalType = document.getElementById('medal_type') ? document.getElementById('medal_type').value : '';
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-gray-500">Buscando...</p>';

    try {
        const params = {};
        if (query) params.q = query;
        if (issuer) params.issuer = issuer; 
        if (yearInput) params.year = yearInput;
        if (category) params.category = category; 
        
        // Si está activa la categoría medalla y se seleccionó un subtipo específico
        if (category === 'medal' && medalType) {
            params.medal_type = medalType;
        }

        params.lang = 'es'; 

        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'types',
                params: params
            }
        });

        if (error) throw error;

        if (loading) loading.classList.add('hidden');
        
        const monedas = Array.isArray(data) ? data : (data.types || data.coins || data.results || []);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500 col-span-2">No se encontraron elementos con esos criterios.</p>';
            return;
        }

        resultsDiv.innerHTML = ''; 

        monedas.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'border p-4 rounded-lg flex gap-4 items-center bg-gray-50 shadow-sm item';
            
            const coinId = coin.type_id || coin.id;
            const coinTitle = coin.title || coin.name || 'Sin título';
            const issuerName = coin.issuer?.name || coin.issuer || 'Desconocido';
            
            const obverseImg = coin.obverse_thumbnail || 'https://via.placeholder.com/75?text=Sin+Anverso';
            const reverseImg = coin.reverse_thumbnail || 'https://via.placeholder.com/75?text=Sin+Reverso';

            card.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <img src="${obverseImg}" alt="${coinTitle} - Anverso" title="Anverso" style="width: 105px; height: 105px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
                    <img src="${reverseImg}" alt="${coinTitle} - Reverso" title="Reverso" style="width: 105px; height: 105px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-blue-900">${coinTitle}</h3>
                    <p class="text-sm text-gray-600">Emisor: ${issuerName}</p>
                    <p class="text-xs text-gray-500 mt-1">ID Numista: N#${coinId}</p>
                    <button data-id="${coinId}" class="mt-3 bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors add-collection-btn">Añadir a mi colección</button>
                </div>
            `;
            resultsDiv.appendChild(card);
        });

        document.querySelectorAll('.add-collection-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const numistaId = e.target.getAttribute('data-id');
                agregarAMiColeccion(numistaId);
            });
        });

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        console.error("Error completo:", err);
        resultsDiv.innerHTML = `<p class="text-red-500 col-span-2">Error al buscar: ${err.message}</p>`;
    }
}

function agregarAMiColeccion(numistaId) {
    alert(`Aquí guardarás la moneda N#${numistaId} en tu tabla user_collection de Supabase.`);
}
