import { supabaseClient } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    cargarEmisores();
    cargarCategorias();
    cargarTiposMedalla();

    const categorySelect = document.getElementById('category');
    const medalContainer = document.getElementById('medal-container');
    
    if (categorySelect && medalContainer) {
        categorySelect.addEventListener('change', (e) => {
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            const valorSeleccionado = e.target.value.toLowerCase();
            const textoSeleccionado = selectedOption ? selectedOption.textContent.toLowerCase() : '';
            
            // Comprobación flexible por valor o texto visible para mostrar el selector de medallas
            const esMedallaOExonumia = 
                valorSeleccionado === 'exonumia' || 
                valorSeleccionado.includes('medal') || 
                valorSeleccionado.includes('medalla') || 
                valorSeleccionado.includes('exonumia') ||
                textoSeleccionado.includes('medal') || 
                textoSeleccionado.includes('medalla') || 
                textoSeleccionado.includes('exonumia');

            if (esMedallaOExonumia) {
                medalContainer.style.display = 'flex'; // Mantiene el diseño del form-group
            } else {
                medalContainer.style.display = 'none';
                const medalTypeSelect = document.getElementById('medal_type');
                if (medalTypeSelect) medalTypeSelect.value = '';
            }
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', buscarMonedas);
    }
});

// Función auxiliar robusta para transformar cualquier tipo de respuesta en un array iterable
function asegurarArray(data) {
    if (Array.isArray(data)) return data;
    if (!data) return [];
    if (typeof data === 'object') {
        // Busca si alguna de las propiedades internas es un array
        const possibleArray = Object.values(data).find(val => Array.isArray(val));
        if (possibleArray) return possibleArray;
        // Si es un objeto asociativo, extrae sus valores
        return Object.values(data);
    }
    return [];
}

async function cargarEmisores() {
    const issuerSelect = document.getElementById('issuer');
    if (!issuerSelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'issuers', params: { lang: 'es' } }
        });
        if (error) throw error;
        const issuers = asegurarArray(data);
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

async function cargarCategorias() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'object_types', params: { lang: 'es' } }
        });
        
        if (error) throw error;

        const categories = asegurarArray(data);

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id || cat.code; 
            option.textContent = cat.name || cat.title || cat.label;
            categorySelect.appendChild(option);
        });

    } catch (err) {
        console.error("No se pudieron cargar las categorías desde la API, usando respaldo:", err);
        
        const categoriasFijas = [
            { id: 'coin', name: 'Moneda' },
            { id: 'banknote', name: 'Billetes' },
            { id: 'exonumia', name: 'Exonumia' }
        ];

        categoriasFijas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    }
}

async function cargarTiposMedalla() {
    const medalTypeSelect = document.getElementById('medal_type');
    if (!medalTypeSelect) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'medal_types', params: { lang: 'es' } }
        });
        
        if (error) throw error;

        const medalTypes = asegurarArray(data);

        medalTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id || type.code;
            option.textContent = type.name || type.title || type.label;
            medalTypeSelect.appendChild(option);
        });

    } catch (err) {
        console.error("No se pudieron cargar los tipos de medallas desde la API, usando respaldo:", err);
        
        const medallasFijas = [
            { id: 'commemorative', name: 'Conmemorativa' },
            { id: 'religious', name: 'Religiosa' },
            { id: 'military', name: 'Militar' }
        ];

        medallasFijas.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            medalTypeSelect.appendChild(option);
        });
    }
}

async function buscarMonedas(e) {
    e.preventDefault(); 

    const query = document.getElementById('q').value.trim();
    const issuer = document.getElementById('issuer').value;
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    const categorySelect = document.getElementById('category');
    const category = categorySelect ? categorySelect.value : '';
    const categoryText = categorySelect && categorySelect.options[categorySelect.selectedIndex] ? categorySelect.options[categorySelect.selectedIndex].textContent.toLowerCase() : '';
    const medalType = document.getElementById('medal_type') ? document.getElementById('medal_type').value : '';
    
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    if (loading) loading.classList.remove('hidden');
    resultsDiv.innerHTML = '';

    try {
        const params = {};
        if (query) params.q = query;
        if (issuer) params.issuer = issuer; 
        if (yearInput) params.year = yearInput;
        if (category) params.category = category; 
        
        const esMedallaOExonumia = category === 'exonumia' || category.includes('medal') || categoryText.includes('medal') || categoryText.includes('medalla') || categoryText.includes('exonumia');
        if (esMedallaOExonumia && medalType) {
            params.medal_type = medalType;
        }

        params.lang = 'es'; 

        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'types', params: params }
        });

        if (error) throw error;
        if (loading) loading.classList.add('hidden');

        const monedas = asegurarArray(data);

        if (monedas.length === 0) {
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">No se encontraron elementos con esos criterios.</p>';
            return;
        }

        monedas.forEach(coin => {
            const card = document.createElement('div');
            card.className = 'item';
            
            const coinId = coin.type_id || coin.id;
            const coinTitle = coin.title || coin.name || 'Sin título';
            const issuerName = coin.issuer?.name || coin.issuer || 'Desconocido';
            
            const obverseImg = coin.obverse_thumbnail || 'https://via.placeholder.com/105?text=Sin+Anverso';
            const reverseImg = coin.reverse_thumbnail || 'https://via.placeholder.com/105?text=Sin+Reverso';

            card.innerHTML = `
                <div class="coin-images">
                    <img src="${obverseImg}" alt="${coinTitle} - Anverso" title="Anverso">
                    <img src="${reverseImg}" alt="${coinTitle} - Reverso" title="Reverso">
                </div>
                <div class="coin-info">
                    <h3 class="coin-title">${coinTitle}</h3>
                    <p class="coin-meta">Emisor: ${issuerName}</p>
                    <p class="coin-id">ID Numista: N#${coinId}</p>
                    <button data-id="${coinId}" class="btn-add add-collection-btn">Añadir a mi colección</button>
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
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error al buscar: ${err.message}</p>`;
    }
}

function agregarAMiColeccion(numistaId) {
    alert(`Aquí guardarás la moneda N#${numistaId} en tu tabla user_collection de Supabase.`);
}
