// ============================================
// VoChat - Beautiful Toast Notification Component
// ============================================

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  subtitle?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastHandle {
  show: (opts: ToastOptions) => void;
  hide: () => void;
}

const ICON_MAP: Record<ToastType, { name: string; bg: string; border: string; icon: string }> = {
  success: { name: 'check-circle', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '#10B981' },
  error:   { name: 'x-circle',     bg: 'rgba(239, 68, 68, 0.15)',  border: 'rgba(239, 68, 68, 0.4)',  icon: '#EF4444' },
  warning: { name: 'alert-circle',  bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', icon: '#F59E0B' },
  info:    { name: 'info',          bg: 'rgba(124, 58, 237, 0.15)', border: 'rgba(124, 58, 237, 0.4)', icon: '#7C3AED' },
};

export const Toast = forwardRef<ToastHandle>((_, ref) => {
  const [opts, setOpts] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (options: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpts(options);
    setVisible(true);
    translateY.setValue(-200);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const dur = options.duration ?? 3500;
    timerRef.current = setTimeout(() => hide(), dur);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setOpts(null);
    });
  };

  useImperativeHandle(ref, () => ({ show, hide }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -30) {
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 60,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  if (!visible || !opts) return null;

  const theme = ICON_MAP[opts.type ?? 'success'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: theme.bg,
          borderColor: theme.border,
        }
      ]}
      {...panResponder.panHandlers}
    >
      <Feather name={theme.name as any} size={22} color={theme.icon} style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={styles.message}>{opts.message}</Text>
        {opts.subtitle ? (
          <Text style={styles.subtitle}>{opts.subtitle}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={hide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
});

Toast.displayName = 'Toast';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  icon: {
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  message: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 2,
  },
});

// ============================================
// Global toast singleton helper
// ============================================

let _toastRef: ToastHandle | null = null;

export const setToastRef = (ref: ToastHandle | null) => {
  _toastRef = ref;
};

export const showToast = (opts: ToastOptions) => {
  _toastRef?.show(opts);
};

export default Toast;
