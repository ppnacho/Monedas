// Importa el cliente configurado desde tu módulo
import { supabaseClient } from './supabaseClient.js';

// Event listener cuando el DOM esté cargado (asociado al formulario)
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', buscarMonedas);
    }
});

async function buscarMonedas(e) {
    e.preventDefault(); // Evita que la página se recargue al enviar el formulario

    // Coincidencia exacta con los IDs del index.html (q, issuer, year)
    const query = document.getElementById('q').value.trim();
    const issuer = document.getElementById('issuer').value.trim();
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '<p class="text-gray-500">Buscando...</p>';

    try {
        // Construcción de los parámetros específicos para la API v3 de Numista
        const params = {};
        if (query) params.q = query;
        if (issuer) params.issuer = issuer; // Numista usa 'issuer' para país/autoridad emisora
        if (yearInput) params.year = yearInput; // Parámetro de año soportado en la v3

        // Llamada a la Edge Function de Supabase usando el nombre correcto del cliente
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'types', // Endpoint oficial v3 para búsqueda de tipos de monedas/billetes
                params: params
            }
        });

        if (error) throw error;

        if (loading) loading.classList.add('hidden');
        
        console.log("Respuesta de Numista:", data);

        // Parseo seguro de la respuesta según el formato de la API v3
        const monedas = Array.isArray(data) ? data : (data.types || data.coins || data.results || []);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500 col-span-2">No se encontraron monedas con esos criterios.</p>';
            return;
        }

        resultsDiv.innerHTML = ''; // Limpiar contenedor

        monedas.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'border p-4 rounded-lg flex gap-4 items-center bg-gray-50 shadow-sm item';
            
            // Propiedades de la API v3 de Numista
            const coinId = coin.type_id || coin.id;
            const coinTitle = coin.title || coin.name || 'Sin título';
            const issuerName = coin.issuer?.name || coin.issuer || 'Desconocido';
            
            // Extracción correcta de la URL de la miniatura del anverso
            const imageUrl = coin.obverse_thumbnail || coin.reverse_thumbnail || 'https://via.placeholder.com/80?text=Sin+Imagen';

            card.innerHTML = `
                <div>
                    <img src="${imageUrl}" alt="${coinTitle}" style="width: 75px; height: 75px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
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
