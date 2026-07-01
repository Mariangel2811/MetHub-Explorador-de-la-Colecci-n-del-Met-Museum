document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('view-container');
  const router = new Router(container);

  window.appRouter = router;

  router.register('home', renderHomeView);
  router.register('explore', renderExploreView);
  router.register('detail/:id', renderDetailView);
  router.register('departments', renderDepartmentsView);
  router.register('artist/:name', renderArtistView);
  router.register('compare', renderCompareView);
  router.register('puzzle', renderPuzzleView);

  router._resolve();
});