const ViewHelpers = (() => {
  function buildLoading(message) {
    const el = document.createElement('loading-state');
    el.setAttribute('message', message);
    return el;
  }

  function buildError(message, onRetry) {
    const el = document.createElement('error-state');
    el.setAttribute('message', message);
    el.onRetry(onRetry);
    return el;
  }

  function readHashQueryParam(name) {
    const [, queryString] = window.location.hash.split('?');
    if (!queryString) return null;
    return new URLSearchParams(queryString).get(name);
  }

  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  return { buildLoading, buildError, readHashQueryParam, clearElement };
})();
