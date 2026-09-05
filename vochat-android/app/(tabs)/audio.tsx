import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import api from '../api';
import { Theme } from '../../constants/Theme';
import { StoriesBar, StoryUserGroup } from '../../components/StoriesBar';
import { StoryViewerModal } from '../../components/StoryViewerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic Audio Data

export default function AudioScreen() {
  const [activeSegment, setActiveSegment] = useState<'Calls' | 'Voices' | 'Reel'>('Voices');
  const [posts, setPosts] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isFocused = useIsFocused();

  const loadFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts/feed');
      const backendPosts = res.data?.data?.posts || [];
      
      if (Array.isArray(backendPosts)) {
        setPosts(backendPosts);
      }
    } catch (error) {
      console.log('Error fetching posts feed:', error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (isFocused) {
      loadFeed();
      loadStories();
    }
    // Clean up sound on blur
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [isFocused]);

  const handlePlayPause = async (post: any) => {
    try {
      // If tapping the already playing post, toggle state
      if (playingPostId === post.id && sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(false);
        }
        return;
      }

      // Stop previous playback
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPlayingPostId(null);
      }

      // If no valid audioUrl, simulate playing
      if (!post.audioUrl) {
        setPlayingPostId(post.id);
        setIsPlaying(true);
        setTimeout(() => {
          setIsPlaying(false);
          setPlayingPostId(null);
        }, post.duration * 1000);
        return;
      }

      // Load sound from server
      setPlayingPostId(post.id);
      setIsPlaying(true);

      let rate = 1.0;
      let shouldCorrectPitch = true;
      const filterName = post.voiceFilter;

      if (filterName === 'Chipmunk') {
        rate = 1.35;
        shouldCorrectPitch = false;
      } else if (filterName === 'Deep' || filterName === 'Deep Voice') {
        rate = 0.8;
        shouldCorrectPitch = false;
      } else if (filterName === 'Robot') {
        rate = 0.95;
        shouldCorrectPitch = false;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: post.audioUrl },
        { shouldPlay: true, rate, shouldCorrectPitch }
      );

      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlayingPostId(null);
        }
      });
    } catch (error) {
      console.log('Failed to play audio:', error);
      Alert.alert('Playback Error', 'Unable to play this voice post.');
      setIsPlaying(false);
      setPlayingPostId(null);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: !p.isLiked,
            likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
          };
        }
        return p;
      }));

      await api.post(`/posts/${postId}/like`);
    } catch (error) {
      console.log('Failed to toggle like:', error);
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isBookmarked: !p.isBookmarked,
            bookmarksCount: p.isBookmarked ? p.bookmarksCount - 1 : p.bookmarksCount + 1
          };
        }
        return p;
      }));

      await api.post(`/posts/${postId}/bookmark`);
    } catch (error) {
      console.log('Failed to toggle bookmark:', error);
    }
  };

  const getFormatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="user-plus" size={20} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>VOCHAT</Text>
        
        <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>M</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Segment Selector tabs */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentBar}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeSegment === 'Calls' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('Calls')}
          >
            <Text style={[styles.segmentText, activeSegment === 'Calls' && styles.segmentTextActive]}>Calls</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, activeSegment === 'Voices' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('Voices')}
          >
            <View style={styles.voicesLabelContainer}>
              {activeSegment === 'Voices' && (
                <MaterialCommunityIcons name="waveform" size={14} color="#FFF" style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.segmentText, activeSegment === 'Voices' && styles.segmentTextActive]}>Voices</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, activeSegment === 'Reel' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('Reel')}
          >
            <View style={styles.reelLabelContainer}>
              <Text style={[styles.segmentText, activeSegment === 'Reel' && styles.segmentTextActive]}>Reel</Text>
              <View style={styles.redDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Area */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Stories Bar */}
        <StoriesBar 
          storyGroups={storyGroups} 
          onSelectStoryGroup={(group) => {
            setSelectedStoryGroup(group);
            setIsStoryViewerVisible(true);
          }} 
        />

        {activeSegment === 'Voices' && (
          <View style={styles.feedList}>
            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
            ) : (
              posts.map((post) => {
                const isPlayingThis = playingPostId === post.id;
                // Generate waveform if missing
                const bars = post.waveform || [10, 14, 18, 12, 8, 16, 20, 24, 14, 10, 18, 12, 6, 12, 16, 10, 6, 8, 14, 10, 8, 12, 6, 10, 14, 8, 6, 10, 8, 6, 6];
                
                return (
                  <View key={post.id} style={styles.voiceCard}>
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={styles.cardAvatar}>
                          <Text style={styles.avatarLetter}>{(post.user?.name || 'V')[0]}</Text>
                        </View>
                        <View style={styles.headerInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.userName}>{post.user?.name || 'Vochat User'}</Text>
                            <MaterialCommunityIcons name="decagram" size={14} color="#8B5CF6" style={{ marginLeft: 4 }} />
                          </View>
                          <Text style={styles.timeAgo}>@{post.user?.username || 'user'}</Text>
                        </View>
                      </View>
                      
                      {post.voiceFilter && post.voiceFilter !== 'Original' && (
                        <View style={styles.filterBadge}>
                          <Feather name="activity" size={10} color="#00E0FF" style={{ marginRight: 4 }} />
                          <Text style={styles.filterBadgeText}>{post.voiceFilter}</Text>
                        </View>
                      )}
                    </View>

                    {/* Player Block */}
                    <View style={styles.playerBlock}>
                      <TouchableOpacity 
                        style={[styles.playBtn, isPlayingThis && styles.playingBtn]} 
                        onPress={() => handlePlayPause(post)}
                      >
                        <Ionicons 
                          name={isPlayingThis && isPlaying ? "pause" : "play"} 
                          size={16} 
                          color="#FFF" 
                          style={!(isPlayingThis && isPlaying) && { marginLeft: 2 }} 
                        />
                      </TouchableOpacity>
                      
                      {/* Waveform preview */}
                      <View style={styles.waveformContainer}>
                        {bars.map((h: number, i: number) => (
                          <View 
                            key={i} 
                            style={[
                              styles.waveBar, 
                              { 
                                height: h * 0.7, 
                                backgroundColor: isPlayingThis ? '#00E0FF' : '#8B5CF6' 
                              }
                            ]} 
                          />
                        ))}
                      </View>

                      <Text style={styles.durationText}>{getFormatTime(post.duration)}</Text>
                    </View>

                    {/* Caption */}
                    {post.caption && <Text style={styles.captionText}>{post.caption}</Text>}

                    {/* Card Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.actionsLeft}>
                        <TouchableOpacity style={styles.actionItem} onPress={() => handleLike(post.id)}>
                          <Feather 
                            name="heart" 
                            size={16} 
                            color={post.isLiked ? "#FF2A54" : "#B3B6C7"} 
                            style={post.isLiked && styles.likedHeart}
                          />
                          <Text style={[styles.actionCount, post.isLiked && styles.likedCount]}>{post.likesCount}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Comments', 'View and post audio comments coming soon!')}>
                          <Ionicons name="chatbubble-outline" size={16} color="#B3B6C7" />
                          <Text style={styles.actionCount}>{post.commentsCount}</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.bookmarkBtn} onPress={() => handleBookmark(post.id)}>
                        <Feather 
                          name="bookmark" 
                          size={16} 
                          color={post.isBookmarked ? "#00E0FF" : "#B3B6C7"} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeSegment === 'Calls' && (
          <View style={styles.callsList}>
            {calls.length > 0 ? calls.map((call) => (
              <View key={call.id} style={styles.callItem}>
                <View style={styles.callLeft}>
                  <View style={styles.callIconBg}>
                    <Ionicons 
                      name={call.type === 'incoming' ? "call-outline" : "arrow-redo-outline"} 
                      size={18} 
                      color={call.missed ? "#EF4444" : "#34D399"} 
                    />
                  </View>
                  <View>
                    <Text style={styles.callName}>{call.name}</Text>
                    <Text style={styles.callTime}>{call.time}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.callAction}>
                  <Ionicons name="call" size={20} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            )) : (
              <View style={styles.emptyFeed}>
                <Feather name="phone-missed" size={40} color="#73778F" />
                <Text style={styles.emptyText}>No recent calls</Text>
              </View>
            )}
          </View>
        )}

        {activeSegment === 'Reel' && (
          <View style={styles.emptyFeed}>
            <Feather name="film" size={40} color="#73778F" />
            <Text style={styles.emptyText}>Reels feed is coming soon!</Text>
          </View>
        )}

      </ScrollView>

      {/* Story Viewer Modal */}
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
  headerBtn: {
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
    color: '#00E0FF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EC4899',
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#1C152B',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#131124',
    borderRadius: 24,
    padding: 4,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  segmentBtnActive: {
    backgroundColor: '#1C152B',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  segmentText: {
    color: '#73778F',
    fontSize: 13,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: '#FFF',
  },
  voicesLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    position: 'absolute',
    right: -8,
    top: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  feedList: {
    gap: 16,
  },
  voiceCard: {
    backgroundColor: '#131124',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D3449',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeAgo: {
    color: '#73778F',
    fontSize: 11,
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  },
  playerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C152B',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playingBtn: {
    backgroundColor: '#00E0FF',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  durationText: {
    color: '#73778F',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginLeft: 12,
  },
  captionText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  likedHeart: {
    textShadowColor: 'rgba(255, 42, 84, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  likedCount: {
    color: '#FF2A54',
  },
  bookmarkBtn: {
    padding: 4,
  },
  callsList: {
    gap: 12,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131124',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  callLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  callTime: {
    color: '#73778F',
    fontSize: 11,
    marginTop: 2,
  },
  callAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    color: '#73778F',
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 224, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 224, 255, 0.15)',
  },
  filterBadgeText: {
    color: '#00E0FF',
    fontSize: 9,
    fontWeight: 'bold',
  }
});
