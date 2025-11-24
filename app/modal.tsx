// app/(auth)/SignUpScreen.tsx  (or wherever your SignUp currently lives)
import { useAuth } from '@/.vscode/screens/AuthContext'; // <-- recommended canonical path
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Defensive: import from canonical path. If you still use @/.vscode path change it,
  // but prefer '@/app/contexts/AuthContext' as recommended.
  const auth = useAuth();
  // show clearer error if the hook returns nothing
  if (!auth) {
    // This will throw in dev; keep it so you can see the issue quickly
    throw new Error('useAuth returned empty context. Make sure AuthProvider wraps your app and import path is correct.');
  }

  const { signUp, signInWithGoogle, signInWithFacebook } = auth;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSignUp = async () => {
    // defensive: make sure signUp exists
    if (typeof signUp !== 'function') {
      Alert.alert('Sign Up not available', 'The signUp function is missing from AuthContext. Check that AuthProvider is mounted and you imported useAuth from the right file.');
      return;
    }

    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Error', 'Please accept the terms & policy');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    setIsSigningUp(true);
    try {
      // call the signUp from context
      const res = await signUp(email, password, fullName);
      // If API returns an error-like object, handle user-friendly message:
      if (res?.error) {
        throw res.error;
      }

      Alert.alert(
        'Success',
        'Account created successfully! Please check your email for verification.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      // prefer structured message but fallback to string
      const message = error?.message || String(error) || 'Unknown error';
      Alert.alert('Sign Up Failed', message);
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (typeof signInWithGoogle !== 'function') {
      Alert.alert('Not available', 'Google sign-in is not configured in AuthContext.');
      return;
    }
    setSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error?.message || String(error));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSignIn = async () => {
    if (typeof signInWithFacebook !== 'function') {
      Alert.alert('Not available', 'Facebook sign-in is not configured in AuthContext.');
      return;
    }
    setSocialLoading('facebook');
    try {
      await signInWithFacebook();
    } catch (error: any) {
      Alert.alert('Facebook Sign In Failed', error?.message || String(error));
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top status / back row */}
      <View style={styles.statusBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 16, top: 48 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.time, { color: colors.text }]}>9:41</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.appTitle, { color: colors.text }]}>Taskify student productivity app</Text>
          </View>

          <Text style={[styles.welcomeText, { color: colors.text }]}>Create your account</Text>

          {/* form ... unchanged */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="ex: Sarah Lynch"
                placeholderTextColor={colors.placeholder}
                value={fullName}
                onChangeText={setFullName}
                editable={!isSigningUp}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="ex: Sarahlynch@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isSigningUp}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isSigningUp}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Confirm password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isSigningUp}
              />
            </View>

            <TouchableOpacity style={styles.termsContainer} onPress={() => setAcceptedTerms(!acceptedTerms)} disabled={isSigningUp}>
              <View style={[styles.checkbox, { backgroundColor: acceptedTerms ? colors.tint : 'transparent', borderColor: acceptedTerms ? colors.tint : colors.border }]}>
                {acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={[styles.termsText, { color: colors.secondaryText }]}>I understood the terms & policy.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.signUpButton, { backgroundColor: isSigningUp || !acceptedTerms ? colors.disabled : colors.tint }]} onPress={handleSignUp} disabled={isSigningUp || !acceptedTerms}>
              {isSigningUp ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.signUpButtonText}>Sign Up</Text>}
            </TouchableOpacity>

            {/* Social / rest unchanged */}
            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.secondaryText }]}>or sign up with</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card }]} onPress={handleGoogleSignIn} disabled={!!socialLoading}>
                {socialLoading === 'google' ? <ActivityIndicator size="small" color="#DB4437" /> : <>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Google</Text>
                </>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.socialButton, { backgroundColor: colors.card }]} onPress={handleFacebookSignIn} disabled={!!socialLoading}>
                {socialLoading === 'facebook' ? <ActivityIndicator size="small" color="#4267B2" /> : <>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                  <Text style={[styles.socialButtonText, { color: colors.text }]}>Facebook</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.secondaryText }]}>Have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.loginLink, { color: colors.tint }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* same styles as you had previously — copy them over */
  container: { flex: 1 },
  statusBar: { width: '100%', paddingTop: 50, paddingHorizontal: 30, alignItems: 'center' },
  time: { fontSize: 17, fontWeight: '600' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 60, height: 60, marginBottom: 12 },
  appTitle: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  welcomeText: { fontSize: 24, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  form: { width: '100%', gap: 20 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  input: { width: '100%', height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  termsText: { fontSize: 14, flex: 1 },
  signUpButton: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  signUpButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 14, fontWeight: '500' },
  socialButtonsContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  socialButtonText: { fontSize: 14, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '600' },
});
