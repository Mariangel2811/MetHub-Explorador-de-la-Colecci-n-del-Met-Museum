function renderDetailView(container, params, signal) {
  const loadingWrap = document.createElement('div');
  loadingWrap.appendChild(ViewHelpers.buildLoading('Cargando obra...'));
  container.appendChild(loadingWrap);

  _load();

  async function _load() {
    try {
      const artwork = await MetAPI.getObject(params.id, { signal });
      if (signal.aborted) return;
      ViewHelpers.clearElement(container);
      _renderArtwork(container, artwork);
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) return;
      console.error('Vitrae: fallo al cargar el detalle de la obra:', err);
      ViewHelpers.clearElement(container);

      if (err.kind === 'NOT_FOUND') {
        const notFound = document.createElement('p');
        notFound.className = 'empty-message';
        notFound.textContent = 'La obra solicitada no existe.';
        container.appendChild(notFound);
        container.appendChild(_buildBackButton());
        return;
      }

      container.appendChild(
        ViewHelpers.buildError(`No se pudo cargar la obra (${err.message || 'error de red'}).`, () => {
          ViewHelpers.clearElement(container);
          const wrap = document.createElement('div');
          wrap.appendChild(ViewHelpers.buildLoading('Cargando obra...'));
          container.appendChild(wrap);
          _load();
        })
      );
    }
  }
}

function _renderArtwork(container, artwork) {
  const layout = document.createElement('div');
  layout.className = 'detail-layout';

  // --- Columna izquierda: imagen(es) ---
  const imageCol = document.createElement('div');
  imageCol.className = 'detail-image-col';

  const mainImageSrc = artwork.primaryImage || artwork.primaryImageSmall;
  if (mainImageSrc) {
    const mainFrame = document.createElement('div');
    mainFrame.className = 'detail-main-frame';
    const mainImg = document.createElement('img');
    mainImg.src = mainImageSrc;
    mainImg.alt = artwork.title || 'Obra sin título';
    mainFrame.appendChild(mainImg);
    imageCol.appendChild(mainFrame);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'detail-image-placeholder';
    placeholder.textContent = 'Sin imagen disponible';
    imageCol.appendChild(placeholder);
  }

  const additional = (artwork.additionalImages || []).slice(0, 8);
  if (additional.length > 0) {
    const stripe = document.createElement('div');
    stripe.className = 'detail-additional-images';
    additional.forEach((src) => {
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = `Imagen adicional de ${artwork.title || 'la obra'}`;
      thumb.loading = 'lazy';
      stripe.appendChild(thumb);
    });
    imageCol.appendChild(stripe);
  }

  layout.appendChild(imageCol);

  // --- Columna derecha: ficha técnica ---
  const infoCol = document.createElement('div');
  infoCol.className = 'detail-info-col';

  const titleEl = document.createElement('h1');
  titleEl.textContent = artwork.title || 'Sin título';
  infoCol.appendChild(titleEl);

  if (artwork.artistDisplayName) {
    const artistLink = document.createElement('a');
    artistLink.href = '#';
    artistLink.className = 'detail-artist-link';
    artistLink.textContent = artwork.artistDisplayName;
    artistLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.appRouter.navigate(`artist/${encodeURIComponent(artwork.artistDisplayName)}`);
    });
    infoCol.appendChild(artistLink);
  } else {
    const unknownArtist = document.createElement('p');
    unknownArtist.className = 'detail-artist-link detail-artist-unknown';
    unknownArtist.textContent = 'Artista desconocido';
    infoCol.appendChild(unknownArtist);
  }

  if (artwork.artistDisplayBio) {
    const bio = document.createElement('p');
    bio.className = 'detail-artist-bio';
    bio.textContent = artwork.artistDisplayBio;
    infoCol.appendChild(bio);
  }

  const fields = [
    ['Fecha', artwork.objectDate],
    ['Técnica', artwork.medium],
    ['Dimensiones', artwork.dimensions],
    ['Departamento', artwork.department],
    ['Cultura', artwork.culture],
    ['Período', artwork.period],
    ['Clasificación', artwork.classification],
    ['Adquisición', artwork.creditLine],
  ];

  const table = document.createElement('dl');
  table.className = 'detail-fields';
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value && String(value).trim() ? value : '—';
    table.append(dt, dd);
  });
  infoCol.appendChild(table);

  const tags = (artwork.tags || []).slice(0, 12);
  if (tags.length > 0) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'detail-tags';
    tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'detail-tag-chip';
      chip.textContent = tag.term;
      tagsWrap.appendChild(chip);
    });
    infoCol.appendChild(tagsWrap);
  }

  if (artwork.objectURL) {
    const externalLink = document.createElement('a');
    externalLink.href = artwork.objectURL;
    externalLink.target = '_blank';
    externalLink.rel = 'noopener noreferrer';
    externalLink.className = 'detail-external-link';
    externalLink.textContent = 'Ver en el sitio del museo →';
    infoCol.appendChild(externalLink);
  }

  // --- Acciones ---
  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  actions.appendChild(_buildBackButton());

  if (artwork.artistDisplayName) {
    const artistBtn = document.createElement('button');
    artistBtn.type = 'button';
    artistBtn.className = 'btn';
    artistBtn.textContent = 'Ver más obras del artista';
    artistBtn.addEventListener('click', () => {
      window.appRouter.navigate(`artist/${encodeURIComponent(artwork.artistDisplayName)}`);
    });
    actions.appendChild(artistBtn);
  }

  const compareBtn = document.createElement('button');
  compareBtn.type = 'button';
  compareBtn.className = 'btn btn-secondary';
  compareBtn.textContent = 'Comparar';
  compareBtn.addEventListener('click', () => {
    window.appRouter.navigate(`compare?presetId=${artwork.objectID}`);
  });
  actions.appendChild(compareBtn);

  infoCol.appendChild(actions);
  layout.appendChild(infoCol);

  container.appendChild(layout);
}

function _buildBackButton() {
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn btn-secondary detail-back-btn';
  backBtn.textContent = '← Volver';
  backBtn.addEventListener('click', () => {
    // history.back() conserva el scroll/estado de la vista anterior
    // (filtros de #explore, página del artista, etc.) mejor que
    // navegar directo a una ruta fija.
    window.history.back();
  });
  return backBtn;
}
