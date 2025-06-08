import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { testFirebaseConnection, debugAuthState } from "../utils/firebaseDebug";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

export const FirebaseTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Debug auth state on component mount
    const unsubscribe = debugAuthState();
    return unsubscribe;
  }, []);

  const runTest = async () => {
    setLoading(true);
    try {
      const result = await testFirebaseConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        error,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prueba de Conexión Firebase</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Usuario Actual:</Text>
        <Text style={styles.value}>{user ? user.email : "No ha iniciado sesión"}</Text>
      </View>
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={runTest} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Probando..." : "Probar Conexión Firebase"}</Text>
      </TouchableOpacity>
      {testResult && (
        <View style={[styles.result, testResult.success ? styles.success : styles.error]}>
          <Text style={styles.resultTitle}>{testResult.success ? "✅ Éxito" : "❌ Error"}</Text>
          <Text style={styles.resultMessage}>{testResult.message}</Text>
          {testResult.error && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorText}>{JSON.stringify(testResult.error, null, 2)}</Text>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    borderRadius: 8,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    marginBottom: SPACING.md,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  result: {
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  success: {
    backgroundColor: "#d4edda",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  error: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  resultMessage: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  errorDetails: {
    maxHeight: 200,
    backgroundColor: "#f8f9fa",
    padding: SPACING.sm,
    borderRadius: 4,
  },
  errorText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: "monospace",
    color: COLORS.textSecondary,
  },
});
