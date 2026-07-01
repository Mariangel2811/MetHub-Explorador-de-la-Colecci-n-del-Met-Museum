class Router {
  constructor(container) {
    this.container = container;
    this.routes = [];       // { pattern, paramNames, render, name }
    this.notFoundRoute = null;
    this.currentAbortController = null; // ver nota en renderView()

    // 'hashchange' cubre navegación por links y por Atrás/Adelante.
    // 'load' cubre el primer render cuando se abre la app (con o sin hash).
    window.addEventListener('hashchange', () => this._resolve());
    window.addEventListener('load', () => this._resolve());
  }

  /**
   * Registra una ruta.
   * @param {string} path - ej: 'home', 'detail/:id', 'artist/:name'
   * @param {(container: HTMLElement, params: Object) => void} renderFn
   */
  register(path, renderFn) {
    const paramNames = [];
    const segments = path.split('/').filter(Boolean);

    const regexParts = segments.map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      // Escapamos por si el segmento tuviera caracteres especiales de regex
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });

    const pattern = new RegExp(`^${regexParts.join('/')}$`);
    this.routes.push({ pattern, paramNames, render: renderFn, name: path });
  }

  /** Define qué renderizar si ningún patrón matchea (ruta desconocida). */
  registerNotFound(renderFn) {
    this.notFoundRoute = renderFn;
  }

  /** Navegación programática, ej: router.navigate('detail/12345') */
  navigate(path) {
    // Si ya estamos en ese hash, forzamos la resolución igual
    // (útil para "Ver más obras del artista" -> "#artist/x" -> "#artist/y")
    if (window.location.hash === `#${path}`) {
      this._resolve();
    } else {
      window.location.hash = path;
    }
  }

  /**
   * Lee el hash actual, busca la ruta que matchea y renderiza.
   * Importante: separamos el querystring opcional (ej. '#explore?departmentId=11')
   * antes de matchear el patrón, porque los patrones registrados solo
   * describen el "path" (ej. 'explore'), no la query. Las vistas que
   * necesiten leer esos parámetros lo hacen ellas mismas con
   * window.location.hash.split('?')[1] (ver TODOs en las vistas).
   */
  _resolve() {
    const rawHash = window.location.hash.replace(/^#/, '');
    const [pathOnly] = rawHash.split('?');
    const hash = pathOnly || 'home';

    for (const route of this.routes) {
      const match = hash.match(route.pattern);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        this._renderView(route, params);
        return;
      }
    }

    // Ninguna ruta matcheó
    if (this.notFoundRoute) {
      this._renderView({ name: 'not-found', render: this.notFoundRoute }, {});
    } else {
      // Fallback razonable: volver a home
      window.location.hash = 'home';
    }
  }

  _renderView(route, params) {
    // Si la vista anterior había disparado un fetch en curso, lo cancelamos
    // para que una respuesta tardía no "pise" la vista nueva.
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    // Limpieza del contenedor sin innerHTML (RNF-07)
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    route.render(this.container, params, this.currentAbortController.signal);

    this._updateActiveNav(route.name);
    window.scrollTo(0, 0);
  }

  _updateActiveNav(routeName) {
    const nav = document.querySelector('nav-bar');
    if (nav && typeof nav.setActive === 'function') {
      nav.setActive(routeName);
    }
  }
}
