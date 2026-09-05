import { Tabs, router } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B0D15',
          borderTopWidth: 1,
          borderTopColor: '#1D202D',
          height: 84,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#5C6078',
        tabBarShowLabel: false,
      }}>
      
      {/* 1. Chats */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 2. Voices */}
      <Tabs.Screen
        name="audio"
        options={{
          title: 'Voices',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <MaterialCommunityIcons name="waveform" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. Custom Center Mic Button */}
      <Tabs.Screen
        name="mic-placeholder"
        listeners={{
          tabPress: (e) => {
            // Prevent default navigation
            e.preventDefault();
            router.push('/record');
          },
        }}
        options={{
          tabBarButton: () => (
            <TouchableOpacity 
              style={styles.micButtonContainer} 
              activeOpacity={0.8}
              onPress={() => router.push('/record')}
            >
              <LinearGradient
                colors={['#7C3AED', '#DB2777']}
                style={styles.micButton}
              >
                <Feather name="mic" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )
        }}
      />

      {/* 4. Friends */}
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Feather name="users" size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* 5. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrapper}>
              <Feather name="user" size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

// Inline LinearGradient import helper since expo-linear-gradient is required inside custom tab button
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#06080E',
  }
});
