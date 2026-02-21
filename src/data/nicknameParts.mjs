export const NICK_WORD_CATEGORIES = {
  colors: [
    'Amber', 'Aqua', 'Azure', 'Beige', 'Black', 'Blue', 'Bronze', 'Coral', 'Crimson', 'Cyan',
    'Emerald', 'Gold', 'Gray', 'Green', 'Indigo', 'Ivory', 'Jade', 'Lavender', 'Lime', 'Magenta',
    'Maroon', 'Mint', 'Navy', 'Neon', 'Olive', 'Orange', 'Peach', 'Pink', 'Plum', 'Purple',
    'Red', 'Rose', 'Ruby', 'Saffron', 'Scarlet', 'Silver', 'Teal', 'Turquoise', 'Violet', 'White',
    'Yellow',
  ],
  adjectives: [
    'Agile', 'Alert', 'Bold', 'Bright', 'Calm', 'Clever', 'Crisp', 'Daring', 'Eager', 'Fancy',
    'Fast', 'Fierce', 'Focused', 'Gentle', 'Grand', 'Happy', 'Icy', 'Jolly', 'Keen', 'Kind',
    'Lucky', 'Mighty', 'Nimble', 'Noble', 'Patient', 'Playful', 'Proud', 'Quick', 'Rapid', 'Ready',
    'Sharp', 'Silent', 'Smart', 'Smooth', 'Solid', 'Steady', 'Steel', 'Sunny', 'Swift', 'Tidy',
    'Vivid', 'Wise', 'Zesty',
  ],
  animals: [
    'Ant', 'Bear', 'Beaver', 'Bee', 'Bison', 'Cat', 'Cheetah', 'Cobra', 'Crane', 'Crow',
    'Deer', 'Dolphin', 'Dragon', 'Eagle', 'Falcon', 'Finch', 'Fox', 'Frog', 'Gecko', 'Hawk',
    'Horse', 'Hound', 'Koala', 'Lion', 'Lynx', 'Mantis', 'Moose', 'Otter', 'Owl', 'Panda',
    'Panther', 'Penguin', 'Pigeon', 'Puma', 'Rabbit', 'Raven', 'Seal', 'Shark', 'Sparrow', 'Tiger',
    'Turtle', 'Whale', 'Wolf', 'Wren', 'Yak', 'Zebra',
  ],
  objects: [
    'Anchor', 'Arrow', 'Beacon', 'Blade', 'Bolt', 'Book', 'Bridge', 'Cannon', 'Clock', 'Compass',
    'Crystal', 'Cube', 'Disk', 'Drone', 'Engine', 'Feather', 'Flame', 'Gadget', 'Gear', 'Globe',
    'Hammer', 'Helmet', 'Jet', 'Key', 'Lantern', 'Laser', 'Lens', 'Magnet', 'Mirror', 'Needle',
    'Nova', 'Orb', 'Pixel', 'Planet', 'Prism', 'Radar', 'Rocket', 'Shield', 'Signal', 'Socket',
    'Spark', 'Sphere', 'Star', 'Stone', 'Switch', 'Tablet', 'Tower', 'Wheel', 'Wing',
  ],
  coding: [
    'Agent', 'Algorithm', 'Array', 'Binary', 'Branch', 'Buffer', 'Cache', 'Class', 'Cloud', 'Code',
    'Commit', 'Compiler', 'Cookie', 'Cursor', 'Data', 'Debug', 'Deploy', 'Docker', 'Field', 'Flux',
    'Frame', 'Function', 'Gateway', 'Git', 'Graph', 'Hash', 'Hook', 'Index', 'Kernel', 'Lambda',
    'Library', 'Linker', 'Logic', 'Loop', 'Matrix', 'Method', 'Module', 'Object', 'Packet', 'Parser',
    'Patch', 'Pilot', 'Pipeline', 'Pointer', 'Process', 'Protocol', 'Query', 'Queue', 'Script', 'Server',
    'Stack', 'Stream', 'Syntax', 'Tensor', 'Thread', 'Token', 'Variable', 'Vector',
  ],
}

const ALL_NICK_WORDS = Object.values(NICK_WORD_CATEGORIES).flat()
const UNIQUE_NICK_WORDS = [...new Set(ALL_NICK_WORDS)]

// All three slots intentionally share the same safe dictionary pool.
export const NICK_PARTS_A = UNIQUE_NICK_WORDS
export const NICK_PARTS_B = UNIQUE_NICK_WORDS
export const NICK_PARTS_C = UNIQUE_NICK_WORDS
