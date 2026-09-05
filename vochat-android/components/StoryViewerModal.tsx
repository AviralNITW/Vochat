import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryUserGroup } from './StoriesBar';
import api from '../app/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryViewerModalProps {
  visible: boolean;
  storyGroup: StoryUserGroup | null;
  onClose: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  visible,
  storyGroup,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible && storyGroup && storyGroup.stories.length > 0) {
      setCurrentIndex(0);
      loadAndPlayStory(storyGroup.stories[0].audioUrl);
    } else {
      stopAndUnloadSound();
    }

    return () => {
      stopAndUnloadSound();
    };
  }, [visible, storyGroup]);

  const stopAndUnloadSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      // ignore unload errors
    }
    setIsPlaying(false);
    setProgress(0);
  };

  const loadAndPlayStory = async (url: string, filterName?: string) => {
    await stopAndUnloadSound();
    try {
      let rate = 1.0;
      let shouldCorrectPitch = true;

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

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate, shouldCorrectPitch },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.log('Error loading story audio:', error);
    }
  };

  const onPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      if (status.durationMillis) {
        setProgress(status.positionMillis / status.durationMillis);
      }
      if (status.didJustFinish) {
        if (storyGroup && storyGroup.stories[currentIndex]) {
          const currentStory = storyGroup.stories[currentIndex];
          try {
            await api.post('/stories/view', { storyId: currentStory.id });
          } catch (e) {}
        }
        handleNextStory();
      }
    }
  };

  const handleNextStory = () => {
    if (storyGroup && currentIndex < storyGroup.stories.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextStory = storyGroup.stories[nextIdx] as any;
      loadAndPlayStory(nextStory.audioUrl, nextStory.voiceFilter);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (storyGroup && currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      const prevStory = storyGroup.stories[prevIdx] as any;
      loadAndPlayStory(prevStory.audioUrl, prevStory.voiceFilter);
    }
  };

  const togglePlayPause = async () => {
    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  if (!visible || !storyGroup) return null;

  const currentStory = storyGroup.stories[currentIndex];
  const { user } = storyGroup;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Fullscreen Ambient Glow */}
        <LinearGradient
          colors={['#1F1633', '#06080E', '#110C24']}
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.safeArea}>
          
          {/* Header Segment Progress Bars */}
          <View style={styles.progressContainer}>
            {storyGroup.stories.map((s, idx) => {
              let barProgress = 0;
              if (idx < currentIndex) barProgress = 1;
              if (idx === currentIndex) barProgress = progress;

              return (
                <View key={s.id || idx} style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${barProgress * 100}%` }]} />
                </View>
              );
            })}
          </View>

          {/* User Info & Close Header */}
          <View style={styles.headerRow}>
            <View style={styles.userInfo}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user.name ? user.name[0] : 'U'}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.storyTime}>Voice Story 24h</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Center Soundwave Visualizer Card */}
          <View style={styles.centerCard}>
            <View style={styles.waveBubble}>
              <FontAwesome5 name="volume-up" size={32} color="#7C3AED" />
              <View style={styles.waveBarsRow}>
                {[14, 28, 42, 20, 36, 18, 30, 24, 40, 16, 28].map((h, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.waveBar, 
                      { height: h, backgroundColor: isPlaying ? '#DB2777' : '#7C3AED' }
                    ]} 
                  />
                ))}
              </View>
            </View>

            {currentStory?.caption ? (
              <Text style={styles.captionText}>"{currentStory.caption}"</Text>
            ) : null}

            {currentStory?.voiceFilter && currentStory.voiceFilter !== 'original' && currentStory.voiceFilter !== 'Original' ? (
              <View style={styles.filterBadge}>
                <Feather name="mic" size={12} color="#F472B6" style={{ marginRight: 4 }} />
                <Text style={styles.filterBadgeText}>{currentStory.voiceFilter}</Text>
              </View>
            ) : null}

            {/* Play / Pause Toggle Button */}
            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
              <Feather name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Tap Navigation Overlays (Left for Prev, Right for Next) */}
          <TouchableOpacity 
            style={[styles.tapOverlay, { left: 0 }]} 
            onPress={handlePrevStory} 
            activeOpacity={1}
          />
          <TouchableOpacity 
            style={[styles.tapOverlay, { right: 0 }]} 
            onPress={handleNextStory} 
            activeOpacity={1}
          />

        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  storyTime: {
    color: '#8E92A5',
    fontSize: 12,
  },
  closeButton: {
    padding: 6,
  },
  centerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  waveBubble: {
    width: SCREEN_WIDTH - 64,
    height: 180,
    borderRadius: 24,
    backgroundColor: '#11131B',
    borderWidth: 1.5,
    borderColor: '#202330',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  waveBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 50,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  captionText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(219, 39, 119, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(219, 39, 119, 0.3)',
  },
  filterBadgeText: {
    color: '#F472B6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  tapOverlay: {
    position: 'absolute',
    top: 100,
    bottom: 0,
    width: SCREEN_WIDTH * 0.35,
    zIndex: 5,
  },
});
