import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { Button, InputField, useAlert, StampConfirmationModal, LoadingState } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService, BusinessService } from "../../services/api";
import { BusinessTabParamList, CustomerCard, Business } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { refreshFlags } from "../../utils";

interface AddStampScreenProps {
  navigation: BottomTabNavigationProp<BusinessTabParamList, "Sellar">;
}

export const AddStampScreen: React.FC<AddStampScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const { showAlert, hideAlert } = useAlert();
  const [cardCode, setCardCode] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerCard, setCustomerCard] = useState<CustomerCard | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [addingStamp, setAddingStamp] = useState(false);

  useEffect(() => {
    loadBusinessData();
  }, [user]);

  const loadBusinessData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Load business info
      const businesses = await BusinessService.getBusinessesByOwner(user.id);
      const userBusiness = businesses[0];
      setBusiness(userBusiness);
    } catch (err) {
      console.error("Error loading business data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: No se pudo obtener la información del negocio</Text>
        </View>
      </SafeAreaView>
    );
  }

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

    setSearchLoading(true);
    setError("");
    try {
      // Find customer card by card code and business ID
      const foundCustomerCard = await CustomerCardService.getUnclaimedCustomerCardByCodeAndBusiness(cardCode.trim(), business.id);

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
      setSearchLoading(false);
    }
  };
  const handleConfirmAddStamp = async (count: number = 1) => {
    if (!customerCard) return;

    setAddingStamp(true);
    try {
      const toAdd = Math.max(1, Math.floor(count));
      const nextCount = (customerCard.currentStamps || 0) + toAdd;
      const willCompleteCard = customerCard.loyaltyCard && nextCount >= customerCard.loyaltyCard.totalSlots;

      // Always just add a stamp - never auto-claim rewards
      await CustomerCardService.addStampByCardCodeAndBusiness(cardCode.trim(), business.id, toAdd);

      // Set refresh flag for business dashboard to update stats
      await refreshFlags.setBusinessDashboardRefresh();

      setShowConfirmationModal(false);
      setCustomerCard(null);

      if (willCompleteCard) {
        showAlert({
          title: "🎉 ¡Tarjeta Completada!",
          message: `¡Tarjeta completada exitosamente para ${
            customerCard.customerName || "el cliente"
          }! Se ha enviado una notificación al cliente informándole que puede canjear su recompensa en la próxima visita.`,
          buttons: [
            {
              text: "Ok",
              onPress: () => setCardCode(""),
            },
          ],
        });
      } else {
        const stampsNeeded = customerCard.loyaltyCard ? customerCard.loyaltyCard.totalSlots - nextCount : 0;
        showAlert({
          title: toAdd > 1 ? "✅ ¡Sellos Agregados!" : "✅ ¡Sello Agregado!",
          message: `${toAdd > 1 ? `${toAdd} sellos agregados` : "Sello agregado"} exitosamente a la tarjeta de ${
            customerCard.customerName || "el cliente"
          }. Se ha enviado una notificación al cliente informándole que ${stampsNeeded === 1 ? "le falta" : "le faltan"} ${stampsNeeded} sello${
            stampsNeeded === 1 ? "" : "s"
          } para completar su tarjeta.`,
          buttons: [
            {
              text: "Ok",
              onPress: () => setCardCode(""),
            },
          ],
        });
      }
    } catch (err) {
      console.log("Error adding stamp:", err);
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

  const handleRedeemReward = async () => {
    if (!customerCard) return;

    setAddingStamp(true);
    try {
      // Call the redeem reward API
      await CustomerCardService.claimRewardByCardCodeAndBusiness(cardCode.trim(), business.id);

      // Set refresh flag for business dashboard to update stats
      await refreshFlags.setBusinessDashboardRefresh();

      setShowConfirmationModal(false);
      setCustomerCard(null);

      showAlert({
        title: "🎁 ¡Recompensa Canjeada!",
        message: `Recompensa canjeada exitosamente para ${
          customerCard.customerName || "el cliente"
        }. Se ha enviado una notificación al cliente confirmando el canje de su recompensa. ¡Gracias por su lealtad!`,
        buttons: [
          {
            text: "Ok",
            onPress: () => setCardCode(""),
          },
        ],
      });
    } catch (err) {
      console.log("Error redeeming reward:", err);
      let errorMessage = "Error al canjear la recompensa";
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Agrega sellos o canjea recompensas de las tarjetas de lealtad</Text>
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
              3. Confirma los detalles y agrega sello o canjea recompensa según corresponda
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <Button title="Buscar Tarjeta" onPress={handleFindCustomerCard} loading={searchLoading} size="large" style={styles.findButton} />
            <Button
              title="Escanear QR"
              onPress={() => {
                // TODO: Implement QR code scanning
                showAlert({
                  title: "Próximamente",
                  message: "El escaneo de códigos QR estará disponible en una futura actualización",
                });
              }}
              variant="outline"
              size="large"
              style={styles.scanButton}
            />
          </View>
        </View>
      </ScrollView>

      <StampConfirmationModal
        customerCard={customerCard}
        isVisible={showConfirmationModal}
        loading={addingStamp}
        onClose={handleCloseModal}
        onConfirmStamp={handleConfirmAddStamp}
        onRedeemReward={handleRedeemReward}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
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
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  findButton: {
    flex: 1,
  },
  scanButton: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    textAlign: "center",
  },
});
