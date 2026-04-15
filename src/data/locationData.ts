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

export const getDistricts = () => Object.keys(locationData);
export const getUpazilas = (district: string) => district ? Object.keys(locationData[district] || {}) : [];
export const getMouzas = (district: string, upazila: string) =>
  district && upazila ? (locationData[district]?.[upazila] || []) : [];
