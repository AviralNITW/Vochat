import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Switch,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { showToast } from '../components/Toast';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { Theme } from '../constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dynamic Recipients

const LEFT_WAVEFORM = [10, 14, 18, 22, 12, 16, 26, 32, 20, 14, 28, 38, 24, 18, 12, 16, 8, 10];
const RIGHT_WAVEFORM = [10, 8, 16, 12, 18, 24, 38, 28, 14, 20, 32, 26, 16, 12, 22, 18, 14, 10];

const VOICE_FILTERS = [
  { id: 'original', name: 'Original', icon: 'mic', family: 'Ionicons' },
  { id: 'robot', name: 'Robot', icon: 'robot', family: 'MaterialCommunityIcons' },
  { id: 'deep', name: 'Deep Voice', icon: 'waveform', family: 'MaterialCommunityIcons' },
  { id: 'spy', name: 'Spy Mode', icon: 'incognito', family: 'MaterialCommunityIcons' }
];

export default function VoicePreviewScreen() {
  const { uri, duration, type } = useLocalSearchParams<{ uri: string; duration: string; type: string }>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [caption, setCaption] = useState('');
  const [voiceBoost, setVoiceBoost] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(Number(duration) || 7000);
  
  const [publishType, setPublishType] = useState<'Post' | 'Message' | 'Story'>(
    (type === 'Story' || type === 'Stories') ? 'Story' : (type as any) || 'Post'
  );
  const [audience, setAudience] = useState<'All' | 'Close Friends' | 'Following'>('All');
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const uStr = await AsyncStorage.getItem('user');
        if (uStr) {
          setCurrentUser(JSON.parse(uStr));
        } else {
          const res = await api.get('/auth/me');
          if (res.data?.data?.user) {
            setCurrentUser(res.data.data.user);
            await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));
          }
        }
      } catch (e) {}
    };
    const loadFriends = async () => {
      try {
        const res = await api.get('/friend');
        const apiFriends = res.data?.data?.friends || res.data?.data || [];
        if (Array.isArray(apiFriends)) {
          const formatted = apiFriends.map((f: any) => ({
            id: f.id || f.friendId || f._id,
            name: f.name || f.username || 'Friend',
            initial: (f.name || f.username || 'F').charAt(0).toUpperCase(),
          }));
          setFriends(formatted);
        }
      } catch (err) {
        console.log('Error loading friends:', err);
      }
    };
    
    loadFriends();
    loadCurrentUser();
  }, []);

  // Setup sound on mount
  useEffect(() => {
    if (uri) {
      loadSound();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [uri]);

  const getTargetUri = () => {
    if (!uri) return '';
    const raw = Array.isArray(uri) ? uri[0] : uri;
    let target = raw;
    try {
      target = decodeURIComponent(raw);
    } catch (e) {}

    if (Platform.OS === 'android' && target.startsWith('/data/user/')) {
      target = `file://${target}`;
    }
    return target;
  };

  const getFilterAudioParams = (filterId: string) => {
    if (filterId === 'robot') {
      return { rate: 0.95, shouldCorrectPitch: false };
    } else if (filterId === 'deep') {
      return { rate: 0.8, shouldCorrectPitch: false };
    } else if (filterId === 'spy') {
      return { rate: 1.35, shouldCorrectPitch: false };
    }
    return { rate: 1.0, shouldCorrectPitch: true };
  };

  useEffect(() => {
    if (sound) {
      const { rate, shouldCorrectPitch } = getFilterAudioParams(selectedFilter);
      sound.setRateAsync(rate, shouldCorrectPitch).catch(() => {});
    }
  }, [selectedFilter, sound]);

  const loadSound = async () => {
    const targetUri = getTargetUri();
    if (!targetUri) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { rate, shouldCorrectPitch } = getFilterAudioParams(selectedFilter);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: targetUri },
        { shouldPlay: false, rate, shouldCorrectPitch }
      );
      
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPositionMillis(status.positionMillis);
          setDurationMillis(status.durationMillis || durationMillis);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.setPositionAsync(0);
          }
        }
      });
      setSound(newSound);
    } catch (e: any) {
      console.log('Error loading preview sound:', e?.message || e);
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const toggleRecipient = (id: string) => {
    if (id === 'add_more') return;
    if (selectedRecipients.includes(id)) {
      setSelectedRecipients(selectedRecipients.filter(r => r !== id));
    } else {
      setSelectedRecipients([...selectedRecipients, id]);
    }
  };

  const handleSend = async () => {
    if (publishType === 'Message' && selectedRecipients.length === 0) {
      showToast({ type: 'warning', message: 'Who is it for?', subtitle: 'Please select at least one recipient.' });
      return;
    }
    
    try {
      setIsSending(true);
      
      const targetUri = getTargetUri();
      let finalAudioUrl = targetUri;

      if (targetUri && (targetUri.startsWith('file://') || targetUri.startsWith('/'))) {
        const formData = new FormData();
        const filename = targetUri.split('/').pop() || `snap_${Date.now()}.m4a`;
        const match = /\.(\w+)$/.exec(filename);
        const extension = match ? match[1] : 'm4a';
        const mimeType = `audio/${extension}`;

        const uploadUri = Platform.OS === 'android' 
          ? (targetUri.startsWith('file://') ? targetUri : `file://${targetUri}`)
          : targetUri.replace('file://', '');

        formData.append('file', {
          uri: uploadUri,
          name: filename,
          type: mimeType,
        } as any);
        formData.append('folder', 'messages');

        const uploadRes = await api.post('/media/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const rawUrl = uploadRes.data.data.url;
        finalAudioUrl = `${rawUrl}?boost=${voiceBoost ? 'true' : 'false'}`;
      }

      if (publishType === 'Message') {
        // Send message
        await Promise.all(selectedRecipients.map(recipientId => 
          api.post('/messages/send', {
            receiverId: recipientId,
            audioUrl: finalAudioUrl,
            duration: Math.round(durationMillis / 1000) || 1,
            caption: caption,
            voiceFilter: selectedFilter
          })
        ));
      } else if (publishType === 'Story') {
        // Publish as 24h Voice Story
        await api.post('/stories/create', {
          audioUrl: finalAudioUrl,
          duration: Math.round(durationMillis / 1000) || 1,
          caption: caption,
          voiceFilter: selectedFilter,
        });
      } else {
        // Publish as Voice Post / Feed
        await api.post('/posts/create', {
          audioUrl: finalAudioUrl,
          duration: Math.round(durationMillis / 1000) || 1,
          caption: caption,
          audience: audience === 'All' ? 'ALL' : 'FRIENDS',
          voiceFilter: selectedFilter
        });
      }

      showToast({ type: 'success', message: `${publishType} published! 🚀`, subtitle: 'Your voice snap has been shared.', duration: 3000 });
      router.replace({ pathname: '/(tabs)', params: { refresh: 'stories' } });
    } catch (err: any) {
      console.log('Error sending:', err);
      showToast({ type: 'error', message: 'Failed to send', subtitle: 'Could not share the snap', duration: 3000 });
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Voice Snap Preview</Text>
          <View style={styles.encryptedSubtitle}>
            <Ionicons name="shield-checkmark" size={12} color="#8B5CF6" style={{ marginRight: 4 }} />
            <Text style={styles.encryptedText}>End-to-end Encrypted</Text>
          </View>
        </View>

        <View style={styles.deleteBadge}>
          <Ionicons name="time-outline" size={14} color="#FF8C2B" style={{ marginRight: 4 }} />
          <Text style={styles.deleteBadgeText}>Auto-delete{"\n"}After listen</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Top Type Selector (Allow changing type during preview) */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentBar}>
            {['Post', 'Story', 'Message'].map((typeOption) => {
              const isActive = publishType === typeOption;
              return (
                <TouchableOpacity 
                  key={typeOption}
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                  onPress={() => setPublishType(typeOption as any)}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {typeOption}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Main Card (Preview Player) */}
        <View style={styles.previewCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.sparkleLeft}>
              <Ionicons name="sparkles" size={12} color="rgba(180, 108, 255, 0.4)" />
            </View>
            <View style={styles.sparkleRight}>
              <Ionicons name="sparkles" size={14} color="rgba(180, 108, 255, 0.6)" />
            </View>
            <View style={styles.avatarBorder}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : 'V'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.recipientNameText}>
            {currentUser?.name || 'Aviral'} <FontAwesome5 name="fire" size={16} color={Theme.colors.orange} /> <Text style={{ color: Theme.colors.orange }}>{currentUser?.streakCount || 24}</Text>
          </Text>
          <Text style={styles.onlineStatusText}>🟢 Online</Text>

          {/* Waveform Player */}
          <View style={styles.playerContainer}>
            <View style={styles.waveformHalf}>
              {LEFT_WAVEFORM.map((h, i) => (
                <View 
                  key={`left-${i}`} 
                  style={[
                    styles.waveBar, 
                    { height: h * 1.2, backgroundColor: '#8B5CF6' }
                  ]} 
                />
              ))}
            </View>

            <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#FFF" style={!isPlaying && { marginLeft: 2 }} />
            </TouchableOpacity>

            <View style={styles.waveformHalf}>
              {RIGHT_WAVEFORM.map((h, i) => (
                <View 
                  key={`right-${i}`} 
                  style={[
                    styles.waveBar, 
                    { height: h * 1.2, backgroundColor: '#8B5CF6' }
                  ]} 
                />
              ))}
            </View>
          </View>

          <View style={styles.timersRow}>
            <Text style={styles.timeLabel}>0:00</Text>
            <Text style={styles.timeLabel}>{formatTime(durationMillis)}</Text>
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="time" size={18} color="#8B5CF6" style={{ marginRight: 10 }} />
            <Text style={styles.infoBannerText}>
              This voice snap will disappear immediately after it's played.
            </Text>
            <Ionicons name="shield-outline" size={18} color="#8B5CF6" style={{ marginLeft: 10 }} />
          </View>
        </View>

        {/* Dynamic section: Send to (for Message) vs Share Target (for Reels/Post) */}
        {publishType === 'Message' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Send to</Text>
              <TouchableOpacity style={styles.createGroupBtn}>
                <Ionicons name="people-outline" size={16} color="#8B5CF6" style={{ marginRight: 4 }} />
                <Text style={styles.createGroupText}>Create Group</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recipientsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientsScroll}>
                <TouchableOpacity key="add_more" style={styles.recipientItem}>
                  <View style={styles.addMoreAvatar}>
                    <Feather name="plus" size={24} color="#73778F" />
                  </View>
                  <Text style={styles.recipientLabel}>Add more</Text>
                </TouchableOpacity>

                {friends.map((friend) => {
                  const isSelected = selectedRecipients.includes(friend.id);
                  
                  return (
                    <TouchableOpacity 
                      key={friend.id} 
                      style={styles.recipientItem}
                      onPress={() => toggleRecipient(friend.id)}
                    >
                      <View style={[styles.avatarBorderRing, isSelected && styles.avatarBorderRingActive]}>
                        <View style={styles.avatarBoxInner}>
                          <Text style={styles.avatarText}>{friend.initial}</Text>
                        </View>
                        {isSelected ? (
                          <View style={styles.checkOverlayBadge}>
                            <Feather name="check" size={10} color="#FFF" />
                          </View>
                        ) : (
                          <View style={styles.circleOverlayBadge} />
                        )}
                      </View>
                      <Text style={[styles.recipientLabel, isSelected && styles.recipientLabelActive]}>
                        {friend.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.fieldTitle}>Select Audience</Text>
            <View style={styles.audienceContainer}>
              {['All', 'Following', 'Close Friends'].map((option) => {
                const isActive = audience === option;
                return (
                  <TouchableOpacity 
                    key={option}
                    style={[styles.audienceChip, isActive && styles.audienceChipActive]}
                    onPress={() => setAudience(option as any)}
                  >
                    <Text style={[styles.audienceText, isActive && styles.audienceTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {/* Voice Filters Section */}
        <Text style={styles.fieldTitle}>Voice Filter</Text>
        <View style={styles.filtersWrapper}>
          {VOICE_FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={styles.filterBtnWrapper}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <View style={[styles.filterIconCircle, isActive && styles.filterIconCircleActive]}>
                  {filter.family === 'Ionicons' ? (
                    <Ionicons name={filter.icon as any} size={20} color={isActive ? '#FFF' : '#73778F'} />
                  ) : (
                    <MaterialCommunityIcons name={filter.icon as any} size={20} color={isActive ? '#FFF' : '#73778F'} />
                  )}
                </View>
                <Text style={[styles.filterBtnLabel, isActive && styles.filterBtnLabelActive]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add caption section */}
        <Text style={styles.fieldTitle}>Add a caption <Text style={{ textTransform: 'lowercase', color: '#73778F' }}>(optional)</Text></Text>
        <View style={styles.captionBox}>
          <TextInput
            placeholder="Say something..."
            placeholderTextColor="#73778F"
            value={caption}
            onChangeText={(text) => {
              if (text.length <= 60) setCaption(text);
            }}
            style={styles.captionInput}
          />
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={20} color="#73778F" />
          </TouchableOpacity>
          <Text style={styles.counterText}>{caption.length}/60</Text>
        </View>

        {/* Voice Boost Card */}
        <View style={styles.voiceBoostCard}>
          <View style={styles.boostLeft}>
            <Ionicons name="sparkles" size={18} color="#8B5CF6" style={styles.boostIcon} />
            <View>
              <Text style={styles.boostTitle}>Voice Boost</Text>
              <Text style={styles.boostSubtitle}>Make your voice clearer and louder.</Text>
            </View>
          </View>
          <Switch
            value={voiceBoost}
            onValueChange={setVoiceBoost}
            trackColor={{ false: '#1A172A', true: '#8B5CF6' }}
            thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
          />
        </View>

        {/* Send Capsule CTA */}
        <TouchableOpacity 
          style={styles.sendBtnWrapper}
          onPress={handleSend}
          disabled={isSending}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendBtn}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Feather name="send" size={16} color="#FFF" style={{ marginRight: 8, transform: [{ rotate: '-15deg' }] }} />
                <Text style={styles.sendBtnText}>
                  {publishType === 'Message' ? 'Send Voice Snap' : `Publish as ${publishType}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  encryptedSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  encryptedText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 140, 43, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 43, 0.2)',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  deleteBadgeText: {
    color: '#FF8C2B',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  segmentContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
  previewCard: {
    backgroundColor: '#131124',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    marginVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  sparkleLeft: {
    position: 'absolute',
    left: -12,
    top: 12,
  },
  sparkleRight: {
    position: 'absolute',
    right: -14,
    bottom: 12,
  },
  avatarBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#B46CFF',
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#2D3449',
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recipientNameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  onlineStatusText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  waveformHalf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    justifyContent: 'center',
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  timersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  timeLabel: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151229',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  infoBannerText: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  createGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createGroupText: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: 'bold',
  },
  recipientsContainer: {
    marginBottom: 16,
  },
  recipientsScroll: {
    gap: 12,
  },
  recipientItem: {
    alignItems: 'center',
    width: 72,
  },
  addMoreAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2D2845',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorderRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#1D1A35',
    padding: 2,
    position: 'relative',
  },
  avatarBorderRingActive: {
    borderColor: '#8B5CF6',
  },
  avatarBoxInner: {
    flex: 1,
    backgroundColor: '#2D3449',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOverlayBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8B5CF6',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#07050C',
  },
  circleOverlayBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#07050C',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#73778F',
  },
  recipientLabel: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  recipientLabelActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  audienceContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  audienceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.radius.button,
    backgroundColor: '#131124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  audienceChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  audienceText: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '600',
  },
  audienceTextActive: {
    color: '#FFF',
  },
  fieldTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#131124',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  filterBtnWrapper: {
    alignItems: 'center',
    width: 68,
  },
  filterIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterIconCircleActive: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterBtnLabel: {
    color: '#73778F',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
  },
  filterBtnLabelActive: {
    color: '#FFF',
  },
  captionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131124',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 20,
    position: 'relative',
  },
  captionInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    height: 40,
    paddingRight: 60,
  },
  emojiBtn: {
    position: 'absolute',
    right: 50,
  },
  counterText: {
    position: 'absolute',
    right: 16,
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
  },
  voiceBoostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131124',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: 24,
  },
  boostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  boostIcon: {
    marginRight: 12,
  },
  boostTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  boostSubtitle: {
    color: '#73778F',
    fontSize: 11,
    marginTop: 2,
  },
  sendBtnWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
