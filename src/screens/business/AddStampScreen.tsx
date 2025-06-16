import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

import { Button, InputField, useAlert, StampConfirmationModal } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService, StampActivityService } from "../../services/api";
import { BusinessStackParamList, CustomerCard } from "../../types";

interface AddStampScreenProps {
  navigation: StackNavigationProp<BusinessStackParamList, "AddStamp">;
  route: RouteProp<BusinessStackParamList, "AddStamp">;
}

export const AddStampScreen: React.FC<AddStampScreenProps> = ({ navigation, route }) => {
  const { loyaltyCardId, businessId } = route.params;
  const { showAlert, hideAlert } = useAlert();
  const [cardCode, setCardCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerCard, setCustomerCard] = useState<CustomerCard | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [addingStamp, setAddingStamp] = useState(false);

  console.log("AddStampScreen: loyaltyCardId =", loyaltyCardId, "businessId =", businessId);
  const handleFindCustomerCard = async () => {
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
      // Find customer card by card code and business ID
      const foundCustomerCard = await CustomerCardService.getUnclaimedCustomerCardByCodeAndBusiness(cardCode.trim(), businessId);

      if (!foundCustomerCard) {
        setError("Código de tarjeta inválido o no pertenece a este negocio");
        showAlert({
          title: "Tarjeta no encontrada",
          message: "Código de tarjeta inválido o no pertenece a este negocio. Verifica el código e intenta nuevamente.",
        });
        return;
      }

      // Show confirmation modal with customer card details
      setCustomerCard(foundCustomerCard);
      setShowConfirmationModal(true);
    } catch (err) {
      console.log("Error finding customer card:", err);
      let errorMessage = "Error al buscar la tarjeta";
      if (err instanceof Error) {
        if (err.message.includes("not found") || err.message.includes("no encontrada")) {
          errorMessage = "Código de tarjeta inválido o no pertenece a este negocio";
        } else if (err.message.includes("permission") || err.message.includes("permisos")) {
          errorMessage = "No tienes permisos para acceder a esta tarjeta";
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
  const handleConfirmAddStamp = async () => {
    if (!customerCard) return;

    setAddingStamp(true);
    try {
      const isCardComplete = customerCard.loyaltyCard && customerCard.currentStamps + 1 >= customerCard.loyaltyCard.totalSlots;

      if (isCardComplete) {
        // Claim reward (which will add final stamp if needed and mark as claimed)
        await CustomerCardService.claimRewardByCardCodeAndBusiness(cardCode.trim(), businessId);

        setShowConfirmationModal(false);
        setCustomerCard(null);

        showAlert({
          title: "¡Recompensa Canjeada!",
          message: `Recompensa canjeada exitosamente para ${customerCard.customerName || "el cliente"}. La tarjeta está completa.`,
          buttons: [
            {
              text: "Ok",
              onPress: () => setCardCode(""),
            },
          ],
        });
      } else {
        // Add regular stamp
        await CustomerCardService.addStampByCardCodeAndBusiness(cardCode.trim(), businessId);

        setShowConfirmationModal(false);
        setCustomerCard(null);

        showAlert({
          title: "¡Sello Agregado!",
          message: `Sello agregado exitosamente a la tarjeta de ${customerCard.customerName || "el cliente"}.`,
          buttons: [
            {
              text: "Ok",
              onPress: () => setCardCode(""),
            },
          ],
        });
      }
    } catch (err) {
      console.log("Error adding stamp or claiming reward:", err);
      let errorMessage = "Error al procesar la tarjeta";
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      showAlert({
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setAddingStamp(false);
    }
  };

  const handleCloseModal = () => {
    setShowConfirmationModal(false);
    setCustomerCard(null);
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
              2. Ingrésalo arriba y presiona "Buscar Tarjeta"{"\n"}
              3. Confirma los detalles del cliente y agrega el sello
            </Text>
          </View>
          <Button title="Buscar Tarjeta" onPress={handleFindCustomerCard} loading={loading} size="large" style={styles.addButton} />
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

      <StampConfirmationModal customerCard={customerCard} isVisible={showConfirmationModal} loading={addingStamp} onClose={handleCloseModal} onConfirmStamp={handleConfirmAddStamp} />
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
