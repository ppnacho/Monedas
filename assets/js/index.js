// Importa el cliente configurado desde tu módulo
import { supabaseClient } from './supabaseClient.js';

// Event listener cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    cargarEmisores(); // Carga la lista desplegable al iniciar

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', buscarMonedas);
    }
});

// Función para obtener la lista de emisores desde la Edge Function
async function cargarEmisores() {
    const issuerSelect = document.getElementById('issuer');
    if (!issuerSelect) return;

    try {
        // Llamada a la API de Numista usando el endpoint 'issuers'
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'issuers',
                params: {}
            }
        });

        if (error) throw error;

        // Parseo seguro de la lista de emisores (según el formato de la API v3)
        const issuers = Array.isArray(data) ? data : (data.issuers || data.results || []);

        // Rellenar el select ordenándolos alfabéticamente por nombre
        issuers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        issuers.forEach(issuer => {
            const option = document.createElement('option');
            // Numista suele requerir el 'code' (ej: 'espagne') o el 'id' como valor del filtro
            option.value = issuer.code || issuer.id; 
            option.textContent = issuer.name || issuer.code;
            issuerSelect.appendChild(option);
        });

    } catch (err) {
        console.error("No se pudieron cargar los emisores:", err);
    }
}

async function buscarMonedas(e) {
    e.preventDefault(); 

    const query = document.getElementById('q').value.trim();
    const issuer = document.getElementById('issuer').value; // Valor seleccionado del desplegable
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-gray-500">Buscando...</p>';

    try {
        const params = {};
        if (query) params.q = query;
        if (issuer) params.issuer = issuer; // Envía el código exacto del emisor seleccionado
        if (yearInput) params.year = yearInput;

        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'types',
                params: params
            }
        });

        if (error) throw error;

        if (loading) loading.classList.add('hidden');
        
        console.log("Respuesta de Numista:", data);

        const monedas = Array.isArray(data) ? data : (data.types || data.coins || data.results || []);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500 col-span-2">No se encontraron monedas con esos criterios.</p>';
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
                    <img src="${obverseImg}" alt="${coinTitle} - Anverso" title="Anverso" style="width: 70px; height: 70px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
                    <img src="${reverseImg}" alt="${coinTitle} - Reverso" title="Reverso" style="width: 70px; height: 70px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
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
