// app/(tabs)/scan.tsx — Scanner (accessible depuis le FAB)

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanScreen } from '../../src/features/scan/ScanScreen';
import { theme } from '../../src/theme/theme';

export default function ScanPage() {
  return (
    <SafeAreaView style={s.container}>
      <ScanScreen />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({ container: { flex: 1, backgroundColor: theme.colors.background } });
