import { useAuth } from '@/.vscode/screens/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn, loading: authLoading } = useAuth(); // Remove user from destructuring

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(email, password);
      // Navigation is handled by route protection - don't do anything here
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.statusBar}>
        <Text style={[styles.time, { color: colors.text }]}>9:41</Text>
      </View>
      
      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome to taskify!</Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Login To Your Account</Text>
        
        <View style={styles.form}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground || colors.card,
              borderColor: colors.border,
              color: colors.text 
            }]}
            placeholder="Email"
            placeholderTextColor={colors.placeholder || colors.secondaryText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoggingIn && !authLoading}
          />
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.inputBackground || colors.card,
              borderColor: colors.border,
              color: colors.text 
            }]}
            placeholder="Password"
            placeholderTextColor={colors.placeholder || colors.secondaryText}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoggingIn && !authLoading}
          />
          
          <TouchableOpacity 
            style={[
              styles.loginButton, 
              { 
                backgroundColor: (isLoggingIn || authLoading) 
                  ? (colors.disabled || '#cccccc') 
                  : colors.tint 
              }
            ]}
            onPress={handleLogin}
            disabled={isLoggingIn || authLoading}
          >
            {(isLoggingIn || authLoading) ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.signUpContainer}
          onPress={() => router.push('/modal')}
          disabled={isLoggingIn || authLoading}
        >
          <Text style={[styles.signUpText, { color: colors.secondaryText }]}>
            Don't have an account? <Text style={[styles.signUpLink, { color: colors.tint }]}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    width: '100%',
    paddingTop: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  time: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: 15,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  loginButton: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpContainer: {
    marginTop: 30,
  },
  signUpText: {
    fontSize: 14,
    textAlign: 'center',
  },
  signUpLink: {
    fontWeight: '600',
  },
});