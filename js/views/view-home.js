function renderHomeView(container, params, signal) {
  // --- Estructura estática de la vista ---
  const hero = document.createElement('section');
  hero.className = 'hero';

  const title = document.createElement('h1');
  title.textContent = 'Explorá la colección del Met';
  hero.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent =
    'Más de 470.000 obras del Metropolitan Museum of Art, a un clic de distancia.';
  hero.appendChild(subtitle);

  container.appendChild(hero);

  // --- Sección de estadísticas (se completa async más abajo) ---
  const statsSection = document.createElement('section');
  statsSection.className = 'stats-section';
  statsSection.appendChild(ViewHelpers.buildLoading('Cargando estadísticas...'));
  container.appendChild(statsSection);

  // --- Sección de galería destacada (se completa async más abajo) ---
  const gallerySection = document.createElement('section');
  gallerySection.className = 'gallery-section';

  const galleryTitle = document.createElement('h2');
  galleryTitle.textContent = 'Obras destacadas';
  gallerySection.appendChild(galleryTitle);

  const galleryBody = document.createElement('div');
  galleryBody.className = 'gallery-grid';
  galleryBody.appendChild(ViewHelpers.buildLoading('Cargando obras destacadas...'));
  gallerySection.appendChild(galleryBody);

  container.appendChild(gallerySection);

  // --- Carga de datos ---
  _loadStats(statsSection, signal);
  _loadFeaturedGallery(galleryBody, signal);
}

async function _loadStats(sectionEl, signal) {
  // Promise.allSettled en vez de Promise.all: si un endpoint falla,
  // igual mostramos la estadística que sí llegó, en vez de perder
  // ambas por un solo fallo.
  const [departmentsResult, highlightsResult] = await Promise.allSettled([
    MetAPI.getDepartments({ signal }),
    MetAPI.search({ isHighlight: true, hasImages: true }, { signal }),
  ]);

  if (signal.aborted) return; // el usuario ya navegó a otra vista

  const failures = [departmentsResult, highlightsResult].filter(
    (r) => r.status === 'rejected'
  );

  failures.forEach((f) => console.error('Vitrae: fallo al cargar estadísticas:', f.reason));

  while (sectionEl.firstChild) sectionEl.removeChild(sectionEl.firstChild);

  if (failures.length === 2) {
    sectionEl.appendChild(
      ViewHelpers.buildError(
        `No se pudieron cargar las estadísticas (${departmentsResult.reason?.message || 'error de red'}).`,
        () => _loadStats(sectionEl, signal)
      )
    );
    return;
  }

  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  if (departmentsResult.status === 'fulfilled') {
    statsGrid.appendChild(
      _buildStatCard(departmentsResult.value.departments.length, 'Departamentos')
    );
  }
  if (highlightsResult.status === 'fulfilled') {
    statsGrid.appendChild(
      _buildStatCard(highlightsResult.value.total ?? 0, 'Obras destacadas con imagen')
    );
  }

  sectionEl.appendChild(statsGrid);
}

function _buildStatCard(value, label) {
  const card = document.createElement('div');
  card.className = 'stat-card';

  const valueEl = document.createElement('span');
  valueEl.className = 'stat-value';
  valueEl.textContent = value.toLocaleString('es-AR');
  card.appendChild(valueEl);

  const labelEl = document.createElement('span');
  labelEl.className = 'stat-label';
  labelEl.textContent = label;
  card.appendChild(labelEl);

  return card;
}

async function _loadFeaturedGallery(gridEl, signal) {
  try {
    const searchResult = await MetAPI.search(
      { q: 'painting', isHighlight: true, hasImages: true },
      { signal }
    );

    const ids = (searchResult.objectIDs || []).slice(0, 10);

    if (ids.length === 0) {
      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      gridEl.appendChild(ViewHelpers.buildError(
        'No se encontraron obras destacadas en este momento.',
        () => _loadFeaturedGallery(gridEl, signal)
      ));
      return;
    }

    // RNF-04: resolución en paralelo obligatoria con Promise.allSettled
    const { artworks, failedCount } = await MetAPI.resolveObjects(ids, { signal });

    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);

    if (artworks.length === 0) {
      gridEl.appendChild(ViewHelpers.buildError(
        'No se pudo cargar ninguna obra destacada.',
        () => _loadFeaturedGallery(gridEl, signal)
      ));
      return;
    }

    artworks.forEach((artwork) => {
      const card = document.createElement('artwork-card');
      card.setData(artwork);
      gridEl.appendChild(card);
    });

    if (failedCount > 0) {
      const note = document.createElement('p');
      note.className = 'gallery-partial-note';
      note.textContent = `${failedCount} obra(s) no pudieron cargarse y fueron omitidas.`;
      gridEl.parentElement.appendChild(note);
    }
  } catch (err) {
    if (err.name === 'AbortError' || signal.aborted) return;

    console.error('Vitrae: fallo al cargar obras destacadas:', err);

    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
    gridEl.appendChild(
      ViewHelpers.buildError(
        `No se pudieron cargar las obras destacadas (${err.message || 'error de red'}).`,
        () => _loadFeaturedGallery(gridEl, signal)
      )
    );
  }
}
