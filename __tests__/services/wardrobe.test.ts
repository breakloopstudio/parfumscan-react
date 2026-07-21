import { __resetStore, setDoc, deleteDoc, getDoc, getDocs, writeBatch, doc } from '@react-native-firebase/firestore';
import {
  addToWardrobe, updateWardrobeItem, removeFromWardrobe, isInWardrobe,
  createShelf, updateShelf, deleteShelf, setSotd, getTodaySotd,
} from '../../src/services/wardrobe';

beforeEach(() => {
  __resetStore();
  jest.clearAllMocks();
});

describe('addToWardrobe', () => {
  it('creates a wardrobe item with setDoc merge: true', async () => {
    await addToWardrobe('uid1', 'parfum_1', 'have', 'Sauvage', 'Dior', 'img.jpg', 'aromatic');

    expect(setDoc).toHaveBeenCalled();
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[0].path).toBe('users/uid1/wardrobe/parfum_1');
    expect(args[1].ownership).toBe('have');
    expect(args[1].nom).toBe('Sauvage');
    expect(args[1].sotdCount).toBe(0);
    expect(args[1].isSignature).toBe(false);
    expect(args[2]).toEqual({ merge: true });
  });

  it('defaults null values', async () => {
    await addToWardrobe('uid1', 'parfum_2', 'want');
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[1].nom).toBeNull();
    expect(args[1].imageUrl).toBeNull();
    expect(args[1].rating).toBeNull();
  });

  it('handles sizeMl', async () => {
    await addToWardrobe('uid1', 'parfum_3', 'have', undefined, undefined, undefined, undefined, 50);
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[1].sizeMl).toBe(50);
  });
});

describe('updateWardrobeItem', () => {
  it('updates with merge: true', async () => {
    await updateWardrobeItem('uid1', 'parfum_1', { rating: 4.5, notes: 'Superbe' });
    expect(setDoc).toHaveBeenCalled();
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[0].path).toBe('users/uid1/wardrobe/parfum_1');
    expect(args[1].rating).toBe(4.5);
    expect(args[1].notes).toBe('Superbe');
    expect(args[1].updatedAt).toBeInstanceOf(Date);
    expect(args[2]).toEqual({ merge: true });
  });
});

describe('removeFromWardrobe', () => {
  it('deletes the wardrobe document', async () => {
    await removeFromWardrobe('uid1', 'parfum_1');
    expect(deleteDoc).toHaveBeenCalled();
    expect((deleteDoc as jest.Mock).mock.calls[0][0].path).toBe('users/uid1/wardrobe/parfum_1');
  });
});

describe('isInWardrobe', () => {
  it('returns null when item does not exist', async () => {
    const result = await isInWardrobe('uid1', 'parfum_1');
    expect(result).toBeNull();
  });

  it('returns wardrobe item when it exists', async () => {
    await addToWardrobe('uid1', 'parfum_1', 'have', 'Sauvage', 'Dior');
    const result = await isInWardrobe('uid1', 'parfum_1');
    expect(result).not.toBeNull();
    expect(result!.nom).toBe('Sauvage');
    expect(result!.ownership).toBe('have');
  });
});

describe('createShelf', () => {
  it('creates a shelf with order 0 when no shelves exist', async () => {
    const id = await createShelf('uid1', 'Été', 'sunny-outline', '#FF0000');
    expect(setDoc).toHaveBeenCalled();
    // find the setDoc call with order 0 (last call after getDocs)
    const allCalls = (setDoc as jest.Mock).mock.calls;
    const createCall = allCalls[allCalls.length - 1];
    expect(createCall[1].name).toBe('Été');
    expect(createCall[1].icon).toBe('sunny-outline');
    expect(createCall[1].color).toBe('#FF0000');
    expect(createCall[1].order).toBe(0);
    expect(typeof id).toBe('string');
  });

  it('increments order based on highest existing shelf', async () => {
    // First shelf gets order 0
    await createShelf('uid1', 'First');
    // Second shelf should get order 1
    await createShelf('uid1', 'Second');
    // The second call's setDoc should have order 1
    const setDocCalls = (setDoc as jest.Mock).mock.calls;
    const lastSetDoc = setDocCalls[setDocCalls.length - 1];
    expect(lastSetDoc[1].order).toBe(1);
  });
});

describe('updateShelf', () => {
  it('merges partial data', async () => {
    await updateShelf('uid1', 'shelf_1', { name: 'Renamed' });
    expect(setDoc).toHaveBeenCalled();
    const args = (setDoc as jest.Mock).mock.calls[0];
    expect(args[0].path).toBe('users/uid1/shelves/shelf_1');
    expect(args[1]).toEqual({ name: 'Renamed' });
    expect(args[2]).toEqual({ merge: true });
  });
});

describe('deleteShelf', () => {
  it('deletes shelf and removes from wardrobe items', async () => {
    // Create a shelf and a wardrobe item with that shelf
    const shelfId = await createShelf('uid1', 'Summer');
    await addToWardrobe('uid1', 'parfum_1', 'have');
    await updateWardrobeItem('uid1', 'parfum_1', { shelfIds: [shelfId] });

    await deleteShelf('uid1', shelfId);

    // Batch should have committed (delete + update)
    expect(writeBatch).toHaveBeenCalled();
  });
});

describe('setSotd', () => {
  it('creates SOTD entry and increments sotdCount', async () => {
    await addToWardrobe('uid1', 'parfum_1', 'have', 'Sauvage', 'Dior');

    await setSotd('uid1', 'parfum_1', 'Sauvage', 'Dior', 'img.jpg');

    // Should have used batch
    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.set).toHaveBeenCalledTimes(2); // SOTD + wardrobe update
    expect(batch.commit).toHaveBeenCalled();
  });

  it('works even if wardrobe item does not exist (uses merge: true)', async () => {
    await setSotd('uid1', 'parfum_new', 'New Frag', 'New Brand');
    expect(writeBatch).toHaveBeenCalled();
    const batch = (writeBatch as jest.Mock).mock.results[0].value;
    expect(batch.set).toHaveBeenCalledTimes(2);
    expect(batch.commit).toHaveBeenCalled();
  });
});

describe('getTodaySotd', () => {
  it('returns null when no SOTD for today', async () => {
    const result = await getTodaySotd('uid1');
    expect(result).toBeNull();
  });

  it('returns SOTD when it exists', async () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await setDoc(
      { path: `users/uid1/sotd/${key}` } as any,
      { parfumId: 'p1', nom: 'Sauvage', marque: 'Dior', imageUrl: 'img.jpg' }
    );

    const result = await getTodaySotd('uid1');
    expect(result).not.toBeNull();
    expect(result!.parfumId).toBe('p1');
    expect(result!.nom).toBe('Sauvage');
  });
});
