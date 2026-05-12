import type { LandRecord } from '@/types';

// Correlated Bangladesh location data: District → Upazila → Mouza
export const locationData: Record<string, Record<string, string[]>> = {
  Dhaka: {
    Dhanmondi: ['Kalabagan', 'Jigatola', 'Shankar'],
    Mirpur: ['Pallabi', 'Rupnagar', 'Kazipara'],
    Savar: ['Kashipur', 'Ashulia', 'Nabinagar'],
    Uttara: ['Sector 10', 'Sector 3', 'Ranavola'],
    Gulshan: ['Banani', 'Mohakhali', 'Niketan'],
  },
  Chattogram: {
    Pahartali: ['Bayezid', 'Lalkhan Bazar', 'Firingi Bazar'],
    Kotwali: ['Chawkbazar', 'Sadarghat', 'Bakalia'],
    'Double Mooring': ['Patenga', 'Halishahar', 'Agrabad'],
  },
  Rajshahi: {
    Boalia: ['Shaheb Bazar', 'Hetemkhan', 'Laxmipur'],
    Rajpara: ['Talaimari', 'Kazla', 'Meherchandi'],
    Motihar: ['Binodpur', 'Paba', 'Katakhali'],
  },
  Khulna: {
    Daulatpur: ['Khalishpur', 'Rupsha', 'Labanchara'],
    Kotwali: ['Boyra', 'Khan Jahan Ali', 'Tutpara'],
  },
  Sylhet: {
    Kotwali: ['Zindabazar', 'Amberkhana', 'Bondor Bazar'],
    'South Surma': ['Mogla Bazar', 'Kuchai', 'Tetli'],
  },
  Barishal: {
    Kotwali: ['Sadar Road', 'Kaunia', 'Nathullabad'],
    'Banaripara': ['Baishari', 'Saliabad', 'Chakhar'],
  },
  Rangpur: {
    Kotwali: ['Jahaj Company', 'Shapla Chottor', 'Dhap'],
    Mithapukur: ['Ballapara', 'Omarganj', 'Pairaband'],
  },
  Mymensingh: {
    Kotwali: ['Ganginarpar', 'Chorpara', 'Mashkhola'],
    Trishal: ['Darirampur', 'Bailar', 'Dhanikhola'],
  },
  Comilla: {
    Kotwali: ['Kandirpar', 'Tomsom Bridge', 'Rajganj'],
    'Debidwar': ['Subil', 'Joypur', 'Eliotganj'],
  },
};

type LocationSource = Pick<LandRecord, 'district' | 'upazila' | 'mouza'>;

function mergedLocationData(extra: LocationSource[] = []) {
  const merged = Object.entries(locationData).reduce<Record<string, Record<string, string[]>>>((acc, [district, upazilas]) => {
    acc[district] = Object.entries(upazilas).reduce<Record<string, string[]>>((upazilaAcc, [upazila, mouzas]) => {
      upazilaAcc[upazila] = [...mouzas];
      return upazilaAcc;
    }, {});
    return acc;
  }, {});

  for (const location of extra) {
    const district = location.district?.trim();
    const upazila = location.upazila?.trim();
    const mouza = location.mouza?.trim();

    if (!district || !upazila || !mouza) continue;

    merged[district] ||= {};
    merged[district][upazila] ||= [];

    if (!merged[district][upazila].includes(mouza)) {
      merged[district][upazila].push(mouza);
      merged[district][upazila].sort((left, right) => left.localeCompare(right));
    }
  }

  return merged;
}

export const getDistricts = (extra: LocationSource[] = []) => Object.keys(mergedLocationData(extra));
export const getUpazilas = (district: string, extra: LocationSource[] = []) => district ? Object.keys(mergedLocationData(extra)[district] || {}) : [];
export const getMouzas = (district: string, upazila: string, extra: LocationSource[] = []) =>
  district && upazila ? (mergedLocationData(extra)[district]?.[upazila] || []) : [];
