import { describe, expect, it } from 'vitest';
import { getDistricts, getMouzas, getUpazilas } from '@/data/locationData';

describe('locationData helpers', () => {
  it('merges live land-record locations into dropdown options', () => {
    const extraLocations = [
      {
        id: '1',
        ownerName: 'Nusrat Jahan',
        plotNumber: 'GAZ-1024',
        holdingNumber: 'H-45/2',
        district: 'Gazipur',
        upazila: 'Kapasia',
        mouza: 'Borun Mouza',
        landSize: '1.5',
        ownershipStatus: 'Active' as const,
      },
    ];

    expect(getDistricts(extraLocations)).toContain('Gazipur');
    expect(getUpazilas('Gazipur', extraLocations)).toContain('Kapasia');
    expect(getMouzas('Gazipur', 'Kapasia', extraLocations)).toContain('Borun Mouza');
  });
});
