// jest-setup.js — ParfumScan test environment

// Mock Reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedReaction: () => {},
  withSpring: (v) => v,
  withTiming: (v) => v,
  withRepeat: (v) => v,
  withDelay: (_, v) => v,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  makeMutable: (v) => ({ value: v }),
  isSharedValue: () => false,
  setUpTests: () => {},
  Easing: { out: (x) => x, inOut: (x) => x, linear: (x) => x, ease: (x) => x },
  Layout: { duration: 300 },
  SlideInLeft: { duration: 300 },
  SlideOutRight: { duration: 300 },
  FadeIn: { duration: 300 },
  FadeOut: { duration: 300 },
  createAnimatedComponent: (c) => c,
  FlatList: 'FlatList',
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  default: {
    View: 'View', Text: 'Text', Image: 'Image',
    ScrollView: 'ScrollView', FlatList: 'FlatList',
    createAnimatedComponent: (c) => c,
  },
}));

// Mock expo-blur
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

// Mock AsyncStorage — custom mock pour controle total des appels
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase — les mocks sont dans __mocks__/@react-native-firebase/firestore.ts
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@react-native-firebase/storage', () => ({}));
jest.mock('@react-native-firebase/functions', () => ({}));
jest.mock('@react-native-firebase/messaging', () => ({}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

// Mock NativeEventEmitter pour expo-modules-core
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  const { EventEmitter } = require('events');
  return { default: EventEmitter };
});
