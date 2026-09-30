import { supabaseClient } from './supabaseClient.js';

// Base de datos local de la taxonomía oficial de Numista para alimentar los selectores
const TAXONOMIA_NUMISTA = {
    coin: {
        name: "Monedas",
        subcategories: [
            { id: "normal", name: "Monedas circulantes normales" },
            { id: "commemorative", name: "Monedas circulantes conmemorativas" },
            { id: "nclt", name: "Monedas no circulantes (NCLT)" },
            { id: "collector", name: "Monedas de colección" },
            { id: "emergency", name: "Monedas de emergencia" },
            { id: "local", name: "Monedas locales" },
            { id: "piefort", name: "Monedas de ensayo" },
            { id: "contemporary_counterfeit", name: "Monedas falsas de época" },
            { id: "protocurrency", name: "Protomonedas" }
        ]
    },
    token: {
        name: "Fichas",
        subcategories: [
            { id: "service", name: "Fichas de acceso a un servicio" },
            { id: "dispenser", name: "Fichas de dispensador" },
            { id: "commercial", name: "Fichas con valor comercial" },
            { id: "tax", name: "Fichas de impuesto" },
            { id: "spiritual", name: "Fichas espirituales" },
            { id: "attendance", name: "Fichas de asistencia" },
            { id: "utility", name: "Objetos de utilidad" },
            { id: "bullion", name: "Bullion" }
        ]
    },
    medal: {
        name: "Medallas",
        subcategories: [
            { id: "award", name: "Medallas de condecoración" },
            { id: "commemorative_medal", name: "Medallas conmemorativas" },
            { id: "art", name: "Medallas artísticas" },
            { id: "membership", name: "Medallas de membría" },
            { id: "religious_medal", name: "Medallas religiosas" },
            { id: "souvenir", name: "Medallones de recuerdo" },
            { id: "collection", name: "Medallones de colección" },
            { id: "advertising", name: "Medallones publicitarios" },
            { id: "replica", name: "Réplicas de monedas" },
            { id: "fantasy", name: "Monedas de fantasía" }
        ]
    },
    banknote: {
        name: "Billetes",
        subcategories: [
            { id: "normal_banknote", name: "Billetes circulantes normales" },
            { id: "commemorative_banknote", name: "Billetes circulantes conmemorativos" },
            { id: "collector_banknote", name: "Billetes no circulantes" },
            { id: "local_banknote", name: "Billetes locales" },
            { id: "emergency_banknote", name: "Billetes de emergencia" },
            { id: "unissued", name: "Billetes no emitidos" },
            { id: "essay_banknote", name: "Billetes de ensayo" }
        ]
    },
    exonumia: {
        name: "Exonumia de papel",
        subcategories: [
            { id: "paper_like", name: "Objetos similares a billetes" },
            { id: "confinement", name: "Vales de confinamiento" },
            { id: "currency_exchange", name: "Certificados de cambio de divisas" },
            { id: "postal_order", name: "Giros postales" },
            { id: "bill_of_exchange", name: "Letras de cambio" },
            { id: "travelers_cheque", name: "Cheques de viaje" },
            { id: "ration_coupon", name: "Cupones de racionamiento" },
            { id: "trade_scrip", name: "Vales de comercio" }
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cargarEmisores();
    cargarCategoriasPrincipales();

    // Evento para cambiar dinámicamente las subcategorías según la categoría elegida
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            actualizarSubcategorias(e.target.value);
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', buscarMonedas);
    }
});

// Función auxiliar robusta para transformar respuestas en arrays
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

// 1. Carga de emisores (países)
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

// 2. Carga de categorías principales basadas en la taxonomía
function cargarCategoriasPrincipales() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    Object.keys(TAXONOMIA_NUMISTA).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = TAXONOMIA_NUMISTA[key].name;
        categorySelect.appendChild(option);
    });
}

// 3. Actualizar el selector de subcategorías en función de la categoría seleccionada
function actualizarSubcategorias(categoriaKey) {
    const medalContainer = document.getElementById('medal-container');
    const medalTypeSelect = document.getElementById('medal_type');
    
    if (!medalTypeSelect || !medalContainer) return;

    // Limpiar opciones previas
    medalTypeSelect.innerHTML = '<option value="">-- Todas las subcategorías --</option>';

    if (categoriaKey && TAXONOMIA_NUMISTA[categoriaKey]) {
        const subcategories = TAXONOMIA_NUMISTA[categoriaKey].subcategories;
        
        subcategories.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            medalTypeSelect.appendChild(option);
        });

        // Mostrar el contenedor de subcategorías
        medalContainer.style.display = 'block';
    } else {
        // Si no hay categoría seleccionada, podemos ocultarlo o dejarlo vacío
        medalContainer.style.display = 'none';
    }
}

// Búsqueda de piezas enviando todos los parámetros seleccionados
async function buscarMonedas(e) {
    e.preventDefault(); 

    const query = document.getElementById('q').value.trim();
    const issuer = document.getElementById('issuer').value;
    const yearInput = document.getElementById('year') ? document.getElementById('year').value.trim() : '';
    const categorySelect = document.getElementById('category');
    const category = categorySelect ? categorySelect.value : '';
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
        if (medalType) params.object_type = medalType; // Parámetro estándar para filtrar por subtipo de objeto en la API

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
    alert(`Aquí guardarás la pieza N#${numistaId} en tu tabla user_collection de Supabase.`);
}
