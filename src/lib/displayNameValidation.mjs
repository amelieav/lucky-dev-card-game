import leoProfanity from 'leo-profanity'

export const DISPLAY_NAME_MIN_LENGTH = 3
export const DISPLAY_NAME_MAX_LENGTH = 16
export const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_]+$/
const EXTRA_BLOCKED_FRAGMENTS = [
  'kkk',
  'kukluxklan',
]
const RESTRICTED_TOPIC_FRAGMENTS = [
  'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia', 'austria', 'azerbaijan',
  'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin', 'bhutan', 'bolivia',
  'bosnia', 'botswana', 'brazil', 'brunei', 'bulgaria', 'burkina', 'burundi', 'cambodia', 'cameroon', 'canada',
  'chad', 'chile', 'china', 'colombia', 'comoros', 'congo', 'costarica', 'croatia', 'cuba', 'cyprus',
  'czechia', 'denmark', 'djibouti', 'dominica', 'ecuador', 'egypt', 'eritrea', 'estonia', 'eswatini', 'ethiopia',
  'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'greece', 'grenada',
  'guatemala', 'guinea', 'guyana', 'haiti', 'honduras', 'hungary', 'iceland', 'india', 'indonesia', 'iran',
  'iraq', 'ireland', 'israel', 'italy', 'jamaica', 'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati',
  'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein',
  'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius',
  'mexico', 'micronesia', 'moldova', 'monaco', 'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia',
  'nauru', 'nepal', 'netherlands', 'newzealand', 'nicaragua', 'niger', 'nigeria', 'norway', 'oman', 'pakistan',
  'palau', 'palestine', 'panama', 'paraguay', 'peru', 'philippines', 'poland', 'portugal', 'qatar', 'romania', 'russia',
  'rwanda', 'samoa', 'sanmarino', 'saudiarabia', 'senegal', 'serbia', 'seychelles', 'singapore', 'slovakia', 'slovenia',
  'somalia', 'spain', 'srilanka', 'sudan', 'suriname', 'sweden', 'switzerland', 'syria', 'taiwan', 'tajikistan',
  'tanzania', 'thailand', 'timorleste', 'togo', 'tonga', 'tunisia', 'turkiye', 'turkey', 'turkmenistan', 'tuvalu',
  'uganda', 'ukraine', 'unitedarabemirates', 'uae', 'unitedkingdom', 'britain', 'england', 'scotland', 'wales', 'uk',
  'unitedstates', 'america', 'usa', 'uruguay', 'uzbekistan', 'vanuatu', 'venezuela', 'vietnam', 'yemen', 'zambia',
  'zimbabwe',
  'christian', 'christianity', 'catholic', 'protestant', 'orthodox', 'muslim', 'islam', 'islamic', 'hindu', 'hinduism',
  'buddhist', 'buddhism', 'jewish', 'judaism', 'jew', 'sikh', 'sikhism', 'atheist', 'atheism', 'agnostic',
  'taoist', 'taoism', 'shinto', 'jain', 'jainism', 'pagan', 'wicca', 'bahai', 'zoroastrian', 'religion',
  'allah', 'jesus', 'christ', 'yahweh', 'bible', 'quran', 'torah',
  'immigrant', 'immigrants', 'immigration', 'migrant', 'migrants', 'migration', 'refugee', 'refugees', 'asylum',
]
const BLOCKED_FRAGMENTS = Array.from(new Set([
  ...EXTRA_BLOCKED_FRAGMENTS,
  ...RESTRICTED_TOPIC_FRAGMENTS,
]))

export function normalizeDisplayNameForCheck(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function validateDisplayName(inputValue) {
  const value = String(inputValue || '').trim()

  if (value.length < DISPLAY_NAME_MIN_LENGTH || value.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      code: 'length',
      message: `Display name must be ${DISPLAY_NAME_MIN_LENGTH}-${DISPLAY_NAME_MAX_LENGTH} characters.`,
    }
  }

  if (!DISPLAY_NAME_PATTERN.test(value)) {
    return {
      ok: false,
      code: 'charset',
      message: 'Display name can only use letters, numbers, and underscores.',
    }
  }

  const normalizedForCheck = normalizeDisplayNameForCheck(value)
  if (!normalizedForCheck) {
    return {
      ok: false,
      code: 'empty',
      message: 'Display name is invalid.',
    }
  }

  if (leoProfanity.check(normalizedForCheck)) {
    return {
      ok: false,
      code: 'profanity',
      message: 'Display name contains blocked language.',
    }
  }

  if (BLOCKED_FRAGMENTS.some((fragment) => normalizedForCheck.includes(fragment))) {
    return {
      ok: false,
      code: 'profanity',
      message: 'Display name contains blocked language.',
    }
  }

  return {
    ok: true,
    code: null,
    message: null,
    value,
    normalizedForCheck,
  }
}
