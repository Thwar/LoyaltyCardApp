import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import { Button, InputField, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService, StampActivityService } from "../../services/api";
import { BusinessStackParamList } from "../../types";

interface AddStampScreenProps {
  navigation: StackNavigationProp<BusinessStackParamList, "AddStamp">;
  route: RouteProp<BusinessStackParamList, "AddStamp">;
}

export const AddStampScreen: React.FC<AddStampScreenProps> = ({ navigation, route }) => {
  const { loyaltyCardId } = route.params;
  const { showAlert } = useAlert();
  const [cardCode, setCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleAddStamp = async () => {
    if (!cardCode.trim()) {
      setError("Por favor ingrese el código de la tarjeta");
      return;
    }

    // Validate card code is numeric and 3 digits
    if (!/^\d{3}$/.test(cardCode.trim())) {
      setError("El código debe ser de 3 dígitos numéricos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await CustomerCardService.addStampByCardCode(cardCode.trim(), loyaltyCardId);

      showAlert({
        title: "¡Sello Agregado!",
        message: "El sello del cliente ha sido agregado exitosamente.",
        buttons: [
          {
            text: "Agregar Otro",
            onPress: () => setCardCode(""),
          },
          {
            text: "Listo",
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (err) {
      console.log("Error adding stamp:", err);
      let errorMessage = "Error al agregar sello";

      if (err instanceof Error) {
        if (err.message.includes("not found") || err.message.includes("no encontrada")) {
          errorMessage = "Código de tarjeta inválido o no pertenece a este programa de fidelidad";
        } else if (err.message.includes("permission") || err.message.includes("permisos")) {
          errorMessage = "No tienes permisos para agregar sellos a esta tarjeta";
        } else if (err.message.includes("network") || err.message.includes("connection")) {
          errorMessage = "Error de conexión. Verifica tu conexión a internet e intenta nuevamente";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      showAlert({
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Agregar Sello</Text>
          <Text style={styles.subtitle}>Agrega un sello a la tarjeta de lealtad de un cliente</Text>
        </View>
        <View style={styles.form}>
          <InputField
            label="Código de Tarjeta"
            value={cardCode}
            onChangeText={setCardCode}
            placeholder="Ingrese el código de 3 dígitos"
            keyboardType="numeric"
            maxLength={3}
            leftIcon="card"
            error={error}
          />
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instrucciones:</Text>
            <Text style={styles.instructionsText}>
              1. Solicita al cliente su código de tarjeta de 3 dígitos{"\n"}
              2. Ingrésalo arriba y presiona "Agregar Sello"{"\n"}
              3. El cliente verá el nuevo sello en su tarjeta
            </Text>
          </View>
          <Button title="Agregar Sello" onPress={handleAddStamp} loading={loading} size="large" style={styles.addButton} />
        </View>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Acciones Rápidas</Text>
          <Button
            title="Escanear Código QR"
            onPress={() => {
              // TODO: Implement QR code scanning
              showAlert({
                title: "Próximamente",
                message: "El escaneo de códigos QR estará disponible en una futura actualización",
              });
            }}
            variant="outline"
            size="large"
            style={styles.quickActionButton}
          />
          <Button title="Ver Clientes Recientes" onPress={() => navigation.navigate("BusinessTabs")} variant="outline" size="large" style={styles.quickActionButton} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  instructionsContainer: {
    backgroundColor: COLORS.lightGray,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    marginTop: SPACING.md,
  },
  quickActions: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  quickActionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  quickActionButton: {
    marginBottom: SPACING.md,
  },
});
