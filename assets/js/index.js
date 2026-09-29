// Inicialización del cliente
import { supabase } from './supabaseClient.js';

// Event listener cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', buscarMonedas);
    }
});

async function buscarMonedas() {
    // Captura de los campos del formulario (asegúrate de que los IDs en tu HTML coincidan: query, country, year)
    const query = document.getElementById('query').value.trim();
    const country = document.getElementById('country').value.trim();
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    try {
        // Construcción de los parámetros específicos para la API v3 de Numista
        const params = {};
        if (query) params.q = query;
        if (country) params.issuer = country; // Numista usa 'issuer' para país/autoridad emisora
        if (yearInput) params.year = yearInput; // Parámetro de año soportado en la v3

        // Llamada a la Edge Function de Supabase adaptada a Numista v3 (/types)
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'types', // Endpoint oficial v3 para búsqueda de tipos de monedas/billetes
                params: params
            }
        });

        if (error) throw error;

        if (loading) loading.classList.add('hidden');
        
        console.log("Respuesta de Numista:", data);

        // Parseo seguro de la respuesta según el formato de la API v3 (suele devolver un array de tipos)
        const monedas = Array.isArray(data) ? data : (data.types || data.coins || data.results || []);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500 col-span-2">No se encontraron monedas con esos criterios.</p>';
            return;
        }

        monedas.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'border p-4 rounded-lg flex gap-4 items-center bg-gray-50 shadow-sm';
            
            // Adaptado a las propiedades devueltas por /types en la API v3 (ej. title, type_id, issuer)
            const coinId = coin.type_id || coin.id;
            const coinTitle = coin.title || coin.name || 'Sin título';
            const issuerName = coin.issuer?.name || coin.issuer || 'Desconocido';

            card.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-blue-900">${coinTitle}</h3>
                    <p class="text-sm text-gray-600">Emisor: ${issuerName}</p>
                    <p class="text-xs text-gray-500 mt-1">ID Numista: N#${coinId}</p>
                    <button data-id="${coinId}" class="mt-3 bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors add-collection-btn">Añadir a mi colección</button>
                </div>
            `;
            resultsDiv.appendChild(card);
        });

        // Añadir eventos a los botones generados dinámicamente
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
    // Próximo paso: Realizar un supabaseClient.from('user_collection').insert({...})
}
