// Campo de formulario con etiqueta y mensaje de error
function Campo({ label, error, children }) {
  return (
    <label className={`campo ${error ? "campo-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small className="mensaje-error">{error}</small>}
    </label>
  );
}

export default Campo;
