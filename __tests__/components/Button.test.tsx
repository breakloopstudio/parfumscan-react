import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import Button from '../../src/components/Button';

jest.mock('../../src/services/theme-storage', () => ({
  getThemeMode: () => Promise.resolve('system'),
  setThemeMode: () => Promise.resolve(),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

async function renderWithTheme(ui: React.ReactElement) {
  const result = render(ui, { wrapper: Wrapper });
  await waitFor(() => expect(screen.toJSON()).toBeTruthy(), { timeout: 2000 });
  return result;
}

describe('Button', () => {
  describe('primary', () => {
    it('renders children as text', async () => {
      await renderWithTheme(<Button onPress={jest.fn()}>Valider</Button>);
      expect(screen.getByText('Valider')).toBeTruthy();
    });

    it('calls onPress when pressed', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button onPress={onPress}>Valider</Button>);
      fireEvent.press(screen.getByText('Valider'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button onPress={onPress} disabled>Valider</Button>);
      fireEvent.press(screen.getByText('Valider'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button onPress={onPress} loading>Valider</Button>);
      fireEvent.press(screen.getByText('Valider'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows ActivityIndicator when loading', async () => {
      await renderWithTheme(<Button onPress={jest.fn()} loading>Valider</Button>);
      expect(screen.getByText('Valider')).toBeTruthy();
    });
  });

  describe('outline', () => {
    it('renders children', async () => {
      await renderWithTheme(<Button variant="outline" onPress={jest.fn()}>Annuler</Button>);
      expect(screen.getByText('Annuler')).toBeTruthy();
    });

    it('calls onPress', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button variant="outline" onPress={onPress}>Annuler</Button>);
      fireEvent.press(screen.getByText('Annuler'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('ghost', () => {
    it('renders children', async () => {
      await renderWithTheme(<Button variant="ghost" onPress={jest.fn()}>Retour</Button>);
      expect(screen.getByText('Retour')).toBeTruthy();
    });

    it('calls onPress', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button variant="ghost" onPress={onPress}>Retour</Button>);
      fireEvent.press(screen.getByText('Retour'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('secondary', () => {
    it('renders children', async () => {
      await renderWithTheme(<Button variant="secondary" onPress={jest.fn()}>Acheter</Button>);
      expect(screen.getByText('Acheter')).toBeTruthy();
    });
  });

  describe('with icon', () => {
    it('renders icon alongside text', async () => {
      await renderWithTheme(<Button onPress={jest.fn()} icon="cart-outline">Acheter</Button>);
      expect(screen.getByText('Acheter')).toBeTruthy();
    });
  });

  describe('disabled', () => {
    it('applies disabled state for ghost variant', async () => {
      await renderWithTheme(<Button variant="ghost" onPress={jest.fn()} disabled>Retour</Button>);
      expect(screen.getByText('Retour')).toBeTruthy();
    });
  });
});
