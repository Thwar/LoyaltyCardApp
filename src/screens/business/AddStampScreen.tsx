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
      setError("Please enter customer email");
      return;
    }
    setLoading(true);
    try {
      // For now, we'll simulate adding a stamp
      // In a real app, you'd look up the customer by email first
      showAlert({
        title: "Stamp Added!",
        message: "Customer stamp has been added successfully.",
        buttons: [
          {
            text: "Add Another",
            onPress: () => setCustomerEmail(""),
          },
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to add stamp",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Stamp</Text>
          <Text style={styles.subtitle}>Add a stamp to a customer's loyalty card</Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Customer Email"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="Enter customer's email address"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
            error={error}
          />

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Ask the customer for their email address{"\n"}
              2. Enter it above and tap "Add Stamp"{"\n"}
              3. The customer will see the new stamp on their card
            </Text>
          </View>

          <Button title="Add Stamp" onPress={handleAddStamp} loading={loading} size="large" style={styles.addButton} />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>{" "}
          <Button
            title="Scan QR Code"
            onPress={() => {
              // TODO: Implement QR code scanning
              showAlert({
                title: "Coming Soon",
                message: "QR code scanning will be available in a future update",
              });
            }}
            variant="outline"
            size="large"
            style={styles.quickActionButton}
          />
          <Button title="View Recent Customers" onPress={() => navigation.navigate("BusinessTabs", { screen: "Customers" })} variant="outline" size="large" style={styles.quickActionButton} />
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
