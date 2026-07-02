/**
 * view-departments.js
 * -------------------
 * Vista #departments — sección 4.4 del documento de requerimientos.
 */

// Pequeño set de motivos decorativos rotando por índice, para que las
// 19 tarjetas no se vean todas idénticas. Es decoración (4.4.1: "icono
// temático... a discreción de la pareja"), no información funcional.
const DEPARTMENT_MOTIFS = ['◆', '⚜', '✦', '☙', '⚚', '❖'];

function renderDepartmentsView(container, params, signal) {
  const title = document.createElement('h1');
  title.textContent = 'Departamentos';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'departments-subtitle';
  subtitle.textContent = 'Las áreas curatoriales del museo. Elegí una para explorar sus obras.';
  container.appendChild(subtitle);

  const grid = document.createElement('div');
  grid.className = 'departments-grid';

  // Tarjeta especial: no es un departamento real del museo (no viene
  // de /departments), es una funcionalidad extra que arma un
  // rompecabezas con la obra que el usuario elija. Va primero y con
  // estilo distintivo para que quede claro que es "otra cosa".
  grid.appendChild(_buildPuzzleCard());

  const departmentsList = document.createElement('div');
  departmentsList.className = 'departments-loading-wrap';
  departmentsList.appendChild(ViewHelpers.buildLoading('Cargando departamentos...'));
  grid.appendChild(departmentsList);

  container.appendChild(grid);

  _load();

  async function _load() {
    try {
      const data = await MetAPI.getDepartments({ signal });
      if (signal.aborted) return;

      departmentsList.remove();

      data.departments.forEach((dept, index) => {
        grid.appendChild(_buildDepartmentCard(dept, index));
      });
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) return;
      console.error('Vitrae: fallo al cargar departamentos:', err);
      ViewHelpers.clearElement(departmentsList);
      departmentsList.appendChild(
        ViewHelpers.buildError(`No se pudieron cargar los departamentos (${err.message || 'error de red'}).`, _load)
      );
    }
  }
}

function _buildPuzzleCard() {
  const card = document.createElement('article');
  card.className = 'department-card department-card--special';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  const motif = document.createElement('span');
  motif.className = 'department-motif';
  motif.textContent = '▦';
  motif.setAttribute('aria-hidden', 'true');
  card.appendChild(motif);

  const name = document.createElement('h2');
  name.textContent = 'Rompecabezas';
  card.appendChild(name);

  const badge = document.createElement('span');
  badge.className = 'department-card-badge';
  badge.textContent = 'Modo interactivo';
  card.appendChild(badge);

  const goToPuzzle = () => window.appRouter.navigate('puzzle');
  card.addEventListener('click', goToPuzzle);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToPuzzle();
    }
  });

  return card;
}

function _buildDepartmentCard(dept, index) {
  const card = document.createElement('article');
  card.className = 'department-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  const motif = document.createElement('span');
  motif.className = 'department-motif';
  motif.textContent = DEPARTMENT_MOTIFS[index % DEPARTMENT_MOTIFS.length];
  motif.setAttribute('aria-hidden', 'true');
  card.appendChild(motif);

  const name = document.createElement('h2');
  name.textContent = dept.displayName;
  card.appendChild(name);

  const goToExplore = () => {
    window.appRouter.navigate(`explore?departmentId=${dept.departmentId}`);
  };
  card.addEventListener('click', goToExplore);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToExplore();
    }
  });

  return card;
}
