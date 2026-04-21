// source.unsplash.com was shut down in 2024; picsum.photos is identical:
// no API key, seed-based for consistent images per plan/profile.

export function hashString(s: string): number {
  return Math.abs(s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 1000
}

export function getPlanPhoto(activityType: string, title: string): string {
  const seed = hashString(activityType + title)
  return `https://picsum.photos/seed/${seed}/800/400`
}

export function getProfilePhoto(name: string, city: string): string {
  const seed = hashString(name + city)
  return `https://picsum.photos/seed/${seed}/400/400`
}

export function getBannerPhoto(name: string, city: string): string {
  const seed = hashString(name + city + 'banner')
  return `https://picsum.photos/seed/${seed}/800/300`
}
