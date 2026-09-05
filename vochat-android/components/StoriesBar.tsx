import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export interface StoryUserGroup {
  user: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string | null;
  };
  stories: {
    id: string;
    audioUrl: string;
    duration: number;
    caption?: string;
    voiceFilter?: string;
    createdAt: string;
  }[];
}

interface StoriesBarProps {
  storyGroups: StoryUserGroup[];
  onSelectStoryGroup: (group: StoryUserGroup) => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({ storyGroups, onSelectStoryGroup }) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Add Story Button */}
        <TouchableOpacity 
          style={styles.storyItem} 
          onPress={() => router.push({ pathname: '/record', params: { initialTab: 'Story' } })}
        >
          <View style={styles.addStoryRing}>
            <View style={styles.addAvatarPlaceholder}>
              <Feather name="mic" size={20} color="#7C3AED" />
              <View style={styles.plusBadge}>
                <Feather name="plus" size={12} color="#FFF" />
              </View>
            </View>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>Your Story</Text>
        </TouchableOpacity>

        {/* Story Avatars */}
        {storyGroups.map((group) => {
          const { user } = group;
          const initials = user.name ? user.name.slice(0, 2).toUpperCase() : 'VC';

          return (
            <TouchableOpacity 
              key={user.id} 
              style={styles.storyItem}
              onPress={() => onSelectStoryGroup(group)}
            >
              <LinearGradient
                colors={['#7C3AED', '#DB2777', '#FF8C2B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientRing}
              >
                <View style={styles.avatarInnerContainer}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarTextContainer}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.storyName} numberOfLines={1}>{user.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  addStoryRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DB2777',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#06080E',
  },
  gradientRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarInnerContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#06080E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarTextContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1F1633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  storyName: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
