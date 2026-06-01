// Friendly Spanish messages for the common Firebase Auth error codes.
export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo. Inicia sesión.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    default:
      return "Ocurrió un error. Inténtalo de nuevo.";
  }
}
