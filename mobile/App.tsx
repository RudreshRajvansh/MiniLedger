import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { LoansListScreen } from './src/screens/LoansListScreen';
import { AddLoanScreen } from './src/screens/AddLoanScreen';
import { colors, radius, shadow } from './src/theme';

export type RootStackParamList = {
  Login: undefined;
  LoansList: undefined;
  AddLoan: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Browsers draw a focus ring on inputs; the app styles its own focus states
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input, textarea { outline: none !important; min-width: 0; }';
  document.head.appendChild(style);
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    primary: colors.primary,
    text: colors.text,
  },
};

function AppNavigation() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>₹</Text>
        </View>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={token ? 'dark' : 'light'} />
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: 'Back',
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen
              name="LoansList"
              component={LoansListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddLoan"
              component={AddLoanScreen}
              options={{ title: 'New loan', headerShown: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * On a desktop browser, render the app inside a phone-sized frame so the
 * web demo looks like the mobile app it is. Native builds are unaffected.
 */
const DeviceFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.webDevice}>{children}</View>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DeviceFrame>
          <AppNavigation />
        </DeviceFrame>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ink,
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  splashLogoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4E7F0',
  },
  webDevice: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 900,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    borderRadius: Platform.OS === 'web' ? radius.xl : 0,
    ...shadow(3),
  },
});
