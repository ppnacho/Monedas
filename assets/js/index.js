import { supabaseClient } from './supabaseClient.js';

let issuersGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded disparado. Inicializando aplicación...");
    cargarEmisores();
    cargarCategoriasFijas(); 
    cargarSubtiposFijos();

    const yearInput = document.getElementById('year');
    if (yearInput) {
        yearInput.setAttribute('title', 'Formatos admitidos:\n- Año exacto: 1566\n- Hasta un año (-AÑO): -2000 (hasta el 2000)\n- Desde un año (AÑO-): 2000- (desde el 2000)\n- Rango (AÑO-AÑO): 1500-1600');
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', probarConsultaEmisor);
    }

    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            filtrarSubtiposPorCategoria();
        });
    }

    inicializarAutocompletadoEmisor();
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

async function cargarEmisores() {
    try {
        const { data, error } = await supabaseClient.functions.invoke('numista-proxy', {
            body: { endpoint: 'issuers', params: { lang: 'es' } }
        });

        if (error) throw error;
        
        issuersGlobal = asegurarArray(data);
        issuersGlobal.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        console.log(`Se han cargado ${issuersGlobal.length} emisores en memoria.`);
    } catch (err) {
        console.error("No se pudieron cargar los emisores:", err);
    }
}

// Autocompletado flotante personalizado para PC y móvil
function inicializarAutocompletadoEmisor() {
    const issuerInput = document.getElementById('issuer-input');
    const issuerHidden = document.getElementById('issuer');
    const dropdown = document.getElementById('lista-emisores');

    if (!issuerInput || !issuerHidden || !dropdown) return;

    // Aplicar estilos básicos para que actúe como lista flotante
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.right = '0';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.backgroundColor = 'var(--bg-card, #222)';
    dropdown.style.border = '1px solid #444';
    dropdown.style.borderRadius = '0 0 6px 6px';
    dropdown.style.zIndex = '1000';

    function mostrarSugerencias(filtro = '') {
        dropdown.innerHTML = '';
        const texto = filtro.toLowerCase().trim();

        const filtrados = issuersGlobal.filter(iss => 
            (iss.name || '').toLowerCase().includes(texto) || 
            (iss.code || '').toLowerCase().includes(texto)
        );

        if (filtrados.length === 0 || (filtrados.length === 1 && filtrados[0].name.toLowerCase() === texto)) {
            dropdown.classList.add('hidden');
            return;
        }

        filtrados.slice(0, 50).forEach(issuer => {
            const div = document.createElement('div');
            div.textContent = issuer.name;
            div.style.padding = '8px 12px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            
            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                issuerInput.value = issuer.name;
                issuerHidden.value = issuer.code || issuer.id;
                dropdown.classList.add('hidden');
            });

            dropdown.appendChild(div);
        });

        dropdown.classList.remove('hidden');
    }

    issuerInput.addEventListener('input', (e) => {
        issuerHidden.value = ""; 
        mostrarSugerencias(e.target.value);
    });

    issuerInput.addEventListener('focus', () => {
        mostrarSugerencias(issuerInput.value);
    });

    issuerInput.addEventListener('blur', () => {
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 200);
    });
}

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
}

const objectTypesOficiales = [
    { id: 1, name: 'Monedas circulantes normales', category: 'coin' },
    { id: 2, name: 'Monedas circulantes conmemorativas', category: 'coin' },
    { id: 3, name: 'Monedas no circulantes', category: 'coin' },
    { id: 47, name: 'Monedas de colección', category: 'coin' },
    { id: 154, name: 'Monedas de emergencia', category: 'coin' },
    { id: 5, name: 'Monedas locales', category: 'coin' },
    { id: 6, name: 'Monedas de ensayo', category: 'coin' },
    { id: 54, name: 'Monedas falsas de época', category: 'coin' },
    { id: 72, name: 'Protomonedas', category: 'coin' },
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

function cargarSubtiposFijos() {
    const subTypeSelect = document.getElementById('object_type');
    if (!subTypeSelect) return;

    subTypeSelect.innerHTML = '<option value="">-- Todos los tipos --</option>';
    objectTypesOficiales.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub.id;
        option.textContent = sub.name;
        option.dataset.category = sub.category;
        subTypeSelect.appendChild(option);
    });
}

function filtrarSubtiposPorCategoria() {
    const categorySelect = document.getElementById('category');
    const subTypeSelect = document.getElementById('object_type');
    if (!categorySelect || !subTypeSelect) return;

    const categoriaSeleccionada = categorySelect.value;
    const valorPrevio = subTypeSelect.value;

    subTypeSelect.innerHTML = '<option value="">-- Todos los tipos --</option>';

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

    if (valorPrevio) {
        subTypeSelect.value = valorPrevio;
    }
}

async function subirImagenASupabase(urlExterna, numistaId, tipo) {
  if (!urlExterna || urlExterna.trim() === "") return null;

  try {
    const response = await fetch(urlExterna);
    if (!response.ok) throw new Error('Error al descargar la imagen');
    
    const blob = await response.blob();
    const fileName = `${numistaId}_${tipo}.jpg`;

    const { data, error } = await supabaseClient.storage
      .from('monedas-img')
      .upload(fileName, blob, { upsert: true });

    if (error) return urlExterna;

    const { data: publicUrlData } = supabaseClient.storage
      .from('monedas-img')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    return urlExterna;
  }
}

async function ejecutarConsultaEmisor(issuerCode) {
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const categoryValue = document.getElementById('category')?.value;
    const subTypeVal = document.getElementById('object_type')?.value;
    const yearValue = document.getElementById('year')?.value?.trim();
    const searchTerm = document.getElementById('q')?.value?.trim().toLowerCase() || '';

    if (loading) loading.classList.remove('hidden');
    if (resultsDiv) resultsDiv.innerHTML = '';

    try {
        let todosLosRegistros = [];
        let paginaActual = 1;
        let totalApi = 0;

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

            if (error) throw error;

            const registrosBloque = asegurarArray(data.types || data);
            totalApi = data.count || totalApi || registrosBloque.length;

            if (registrosBloque.length === 0) break;

            todosLosRegistros = todosLosRegistros.concat(registrosBloque);

            if (todosLosRegistros.length >= totalApi || registrosBloque.length < 50) {
                break;
            }

            paginaActual++;
        } while (true);

        let registrosFiltrados = todosLosRegistros;

        if (subTypeVal !== null && subTypeVal !== undefined && subTypeVal.trim() !== "") {
            registrosFiltrados = registrosFiltrados.filter(item => {
                const idSubtipoItem = item.object_type?.id;
                return idSubtipoItem == subTypeVal.trim();
            });
        }

        if (searchTerm !== "") {
            registrosFiltrados = registrosFiltrados.filter(item => {
                const titleText = (item.title || item.name || '').toLowerCase();
                return titleText.includes(searchTerm);
            });
        }

        if (yearValue && yearValue !== "") {
            registrosFiltrados = registrosFiltrados.filter(item => {
                const minYear = item.min_year ? parseInt(item.min_year, 10) : null;
                const maxYear = item.max_year ? parseInt(item.max_year, 10) : null;
                const issueYear = item.year ? parseInt(item.year, 10) : null;

                if (minYear === null && maxYear === null && issueYear === null) return false;

                const pMin = minYear !== null ? minYear : (maxYear !== null ? maxYear : issueYear);
                const pMax = maxYear !== null ? maxYear : (minYear !== null ? minYear : issueYear);

                if (yearValue.startsWith('-') && !yearValue.endsWith('-')) {
                    const targetYear = parseInt(yearValue.substring(1), 10);
                    return isNaN(targetYear) || pMin <= targetYear;
                }

                if (yearValue.endsWith('-') && !yearValue.startsWith('-')) {
                    const targetYear = parseInt(yearValue.slice(0, -1), 10);
                    return isNaN(targetYear) || pMax >= targetYear;
                }

                if (yearValue.includes('-')) {
                    const partes = yearValue.split('-');
                    const startYear = parseInt(partes[0], 10);
                    const endYear = parseInt(partes[1], 10);
                    return isNaN(startYear) || isNaN(endYear) || (pMin <= endYear && pMax >= startYear);
                }

                const exactYear = parseInt(yearValue, 10);
                if (isNaN(exactYear)) {
                    return item.title && item.title.includes(yearValue);
                }
                return (exactYear >= pMin && exactYear <= pMax) || (item.title && item.title.includes(yearValue));
            });
        }

        if (loading) loading.classList.add('hidden');

        if (registrosFiltrados.length === 0) {
            resultsDiv.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: orange;">No se encontraron registros para esta selección.</p>';
            return;
        }

        resultsDiv.innerHTML = `
            <div style="grid-column: 1 / -1; background: var(--bg-card, #222); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p><strong>Total filtrados:</strong> ${registrosFiltrados.length} | <strong>Total global descargado:</strong> ${totalApi}</p>
            </div>
        `;

        registrosFiltrados.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item';
            
            const title = item.title || item.name || 'Sin título';
            const id = item.type_id || item.id || 'N/A';
            const cat = item.category || 'N/A';
            const subName = item.object_type?.name || 'N/A';
            const minYear = item.min_year || '';
            const maxYear = item.max_year || '';
            const rangoAnios = (minYear || maxYear) ? `${minYear} - ${maxYear}` : 'No especificado';
            const emisorNombre = item.issuer?.name || 'Desconocido';

            const imgObverse = item.obverse_thumbnail || item.obverse_pic || item.image || '';
            const imgReverse = item.reverse_thumbnail || item.reverse_pic || '';
            
            let imagenesHtml = '';
            if (imgObverse) imagenesHtml += `<img src="${imgObverse}" class="img-obverse" alt="${title} - Anverso" title="Anverso">`;
            if (imgReverse) imagenesHtml += `<img src="${imgReverse}" class="img-reverse" alt="${title} - Reverso" title="Reverso">`;
            if (!imgObverse && !imgReverse) imagenesHtml = `<img src="https://via.placeholder.com/105?text=Sin+Imagen" alt="Sin Imagen">`;

            card.innerHTML = `
                <div class="coin-images">${imagenesHtml}</div>
                <div class="coin-info">
                    <h3 class="coin-title">[#${index + 1}] ${title}</h3>
                    <p class="coin-meta">
                        ID Numista: <strong>${id}</strong> | Emisor: <strong>${emisorNombre}</strong> | Años: <strong>${rangoAnios}</strong><br>
                        Categoría: <strong>${cat}</strong> | Subtipo: <strong>${subName}</strong>
                    </p>
                    <div style="margin-top: 10px;">
                        <button class="btn-add-collection" data-id="${id}" style="padding: 6px 12px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Añadir a la colección
                        </button>
                    </div>
                </div>
            `;
            resultsDiv.appendChild(card);
        });

        resultsDiv.querySelectorAll('.btn-add-collection').forEach(button => {
            button.addEventListener('click', async (e) => {
                const btn = e.target;
                const card = btn.closest('.item');
                const typeId = btn.getAttribute('data-id');

                const obverseImgElement = card.querySelector('.img-obverse');
                const reverseImgElement = card.querySelector('.img-reverse');
                const obverseUrlOriginal = obverseImgElement ? obverseImgElement.src : '';
                const reverseUrlOriginal = reverseImgElement ? reverseImgElement.src : '';

                if (!typeId || typeId === 'N/A') return;

                const textoOriginal = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Subiendo imágenes...';

                try {
                    const obverseUrlPropia = await subirImagenASupabase(obverseUrlOriginal, typeId, 'anverso');
                    const reverseUrlPropia = await subirImagenASupabase(reverseUrlOriginal, typeId, 'reverso');

                    btn.textContent = 'Guardando datos...';
                    const { error } = await supabaseClient.functions.invoke('add-item', {
                        body: { 
                            typeId: parseInt(typeId, 10),
                            obverseUrl: obverseUrlPropia,
                            reverseUrl: reverseUrlPropia
                        }
                    });

                    if (error) throw error;

                    btn.style.backgroundColor = '#155724';
                    btn.textContent = '¡Guardado!';
                    setTimeout(() => {
                        btn.textContent = textoOriginal;
                        btn.style.backgroundColor = '#28a745';
                        btn.disabled = false;
                    }, 3000);
                } catch (err) {
                    alert(`Error al guardar la pieza: ${err.message}`);
                    btn.textContent = 'Error';
                    btn.style.backgroundColor = '#dc3545';
                    setTimeout(() => {
                        btn.textContent = textoOriginal;
                        btn.style.backgroundColor = '#28a745';
                        btn.disabled = false;
                    }, 3000);
                }
            });
        });

    } catch (err) {
        if (loading) loading.classList.add('hidden');
        resultsDiv.innerHTML = `<p style="color: red; grid-column: 1 / -1; text-align: center;">Error: ${err.message}</p>`;
    }
}

function probarConsultaEmisor(e) {
    e.preventDefault();
    const issuerInput = document.getElementById('issuer-input');
    let issuer = document.getElementById('issuer').value;

    if (!issuer && issuerInput && issuerInput.value.trim() !== "") {
        const textoEscrito = issuerInput.value.trim().toLowerCase();
        const coincidencia = issuersGlobal.find(iss => (iss.name || '').toLowerCase() === textoEscrito);
        if (coincidencia) {
            issuer = coincidencia.code || coincidencia.id;
            document.getElementById('issuer').value = issuer;
        }
    }

    if (issuer) {
        ejecutarConsultaEmisor(issuer);
    } else {
        alert("Por favor, selecciona o escribe un país/emisor válido de la lista.");
    }
}
