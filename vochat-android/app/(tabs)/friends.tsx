import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  StatusBar,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../api';
import { Theme } from '../../constants/Theme';

// Dynamic Friends Data

export default function FriendsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get('/friend');
      const apiFriends = res.data?.data?.friends || res.data?.data || [];
      
      if (Array.isArray(apiFriends)) {
        const formatted = apiFriends.map((f: any) => ({
          id: f.id || f.friendId || f._id,
          name: f.name || f.username || 'Friend',
          status: f.isOnline ? 'Online' : 'Offline',
          isOnline: !!f.isOnline,
          isGroup: false,
          hasStreak: f.hasStreak || false,
        }));
        setFriendsList(formatted);
        setOnlineUsers(formatted.filter((f: any) => f.isOnline));
      }
    } catch (err) {
      console.log('Error loading friends list:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFriends();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Friends</Text>
            <Text style={styles.headerSubtitle}>People who matter 💜</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="user-plus" size={20} color="#FFF" />
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
        
        {/* Filter Chips */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {['All', 'Online', 'Close Friends', 'Requests'].map((filter) => {
              const isActive = activeFilter === filter;
              let label = filter;
              if (filter === 'Online') label = 'Online 🟢';
              if (filter === 'Close Friends') label = 'Close Friends ⭐️';
              if (filter === 'Requests') label = 'Requests 3';

              return (
                <TouchableOpacity 
                  key={filter} 
                  style={[
                    styles.filterChip, 
                    isActive ? styles.activeFilterChip : null
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[
                    styles.filterText,
                    isActive ? styles.activeFilterText : null
                  ]}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Promotional Card */}
        <View style={styles.promoCardContainer}>
          <LinearGradient
            colors={['#1F1633', '#110C24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoLeft}>
              <View style={styles.mascotBg}>
                <Ionicons name="logo-octocat" size={32} color={Theme.colors.primary} />
                <View style={styles.mascotEyeRow}>
                  <View style={styles.mascotEye} />
                  <View style={styles.mascotEye} />
                </View>
              </View>
            </View>

            <View style={styles.promoMiddle}>
              <Text style={styles.promoTitle}>Add more friends</Text>
              <Text style={styles.promoSubtitle}>Chat, share voice snaps and keep your streaks alive!</Text>
            </View>

            <TouchableOpacity style={styles.promoCtaBtn}>
              <Text style={styles.promoCtaText}>Find Friends</Text>
              <Feather name="chevron-right" size={14} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Online Now Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.onlineStatusDot} />
            <Text style={styles.sectionTitle}>Online Now</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.onlineScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineScroll}>
            {onlineUsers.map((user) => (
              <View key={user.id} style={styles.onlineAvatarCard}>
                <View style={[
                  styles.avatarBorderRing,
                  user.hasStreak ? styles.avatarBorderRingStreak : null
                ]}>
                  <View style={styles.onlineAvatarInner}>
                    <Text style={styles.avatarLetter}>{user.name[0]}</Text>
                  </View>
                  {user.hasStreak ? (
                    <View style={styles.avatarStreakIconBg}>
                      <FontAwesome5 name="fire" size={8} color="#FFF" />
                    </View>
                  ) : (
                    <View style={styles.avatarOnlineDotGreen} />
                  )}
                </View>
                <Text style={styles.onlineName} numberOfLines={1}>{user.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* All Friends Section */}
        <View style={styles.sectionHeaderFriends}>
          <Text style={styles.sectionTitle}>All Friends</Text>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortText}>Sort</Text>
            <Ionicons name="swap-vertical-outline" size={14} color={Theme.colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Friends Cards */}
        <View style={styles.friendsList}>
          {friendsList.map((friend) => (
            <View key={friend.id} style={styles.friendCard}>
              <View style={styles.friendLeft}>
                <View style={styles.friendAvatarRing}>
                  <View style={styles.friendAvatarInner}>
                    {friend.isGroup ? (
                      <Ionicons name="people" size={18} color={Theme.colors.primary} />
                    ) : (
                      <Text style={styles.avatarLetter}>{friend.name[0]}</Text>
                    )}
                  </View>
                  {friend.isOnline && <View style={styles.friendOnlineDot} />}
                </View>

                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={[
                    styles.friendStatusText,
                    friend.isOnline ? { color: Theme.colors.green } : null
                  ]}>
                    {friend.isOnline ? '• Online' : friend.status}
                  </Text>
                </View>
              </View>

              <View style={styles.friendActions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Theme.colors.primary} />
                </TouchableOpacity>
                {!friend.isGroup && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnVoice]}>
                    <MaterialCommunityIcons name="waveform" size={16} color={Theme.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131124',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#73778F',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131124',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.radius.button,
    backgroundColor: '#131124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeFilterChip: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterText: {
    color: '#B3B6C7',
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFF',
  },
  promoCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  promoLeft: {
    marginRight: 12,
  },
  mascotBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mascotEyeRow: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 12,
  },
  mascotEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  promoMiddle: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  promoSubtitle: {
    color: '#B3B6C7',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  promoCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  promoCtaText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 8,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#73778F',
    fontSize: 13,
    fontWeight: '600',
  },
  onlineScrollContainer: {
    marginBottom: 28,
  },
  onlineScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  onlineAvatarCard: {
    alignItems: 'center',
    gap: 8,
  },
  avatarBorderRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarBorderRingStreak: {
    borderColor: Theme.colors.orange,
  },
  onlineAvatarInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#1E202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarStreakIconBg: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Theme.colors.orange,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#07050C',
  },
  avatarOnlineDotGreen: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#34D399',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#07050C',
  },
  onlineName: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 64,
    textAlign: 'center',
  },
  sectionHeaderFriends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    color: '#73778F',
    fontSize: 13,
    fontWeight: '600',
  },
  friendsList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131124',
    borderRadius: Theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  friendAvatarInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#1E202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 1.5,
    borderColor: '#131124',
  },
  friendInfo: {
    marginLeft: 12,
  },
  friendName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  friendStatusText: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnVoice: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  }
});
