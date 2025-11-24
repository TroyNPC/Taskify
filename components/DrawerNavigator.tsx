import { useAuth } from '@/.vscode/screens/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = 300;

interface DrawerNavigatorProps {
  isVisible: boolean;
  onClose: () => void;
  currentScreen: string;
}

export default function DrawerNavigator({ isVisible, onClose, currentScreen }: DrawerNavigatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const menuItems = [
    { 
      key: 'dashboard', 
      label: 'Dashboard', 
      icon: 'grid-outline',
      screen: '/(tabs)/explore'
    },
    { 
      key: 'projects', 
      label: 'Projects', 
      icon: 'folder-outline',
      screen: '/(tabs)/projects'
    },
    { 
      key: 'tasks', 
      label: 'Tasks', 
      icon: 'checkmark-done-outline',
      screen: '/(tabs)/tasks'
    },
    { 
      key: 'todos', 
      label: 'Todos', 
      icon: 'list-outline',
      screen: '/(tabs)/todos'
    },
    { 
      key: 'meetings', 
      label: 'Meetings', 
      icon: 'people-outline',
      screen: '/(tabs)/meetings'
    },
    { 
      key: 'calendar', 
      label: 'Calendar', 
      icon: 'calendar-outline',
      screen: '/(tabs)/calendar'
    },
  ];

  const handleNavigation = (screen: string) => {
    onClose();
    // Use navigation without replace to avoid timing issues
    router.push(screen);
  };

  // SAFE LOGOUT FUNCTION - No navigation, just close drawer and sign out
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1) close the drawer UI so it does not interfere with navigation
      onClose();

      // 2) small delay to let parent close animation/state settle
      await new Promise((r) => setTimeout(r, 200));

      // 3) sign out from auth provider (clears state in AuthContext)
      await signOut();

      // 4) short wait to let AuthContext subscription run (if any)
      await new Promise((r) => setTimeout(r, 200));

      // 5) CORRECTED: Navigate to the root login screen
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // best-effort fallback navigation so user isn't stuck
      try {
        router.replace('/');
      } catch (e) {
        // ignore
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.full_name) return 'U';
    return user.user_metadata.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleOverlayPress = () => {
    onClose();
  };

  if (!isVisible) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={handleOverlayPress}
          activeOpacity={1}
        />
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.drawer,
          { 
            backgroundColor: colors.card,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {getUserDisplayName()}
            </Text>
            <Text style={[styles.userEmail, { color: colors.secondaryText }]}>
              {user?.email}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                currentScreen === item.key && { backgroundColor: colors.tint + '20' }
              ]}
              onPress={() => handleNavigation(item.screen)}
            >
              <Ionicons 
                name={item.icon as any} 
                size={22} 
                color={currentScreen === item.key ? colors.tint : colors.text} 
              />
              <Text style={[
                styles.menuText,
                { 
                  color: currentScreen === item.key ? colors.tint : colors.text 
                }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={[
            styles.logoutButton, 
            { borderTopColor: colors.border },
            isLoggingOut && { opacity: 0.6 }
          ]} 
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          )}
          <Text style={[styles.logoutText, { color: colors.error }]}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
  },
  menu: {
    flex: 1,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    marginHorizontal: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
});