/**
 * profileCompletion.ts
 *
 * Profile Completion Breakdown Logic:
 * Total Completion = 100%
 * - Section A: Basic Onboarding Steps (80% Total)
 *   - Step 1 (16% total): Name (3.2%), DOB (3.2%), Height (3.2%), Gender (3.2%), Preference (3.2%)
 *   - Step 2 (16% total): Location (3.2%), Religion (3.2%), Drink (3.2%), Smoke (3.2%), Weed (3.2%)
 *   - Step 3 (16% total): Bio (8%), Interests (8%)
 *   - Step 4 (16% total): College (5.333%), Year (5.333%), Course (5.334%)
 *   - Step 5 (16% total): Photos (8% - min 2 photos), Prompts (8% - min 1 prompt)
 * - Section B: Get Verified (10% Total)
 * - Section C: Connect Spotify (10% Total)
 */

export interface CompletionItem {
  id: string;
  section: 'onboarding' | 'verification' | 'spotify';
  label: string;
  weight: number;
  isCompleted: boolean;
  actionText: string;
  actionRoute?: string;
  actionType?: 'spotify' | 'verification' | 'edit_profile';
}

export interface ProfileCompletionResult {
  totalPercentage: number;
  onboardingPercentage: number;
  isVerified: boolean;
  isSpotifyConnected: boolean;
  completedItems: CompletionItem[];
  missingItems: CompletionItem[];
  allItems: CompletionItem[];
}

export function calculateProfileCompletion(user: any): ProfileCompletionResult {
  if (!user) {
    return {
      totalPercentage: 0,
      onboardingPercentage: 0,
      isVerified: false,
      isSpotifyConnected: false,
      completedItems: [],
      missingItems: [],
      allItems: [],
    };
  }

  // Section A: Onboarding Fields (80% total)
  // Step 1 (16%)
  const hasName = !!(user.name && user.name.trim().length > 0);
  const hasDob = !!(user.dob || user.age);
  const hasHeight = !!(user.height && user.height > 0);
  const hasGender = !!(user.gender && user.gender.trim().length > 0);
  const hasPreference = !!(user.gender_preference && user.gender_preference.trim().length > 0);

  // Step 2 (16%)
  const hasLocation = !!(user.location && user.location.trim().length > 0);
  const hasReligion = !!(user.religion && user.religion.trim().length > 0);
  const hasDrink = !!(user.drink && user.drink.trim().length > 0);
  const hasSmoke = !!(user.smoke && user.smoke.trim().length > 0);
  const hasWeed = !!(user.weed && user.weed.trim().length > 0);

  // Step 3 (16%)
  const hasBio = !!(user.bio && user.bio.trim().length > 0);
  const hasInterests = !!(Array.isArray(user.interests) && user.interests.length > 0);

  // Step 4 (16%)
  const hasCollege = !!(user.college_id || (user.college && user.college.name));
  const hasYear = !!(user.year && user.year.trim().length > 0);
  const hasCourse = !!(user.course && user.course.trim().length > 0);

  // Step 5 (16%)
  const photosArray = Array.isArray(user.photos) ? user.photos : [];
  const hasPhotos = photosArray.length >= 2 || (user.picture && photosArray.length >= 1);
  const promptsObj = user.prompts && typeof user.prompts === 'object' ? user.prompts : {};
  const hasPrompts = Object.keys(promptsObj).length > 0;

  // Section B: Verification (10%)
  const isVerified = user.verification_status === 'verified';

  // Section C: Spotify (10%)
  const isSpotifyConnected = !!(user.spotify_data && Object.keys(user.spotify_data).length > 0);

  const allItems: CompletionItem[] = [
    // Step 1
    { id: 's1_name', section: 'onboarding', label: 'Full Name', weight: 3.2, isCompleted: hasName, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's1_dob', section: 'onboarding', label: 'Date of Birth / Age', weight: 3.2, isCompleted: hasDob, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's1_height', section: 'onboarding', label: 'Height Selection', weight: 3.2, isCompleted: hasHeight, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's1_gender', section: 'onboarding', label: 'Gender', weight: 3.2, isCompleted: hasGender, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's1_pref', section: 'onboarding', label: 'Gender Preference', weight: 3.2, isCompleted: hasPreference, actionText: 'Edit Profile', actionType: 'edit_profile' },

    // Step 2
    { id: 's2_loc', section: 'onboarding', label: 'Current Location', weight: 3.2, isCompleted: hasLocation, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's2_religion', section: 'onboarding', label: 'Religion', weight: 3.2, isCompleted: hasReligion, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's2_drink', section: 'onboarding', label: 'Drinking Habit', weight: 3.2, isCompleted: hasDrink, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's2_smoke', section: 'onboarding', label: 'Smoking Habit', weight: 3.2, isCompleted: hasSmoke, actionText: 'Edit Profile', actionType: 'edit_profile' },
    { id: 's2_weed', section: 'onboarding', label: 'Weed Habit', weight: 3.2, isCompleted: hasWeed, actionText: 'Edit Profile', actionType: 'edit_profile' },

    // Step 3
    { id: 's3_bio', section: 'onboarding', label: 'Short Bio', weight: 8, isCompleted: hasBio, actionText: 'Add Bio', actionType: 'edit_profile' },
    { id: 's3_interests', section: 'onboarding', label: 'Interests & Tags', weight: 8, isCompleted: hasInterests, actionText: 'Pick Interests', actionType: 'edit_profile' },

    // Step 4
    { id: 's4_college', section: 'onboarding', label: 'College Selection', weight: 5.333, isCompleted: hasCollege, actionText: 'Select College', actionType: 'edit_profile' },
    { id: 's4_year', section: 'onboarding', label: 'College Year', weight: 5.333, isCompleted: hasYear, actionText: 'Select Year', actionType: 'edit_profile' },
    { id: 's4_course', section: 'onboarding', label: 'Course / Major', weight: 5.334, isCompleted: hasCourse, actionText: 'Add Course', actionType: 'edit_profile' },

    // Step 5
    { id: 's5_photos', section: 'onboarding', label: 'Photos (Min 2 photos)', weight: 8, isCompleted: hasPhotos, actionText: 'Upload Photos', actionType: 'edit_profile' },
    { id: 's5_prompts', section: 'onboarding', label: 'Photo Prompts', weight: 8, isCompleted: hasPrompts, actionText: 'Add Prompt', actionType: 'edit_profile' },

    // Section B
    { id: 'verification', section: 'verification', label: 'Student Identity Verification', weight: 10, isCompleted: isVerified, actionText: 'Get Verified', actionType: 'verification', actionRoute: '/onboarding/verification' },

    // Section C
    { id: 'spotify', section: 'spotify', label: 'Spotify & Music Integration', weight: 10, isCompleted: isSpotifyConnected, actionText: 'Connect Spotify', actionType: 'spotify' },
  ];

  let rawTotal = 0;
  let rawOnboarding = 0;

  for (const item of allItems) {
    if (item.isCompleted) {
      rawTotal += item.weight;
      if (item.section === 'onboarding') {
        rawOnboarding += item.weight;
      }
    }
  }

  const totalPercentage = Math.min(100, Math.round(rawTotal));
  const onboardingPercentage = Math.min(80, Math.round(rawOnboarding));

  const completedItems = allItems.filter(i => i.isCompleted);
  const missingItems = allItems.filter(i => !i.isCompleted);

  return {
    totalPercentage,
    onboardingPercentage,
    isVerified,
    isSpotifyConnected,
    completedItems,
    missingItems,
    allItems,
  };
}
