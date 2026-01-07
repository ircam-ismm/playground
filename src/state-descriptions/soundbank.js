export default {
  updateSoundBankPreset: {
    type: 'any',
    event: true,
    acknowledge: false,
  },
  updateSoundBankPresetNotification: {
    type: 'any',
    event: true,
    acknowledge: false,
  },
  updateSoundFilePreset: {
    type: 'any',
    event: true,
    acknowledge: false,
  },
  updateSoundFilePresetNotification: {
    type: 'any',
    event: true,
    acknowledge: false,
  },
  soundBanks: {
    type: 'any',
    default: {},
  },
  soundBankDefaultPresets: {
    type: 'any',
    default: {},
  },
  soundFileDefaultPresets: {
    type: 'any',
    default: {},
  },
}
