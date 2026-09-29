// Configuración de Supabase (Reemplaza con tus credenciales reales)
const SUPABASE_URL = 'https://gawrunepixcazeuelasw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f46kPmVleLt67O_1t7o-HQ_5ef6QFtq';

// Inicialización del cliente
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Event listener cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-btn');
    if (searchButton) {
        searchButton.addEventListener('click', buscarMonedas);
    }
});

async function buscarMonedas() {
    const query = document.getElementById('query').value;
    const country = document.getElementById('country').value;
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    loading.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    try {
        // Llamada a la Edge Function de Supabase
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: {
                endpoint: 'coins/search',
                params: { q: query, country: country }
            }
        });

        if (error) throw error;

        loading.classList.add('hidden');
        
        console.log("Respuesta de Numista:", data);

        // Parseo seguro de la respuesta según el formato de la API
        const monedas = Array.isArray(data) ? data : (data.coins || data.results || []);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500 col-span-2">No se encontraron monedas con esos criterios.</p>';
            return;
        }

        monedas.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'border p-4 rounded-lg flex gap-4 items-center bg-gray-50 shadow-sm';
            card.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-blue-900">${coin.title || coin.name || 'Sin título'}</h3>
                    <p class="text-sm text-gray-600">Emisor: ${coin.issuer?.name || 'Desconocido'}</p>
                    <p class="text-xs text-gray-500 mt-1">ID Numista: N#${coin.id}</p>
                    <button data-id="${coin.id}" class="mt-3 bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors add-collection-btn">Añadir a mi colección</button>
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
        loading.classList.add('hidden');
        console.error("Error completo:", err);
        resultsDiv.innerHTML = `<p class="text-red-500 col-span-2">Error al buscar: ${err.message}</p>`;
    }
}

function agregarAMiColeccion(numistaId) {
    alert(`Aquí guardarás la moneda N#${numistaId} en tu tabla user_collection de Supabase.`);
    // Próximo paso: Realizar un supabaseClient.from('user_collection').insert({...})
}
