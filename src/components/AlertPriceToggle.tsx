// src/components/AlertPriceToggle.tsx — Toggle alerte prix sur fiche détail

import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { theme } from '../theme/theme';
import { isPriceAlertActive, setPriceAlert } from '../services/user-data';

interface Props {
  parfumId: string;
  uid: string;
}

export default function AlertPriceToggle({ parfumId, uid }: Props) {
  const [active, setActive] = useState(false);
  const knobX = useSharedValue(0);

  useEffect(() => {
    isPriceAlertActive(uid, parfumId).then(setActive);
  }, [uid, parfumId]);

  useEffect(() => {
    knobX.value = withSpring(active ? 20 : 0, { stiffness: 300, damping: 20 });
  }, [active]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value }],
  }));

  const toggle = () => {
    const next = !active;
    setActive(next);
    setPriceAlert(uid, parfumId, next).catch(() => setActive(!next));
  };

  return (
    <Pressable onPress={toggle} style={s.row}>
      <View style={s.left}>
        <Ionicons
          name={active ? 'notifications' : 'notifications-outline'}
          size={20}
          color={active ? theme.colors.primary : theme.colors.textMuted}
        />
        <View>
          <Text style={s.label}>Alerte prix</Text>
          <Text style={s.desc}>
            {active ? 'Activée — tu seras notifié' : 'Sois prévenu quand le prix baisse'}
          </Text>
        </View>
      </View>
      <Pressable onPress={toggle} style={[s.track, active && s.trackActive]}>
        <Animated.View style={[s.knob, knobStyle]} />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: theme.colors.text,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trackActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.textMuted,
  },
});
