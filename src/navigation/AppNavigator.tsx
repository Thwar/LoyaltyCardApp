import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants";
import { AuthStackParamList, CustomerTabParamList, BusinessTabParamList } from "../types";

// Import screens (we'll create these next)
import { LandingScreen } from "../screens/LandingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { CustomerHomeScreen } from "../screens/customer/CustomerHomeScreen";
import { CustomerCardDetailsScreen } from "../screens/customer/CustomerCardDetailsScreen";
import { BusinessProfileScreen } from "../screens/customer/BusinessProfileScreen";
import { ClaimRewardScreen } from "../screens/customer/ClaimRewardScreen";
import { BusinessDashboardScreen } from "../screens/business/BusinessDashboardScreen";
import { BusinessSettingsScreen } from "../screens/business/BusinessSettingsScreen";
import { CreateLoyaltyCardScreen } from "../screens/business/CreateLoyaltyCardScreen";
import { EditLoyaltyCardScreen } from "../screens/business/EditLoyaltyCardScreen";
import { CustomerManagementScreen } from "../screens/business/CustomerManagementScreen";
import { AddStampScreen } from "../screens/business/AddStampScreen";

const AuthStack = createStackNavigator<AuthStackParamList>();
const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <AuthStack.Screen name="Landing" component={LandingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

const CustomerNavigator = () => {
  return (
    <CustomerTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.inputBorder,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <CustomerTab.Screen name="Home" component={CustomerHomeScreen} options={{ title: "My Cards" }} />
      <CustomerTab.Screen name="Profile" component={BusinessProfileScreen} options={{ title: "Profile" }} />
    </CustomerTab.Navigator>
  );
};

const BusinessNavigator = () => {
  return (
    <BusinessTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Dashboard") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Cards") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "Customers") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "analytics-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.inputBorder,
        },
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <BusinessTab.Screen name="Dashboard" component={BusinessDashboardScreen} options={{ title: "Dashboard" }} />
      <BusinessTab.Screen name="Cards" component={CreateLoyaltyCardScreen} options={{ title: "Loyalty Cards" }} />
      <BusinessTab.Screen name="Customers" component={CustomerManagementScreen} options={{ title: "Customers" }} />
      <BusinessTab.Screen name="Settings" component={BusinessSettingsScreen} options={{ title: "Settings" }} />
    </BusinessTab.Navigator>
  );
};

// Create stack navigators for detailed screens
const CustomerStack = createStackNavigator();
const BusinessStack = createStackNavigator();

const CustomerStackNavigator = () => {
  return (
    <CustomerStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <CustomerStack.Screen name="CustomerTabs" component={CustomerNavigator} options={{ headerShown: false }} />
      <CustomerStack.Screen name="CardDetails" component={CustomerCardDetailsScreen} options={{ title: "Card Details" }} />
      <CustomerStack.Screen name="BusinessProfile" component={BusinessProfileScreen} options={{ title: "Business Profile" }} />
      <CustomerStack.Screen name="ClaimReward" component={ClaimRewardScreen} options={{ title: "Claim Reward" }} />
    </CustomerStack.Navigator>
  );
};

const BusinessStackNavigator = () => {
  return (
    <BusinessStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <BusinessStack.Screen name="BusinessTabs" component={BusinessNavigator} options={{ headerShown: false }} />
      <BusinessStack.Screen name="CreateLoyaltyCard" component={CreateLoyaltyCardScreen} options={{ title: "Create Loyalty Card" }} />
      <BusinessStack.Screen name="EditLoyaltyCard" component={EditLoyaltyCardScreen} options={{ title: "Edit Loyalty Card" }} />
      <BusinessStack.Screen name="AddStamp" component={AddStampScreen} options={{ title: "Add Stamp" }} />
    </BusinessStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return <NavigationContainer>{!user ? <AuthNavigator /> : user.userType === "customer" ? <CustomerStackNavigator /> : <BusinessStackNavigator />}</NavigationContainer>;
};
