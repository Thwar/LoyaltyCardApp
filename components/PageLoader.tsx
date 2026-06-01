// Centered spinner shown while a page's auth/data is loading.
export function PageLoader() {
  return (
    <div className="container center" style={{ paddingTop: 100 }}>
      <span className="spinner" role="status" aria-label="Cargando" />
    </div>
  );
}
