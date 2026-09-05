import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Platform,
  StatusBar,
  Dimensions,
  RefreshControl
} from 'react-native';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api';
import { Theme } from '../../constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic Profile Data

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ snaps: 0, streak: 0, friends: 0, badges: 0 });
  const [activeTab, setActiveTab] = useState<'About' | 'Activity' | 'Badges'>('About');
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const loadProfileData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const userRes = await api.get('/auth/me');
      setUser(userRes.data?.data?.user || userRes.data?.data || null);

      const statsRes = await api.get('/users/me/stats');
      setStats({
        snaps: statsRes.data?.data?.stats?.messagesCount || 0,
        streak: statsRes.data?.data?.stats?.streaksCount || 0,
        friends: statsRes.data?.data?.stats?.friendsCount || 0,
        badges: 0
      });
    } catch (error) {
      console.log('Error fetching profile data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadProfileData();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/');
  };

  const displayName = user?.name || user?.username || 'Vochat User';
  const displayId = user?.id ? `VOCHT_${user.id.substring(0, 4).toUpperCase()}` : 'VOCHT_7842';
  const location = user?.location || 'Earth 🌍';
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';
  const bioText = user?.bio || 'Speak freely. Connect deeply. 💜';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.sparklesContainer}>
              <Ionicons name="sparkles" size={16} color="#B46CFF" />
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Your space, your voice 💜</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Theme.colors.primary}
          />
        }
      >
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            {/* Left: Avatar with Double Ring Glow */}
            <View style={styles.avatarWrapper}>
              <View style={styles.glowRingOuter}>
                <View style={styles.glowRingInner}>
                  <View style={styles.avatarInner}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => router.push('/edit-profile')}>
                <MaterialCommunityIcons name="pencil" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Middle: Details */}
            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
                <MaterialCommunityIcons name="decagram" size={18} color="#8B5CF6" style={{ marginLeft: 6 }} />
              </View>

              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
                <Text style={styles.profileId}>ID: {displayId}</Text>
              </View>

              <Text style={styles.quoteText}>
                <Text style={styles.quoteChar}>❝</Text> {bioText}
              </Text>
            </View>

            {/* Right: Edit Button */}
            <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/edit-profile')}>
              <Feather name="edit-3" size={12} color="#8B5CF6" style={{ marginRight: 4 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statCol}>
              <View style={styles.statIconBg}>
                <MaterialCommunityIcons name="waveform" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.statVal}>{stats.snaps}</Text>
              <Text style={styles.statLbl}>Voice Snaps</Text>
            </View>

            <View style={styles.statColDivider} />

            <View style={styles.statCol}>
              <View style={styles.statIconBg}>
                <MaterialCommunityIcons name="fire" size={18} color="#FF8C2B" />
              </View>
              <Text style={styles.statVal}>{stats.streak}</Text>
              <Text style={styles.statLbl}>Day Streak</Text>
            </View>

            <View style={styles.statColDivider} />

            <View style={styles.statCol}>
              <View style={styles.statIconBg}>
                <Ionicons name="people" size={18} color="#34D399" />
              </View>
              <Text style={styles.statVal}>{stats.friends}</Text>
              <Text style={styles.statLbl}>Friends</Text>
            </View>

            <View style={styles.statColDivider} />

            <View style={styles.statCol}>
              <View style={styles.statIconBg}>
                <MaterialCommunityIcons name="shield-star" size={18} color="#EC4899" />
              </View>
              <Text style={styles.statVal}>{stats.badges}</Text>
              <Text style={styles.statLbl}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {['About', 'Activity', 'Badges'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                {isActive && <View style={styles.tabLine} />}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'About' && (
          <View style={styles.tabContent}>
            {/* Identity Cards */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBg}>
                  <Ionicons name="location-outline" size={18} color="#B46CFF" />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>From</Text>
                  <Text style={styles.infoValue}>{location}</Text>
                </View>
              </View>

              <View style={styles.infoRowDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBg}>
                  <Ionicons name="calendar-outline" size={18} color="#B46CFF" />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Joined</Text>
                  <Text style={styles.infoValue}>{joinedDate}</Text>
                </View>
              </View>

              <View style={styles.infoRowDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconBg}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#B46CFF" />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Bio</Text>
                  <Text style={styles.infoValue}>{bioText}</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Row Card */}
            <View style={styles.quickGridCard}>
              <View style={styles.gridItem}>
                <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
                <Text style={styles.gridItemLabel}>My Notes</Text>
                <Text style={styles.gridItemValue}>18</Text>
              </View>

              <View style={styles.gridDivider} />

              <View style={styles.gridItem}>
                <Ionicons name="heart-outline" size={20} color="#EC4899" />
                <Text style={styles.gridItemLabel}>Saved Snaps</Text>
                <Text style={styles.gridItemValue}>42</Text>
              </View>

              <View style={styles.gridDivider} />

              <View style={styles.gridItem}>
                <Ionicons name="flash-outline" size={20} color="#34D399" />
                <Text style={styles.gridItemLabel}>Voice Boost</Text>
                <Text style={styles.gridItemValue}>3</Text>
              </View>

              <View style={styles.gridDivider} />

              <View style={styles.gridItem}>
                <Ionicons name="color-palette-outline" size={20} color="#60A5FA" />
                <Text style={styles.gridItemLabel}>Themes</Text>
                <Text style={styles.gridItemValue}>6</Text>
              </View>
            </View>

            {/* Settings Card List */}
            <View style={styles.settingsCard}>
              <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/settings')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="lock-closed-outline" size={18} color="#B3B6C7" style={styles.settingIcon} />
                  <Text style={styles.settingText}>Account & Security</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#73778F" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/settings')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#B3B6C7" style={styles.settingIcon} />
                  <Text style={styles.settingText}>Privacy & Safety</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#73778F" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/settings')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="notifications-outline" size={18} color="#B3B6C7" style={styles.settingIcon} />
                  <Text style={styles.settingText}>Notifications</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#73778F" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/settings')}>
                <View style={styles.settingLeft}>
                  <Ionicons name="help-circle-outline" size={18} color="#B3B6C7" style={styles.settingIcon} />
                  <Text style={styles.settingText}>Help & Support</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#73778F" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]}>
                <View style={styles.settingLeft}>
                  <Ionicons name="gift-outline" size={18} color="#B3B6C7" style={styles.settingIcon} />
                  <Text style={styles.settingText}>Invite Friends</Text>
                </View>
                <View style={styles.rewardContainer}>
                  <View style={styles.rewardBadge}>
                    <Ionicons name="gift" size={10} color="#EC4899" style={{ marginRight: 4 }} />
                    <Text style={styles.rewardBadgeText}>Earn Rewards</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#73778F" />
                </View>
              </TouchableOpacity>
            </View>

          </View>
        )}

        {activeTab === 'Activity' && (
          <View style={styles.emptyTab}>
            <Feather name="activity" size={32} color="#73778F" />
            <Text style={styles.emptyTabText}>No activities to display.</Text>
          </View>
        )}

        {activeTab === 'Badges' && (
          <View style={styles.emptyTab}>
            <Feather name="award" size={32} color="#73778F" />
            <Text style={styles.emptyTabText}>Locked badges will show here.</Text>
          </View>
        )}

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
    paddingBottom: 8,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  sparklesContainer: {
    marginLeft: 6,
  },
  headerSubtitle: {
    color: '#73778F',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#8B5CF6',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#07050C',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 180,
  },
  profileCard: {
    backgroundColor: '#131124',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    marginBottom: 20,
  },
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  glowRingOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 108, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRingInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 2,
    borderWidth: 2,
    borderColor: '#B46CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#1C1E2D',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1C152B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8B5CF6',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#131124',
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  onlineText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  profileId: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
  },
  quoteText: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  quoteChar: {
    color: '#B46CFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editProfileBtnText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 18,
    paddingTop: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statColDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLbl: {
    color: '#73778F',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#131124',
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabText: {
    color: '#73778F',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  tabLine: {
    position: 'absolute',
    bottom: 4,
    width: 32,
    height: 2,
    backgroundColor: '#B46CFF',
    borderRadius: 1,
  },
  tabContent: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#131124',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 12,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(180, 108, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    color: '#73778F',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  quickGridCard: {
    flexDirection: 'row',
    backgroundColor: '#131124',
    borderRadius: 28,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
  },
  gridDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignSelf: 'center',
  },
  gridItemLabel: {
    color: '#73778F',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
  },
  gridItemValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#131124',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rewardBadgeText: {
    color: '#EC4899',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTabText: {
    color: '#73778F',
    fontSize: 14,
    fontWeight: '500',
  }
});
