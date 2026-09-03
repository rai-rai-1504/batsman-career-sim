export interface AvatarPreset {
  id: string;
  name: string;
  emoji: string;
  skinTone: string;
  hairColor: string;
  accessory: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'avatar_1', name: 'The Prodigy', emoji: '🧑🏽‍🦱', skinTone: '#D4976A', hairColor: '#2B1B17', accessory: 'Sweatband' },
  { id: 'avatar_2', name: 'The Anchor', emoji: '🧔🏻', skinTone: '#FAD8C0', hairColor: '#4A3728', accessory: 'Trim Beard' },
  { id: 'avatar_3', name: 'The Finisher', emoji: '🧑🏿', skinTone: '#66462C', hairColor: '#1A1A1A', accessory: 'Earring' },
  { id: 'avatar_4', name: 'The Maestro', emoji: '🧑🏼‍🦰', skinTone: '#F5D0A9', hairColor: '#C44D25', accessory: 'Red Mane' },
  { id: 'avatar_5', name: 'The Dynamo', emoji: '🧑🏾', skinTone: '#8D5524', hairColor: '#111111', accessory: 'Fade Cut' },
  { id: 'avatar_6', name: 'The Veteran', emoji: '🧔🏽‍♂️', skinTone: '#BB8044', hairColor: '#5C5C5C', accessory: 'Bandana' },
  { id: 'avatar_7', name: 'The Powerhitter', emoji: '👱🏼‍♂️', skinTone: '#FFE0BD', hairColor: '#E6C280', accessory: 'Gold Chain' },
  { id: 'avatar_8', name: 'The Wall', emoji: '🧑🏽', skinTone: '#C68642', hairColor: '#332421', accessory: 'Focus Helmet' },
];

export const BAT_COLORS: { name: string; hex: string }[] = [
  { name: 'Classic Willow', hex: '#D2A679' },
  { name: 'Neon Green', hex: '#00D4A5' },
  { name: 'Electric Gold', hex: '#FFB020' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Midnight Black', hex: '#1E293B' },
  { name: 'Royal Cyan', hex: '#06B6D4' },
  { name: 'Deep Purple', hex: '#8B5CF6' },
  { name: 'Hot Pink', hex: '#EC4899' },
];
