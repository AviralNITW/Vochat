import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Platform, Alert, Image } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export default function ActiveChatScreen() {
  const { id } = useLocalSearchParams();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [friend, setFriend] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadUserAndFetch();
  }, [id]);

  const loadUserAndFetch = async () => {
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchFriendProfile();
    fetchMessages();
  };

  const fetchFriendProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get(`/users/${id}`);
      setFriend(res.data.data.user);
    } catch (err) {
      console.error('Failed to fetch friend profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/messages/conversation/${id}`);
      setMessages(response.data.data.messages || []);
      // Scroll to bottom after state update
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  // Socket setup & cleanup
  useEffect(() => {
    let socket: any = null;
    const setupSocket = async () => {
      const { initSocket } = await import('../socket');
      socket = await initSocket();
      if (socket) {
        socket.on('new_message', (msg: any) => {
          // Only refresh if the message is from/to this conversation
          if (msg.senderId === id || msg.receiverId === id) {
            fetchMessages();
          }
        });
        socket.on('message_played', (data: any) => {
          fetchMessages();
        });
      }
    };
    setupSocket();

    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (socket) {
        socket.off('new_message');
        socket.off('message_played');
      }
    };
  }, [id]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      } else {
        Alert.alert('Permission needed', 'Please grant microphone permissions');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      const status = await recording.getStatusAsync();
      const durationSecs = Math.round((status.durationMillis || 0) / 1000) || 1;
      
      setRecording(null);
      
      if (uri) {
        // Construct FormData for Media Upload
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const extension = match ? match[1] : '';
        const mimeType = `audio/${extension || 'm4a'}`;

        formData.append('file', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename || `msg_${Date.now()}.${extension}`,
          type: mimeType,
        } as any);
        formData.append('folder', 'messages');

        const uploadResponse = await api.post('/media/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const cloudUrl = uploadResponse.data.data.url;

        // Send the message using the cloud URL
        await api.post('/messages/send', {
          receiverId: id,
          audioUrl: cloudUrl,
          duration: durationSecs,
        });

        fetchMessages();
      }
    } catch (err: any) {
      console.error('Failed to stop/send recording', err);
      Alert.alert('Send Failed', err.response?.data?.error?.message || err.message || 'Microphone recording or upload failed.');
    }
  }

  async function playAudio(uri: string, msgId: string) {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      // Parse pitch/speed parameters if they exist in the URL
      let rate = 1.0;
      let shouldCorrectPitch = true;

      if (uri.includes('rate=')) {
        const rateMatch = /rate=([\d.]+)/.exec(uri);
        if (rateMatch) rate = parseFloat(rateMatch[1]);
      }
      if (uri.includes('pitch=')) {
        const pitchMatch = /pitch=(\w+)/.exec(uri);
        if (pitchMatch) shouldCorrectPitch = pitchMatch[1] === 'true';
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { 
          shouldPlay: false,
          rate,
          shouldCorrectPitch
        }
      );
      setSound(newSound);
      await newSound.playAsync();

      // If it's a received unplayed message, mark it as played
      const msg = messages.find((m) => m.id === msgId);
      if (msg && msg.senderId !== currentUser?.id && !msg.isPlayed) {
        await api.post('/messages/play', { messageId: msgId });
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to play audio', err);
    }
  }

  const getWaveform = (msgId: string) => {
    const heights = [];
    for (let i = 0; i < 15; i++) {
      const charCode = msgId.charCodeAt(i % msgId.length) || 10;
      heights.push(4 + (charCode % 20));
    }
    return heights;
  };

  const friendName = friend?.name || 'Secure Agent';
  const isFriendOnline = friend?.isOnline || false;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={16} color="#00E0FF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{friendName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.onlineDot, { backgroundColor: isFriendOnline ? '#10B981' : '#5C6078' }]} />
            <Text style={[styles.statusText, { color: isFriendOnline ? '#10B981' : '#8E92A5' }]}>
              {isFriendOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => Alert.alert('Voice Call', `Starting encrypted voice call with ${friendName}...`)}
          >
            <Ionicons name="call" size={20} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchFriendProfile}>
            <View style={styles.avatarSmall}>
              {friend?.avatarUrl ? (
                <Image source={{ uri: friend.avatarUrl }} style={styles.avatarImageSmall} />
              ) : (
                <Text style={styles.avatarText}>{friendName[0]?.toUpperCase() || 'U'}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef} 
        contentContainerStyle={styles.content}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const isMe = currentUser && msg.senderId === currentUser.id;

          if (!isMe) {
            return (
              <View key={msg.id} style={styles.messageReceived}>
                <View style={styles.avatarPlaceholder}>
                  {friend?.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={styles.avatarImageSmall} />
                  ) : (
                    <Text style={styles.avatarText}>{friendName[0]?.toUpperCase() || 'F'}</Text>
                  )}
                </View>
                <View style={styles.bubbleReceived}>
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.timestamp}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                  <View style={styles.waveformRow}>
                    <TouchableOpacity 
                      style={styles.playBtnReceived}
                      onPress={() => playAudio(msg.audioUrl, msg.id)}
                    >
                       <FontAwesome5 name="play" size={12} color="#000" />
                    </TouchableOpacity>
                    <View style={styles.waveformContainer}>
                      {getWaveform(msg.id).map((h, i) => (
                        <View key={`wr-${msg.id}-${i}`} style={[styles.waveBar, { height: h, backgroundColor: msg.isPlayed ? '#2D3449' : '#00E0FF' }]} />
                      ))}
                    </View>
                    <Text style={[styles.duration, msg.isPlayed && { color: '#5C6078' }]}>
                      0:{msg.duration.toString().padStart(2, '0')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          } else {
            return (
              <View key={msg.id} style={styles.messageSent}>
                <View style={styles.bubbleSent}>
                  <View style={styles.bubbleHeaderSent}>
                    <Text style={styles.timestampSent}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    <Ionicons 
                      name={msg.isPlayed ? "checkmark-done" : "checkmark"} 
                      size={14} 
                      color={msg.isPlayed ? "#00FF00" : "#BAF2FF"} 
                    />
                  </View>
                  <View style={styles.waveformRow}>
                    <Text style={styles.durationSent}>0:{msg.duration.toString().padStart(2, '0')}</Text>
                    <View style={styles.waveformContainer}>
                      {getWaveform(msg.id).map((h, i) => (
                        <View key={`ws-${msg.id}-${i}`} style={[styles.waveBar, { height: h, backgroundColor: msg.isPlayed ? '#00A896' : '#00FF00' }]} />
                      ))}
                    </View>
                    <TouchableOpacity 
                      style={styles.playBtnSent}
                      onPress={() => playAudio(msg.audioUrl, msg.id)}
                    >
                       <FontAwesome5 name="play" size={12} color="#000" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }
        })}
      </ScrollView>

      {/* Bottom Recording Area */}
      <View style={styles.footer}>
        <View style={styles.recordingControls}>
          <TouchableOpacity style={styles.controlIcon} onPress={() => Alert.alert('Trash', 'Hold and slide left to cancel a recording.')}>
            <FontAwesome5 name="trash-alt" size={18} color="#859397" />
          </TouchableOpacity>
          
          {/* Glowing Orb */}
          <View style={styles.orbContainer}>
            <View style={[styles.orbGlow1, isRecording && { transform: [{ scale: 1.3 }], backgroundColor: '#FF000030' }]} />
            <View style={[styles.orbGlow2, isRecording && { transform: [{ scale: 1.2 }], backgroundColor: '#FF330050' }]} />
            <TouchableOpacity 
              style={styles.orb}
              onPressIn={startRecording}
              onPressOut={stopRecording}
            >
              <LinearGradient
                colors={isRecording ? ['#FF0000', '#D60036'] : ['#FF2A54', '#FF6B00']}
                style={styles.orbGradient}
              >
                <FontAwesome5 name={isRecording ? "stop" : "microphone"} size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.controlIcon} onPress={fetchMessages}>
            <Ionicons name="refresh" size={20} color="#859397" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.recordingHint}>
          {isRecording ? 'Recording! Release to Send' : 'Press & hold mic to record voice snap'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3449',
    backgroundColor: '#0A0E17',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  callButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D600FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImageSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  messageReceived: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  bubbleReceived: {
    backgroundColor: '#131B2E',
    borderRadius: 24,
    borderBottomLeftRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D3449',
    maxWidth: '80%',
  },
  bubbleHeader: {
    marginBottom: 8,
  },
  timestamp: {
    color: '#859397',
    fontSize: 10,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtnReceived: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginHorizontal: 12,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  duration: {
    color: '#00E0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  messageSent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  bubbleSent: {
    backgroundColor: '#00363F',
    borderRadius: 24,
    borderBottomRightRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#006877',
    maxWidth: '80%',
  },
  bubbleHeaderSent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  timestampSent: {
    color: '#BAF2FF',
    fontSize: 10,
  },
  playBtnSent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00FF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  durationSent: {
    color: '#BAF2FF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#2D3449',
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  controlIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  orbGlow1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF2A5420',
  },
  orbGlow2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF6B0040',
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#FF2A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  orbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingHint: {
    color: '#859397',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
  }
});
