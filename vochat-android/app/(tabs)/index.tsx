import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform, 
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  TextInput,
  RefreshControl
} from 'react-native';
import { FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { Theme } from '../../constants/Theme';
import { StoriesBar, StoryUserGroup } from '../../components/StoriesBar';
import { StoryViewerModal } from '../../components/StoryViewerModal';
import { initSocket } from '../socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic Conversations

export default function FeedScreen() {
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // Stories states
  const [storyGroups, setStoryGroups] = useState<StoryUserGroup[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryUserGroup | null>(null);
  const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);

  const loadStories = async () => {
    try {
      const res = await api.get('/stories/feed');
      if (res.data?.data?.storyGroups && Array.isArray(res.data.data.storyGroups)) {
        setStoryGroups(res.data.data.storyGroups);
        return;
      }

      const rawStories = res.data?.data?.stories || (Array.isArray(res.data?.data) ? res.data?.data : []);
      const groupedMap = new Map<string, StoryUserGroup>();
      
      rawStories.forEach((story: any) => {
        const u = story.user || { id: story.userId, name: 'User' };
        if (!groupedMap.has(u.id)) {
          groupedMap.set(u.id, {
            user: u,
            stories: [],
          });
        }
        groupedMap.get(u.id)?.stories.push({
          id: story.id,
          audioUrl: story.audioUrl,
          duration: story.duration,
          caption: story.caption,
          createdAt: story.createdAt,
        });
      });
      setStoryGroups(Array.from(groupedMap.values()));
    } catch (err) {
      console.log('Error fetching stories:', err);
    }
  };

  // Load backend data if available, but merge with mock data
  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await loadStories();

      const res = await api.get('/messages/conversations');
      const backendConvs = res.data?.data?.conversations || res.data?.data || [];
      
      if (Array.isArray(backendConvs)) {
        const formatted = backendConvs.map(conv => ({
          ...conv,
          friend: conv.friend || { id: 'unknown', name: 'Unknown' },
          latestMessage: conv.latestMessage || { isPlayed: true },
          unreadCount: conv.unreadCount || 0,
          streakCount: conv.streakCount || 0,
          statusText: conv.statusText || (conv.latestMessage?.isPlayed ? 'Voice snap opened' : 'New message'),
          time: conv.time || 'Just now',
        }));
        setConversations(formatted);
      }
    } catch (err) {
      console.log('Error fetching conversations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Immediately reload stories when navigating back with refresh=stories param
  useEffect(() => {
    if (refresh === 'stories') {
      loadStories();
    }
  }, [refresh]);

  useEffect(() => {
    let activeSocket: any = null;
    const setupSocket = async () => {
      activeSocket = await initSocket();
      if (activeSocket) {
        activeSocket.on('message:received', () => {
          loadData();
        });
        activeSocket.on('user:status', () => {
          loadData();
        });
      }
    };
    setupSocket();
    return () => {
      if (activeSocket) {
        activeSocket.off('message:received');
        activeSocket.off('user:status');
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSelectStoryGroup = (group: StoryUserGroup) => {
    setSelectedStoryGroup(group);
    setIsStoryViewerVisible(true);
  };

  const getFilteredConversations = () => {
    if (activeFilter === 'Unread') {
      return conversations.filter(c => c.unreadCount > 0);
    }
    if (activeFilter === 'Groups') {
      return conversations.filter(c => c.friend.isGroup);
    }
    if (activeFilter === 'Streaks') {
      return conversations.filter(c => c.streakCount > 0);
    }
    return conversations;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Chats</Text>
          <Text style={styles.headerSubtitle}>Your voice world ✨</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
            <Feather name="settings" size={20} color={Theme.colors.textPrimary} />
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
        
        {/* Horizontal Stories Bar */}
        <StoriesBar 
          storyGroups={storyGroups} 
          onSelectStoryGroup={handleSelectStoryGroup} 
        />
        
        {/* Filter Chips (Horizontal Scroll) */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {['All', 'Unread', 'Groups', 'Streaks'].map((filter) => {
              const isActive = activeFilter === filter;
              let label = filter;
              if (filter === 'Unread') label = 'Unread 3';
              if (filter === 'Streaks') label = 'Streaks 🔥';

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
              );
            })}
            <TouchableOpacity style={styles.filterSettingsButton}>
              <Feather name="sliders" size={16} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Top Hero Card - Besties Streak */}
        <TouchableOpacity 
          style={styles.heroCardContainer} 
          activeOpacity={0.9}
          onPress={() => router.push('/streaks')}
        >
          <LinearGradient
            colors={['#1F1633', '#110C24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Soft inner purple glow */}
            <View style={styles.heroCardGlow} />
            
            <View style={styles.heroLeft}>
              {/* Animated Flame Container */}
              <View style={styles.flameContainer}>
                <LinearGradient
                  colors={['#FF8C2B', '#FF3E00']}
                  style={styles.flameCircle}
                >
                  <FontAwesome5 name="fire" size={24} color="#FFF" />
                </LinearGradient>
                <View style={styles.streakBadgeTextContainer}>
                  <Text style={styles.streakNumber}>25</Text>
                  <Text style={styles.streakDays}>day streak</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroMiddle}>
              <Text style={styles.heroTitle}>Besties Streak 💜</Text>
              <Text style={styles.heroSubtitle}>You and Ishika are on fire!</Text>
              
              {/* Daily Streak Tracker Indicator Dots */}
              <View style={styles.streakIndicatorRow}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.indicatorDot, 
                      i <= 5 ? styles.indicatorDotActive : styles.indicatorDotInactive
                    ]} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.heroRight}>
              <Feather name="chevron-right" size={20} color={Theme.colors.textSecondary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Conversation List cards */}
        <View style={styles.chatList}>
          {getFilteredConversations().map((chat) => {
            const isUnread = chat.unreadCount > 0;
            const isPlayed = chat.latestMessage.isPlayed;
            const isGroup = chat.friend.isGroup;

            return (
              <TouchableOpacity 
                key={`chat-${chat.friend.id}`} 
                style={[
                  styles.chatCard,
                  isGroup ? styles.chatCardGroup : null
                ]}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: chat.friend.id } })}
              >
                <View style={styles.cardAvatarContainer}>
                  {/* Outer ring for avatar */}
                  <View style={[
                    styles.avatarRing,
                    chat.streakCount > 0 ? styles.avatarRingStreak : null
                  ]}>
                    <View style={styles.avatarInner}>
                      {chat.friend.isGroup ? (
                        <View style={styles.groupAvatarBg}>
                          <Ionicons name="people" size={20} color={Theme.colors.primary} />
                        </View>
                      ) : (
                        <View style={[styles.avatarTextBg, { backgroundColor: chat.streakCount > 0 ? '#1F1235' : '#1A1B29' }]}>
                          <Text style={styles.avatarText}>{chat.friend.name?.[0]}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {chat.friend.isOnline && <View style={styles.cardOnlineDot} />}
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.contactName}>{chat.friend.name}</Text>
                    {chat.streakCount > 0 && (
                      <View style={styles.streakIndicator}>
                        <FontAwesome5 name="fire" size={10} color={Theme.colors.orange} />
                        <Text style={styles.streakCount}>{chat.streakCount}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusRow}>
                    {!isGroup && !isPlayed && chat.waveform ? (
                      // Audio Waveform preview
                      <View style={styles.waveformContainer}>
                        <TouchableOpacity style={styles.miniPlayButton}>
                          <Ionicons name="play" size={10} color={Theme.colors.primary} />
                        </TouchableOpacity>
                        <View style={styles.miniWaveform}>
                          {chat.waveform.map((h: number, i: number) => (
                            <View 
                              key={i} 
                              style={[
                                styles.waveBar, 
                                { height: h * 0.5, backgroundColor: Theme.colors.primary }
                              ]} 
                            />
                          ))}
                        </View>
                        <Text style={styles.durationText}>0:06</Text>
                      </View>
                    ) : !isGroup && isPlayed && chat.latestMessage.duration ? (
                      // Played audio voice snap
                      <View style={styles.waveformContainer}>
                        <Ionicons name="play-outline" size={12} color={Theme.colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.statusTextMuted}>Voice snap opened</Text>
                      </View>
                    ) : (
                      // Text Status (e.g. Group messages)
                      <Text style={styles.statusText} numberOfLines={1}>
                        {chat.statusText}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.timeText}>{chat.time}</Text>
                  <View style={styles.badgeRow}>
                    {isUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadCountText}>{chat.unreadCount}</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={16} color={Theme.colors.textMuted} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fullscreen Story Viewer Modal */}
      <StoryViewerModal 
        visible={isStoryViewerVisible} 
        storyGroup={selectedStoryGroup} 
        onClose={() => setIsStoryViewerVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-condensed',
  },
  headerSubtitle: {
    color: Theme.colors.textMuted,
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
    backgroundColor: Theme.colors.surface,
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
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Theme.radius.button,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeFilterChip: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFF',
  },
  filterSettingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    marginLeft: 4,
  },
  heroCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    filter: Platform.OS === 'ios' ? 'blur(30px)' : 'none',
  },
  heroLeft: {
    marginRight: 16,
  },
  flameContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  flameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  streakBadgeTextContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  streakNumber: {
    color: Theme.colors.orange,
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakDays: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
  },
  heroMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  streakIndicatorRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorDotActive: {
    backgroundColor: Theme.colors.orange,
  },
  indicatorDotInactive: {
    backgroundColor: '#2D221D',
  },
  heroRight: {
    marginLeft: 12,
  },
  chatList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  chatCardGroup: {
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  cardAvatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingStreak: {
    borderColor: Theme.colors.orange,
  },
  avatarInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarTextBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupAvatarBg: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: Theme.colors.green,
    borderWidth: 2,
    borderColor: Theme.colors.surface,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(255, 140, 43, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakCount: {
    color: Theme.colors.orange,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniPlayButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  miniWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
  durationText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 8,
  },
  statusText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  statusTextMuted: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  timeText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  }
});
