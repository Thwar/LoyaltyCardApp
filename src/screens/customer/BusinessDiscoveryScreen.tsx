import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, FlatList, Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import { LoadingState, BusinessDiscoveryCard, LoyaltyProgramListModal, BusinessDiscoverySuccessModal, BusinessDiscoveryEmptyState } from "../../components";
import { COLORS } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { Business, LoyaltyCard, CustomerCard } from "../../types";
import { refreshFlags } from "../../utils";
import { useBusinessDiscovery, BusinessWithCards } from "../../hooks/useBusinessDiscovery";
import { styles } from "./BusinessDiscoveryScreen.styles";

interface BusinessDiscoveryScreenProps {
  navigation: StackNavigationProp<any>;
  route?: RouteProp<any>;
}

export const BusinessDiscoveryScreen: React.FC<BusinessDiscoveryScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const {
    businesses,
    loading,
    refreshing,
    loadingMore,
    loadBusinessesWithCards,
    updateBusinessAfterJoining,
    onRefresh,
    loadMoreBusinesses,
  } = useBusinessDiscovery();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithCards | null>(null);
  const [joiningCard, setJoiningCard] = useState<string | null>(null);
  const [newCardCode, setNewCardCode] = useState<string>("");
  const [successModalKey, setSuccessModalKey] = useState<number>(0); 
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Function to clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach((timeout: NodeJS.Timeout) => clearTimeout(timeout));
    timeoutRefs.current = [];
  }, []);

  // Reset modal state
  const resetModalState = useCallback(() => {
    setModalVisible(false);
    setNewCardCode("");
    setJoiningCard(null);
    setSuccessModalKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (user) {
      loadBusinessesWithCards(true);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      const shouldRefresh = route?.params?.refresh || route?.params?.timestamp;
      
      const checkRefreshFlag = async () => {
        const shouldRefreshFromFlag = await refreshFlags.shouldRefreshBusinessDiscovery();
        if (shouldRefreshFromFlag) {
          await refreshFlags.clearBusinessDiscoveryRefresh();
          const timeout = setTimeout(async () => {
            await loadBusinessesWithCards(true, 0);
          }, 100);
          timeoutRefs.current.push(timeout);
        }
      };
      
      checkRefreshFlag();

      if (shouldRefresh) {
        const timeout = setTimeout(() => {
          resetModalState();
        }, 100);
        timeoutRefs.current.push(timeout);
      }
    }, [resetModalState, route?.params, loadBusinessesWithCards])
  );

  const handleJoinLoyaltyProgram = async (loyaltyCard: LoyaltyCard) => {
    if (!user) return;

    try {
      const newCustomerCard = await CustomerCardService.joinLoyaltyProgram(user.id, loyaltyCard.id);
      await refreshFlags.setRefreshForAllScreens();
      
      setJoiningCard(null);
      setNewCardCode(newCustomerCard.cardCode);
      setModalVisible(true);
      
      updateBusinessAfterJoining(loyaltyCard, newCustomerCard);
    } catch (error) {
      console.error("❌ Error joining loyalty program:", error);
      setJoiningCard(null); 
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to join loyalty program");
    }
  };

  const handleViewCard = (customerCard: CustomerCard) => {
    navigation.navigate("CustomerCardDetails", {
      customerCard: customerCard,
    });
  };

  const handleBusinessPress = async (business: BusinessWithCards) => {
    setSelectedBusiness(business);
  };

  const handleJoinLoyaltyProgramFromModal = useCallback(
    (loyaltyCard: LoyaltyCard) => {
      setJoiningCard(loyaltyCard.id);
      setSelectedBusiness(null);
      handleJoinLoyaltyProgram(loyaltyCard);
    },
    []
  );

  const handleViewCardFromModal = useCallback((customerCard: CustomerCard) => {
    setSelectedBusiness(null);
    handleViewCard(customerCard);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedBusiness(null);
  }, []);

  const navigateToCustomerHome = useCallback(() => {
    setModalVisible(false);
    setNewCardCode("");
    navigation.navigate("CustomerTabs", {
      screen: "Home",
      params: { refresh: true, timestamp: Date.now() },
    });
  }, [navigation]);

  const handleCloseSuccessModal = useCallback(() => {
    setModalVisible(false);
    setNewCardCode("");
  }, []);

  const renderBusinessItem = ({ item }: { item: BusinessWithCards }) => <BusinessDiscoveryCard business={item} onPress={handleBusinessPress} />;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingFooterText}>Cargando más negocios...</Text>
      </View>
    );
  };

  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  if (loading) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Descubre Negocios</Text>
          <Text style={styles.subtitle}>
            Encuentra y únete a programas de lealtad para ganar recompensas
          </Text>
        </View>

        {businesses.length === 0 ? (
          <BusinessDiscoveryEmptyState />
        ) : (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.businessList}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            onEndReached={loadMoreBusinesses}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
          />
        )}
      </View>
      
      <LoyaltyProgramListModal
        selectedBusiness={selectedBusiness}
        joiningCard={joiningCard}
        onClose={handleCloseModal}
        onJoinProgram={handleJoinLoyaltyProgramFromModal}
        onViewCard={handleViewCardFromModal}
        key={selectedBusiness ? `${selectedBusiness.id}-${selectedBusiness.customerCards.length}` : "no-business"}
      />
      
      {joiningCard && !modalVisible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={true}
          onRequestClose={() => {}}
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.fullScreenLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.fullScreenLoadingText}>Cargando...</Text>
              <Text style={styles.loadingSubtext}>Uniéndose al programa...</Text>
            </View>
          </View>
        </Modal>
      )}

      <BusinessDiscoverySuccessModal 
        visible={modalVisible && newCardCode.length > 0}
        cardCode={newCardCode}
        onClose={handleCloseSuccessModal}
        onViewCards={navigateToCustomerHome}
      />
    </SafeAreaView>
  );
};
