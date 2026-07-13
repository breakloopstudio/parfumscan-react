// src/features/scan/ScanLoading.tsx — État scanning : étapes animées

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SCAN_STEPS } from '../../hooks/useScanReducer';
import { theme } from '../../theme/theme';

interface Props { step: number; }

export function ScanLoading({ step }: Props) {
  return (
    <View style={s.container}>
      <View style={s.spinner}>
        <Ionicons name="scan-outline" size={64} color={theme.colors.primary} />
      </View>
      <Text style={s.title}>Analyse en cours...</Text>
      <View style={s.steps}>
        {SCAN_STEPS.map((label, i) => (
          <View key={label} style={s.step}>
            <View style={[s.marker, i < step && s.markerDone, i === step && s.markerActive]}>
              {i < step ? <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} /> : <Text style={s.markerNum}>{i + 1}</Text>}
            </View>
            <Text style={[s.label, i <= step && s.labelActive]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  spinner: { marginBottom: 24 },
  title: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: theme.colors.text, marginBottom: 32 },
  steps: { width: '100%', maxWidth: 280, gap: 20 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  marker: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  markerDone: { borderColor: theme.colors.success },
  markerActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.violetSoft },
  markerNum: { fontSize: 14, fontWeight: '600', color: theme.colors.textMuted },
  label: { fontSize: 15, color: theme.colors.textMuted },
  labelActive: { color: theme.colors.text, fontWeight: '500' },
});
