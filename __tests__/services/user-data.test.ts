import { __resetStore, setDoc, deleteDoc, addDoc, getDoc, getDocs, writeBatch, doc } from '@react-native-firebase/firestore';
import {
  addFavori, removeFavori, saveScan, removeScan,
  moveToCollection, moveToWishlist, moveFavori,
  getUserSettings, updateUserSetting,
} from '../../src/services/user-data';

beforeEach(() => {
  __resetStore();
  jest.clearAllMocks();
});

describe('addFavori', () => {
  it('creates a document with parfumId as doc id and merge: true', async () => {
    const id = await addFavori('uid1', 'parfum_123', 'Le Male', 'JPG', 'img.jpg', 'aromatic', 65, 90, 1995);

    expect(setDoc).toHaveBeenCalled();
    const callArgs = (setDoc as jest.Mock).mock.calls[0];
    expect(callArgs[0].path).toBe('users/uid1/favoris/parfum_123');
    expect(callArgs[1].nom).toBe('Le Male');
    expect(callArgs[1].marque).toBe('JPG');
    expect(callArgs[1].bestPrice).toBe(65);
    expect(callArgs[1].referencePrice).toBe(90);
    expect(callArgs[1].annee).toBe(1995);
    expect(callArgs[2]).toEqual({ merge: true });
    expect(id).toBe('parfum_123');
  });

  it('stores null for optional fields when not provided', async () => {
    await addFavori('uid1', 'parfum_456');
    const callArgs = (setDoc as jest.Mock).mock.calls[0];
    expect(callArgs[1].nom).toBeNull();
    expect(callArgs[1].bestPrice).toBeNull();
  });
});

describe('removeFavori', () => {
  it('deletes the document at users/{uid}/favoris/{favoriId}', async () => {
    await removeFavori('uid1', 'parfum_123');
    expect(deleteDoc).toHaveBeenCalled();
    expect((deleteDoc as jest.Mock).mock.calls[0][0].path).toBe('users/uid1/favoris/parfum_123');
  });
});

describe('saveScan', () => {
  it('calls addDoc with scannedAt set to now', async () => {
    await saveScan('uid1', { marque: 'Dior', nom: 'Sauvage', status: 'success' } as any);
    expect(addDoc).toHaveBeenCalled();
    const data = (addDoc as jest.Mock).mock.calls[0][1];
    expect(data.marque).toBe('Dior');
    expect(data.nom).toBe('Sauvage');
    expect(data.status).toBe('success');
    expect(data.scannedAt).toBeInstanceOf(Date);
  });

  it('strips undefined values', async () => {
    await saveScan('uid1', { marque: 'Dior', nom: undefined, status: 'success' } as any);
    const data = (addDoc as jest.Mock).mock.calls[0][1];
    expect(data.nom).toBeUndefined();
    expect(data.marque).toBe('Dior');
  });
});

describe('removeScan', () => {
  it('deletes the scan document', async () => {
    await removeScan('uid1', 'scan_abc');
    expect(deleteDoc).toHaveBeenCalled();
    expect((deleteDoc as jest.Mock).mock.calls[0][0].path).toBe('users/uid1/scans/scan_abc');
  });
});

describe('moveToCollection', () => {
  it('deletes from favoris and sets to collection in a batch', async () => {
    await moveToCollection('uid1', 'favoris', 'fav_1', 'parfum_123', 'Le Male', 'JPG', 'img.jpg');
    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.delete).toHaveBeenCalled();
    expect(batch.set).toHaveBeenCalled();
  });

  it('handles wishlist source', async () => {
    await moveToCollection('uid1', 'wishlist', 'wish_1', 'parfum_123', 'Le Male', 'JPG', 'img.jpg');
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.delete).toHaveBeenCalled();
    expect(batch.set).toHaveBeenCalled();
  });
});

describe('moveToWishlist', () => {
  it('deletes from favoris and adds to wishlist', async () => {
    await moveToWishlist('uid1', 'favoris', 'fav_1', 'parfum_123', 'Le Male', 'JPG', 'img.jpg', 'aromatic');
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.delete).toHaveBeenCalled();
    expect(batch.set).toHaveBeenCalled();
  });
});

describe('moveFavori', () => {
  it('deletes from collection and adds to favoris', async () => {
    await moveFavori('uid1', 'collection', 'coll_1', 'parfum_123', 'Le Male', 'JPG', 'img.jpg');
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.delete).toHaveBeenCalled();
    expect(batch.set).toHaveBeenCalled();
  });
});

describe('getUserSettings', () => {
  it('returns defaults when no settings exist', async () => {
    const settings = await getUserSettings('uid1');
    expect(settings).toEqual({ priceAlerts: false, pushNotifs: true });
  });

  it('reads stored preferences', async () => {
    await setDoc(
      { path: 'users/uid1/settings/preferences' } as any,
      { priceAlerts: true, pushNotifs: false }
    );
    const settings = await getUserSettings('uid1');
    expect(settings).toEqual({ priceAlerts: true, pushNotifs: false });
  });
});

describe('updateUserSetting', () => {
  it('merges the setting into the preferences doc', async () => {
    await updateUserSetting('uid1', 'priceAlerts', true);
    expect(setDoc).toHaveBeenCalled();
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[0].path).toBe('users/uid1/settings/preferences');
    expect(args[1]).toEqual({ priceAlerts: true });
    expect(args[2]).toEqual({ merge: true });
  });
});
