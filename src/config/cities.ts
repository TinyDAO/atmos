import { m } from "framer-motion"

export interface City {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
  icao: string
  timezone: string
  /** UTC offset in minutes (positive = east). Used for timezone sorting. */
  utcOffsetMinutes: number
  description: string
  gradient: string
  image: string
  /** Webcam image URLs for dashboard. Default 4 slots, add URLs to override. */
  webcams?: string[]
}

export const CITIES: City[] = [
  {
    id: 'sao-paulo',
    name: 'Sao Paulo',
    country: 'Brazil',
    latitude: -23.55,
    longitude: -46.63,
    icao: 'SBGR',
    timezone: 'America/Sao_Paulo',
    utcOffsetMinutes: -180,
    description: 'The largest city in the Southern Hemisphere, a vibrant metropolis of culture and commerce.',
    gradient: 'from-amber-600 via-orange-500 to-rose-500',
    image: '/images/cities/sao-paulo.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1249392511/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1356224219/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1580415336/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1356224219/original.jpg'
    ]
  },
  {
    id: 'nyc',
    name: 'New York City',
    country: 'USA',
    latitude: 40.71,
    longitude: -74.01,
    icao: 'KJFK',
    timezone: 'America/New_York',
    utcOffsetMinutes: -300,
    description: 'The city that never sleeps. A global hub of finance, culture, and innovation.',
    gradient: 'from-slate-700 via-blue-600 to-indigo-700',
    image: '/images/cities/nyc.jpg',
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    latitude: 37.57,
    longitude: 126.98,
    icao: 'RKSI',
    timezone: 'Asia/Seoul',
    utcOffsetMinutes: 540,
    description: 'Where ancient palaces meet cutting-edge technology. A dynamic blend of tradition and futurism.',
    gradient: 'from-violet-600 via-purple-500 to-fuchsia-600',
    image: '/images/cities/seoul.jpg',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.68,
    longitude: 139.69,
    icao: 'RJTT',
    timezone: 'Asia/Tokyo',
    utcOffsetMinutes: 540,
    description: 'A megacity where ancient temples stand alongside neon-lit skyscrapers.',
    gradient: 'from-rose-600 via-pink-500 to-violet-600',
    image: '/images/cities/tokyo.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1567938478/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1647579411/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1570808041/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1658398652/original.jpg'
    ]
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    country: 'China',
    latitude: 31.23,
    longitude: 121.47,
    icao: 'ZSPD',
    timezone: 'Asia/Shanghai',
    utcOffsetMinutes: 480,
    description: 'China\'s largest city. A global financial hub where East meets West.',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    image: '/images/cities/shanghai.jpg',
    webcams: [
      // 'https://imgproxy.windy.com/_/full/plain/current/1762629711/original.jpg',
      // 'https://imgproxy.windy.com/_/full/plain/current/1793897678/original.jpg'
    ]
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    country: 'China',
    latitude: 22.32,
    longitude: 114.17,
    icao: 'VHHH',
    timezone: 'Asia/Hong_Kong',
    utcOffsetMinutes: 480,
    description: 'A vibrant metropolis where skyscrapers meet traditional temples.',
    gradient: 'from-amber-500 via-orange-500 to-red-600',
    image: '/images/cities/hong-kong.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1166267733/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1526831849/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1592304269/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1627525317/original.jpg'
    ]
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    latitude: 1.29,
    longitude: 103.85,
    icao: 'WSSS',
    timezone: 'Asia/Singapore',
    utcOffsetMinutes: 480,
    description: 'A global financial hub where cultures converge. Gardens, skyscrapers, and world-class cuisine.',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    image: '/images/cities/singapore.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1369190454/original.jpg'
    ]
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    country: 'India',
    latitude: 26.85,
    longitude: 80.95,
    icao: 'VILK',
    timezone: 'Asia/Kolkata',
    utcOffsetMinutes: 330,
    description: 'City of Nawabs. Mughal heritage, kebabs, and the heart of Uttar Pradesh.',
    gradient: 'from-amber-600 via-orange-500 to-rose-600',
    image: '/images/cities/lucknow.jpg',
  },
  {
    id: 'tel-aviv',
    name: 'Tel Aviv',
    country: 'Israel',
    latitude: 32.09,
    longitude: 34.78,
    icao: 'LLBG',
    timezone: 'Asia/Jerusalem',
    utcOffsetMinutes: 120,
    description: 'The White City. Mediterranean beaches, Bauhaus architecture, and a thriving tech scene.',
    gradient: 'from-sky-500 via-blue-500 to-indigo-600',
    image: '/images/cities/tel-aviv.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1748254982/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1793900793/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1793900794/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1639421838/original.jpg'

    ]
  },
  {
    id: 'wellington',
    name: 'Wellington',
    country: 'New Zealand',
    latitude: -41.29,
    longitude: 174.78,
    icao: 'NZWN',
    timezone: 'Pacific/Auckland',
    utcOffsetMinutes: 720,
    description: 'The capital of New Zealand. Windy hills, craft beer, and film culture.',
    gradient: 'from-slate-600 via-blue-600 to-indigo-700',
    image: '/images/cities/wellington.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1533848823/original.jpg',

    ]
  },
  {
    id: 'atlanta',
    name: 'Atlanta',
    country: 'USA',
    latitude: 33.64,
    longitude: -84.43,
    icao: 'KATL',
    timezone: 'America/New_York',
    utcOffsetMinutes: -300,
    description: 'The capital of the South. Birthplace of civil rights and home to the world\'s busiest airport.',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    image: '/images/cities/atlanta.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1755892004/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1755898629/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1793873553/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1793873555/original.jpg',
    ],
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    latitude: 43.65,
    longitude: -79.38,
    icao: 'CYYZ',
    timezone: 'America/Toronto',
    utcOffsetMinutes: -300,
    description: 'Canada\'s largest city. A diverse, multicultural metropolis by the Great Lakes.',
    gradient: 'from-red-600 via-rose-500 to-pink-600',
    image: '/images/cities/toronto.jpg',
  },
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    latitude: 51.51,
    longitude: -0.13,
    icao: 'EGLL',
    timezone: 'Europe/London',
    utcOffsetMinutes: 0,
    description: 'A historic capital spanning two millennia. Royal palaces, world-class museums, and global finance.',
    gradient: 'from-slate-800 via-blue-800 to-slate-700',
    image: '/images/cities/london.jpg',
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    latitude: 48.86,
    longitude: 2.35,
    icao: 'LFPG',
    timezone: 'Europe/Paris',
    utcOffsetMinutes: 60,
    description: 'The City of Light. Art, fashion, gastronomy, and culture at the heart of Europe.',
    gradient: 'from-rose-600 via-pink-500 to-indigo-600',
    image: '/images/cities/paris.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1706118429/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1721599175/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1207755799/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1758303408/original.jpg',
    ],
  },
  {
    id: 'miami',
    name: 'Miami',
    country: 'USA',
    latitude: 25.79,
    longitude: -80.29,
    icao: 'KMIA',
    timezone: 'America/New_York',
    utcOffsetMinutes: -300,
    description: 'Gateway to the Americas. Beaches, art deco, and Latin culture.',
    gradient: 'from-sky-500 via-cyan-500 to-teal-600',
    image: '/images/cities/miami.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1642561701/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1736342847/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1621689267/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1588249493/original.jpg'
    ]
  },
  {
    id: 'chicago',
    name: 'Chicago',
    country: 'USA',
    latitude: 41.98,
    longitude: -87.91,
    icao: 'KORD',
    timezone: 'America/Chicago',
    utcOffsetMinutes: -360,
    description: 'The Windy City. Architecture, deep-dish pizza, and blues.',
    gradient: 'from-slate-600 via-blue-700 to-indigo-800',
    image: '/images/cities/chicago.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1499764260/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1624255665/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1643653572/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1624250933/original.jpg'
    ]
  },
  {
    id: 'seattle',
    name: 'Seattle',
    country: 'USA',
    latitude: 47.45,
    longitude: -122.31,
    icao: 'KSEA',
    timezone: 'America/Los_Angeles',
    utcOffsetMinutes: -480,
    description: 'The Emerald City. Tech hub, coffee culture, and Pacific Northwest beauty.',
    gradient: 'from-emerald-700 via-green-600 to-teal-700',
    image: '/images/cities/seattle.jpg',
  },
  {
    id: 'ankara',
    name: 'Ankara',
    country: 'Turkey',
    latitude: 39.93,
    longitude: 32.86,
    icao: 'LTAC',
    timezone: 'Europe/Istanbul',
    utcOffsetMinutes: 180,
    description: 'Capital of Turkey. Ancient Anatolia meets modern government.',
    gradient: 'from-amber-700 via-orange-600 to-red-600',
    image: '/images/cities/ankara.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1759873524/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1760176982/original.jpg',
    ]
  },
  {
    id: 'dallas',
    name: 'Dallas',
    country: 'USA',
    latitude: 32.90,
    longitude: -97.04,
    icao: 'KDFW',
    timezone: 'America/Chicago',
    utcOffsetMinutes: -360,
    description: 'Big D. Oil, tech, and the heart of North Texas.',
    gradient: 'from-slate-500 via-blue-600 to-indigo-600',
    image: '/images/cities/dallas.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1666664505/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1666641464/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1693849189/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1666648673/original.jpg'
    ]
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    latitude: -34.82,
    longitude: -58.54,
    icao: 'SAEZ',
    timezone: 'America/Argentina/Buenos_Aires',
    utcOffsetMinutes: -180,
    description: 'Paris of South America. Tango, steak, and European elegance.',
    gradient: 'from-sky-600 via-blue-500 to-indigo-600',
    image: '/images/cities/buenos-aires.jpg',
    webcams: [
      'https://imgproxy.windy.com/_/full/plain/current/1735938641/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1579385444/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1751040831/original.jpg',
      'https://imgproxy.windy.com/_/full/plain/current/1691337947/original.jpg',
    ],
  },
]
