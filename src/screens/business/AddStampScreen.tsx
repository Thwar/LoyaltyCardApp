import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import { Button, InputField, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";

interface AddStampScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any, any>;
}

export const AddStampScreen: React.FC<AddStampScreenProps> = ({ navigation, route }) => {
  const customerCard = route.params?.customerCard;
  const { showAlert } = useAlert();
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleAddStamp = async () => {
    if (!customerEmail.trim()) {
      setError("Por favor ingrese el email del cliente");
      return;
    }
    setLoading(true);
    try {
      // For now, we'll simulate adding a stamp
      // In a real app, you'd look up the customer by email first
      showAlert({
        title: "¡Sello Agregado!",
        message: "El sello del cliente ha sido agregado exitosamente.",
        buttons: [
          {
            text: "Agregar Otro",
            onPress: () => setCustomerEmail(""),
          },
          {
            text: "Listo",
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Error al agregar sello",
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
            label="Email del Cliente"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="Ingrese el email del cliente"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
            error={error}
          />
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instrucciones:</Text>
            <Text style={styles.instructionsText}>
              1. Solicita al cliente su dirección de email{"\n"}
              2. Ingrésala arriba y presiona "Agregar Sello"{"\n"}
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
          <Button title="Ver Clientes Recientes" onPress={() => navigation.navigate("BusinessTabs", { screen: "Customers" })} variant="outline" size="large" style={styles.quickActionButton} />
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
