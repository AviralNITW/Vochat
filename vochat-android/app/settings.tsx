import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Switch, 
  Alert, 
  Platform,
  StatusBar
} from 'react-native';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/Theme';

export default function SettingsScreen() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout 🔐',
      'Are you sure you want to log out of Vochat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear auth tokens
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              
              // Redirect to Login/Registration screen
              router.replace('/login');
            } catch (err) {
              console.error('Logout error:', err);
              Alert.alert('Error', 'Failed to log out cleanly. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderSettingRow = (icon: string, label: string, color: string, onPress?: () => void, isToggle = false, toggleValue?: boolean, onToggleChange?: (v: boolean) => void) => {
    return (
      <TouchableOpacity 
        style={styles.row} 
        onPress={onPress} 
        disabled={isToggle}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBg, { backgroundColor: `${color}15` }]}>
            <Feather name={icon as any} size={18} color={color} />
          </View>
          <Text style={styles.rowLabel}>{label}</Text>
        </View>

        {isToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: '#1C152B', true: '#8B5CF6' }}
            thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
          />
        ) : (
          <Feather name="chevron-right" size={16} color="#73778F" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section: Account */}
        <Text style={styles.sectionHeader}>Account Settings</Text>
        <View style={styles.card}>
          {renderSettingRow('user', 'Account Information', '#8B5CF6', () => Alert.alert('Account Info', 'Manage name, username, and verified status.'))}
          <View style={styles.divider} />
          {renderSettingRow('shield', 'Security & Password', '#3B82F6', () => Alert.alert('Security', 'Manage security questions and update password.'))}
        </View>

        {/* Section: Privacy */}
        <Text style={styles.sectionHeader}>Privacy</Text>
        <View style={styles.card}>
          {renderSettingRow('lock', 'Private Account', '#EF4444', undefined, true, isPrivate, setIsPrivate)}
          <View style={styles.divider} />
          {renderSettingRow('eye-off', 'Read Receipts', '#10B981', undefined, true, readReceipts, setReadReceipts)}
          <View style={styles.divider} />
          {renderSettingRow('slash', 'Blocked Accounts', '#F59E0B', () => Alert.alert('Blocked', 'Manage accounts you have blocked.'))}
        </View>

        {/* Section: Notifications */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          {renderSettingRow('bell', 'Push Notifications', '#EC4899', undefined, true, pushEnabled, setPushEnabled)}
          <View style={styles.divider} />
          {renderSettingRow('database', 'Data & Storage', '#F59E0B', () => Alert.alert('Storage', 'Configure voice download cache limits.'))}
        </View>

        {/* Section: Support */}
        <Text style={styles.sectionHeader}>Help & Support</Text>
        <View style={styles.card}>
          {renderSettingRow('help-circle', 'Help Center', '#8B5CF6', () => Alert.alert('Help Center', 'Browse guidebooks and tutorials.'))}
          <View style={styles.divider} />
          {renderSettingRow('file-text', 'Privacy Policy', '#3B82F6', () => Alert.alert('Privacy Policy', 'Review Vochat privacy guidelines.'))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#FF2A54" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Logout Session</Text>
        </TouchableOpacity>

        {/* App Version Info */}
        <Text style={styles.versionText}>Vochat v1.0.4 • Privacy First 🛡️</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07050C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131124',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  sectionHeader: {
    color: '#73778F',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#131124',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 42, 84, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 42, 84, 0.2)',
    borderRadius: 24,
    height: 52,
    marginTop: 32,
    marginBottom: 16,
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  logoutText: {
    color: '#FF2A54',
    fontSize: 15,
    fontWeight: 'bold',
  },
  versionText: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  }
});
