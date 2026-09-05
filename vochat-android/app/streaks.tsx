import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Platform,
  Dimensions,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from './api';
import { Theme } from '../constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic Streaks Data

export default function StreaksScreen() {
  const [streaks, setStreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStreaks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/streaks');
      const apiStreaks = res.data?.data?.streaks || res.data?.data || [];

      if (Array.isArray(apiStreaks)) {
        const formatted = apiStreaks.map((s: any) => ({
          id: s.id || s._id,
          name: s.friend?.name || s.friend?.username || 'Friend',
          category: s.streakCount >= 20 ? 'Best Friends 🔥' : s.streakCount >= 10 ? 'Close Friends 💜' : 'Friends 🤝',
          streakCount: s.streakCount || 0,
          isOnline: !!s.friend?.isOnline,
        }));
        setStreaks(formatted);
      }
    } catch (err) {
      console.log('Error loading streaks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStreaks();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStreaks();
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Streaks 🔥</Text>
            <Text style={styles.headerSubtitle}>Friendship on fire! Keep it going. 💜</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton}>
          <Feather name="info" size={20} color="#FFF" />
        </TouchableOpacity>
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
        
        {/* Large Hero Card */}
        <View style={styles.heroCardContainer}>
          <LinearGradient
            colors={['#1F1633', '#110C24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Top stats section */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Your Streak</Text>
                <View style={styles.heroStatValRow}>
                  <Text style={styles.heroStatVal}>25</Text>
                  <FontAwesome5 name="fire" size={18} color={Theme.colors.orange} style={{ marginLeft: 6 }} />
                  <Text style={styles.heroStatValText}>days</Text>
                </View>
                <View style={styles.bestRecordBadge}>
                  <Text style={styles.bestRecordText}>🏆 Best: 32 days</Text>
                </View>
              </View>

              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Longest Streak</Text>
                <View style={styles.heroStatValRow}>
                  <Text style={styles.heroStatVal}>32</Text>
                  <Text style={styles.heroStatValText}> days</Text>
                </View>
                <View style={styles.longestWithRow}>
                  <Text style={styles.longestWithText}>with Ishika</Text>
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>I</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Giant Flame Graphic Placeholder */}
            <View style={styles.giantFlameContainer}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(219, 39, 119, 0.05)']}
                style={styles.giantFlameBase}
              >
                <LinearGradient
                  colors={['#FF8C2B', '#FF2A54', '#7C3AED']}
                  style={styles.giantFlame}
                >
                  <FontAwesome5 name="fire" size={48} color="#FFF" />
                </LinearGradient>
              </LinearGradient>
            </View>

            {/* Weekly Tracker */}
            <View style={styles.weeklyTrackerContainer}>
              <View style={styles.trackerRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                  const isCompleted = i < 5; // Monday to Friday completed
                  const isCurrent = i === 5; // Saturday is current (uncompleted dot)

                  return (
                    <View key={day} style={styles.trackerDayCol}>
                      <Text style={styles.trackerDayLabel}>{day}</Text>
                      {isCompleted ? (
                        <View style={styles.trackerDotCompleted}>
                          <Feather name="check" size={10} color="#FFF" />
                        </View>
                      ) : isCurrent ? (
                        <View style={styles.trackerDotCurrent} />
                      ) : (
                        <View style={styles.trackerDotEmpty} />
                      )}
                    </View>
                  );
                })}
              </View>
              <Text style={styles.weeklyTrackerSubtitle}>
                Keep the streak alive! Chat or send a snap today. 🚀
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Your Streaks List Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Streaks</Text>
          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortText}>Sort</Text>
            <Ionicons name="swap-vertical-outline" size={14} color={Theme.colors.primary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.streaksList}>
          {streaks.map((friend) => (
            <TouchableOpacity 
              key={friend.id} 
              style={styles.streakCard}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: friend.id } })}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.avatarRing, styles.avatarRingStreak]}>
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarLetter}>{friend.name[0]}</Text>
                  </View>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendCategory}>{friend.category}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.streakCountText}>{friend.streakCount}</Text>
                <FontAwesome5 name="fire" size={14} color={Theme.colors.orange} style={{ marginLeft: 6 }} />
                <Feather name="chevron-right" size={16} color={Theme.colors.textMuted} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom CTA - Streak Freeze */}
        <View style={styles.streakFreezeContainer}>
          <LinearGradient
            colors={['#17192C', '#0E101F']}
            style={styles.streakFreezeCard}
          >
            <View style={styles.freezeLeft}>
              <View style={styles.freezeIconBg}>
                <Feather name="zap" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.freezeInfo}>
                <Text style={styles.freezeTitle}>Streak Freeze</Text>
                <Text style={styles.freezeSubtitle}>Protect your streak in case you miss a day.</Text>
                <Text style={styles.freezeCountText}>You have <Text style={{ color: '#8B5CF6', fontWeight: 'bold' }}>1 freeze</Text></Text>
              </View>
            </View>

            <TouchableOpacity style={styles.useFreezeBtn}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={styles.useFreezeGradient}
              >
                <Text style={styles.useFreezeText}>Use Freeze</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

      </ScrollView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surface,
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
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  heroCard: {
    borderRadius: Theme.radius.card,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    flexDirection: 'column',
  },
  heroStatLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  heroStatValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroStatVal: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroStatValText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  bestRecordBadge: {
    backgroundColor: 'rgba(255, 140, 43, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  bestRecordText: {
    color: Theme.colors.orange,
    fontSize: 10,
    fontWeight: 'bold',
  },
  longestWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  longestWithText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginRight: 6,
    fontWeight: '500',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  giantFlameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  giantFlameBase: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giantFlame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C2B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  weeklyTrackerContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 20,
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  trackerDayCol: {
    alignItems: 'center',
    gap: 8,
  },
  trackerDayLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  trackerDotCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackerDotCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
  },
  trackerDotEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: '#202330',
  },
  weeklyTrackerSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  streaksList: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
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
    borderRadius: 20,
    backgroundColor: '#1E202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendInfo: {
    marginLeft: 12,
  },
  friendName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  friendCategory: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakCountText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  streakFreezeContainer: {
    paddingHorizontal: 24,
  },
  streakFreezeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  freezeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  freezeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  freezeInfo: {
    flex: 1,
  },
  freezeTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  freezeSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  freezeCountText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  useFreezeBtn: {
    borderRadius: Theme.radius.button,
    overflow: 'hidden',
  },
  useFreezeGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useFreezeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
