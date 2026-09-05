import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ScrollView,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useOAuth, useUser } from './clerk-service';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Setup WebBrowser auth session completion
WebBrowser.maybeCompleteAuthSession();

export default function UnifiedAuthScreen() {
  // Mode toggle: 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Input states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSignUpId, setVerificationSignUpId] = useState('');
  const [otpFlowType, setOtpFlowType] = useState<'signup' | 'login'>('signup');
  const [timer, setTimer] = useState(30);

  // Forgot Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'reset'>('email');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Clerk hooks
  const { user: clerkUser } = useUser();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' });

  // Warm up browser
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  // Timer countdown for OTP resend
  React.useEffect(() => {
    let intervalId: any;
    if ((pendingVerification || (isForgotPassword && forgotPasswordStep === 'reset')) && timer > 0) {
      intervalId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingVerification, isForgotPassword, forgotPasswordStep, timer]);

  const handleResendOtp = async () => {
    if (timer > 0 || loading) return;

    try {
      setLoading(true);
      await api.post('/auth/resend-otp', {
        email: isForgotPassword ? email : verificationSignUpId,
        type: isForgotPassword ? 'forgot_password' : otpFlowType,
      });
      setTimer(30); // reset timer
      Alert.alert('Code Resent', 'Check your email for the new 6-digit verification code.');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to resend code';
      Alert.alert('Resend Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Send Forgot Password Email OTP
  const handleSendForgotPasswordEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setForgotPasswordStep('reset');
      setTimer(30);
      Alert.alert('Code Sent', 'Check your email for the 6-digit reset code.');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to send reset code';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async () => {
    if (!verificationCode || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/reset-password', {
        email,
        otp: verificationCode,
        newPassword,
      });

      Alert.alert('Success', response.data?.message || 'Password reset successfully! Please log in.');
      setIsForgotPassword(false);
      setForgotPasswordStep('email');
      setVerificationCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassword('');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to reset password';
      Alert.alert('Reset Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Listen to Clerk active user state to automatically synchronize social session with Express backend
  React.useEffect(() => {
    if (clerkUser) {
      const syncSocialSession = async () => {
        try {
          setLoading(true);
          const clerkUserId = clerkUser.id;
          const userEmail = clerkUser.primaryEmailAddress?.emailAddress;
          const userName = clerkUser.fullName || userEmail?.split('@')[0] || 'User';

          if (userEmail) {
            const response = await api.post('/auth/social-login', {
              clerkUserId,
              email: userEmail,
              name: userName,
            });

            const { token, user: localUser } = response.data.data;
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('user', JSON.stringify(localUser));

            router.replace('/(tabs)');
          }
        } catch (error: any) {
          const errMsg = error.response?.data?.error?.message || error.message || 'Social sync failed';
          Alert.alert('Social Authentication Failed', errMsg);
        } finally {
          setLoading(false);
        }
      };
      syncSocialSession();
    }
  }, [clerkUser]);

  // Submit Handler for Login (Stage 1)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/auth/login', {
        email: email,
        password: password,
      });

      if (response.data?.data?.status === 'pending_verification') {
        setVerificationSignUpId(response.data.data.email);
        setOtpFlowType('login');
        setPendingVerification(true);
        setTimer(30);
        Alert.alert('Code Sent', 'Check your email for the 6-digit confirmation code.');
      } else {
        const { token, user } = response.data.data;
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to login';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler for Sign Up (Stage 1)
  const handleSignUp = async () => {
    if (!fullName || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/auth/register', {
        name: fullName,
        email: email,
        password: password,
      });

      if (response.data?.data?.status === 'pending_verification') {
        setVerificationSignUpId(response.data.data.email);
        setOtpFlowType('signup');
        setPendingVerification(true);
        setTimer(30);
        Alert.alert('Code Sent', 'Check your email for the 6-digit confirmation code.');
      } else {
        Alert.alert('Error', 'Unexpected registration response from backend.');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Failed to sign up';
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Verification Code for Sign Up / Login completion (Stage 2)
  const handleVerifySubmit = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      setLoading(true);

      const endpoint = otpFlowType === 'signup' ? '/auth/verify-signup' : '/auth/verify-login';
      const response = await api.post(endpoint, {
        email: verificationSignUpId,
        otp: verificationCode,
      });

      const { token, user } = response.data.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Verification failed';
      Alert.alert('Verification Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Clerk social OAuth login using native Clerk hooks
  const onSocialActive = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      const startFlow = provider === 'google' ? startGoogleFlow : startAppleFlow;
      const { createdSessionId, setActive } = await startFlow({
        redirectUrl: Linking.createURL('/oauth-redirect', { scheme: 'vochatandroid' }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert('Social Authentication Error', err.message || 'Social login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06080E" />
      
      {/* Background Glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      
      {/* Floating sphere decoration */}
      <View style={[styles.floatingShape, styles.sphere]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          
          {/* Logo Header */}
          <View style={styles.header}>
            <View style={styles.logoBubble}>
              <View style={styles.logoWave}>
                <View style={[styles.waveBar, { height: 10 }]} />
                <View style={[styles.waveBar, { height: 18 }]} />
                <View style={[styles.waveBar, { height: 26 }]} />
                <View style={[styles.waveBar, { height: 18 }]} />
                <View style={[styles.waveBar, { height: 10 }]} />
              </View>
            </View>
            <Text style={styles.title}>Vochat</Text>
            <Text style={styles.tagline}>Speak freely. Vanish completely.</Text>
          </View>

          {/* Unified Form Container */}
          <View style={styles.formContainer}>
            
            {isForgotPassword ? (
              // Forgot Password Mode
              <>
                <Text style={styles.otpSubtitle}>
                  {forgotPasswordStep === 'email'
                    ? 'Enter your email to receive a 6-digit reset code'
                    : 'Enter the 6-digit code and your new password'}
                </Text>

                {/* Email Address */}
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={16} color="#8E92A5" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Email address" 
                    placeholderTextColor="#5C6078"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    editable={forgotPasswordStep === 'email'}
                  />
                </View>

                {forgotPasswordStep === 'reset' && (
                  <>
                    {/* 6-Digit Code */}
                    <View style={styles.inputWrapper}>
                      <Feather name="shield" size={16} color="#8E92A5" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="6-digit reset code" 
                        placeholderTextColor="#5C6078"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                      />
                    </View>

                    {/* New Password */}
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={16} color="#8E92A5" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="New password" 
                        placeholderTextColor="#5C6078"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                        <Feather name={showNewPassword ? "eye" : "eye-off"} size={16} color="#8E92A5" />
                      </TouchableOpacity>
                    </View>

                    {/* Confirm New Password */}
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={16} color="#8E92A5" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Confirm new password" 
                        placeholderTextColor="#5C6078"
                        secureTextEntry={!showConfirmNewPassword}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}>
                        <Feather name={showConfirmNewPassword ? "eye" : "eye-off"} size={16} color="#8E92A5" />
                      </TouchableOpacity>
                    </View>

                    {timer > 0 ? (
                      <Text style={styles.timerText}>Resend code in {timer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendForgotPasswordEmail} style={styles.resendButton} disabled={loading}>
                        <Text style={styles.resendButtonText}>{loading ? 'Sending...' : 'Resend Code'}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Submit Action Button */}
                <TouchableOpacity 
                  onPress={forgotPasswordStep === 'email' ? handleSendForgotPasswordEmail : handleResetPasswordSubmit} 
                  style={styles.buttonContainer} 
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Processing...' : forgotPasswordStep === 'email' ? 'Send Reset Code' : 'Reset Password'}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#FFF" style={styles.buttonArrow} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Log In */}
                <TouchableOpacity onPress={() => { setIsForgotPassword(false); setForgotPasswordStep('email'); }} style={styles.linkContainer}>
                  <Text style={styles.linkTextBold}>Back to Log In</Text>
                </TouchableOpacity>
              </>
            ) : pendingVerification ? (
              // OTP Verification Mode
              <>
                <Text style={styles.otpSubtitle}>Enter the 6-digit code sent to your email</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="shield" size={18} color="#8E92A5" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="6-digit code" 
                    placeholderTextColor="#5C6078"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                  />
                </View>

                <TouchableOpacity onPress={handleVerifySubmit} style={styles.buttonContainer} disabled={loading}>
                  <LinearGradient
                    colors={['#7C3AED', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
                    <Feather name="check" size={18} color="#FFF" style={styles.buttonArrow} />
                  </LinearGradient>
                </TouchableOpacity>

                {timer > 0 ? (
                  <Text style={styles.timerText}>Resend code in {timer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} style={styles.resendButton} disabled={loading}>
                    <Text style={styles.resendButtonText}>{loading ? 'Resending...' : 'Resend Code'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => setPendingVerification(false)} style={styles.linkContainer}>
                  <Text style={styles.linkTextBold}>Back to Sign Up</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Normal Form Mode
              <>
                {/* Mode Selector Tabs */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity 
                    style={[styles.tabButton, authMode === 'login' ? styles.activeTabButton : null]}
                    onPress={() => setAuthMode('login')}
                  >
                    <Text style={[styles.tabButtonText, authMode === 'login' ? styles.activeTabButtonText : null]}>
                      Log In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tabButton, authMode === 'signup' ? styles.activeTabButton : null]}
                    onPress={() => setAuthMode('signup')}
                  >
                    <Text style={[styles.tabButtonText, authMode === 'signup' ? styles.activeTabButtonText : null]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form Fields depending on mode */}
                {authMode === 'signup' && (
                  <>
                    {/* Full Name */}
                    <View style={styles.inputWrapper}>
                      <Feather name="user" size={16} color="#8E92A5" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Full name" 
                        placeholderTextColor="#5C6078"
                        value={fullName}
                        onChangeText={setFullName}
                      />
                    </View>

                    {/* Username */}
                    <View style={styles.inputWrapper}>
                      <Feather name="at-sign" size={16} color="#8E92A5" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Username" 
                        placeholderTextColor="#5C6078"
                        autoCapitalize="none"
                        value={username}
                        onChangeText={setUsername}
                      />
                      <Text style={styles.usernameSuffix}>@vochat</Text>
                    </View>
                  </>
                )}

                {/* Email Address */}
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={16} color="#8E92A5" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Email address" 
                    placeholderTextColor="#5C6078"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={16} color="#8E92A5" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder={authMode === 'login' ? 'Password' : 'Password'} 
                    placeholderTextColor="#5C6078"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={16} color="#8E92A5" />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password Link on Login */}
                {authMode === 'login' && (
                  <TouchableOpacity 
                    style={styles.forgotPasswordButton}
                    onPress={() => {
                      setIsForgotPassword(true);
                      setForgotPasswordStep('email');
                    }}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                {authMode === 'signup' && (
                  /* Confirm Password */
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={16} color="#8E92A5" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="Confirm password" 
                      placeholderTextColor="#5C6078"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={16} color="#8E92A5" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Compact Privacy Note */}
                <Text style={styles.privacyBriefText}>
                  🛡️ End-to-end encrypted. Voice snaps self-destruct.
                </Text>

                {/* Submit Action Button */}
                <TouchableOpacity 
                  onPress={authMode === 'login' ? handleLogin : handleSignUp} 
                  style={styles.buttonContainer} 
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Processing...' : authMode === 'login' ? 'Initialize Session' : 'Create Account'}
                    </Text>
                    <Feather name="arrow-right" size={16} color="#FFF" style={styles.buttonArrow} />
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or connect via</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Side-by-Side Compact Social Buttons */}
                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialButtonCompact} onPress={() => onSocialActive('google')} disabled={loading}>
                    <FontAwesome5 name="google" size={14} color="#FFF" style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialButtonCompact} onPress={() => onSocialActive('apple')} disabled={loading}>
                    <FontAwesome5 name="apple" size={14} color="#FFF" style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Apple</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06080E',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 8 : 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  glowTopLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#7C3AED',
    opacity: 0.12,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#DB2777',
    opacity: 0.1,
  },
  floatingShape: {
    position: 'absolute',
    opacity: 0.5,
  },
  sphere: {
    bottom: 40,
    left: -15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6D28D9',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBubble: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06080E',
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  waveBar: {
    width: 2.5,
    backgroundColor: '#FFF',
    borderRadius: 1.5,
  },
  title: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tagline: {
    color: '#8E92A5',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#11131B',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#202330',
    padding: 16,
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTabButton: {
    backgroundColor: '#7C3AED',
  },
  tabButtonText: {
    color: '#5C6078',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#FFF',
  },
  otpSubtitle: {
    color: '#8E92A5',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080A10',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#202330',
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  usernameSuffix: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '600',
  },
  privacyBriefText: {
    color: '#8E92A5',
    fontSize: 11,
    textAlign: 'center',
    marginVertical: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 2,
    paddingVertical: 2,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonArrow: {
    position: 'absolute',
    right: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  dividerText: {
    color: '#5C6078',
    marginHorizontal: 10,
    fontSize: 11,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButtonCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080A10',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#202330',
    height: 44,
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkTextBold: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  timerText: {
    color: '#8E92A5',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  resendButtonText: {
    color: '#DB2777',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
