import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView, 
  Alert, 
  Platform,
  StatusBar,
  Dimensions,
  FlatList
} from 'react-native';
import { FontAwesome5, Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '../constants/Theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 48 - 16) / 3;

// Mock data matching the new Record Screen grid mockup exactly
const MOCK_GRID_ITEMS = [
  {
    id: 'rohan',
    name: 'Rohan',
    isPinned: true,
    caption: 'Late night thoughts 💭',
    likes: 128,
    duration: '00:15',
    avatarLetter: 'R',
    color: '#8B5CF6',
    waveform: [10, 16, 22, 14, 18, 8, 20, 12, 16, 10, 14, 8, 12, 6, 10]
  },
  {
    id: 'ananya',
    name: 'Ananya',
    caption: 'Just a vibe ✨',
    likes: 96,
    duration: '00:11',
    avatarLetter: 'A',
    color: '#FF8C2B',
    waveform: [8, 12, 18, 10, 14, 22, 16, 12, 24, 14, 10, 8, 12, 10, 6]
  },
  {
    id: 'vivaan',
    name: 'Vivaan',
    caption: 'Motivation for you 💪',
    likes: 210,
    duration: '00:18',
    avatarLetter: 'V',
    color: '#8B5CF6',
    waveform: [12, 18, 24, 16, 10, 14, 28, 20, 14, 10, 16, 22, 12, 8, 6]
  },
  {
    id: 'meera',
    name: 'Meera',
    caption: 'Good morning ☀️',
    likes: 78,
    duration: '00:07',
    avatarLetter: 'M',
    color: '#EC4899',
    waveform: [6, 10, 14, 18, 10, 12, 16, 8, 12, 10, 8, 6, 8, 10, 6]
  },
  {
    id: 'suman',
    name: 'Suman',
    caption: 'Random talks 💬',
    likes: 64,
    duration: '00:13',
    avatarLetter: 'S',
    color: '#34D399',
    waveform: [10, 14, 12, 8, 16, 22, 14, 10, 18, 12, 10, 6, 8, 12, 8]
  },
  {
    id: 'deepvoice',
    name: 'Deep Voice',
    caption: 'Feel this 🎧',
    likes: 142,
    duration: '00:21',
    isSpecial: true,
    specialType: 'waves',
    waveform: [12, 18, 22, 14, 18, 8, 20, 12, 16, 10, 14, 8, 12, 6, 10]
  },
  {
    id: 'midnight',
    name: 'Midnight Trails',
    caption: 'Lost in thoughts 🌌',
    likes: 102,
    duration: '00:16',
    isSpecial: true,
    specialType: 'moon',
    waveform: [8, 12, 18, 10, 14, 22, 16, 12, 24, 14, 10, 8, 12, 10, 6]
  },
  {
    id: 'heartbeats',
    name: 'Heartbeats',
    caption: 'For you ❤️',
    likes: 89,
    duration: '00:14',
    isSpecial: true,
    specialType: 'heart',
    waveform: [12, 18, 24, 16, 10, 14, 28, 20, 14, 10, 16, 22, 12, 8, 6]
  },
  {
    id: 'starry',
    name: 'Starry Night',
    caption: 'Peaceful 🕊️',
    likes: 115,
    duration: '00:19',
    isSpecial: true,
    specialType: 'star',
    waveform: [6, 10, 14, 18, 10, 12, 16, 8, 12, 10, 8, 6, 8, 10, 6]
  }
];

export default function RecordScreen() {
  const { initialTab, type } = useLocalSearchParams<{ initialTab?: string; type?: string }>();
  const isStoryParam = initialTab === 'Story' || initialTab === 'Stories' || type === 'Story' || type === 'Stories';
  
  const [activeTab, setActiveTab] = useState<'Post' | 'Story' | 'Message'>(isStoryParam ? 'Story' : 'Post');
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  async function handleRecordPress() {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }

  async function startRecording() {
    if (!hasPermission) {
      Alert.alert('Permission needed', 'Please grant microphone permissions to record.');
      return;
    }

    try {
      setDurationMillis(0);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);

      recording.setOnRecordingStatusUpdate((status) => {
        setDurationMillis(status.durationMillis);
      });
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      setIsRecording(false);
      const rawUri = recording.getURI();
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      setRecording(null);
      
      if (rawUri) {
        const filename = `recording_${Date.now()}.m4a`;
        const docDir = FileSystem.documentDirectory || '';
        const permanentUri = docDir ? `${docDir}${filename}` : rawUri;
        
        if (docDir) {
          try {
            await FileSystem.copyAsync({
              from: rawUri,
              to: permanentUri,
            });
          } catch (copyErr) {
            console.log('Error copying recording file:', copyErr);
          }
        }

        const targetPath = permanentUri || rawUri;
        const tabStr = (activeTab as string) || '';
        let mappedType = 'Post';
        if (tabStr === 'Stories' || tabStr === 'Story') mappedType = 'Story';
        else if (tabStr === 'Message' || tabStr === 'Messages') mappedType = 'Message';

        // Push to preview screen with pre-selected category
        router.push({
          pathname: '/voice-preview',
          params: { uri: targetPath, duration: String(durationMillis), type: mappedType }
        });
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderGridCard = ({ item }: { item: typeof MOCK_GRID_ITEMS[0] }) => {
    return (
      <View style={styles.gridCard}>
        {item.isSpecial ? (
          <LinearGradient
            colors={
              item.specialType === 'waves' ? ['#180F33', '#0F0924'] :
              item.specialType === 'moon' ? ['#130930', '#07031D'] :
              item.specialType === 'heart' ? ['#2D0B24', '#150310'] :
              ['#0B1B38', '#030C1D']
            }
            style={[styles.cardGradient, styles.specialCardBorder]}
          >
            {item.specialType === 'waves' && (
              <View style={styles.wavesGraphicBg}>
                <MaterialCommunityIcons name="waveform" size={24} color="rgba(180, 108, 255, 0.25)" />
              </View>
            )}
            {item.specialType === 'moon' && (
              <View style={styles.moonGraphicBg}>
                <View style={styles.moonSphere} />
              </View>
            )}
            {item.specialType === 'heart' && (
              <View style={styles.heartGraphicBg}>
                <Ionicons name="heart" size={22} color="rgba(236, 72, 153, 0.3)" />
              </View>
            )}
            {item.specialType === 'star' && (
              <View style={styles.starGraphicBg}>
                <Ionicons name="sparkles" size={18} color="rgba(96, 165, 250, 0.3)" />
              </View>
            )}

            <View style={styles.cardHeader}>
              <View style={styles.cardAvatarMini}>
                {item.specialType === 'waves' && <MaterialCommunityIcons name="waveform" size={12} color="#FFF" />}
                {item.specialType === 'moon' && <Ionicons name="moon" size={12} color="#FFF" />}
                {item.specialType === 'heart' && <Ionicons name="heart" size={12} color="#FFF" />}
                {item.specialType === 'star' && <Ionicons name="star" size={12} color="#FFF" />}
              </View>
              <Feather name="more-horizontal" size={12} color="#73778F" />
            </View>

            <Text style={styles.cardTitleText} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardCaptionText} numberOfLines={1}>{item.caption}</Text>

            <View style={styles.cardPlayerRow}>
              <TouchableOpacity style={styles.cardPlayBtn}>
                <Ionicons name="play" size={10} color="#FFF" style={{ marginLeft: 1 }} />
              </TouchableOpacity>
              <View style={styles.cardWaveform}>
                {item.waveform.slice(0, 10).map((h, i) => (
                  <View 
                    key={i} 
                    style={[styles.cardWaveBar, { height: h * 0.4, backgroundColor: '#8B5CF6' }]} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.likesRow}>
                <Feather name="heart" size={10} color="#73778F" />
                <Text style={styles.likesCountText}>{item.likes}</Text>
              </View>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.cardNormalBg}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardAvatarBorder, { borderColor: item.color }]}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarLetter}>{item.avatarLetter}</Text>
                </View>
              </View>
              <Feather name="more-horizontal" size={12} color="#73778F" />
            </View>

            <View style={styles.nameVerifyRow}>
              <Text style={styles.cardTitleText} numberOfLines={1}>{item.name}</Text>
              <MaterialCommunityIcons name="decagram" size={11} color="#8B5CF6" style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.cardCaptionText} numberOfLines={1}>{item.caption}</Text>

            <View style={styles.cardPlayerRow}>
              <TouchableOpacity style={styles.cardPlayBtn}>
                <Ionicons name="play" size={10} color="#FFF" style={{ marginLeft: 1 }} />
              </TouchableOpacity>
              <View style={styles.cardWaveform}>
                {item.waveform.slice(0, 10).map((h, i) => (
                  <View 
                    key={i} 
                    style={[styles.cardWaveBar, { height: h * 0.4, backgroundColor: '#8B5CF6' }]} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.likesRow}>
                <Feather name="heart" size={10} color="#73778F" />
                <Text style={styles.likesCountText}>{item.likes}</Text>
              </View>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>

            {item.isPinned && (
              <View style={styles.pinnedBadge}>
                <MaterialCommunityIcons name="pin" size={8} color="#FFF" style={{ marginRight: 2 }} />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07050C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Feather name="x" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Record</Text>
          <Text style={styles.headerSubtitle}>Share your voice with the world 💜</Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
          <Feather name="settings" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Top Selector Segment */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentBar}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'Post' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('Post')}
          >
            <View style={styles.segmentLabelRow}>
              <Ionicons 
                name="bookmark-outline" 
                size={14} 
                color={activeTab === 'Post' ? '#FFF' : '#73778F'} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.segmentText, activeTab === 'Post' && styles.segmentTextActive]}>
                Post
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'Message' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('Message')}
          >
            <View style={styles.segmentLabelRow}>
              <Feather 
                name="send" 
                size={12} 
                color={activeTab === 'Message' ? '#FFF' : '#73778F'} 
                style={{ marginRight: 6, transform: [{ rotate: '-15deg' }] }} 
              />
              <Text style={[styles.segmentText, activeTab === 'Message' && styles.segmentTextActive]}>
                Message
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* FlatList 3-Column Grid Feed */}
      <FlatList
        data={MOCK_GRID_ITEMS}
        renderItem={renderGridCard}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={styles.gridRowWrapper}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {['All', 'Trending', 'Following', 'Close Friends'].map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity 
                    key={filter}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    {filter === 'Trending' && <Feather name="trending-up" size={12} color={isActive ? '#FFF' : '#B3B6C7'} style={{ marginRight: 4 }} />}
                    {filter === 'Following' && <Ionicons name="people-outline" size={12} color={isActive ? '#FFF' : '#B3B6C7'} style={{ marginRight: 4 }} />}
                    {filter === 'Close Friends' && <Ionicons name="star-outline" size={12} color={isActive ? '#FFF' : '#B3B6C7'} style={{ marginRight: 4 }} />}
                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{filter}</Text>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity style={styles.filterMenuBtn}>
                <Ionicons name="filter-outline" size={16} color="#B3B6C7" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        }
      />

      {/* Floating Bottom Recording Panel */}
      <View style={styles.bottomRecordingPanel}>
        <TouchableOpacity style={styles.bottomActionBtn}>
          <Ionicons name="image-outline" size={22} color="#FFF" />
          <Text style={styles.bottomActionLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Gigantic Glowing Mic Button */}
        <View style={styles.giantMicContainer}>
          <TouchableOpacity 
            onPress={handleRecordPress}
            activeOpacity={0.8}
            style={styles.micRingOuter}
          >
            <LinearGradient
              colors={isRecording ? ['#FF2A54', '#FF8C2B'] : ['#8B5CF6', '#EC4899']}
              style={styles.micRingInner}
            >
              <FontAwesome5 
                name={isRecording ? "stop" : "microphone"} 
                size={22} 
                color="#FFF" 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.bottomActionBtn}>
          <Ionicons name="archive-outline" size={22} color="#FFF" />
          <Text style={styles.bottomActionLabel}>Drafts</Text>
        </TouchableOpacity>
      </View>

      {/* Premium Full-Screen Recording Visualizer Overlay */}
      {isRecording && (
        <View style={styles.recordingOverlay}>
          <LinearGradient
            colors={['#0F081C', '#07040C']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.overlayHeader}>
            <Text style={styles.overlayHeaderTitle}>TRANSMITTING</Text>
            <Text style={styles.overlayHeaderSubtitle}>Encryption Secure 🛡️</Text>
          </View>

          <Text style={styles.overlayTimer}>{formatTime(durationMillis)}</Text>

          {/* Symmetrical Ripple Waveforms */}
          <View style={styles.overlayWavesContainer}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.overlayRippleCircle, 
                  { 
                    transform: [{ scale: 1 + i * 0.45 }], 
                    opacity: 0.5 - i * 0.08 
                  }
                ]} 
              />
            ))}
            <View style={styles.pulsingMicCenter}>
              <FontAwesome5 name="microphone" size={40} color="#FF2A54" />
            </View>
          </View>

          <TouchableOpacity 
            onPress={stopRecording}
            activeOpacity={0.8}
            style={styles.stopRecordingCTA}
          >
            <LinearGradient
              colors={['#FF2A54', '#D60036']}
              style={styles.stopRecordingCTAGradient}
            >
              <FontAwesome5 name="stop" size={18} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.stopRecordingCTAText}>Tap to Stop & Preview</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

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
  headerButton: {
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
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  segmentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
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
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentText: {
    color: '#73778F',
    fontSize: 13,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 160,
  },
  filtersContainer: {
    marginVertical: 16,
  },
  filtersScroll: {
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.radius.button,
    backgroundColor: '#131124',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterText: {
    color: '#B3B6C7',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFF',
  },
  filterMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131124',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    marginLeft: 4,
  },
  gridRowWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.5,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardNormalBg: {
    flex: 1,
    backgroundColor: '#131124',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
    position: 'relative',
    justifyContent: 'space-between',
  },
  cardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 8,
    justifyContent: 'space-between',
    position: 'relative',
  },
  specialCardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAvatarBorder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#1E202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardAvatarMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameVerifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardTitleText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardCaptionText: {
    color: '#73778F',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  cardPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 3,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardPlayBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 3,
  },
  cardWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flex: 1,
  },
  cardWaveBar: {
    width: 1.2,
    borderRadius: 0.6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 4,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likesCountText: {
    color: '#73778F',
    fontSize: 8,
    fontWeight: 'bold',
  },
  durationText: {
    color: '#73778F',
    fontSize: 8,
    fontWeight: 'bold',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  pinnedText: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: 'bold',
  },
  wavesGraphicBg: {
    position: 'absolute',
    top: 25,
    left: 15,
    opacity: 0.2,
  },
  moonGraphicBg: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  moonSphere: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#B46CFF',
    opacity: 0.25,
  },
  heartGraphicBg: {
    position: 'absolute',
    top: 35,
    left: 20,
  },
  starGraphicBg: {
    position: 'absolute',
    top: 30,
    right: 20,
  },
  bottomRecordingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#07050C',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.02)',
  },
  bottomActionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  bottomActionLabel: {
    color: '#73778F',
    fontSize: 11,
    fontWeight: 'bold',
  },
  giantMicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -20,
  },
  micRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#07050C',
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  micRingInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  overlayHeader: {
    alignItems: 'center',
  },
  overlayHeaderTitle: {
    color: '#FF2A54',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  overlayHeaderSubtitle: {
    color: '#73778F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  overlayTimer: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  overlayWavesContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  overlayRippleCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#FF2A54',
  },
  pulsingMicCenter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 42, 84, 0.1)',
    borderWidth: 2,
    borderColor: '#FF2A54',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  stopRecordingCTA: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stopRecordingCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
  },
  stopRecordingCTAText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
