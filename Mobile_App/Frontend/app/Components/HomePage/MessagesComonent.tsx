import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

const MessageComponent = ({ 
  name, 
  message, 
  time, 
  unreadCount,
  profileImage,
  customIcon,
  onPress
}) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 600;

  return (
    <TouchableOpacity style={[
      styles.container,
      {
        paddingHorizontal: isLandscape ? width * 0.05 : width * 0.04,
        paddingVertical: height * 0.015,
      }
    ]}
    onPress={onPress}>
      <View style={styles.messageContainer}>
        {/* Profile Image or Custom Icon */}
        <View style={styles.profileImageContainer}>
          {customIcon ? (
            customIcon
          ) : (
            <Image 
              source={profileImage} 
              style={[
                styles.profileImage,
                {
                  width: isTablet ? 50 : 50,
                  height: isTablet ? 50 : 50,
                  borderRadius: isTablet ? 25 : 25,
                }
              ]} 
            />
          )}
        </View>

        {/* Message Content */}
        <View style={[styles.textContainer, { maxWidth: isTablet ? '70%' : '60%' }]}>
          <Text style={[
            styles.nameText,
            { fontSize: isTablet ? 18 : 16 }
          ]}>
            {name}
          </Text>
          <Text 
            style={[
              styles.messageText,
              { fontSize: isTablet ? 16 : 14 }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {message}
          </Text>
        </View>

        {/* Time and Unread */}
        <View style={styles.timeContainer}>
          <Text style={[
            styles.timeText,
            { fontSize: isTablet ? 14 : 12 }
          ]}>
            {time}
          </Text>
          {unreadCount > 0 && (
            <View style={[
              styles.unreadBadge,
              {
                width: isTablet ? 24 : 20,
                height: isTablet ? 24 : 20,
                borderRadius: isTablet ? 12 : 10,
              }
            ]}>
              <Text style={[
                styles.unreadText,
                { fontSize: isTablet ? 14 : 12 }
              ]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    backgroundColor: '#e1e1e1', // Fallback color if image fails to load
  },
  textContainer: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    color: '#000',
    marginBottom: 4,
    includeFontPadding: false,
  },
  messageText: {
    color: '#666',
    includeFontPadding: false,
  },
  timeContainer: {
    marginLeft: 'auto', // Pushes to the far right
    alignItems: 'flex-end',
    minWidth: 60,
  },
  timeText: {
    color: '#999',
    marginBottom: 4,
    includeFontPadding: false,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default MessageComponent;
