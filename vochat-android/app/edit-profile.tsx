import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from './api';

export default function EditProfileScreen() {
  const [name, setName] = useState('');
  const [textBio, setTextBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [audioBioUrl, setAudioBioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data.data.user;
      setName(user.name);
      setTextBio(user.textBio || '');
      setAvatarUrl(user.avatarUrl);
      setAudioBioUrl(user.audioBioUrl);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // On web, expo-image-picker gives us a file object directly
      if (Platform.OS === 'web' && asset.file) {
        uploadFileBlob(asset.file, 'avatars');
      } else {
        uploadFile(asset.uri, 'image', 'avatars');
      }
    }
  };

  const startRecording = async () => {
    // Audio recording is only supported on native (iOS/Android)
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile Only Feature',
        'Voice Bio recording requires the native app on your phone. This feature works perfectly on Android/iOS!',
        [{ text: 'Got it' }]
      );
      return;
    }
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
        Alert.alert('Permission Denied', 'Please enable microphone access to record a bio');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUri(uri);
    setRecording(null);
    
    if (uri) {
      uploadFile(uri, 'audio', 'bios');
    }
  };

  // Web-specific: upload a Blob/File object directly
  const uploadFileBlob = async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    try {
      setSaving(true);
      const response = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response.data.data.url;
      setAvatarUrl(uploadedUrl);
      Alert.alert('Success', 'Avatar uploaded!');
    } catch (error: any) {
      console.error('Upload failed:', error?.response?.data || error);
      Alert.alert('Upload Failed', 'Could not upload. Check Firebase Storage rules.');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (uri: string, type: 'image' | 'audio', folder: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const extension = match ? match[1] : '';
    const mimeType = type === 'image' ? `image/${extension || 'jpeg'}` : `audio/${extension || 'm4a'}`;

    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename || `upload.${extension}`,
      type: mimeType,
    } as any);
    formData.append('folder', folder);

    try {
      setSaving(true);
      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedUrl = response.data.data.url;
      if (type === 'image') {
        setAvatarUrl(uploadedUrl);
      } else {
        setAudioBioUrl(uploadedUrl);
      }
      Alert.alert('Success', `${type === 'image' ? 'Avatar' : 'Voice Bio'} uploaded!`);
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', 'There was an error uploading your file to the cloud.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await api.patch('/users/me', {
        name,
        textBio,
        avatarUrl,
        audioBioUrl,
      });
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00E0FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <LinearGradient
              colors={['#00E0FF', '#D600FF']}
              style={styles.avatarBorder}
            >
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <FontAwesome5 name="user-plus" size={32} color="#00E0FF" />
                )}
              </View>
            </LinearGradient>
            <View style={styles.editBadge}>
              <FontAwesome5 name="camera" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Your Identity</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="What should we call you?"
            placeholderTextColor="#859397"
          />

          <Text style={styles.label}>Bio Tagline</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={textBio}
            onChangeText={setTextBio}
            placeholder="A short blurb about you..."
            placeholderTextColor="#859397"
            multiline
            maxLength={100}
          />
          <Text style={styles.charCount}>{textBio.length}/100</Text>

          <Text style={styles.label}>Voice Bio</Text>
          <View style={styles.audioContainer}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            >
              <FontAwesome5 name={isRecording ? "stop" : "microphone"} size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.audioInfo}>
              <Text style={styles.audioStatus}>
                {isRecording ? "Recording..." : (audioBioUrl ? "Voice Bio recorded ✅" : "Tap to record your vibe")}
              </Text>
              {audioBioUrl && <Text style={styles.audioSubtext}>Will be uploaded to the cloud</Text>}
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0A0E17" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0E17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#D600FF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0E17',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    marginBottom: 32,
  },
  label: {
    color: '#00E0FF',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    color: '#FFF',
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    color: '#859397',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 20,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D600FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D600FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  audioInfo: {
    marginLeft: 20,
    flex: 1,
  },
  audioStatus: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioSubtext: {
    color: '#859397',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#00E0FF',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00E0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#0A0E17',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: '#859397',
    fontSize: 16,
  },
});
