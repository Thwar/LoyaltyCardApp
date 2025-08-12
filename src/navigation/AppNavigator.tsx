import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants";
import { AuthStackParamList, CustomerTabParamList, BusinessTabParamList, CustomerStackParamList, BusinessStackParamList } from "../types";
import { LogoHeader } from "../components";

import { LandingScreen } from "../screens/LandingScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { CustomerHomeScreen } from "../screens/customer/CustomerHomeScreen";
import { CustomerProfileScreen } from "../screens/customer/CustomerProfileScreen";
import { BusinessDiscoveryScreen } from "../screens/customer/BusinessDiscoveryScreen";
import { CustomerCardDetailsScreen } from "../screens/customer/CustomerCardDetailsScreen";
import { BusinessDashboardScreen } from "../screens/business/BusinessDashboardScreen";
import { BusinessSettingsScreen } from "../screens/business/BusinessSettingsScreen";
import { LoyaltyProgramScreen } from "../screens/business/LoyaltyProgramScreen";
import { CustomerManagementScreen } from "../screens/business/CustomerManagementScreen";
import { AddStampScreen } from "../screens/business/AddStampScreen";

const AuthStack = createStackNavigator<AuthStackParamList>();
const CustomerTab = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      id={undefined}
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
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Discovery") {
            iconName = focused ? "search" : "search-outline";
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
      <CustomerTab.Screen
        name="Home"
        component={CustomerHomeScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
      <CustomerTab.Screen
        name="Discovery"
        component={BusinessDiscoveryScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
      <CustomerTab.Screen
        name="Profile"
        component={CustomerProfileScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
    </CustomerTab.Navigator>
  );
};

const BusinessNavigator = () => {
  return (
    <BusinessTab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === "Dashboard") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "MyProgram") {
            iconName = focused ? "card" : "card-outline";
          } else if (route.name === "Customers") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Profile") {
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
      <BusinessTab.Screen
        name="Dashboard"
        component={BusinessDashboardScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
      <BusinessTab.Screen
        name="MyProgram"
        component={LoyaltyProgramScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
      <BusinessTab.Screen
        name="Customers"
        component={CustomerManagementScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
      <BusinessTab.Screen
        name="Profile"
        component={BusinessSettingsScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
        }}
      />
    </BusinessTab.Navigator>
  );
};

// Create stack navigators for detailed screens
const CustomerStack = createStackNavigator<CustomerStackParamList>();
const BusinessStack = createStackNavigator<BusinessStackParamList>();

const CustomerStackNavigator = () => {
  return (
    <CustomerStack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitle: "Atrás",
      }}
    >
      <CustomerStack.Screen name="CustomerTabs" component={CustomerNavigator} options={{ headerShown: false }} />
      <CustomerStack.Screen
        name="BusinessProfile"
        component={CustomerProfileScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
          headerBackTitle: "Atrás",
        }}
      />
      <CustomerStack.Screen
        name="BusinessDiscovery"
        component={BusinessDiscoveryScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
          headerBackTitle: "Atrás",
        }}
      />
      <CustomerStack.Screen
        name="CustomerCardDetails"
        component={CustomerCardDetailsScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
          headerBackTitle: "Atrás",
        }}
      />
    </CustomerStack.Navigator>
  );
};

const BusinessStackNavigator = () => {
  return (
    <BusinessStack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerBackTitle: "Atrás",
      }}
    >
      <BusinessStack.Screen name="BusinessTabs" component={BusinessNavigator} options={{ headerShown: false }} />
      <BusinessStack.Screen
        name="AddStamp"
        component={AddStampScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <LogoHeader title="Agregar Sello" />,
          headerLeftContainerStyle: { left: 0, paddingLeft: 0 },
          headerBackTitle: "Atrás",
        }}
      />
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
