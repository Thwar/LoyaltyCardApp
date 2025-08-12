import { Timestamp } from "firebase/firestore";

// Utility function to safely convert Firestore timestamps to Date objects
export const safeTimestampToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  } else if (timestamp instanceof Date) {
    return timestamp;
  } else {
    // If timestamp is not available yet (e.g., serverTimestamp), use current time
    return new Date();
  }
};

// Enhanced error handling for Firestore operations
export const handleFirestoreError = (error: any, operation: string) => {
  console.error(`Firestore ${operation} error:`, error);

  if (error?.code) {
    switch (error.code) {
      case "permission-denied":
        throw new Error("Permiso denegado. Por favor verifica las reglas de seguridad de Firestore.");
      case "unauthenticated":
        throw new Error("Autenticación requerida. Por favor inicia sesión e intenta de nuevo.");
      case "not-found":
        throw new Error("Documento no encontrado. Puede haber sido eliminado.");
      case "unavailable":
        throw new Error("El servicio Firestore no está disponible temporalmente. Por favor intenta de nuevo.");
      case "resource-exhausted":
        throw new Error("Límite de cuota excedido. Por favor intenta de nuevo más tarde.");
      case "deadline-exceeded":
        throw new Error("La operación tardó demasiado tiempo. Por favor intenta de nuevo.");
      case "cancelled":
        console.warn("Firestore operation was cancelled (likely due to connection issues)");
        return;
      case "failed-precondition":
        throw new Error("Operación no válida en el estado actual. Por favor actualiza la página.");
      default:
        throw new Error(`Error de Firestore (${error.code}): ${error.message}`);
    }
  }

  throw new Error(error?.message || `Error al realizar ${operation}`);
};

// Re-export Timestamp for convenience in some services (optional)
export { Timestamp };
