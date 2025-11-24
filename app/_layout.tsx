import { AuthProvider, useAuth } from '@/.vscode/screens/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LoadingColors = {
  light: {
    background: '#ffffff',
    text: '#000000',
  },
  dark: {
    background: '#000000',
    text: '#ffffff',
  },
};

function RouteHandler() {
  const { user, loading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (loading || !isInitialized) return;

    const firstSegment = segments[0];
    const inTabsGroup = firstSegment === '(tabs)';
    const atRoot = segments.length === 0 || !firstSegment;

    // Prevent infinite redirects
    if (!hasRedirected) {
      if (!user && inTabsGroup) {
        // Not logged in but trying to access protected tabs
        setHasRedirected(true);
        router.replace('/');
      } else if (user && atRoot) {
        // Logged in but at login screen
        setHasRedirected(true);
        router.replace('/(tabs)/explore');
      }
    }
  }, [user, segments, loading, isInitialized, hasRedirected]);

  // Reset redirect flag when auth state changes significantly
  useEffect(() => {
    setHasRedirected(false);
  }, [user]);

  return null;
}

function LoadingScreen() {
  const colorScheme = useColorScheme();
  const colors = LoadingColors[colorScheme ?? 'light'];
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10, color: colors.text }}>Loading...</Text>
    </View>
  );
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { loading, isInitialized } = useAuth();

  if (loading || !isInitialized) {
    return <LoadingScreen />;
  }

  return (

    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RouteHandler />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
        {/* Add the 4 modals */}
        <Stack.Screen 
          name="modals/AddProjectModal" 
          options={{ presentation: 'modal', headerShown: true,  title: 'Add Project' }} 
        />
        <Stack.Screen 
          name="modals/CreateTaskModal" 
          options={{ presentation: 'modal', headerShown: true, title: 'Create Task' }} 
        />
          <Stack.Screen 
          name="modals/AddMeetingModal" 
          options={{ presentation: 'modal', headerShown: true, title: 'Create Meetings' }} 
        />
        <Stack.Screen 
        name="modals/EditProjectModal" 
        options={{ 
          presentation: 'modal',
          headerShown: true
        }} 
      />
        <Stack.Screen 
          name="modals/EditTaskModal" 
          options={{ 
            presentation: 'modal',
            headerShown: false 
          }} 
        />
      
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}