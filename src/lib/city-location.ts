import { City, Country, type ICity } from "country-state-city"

let citiesByName: Map<string, ICity[]> | null = null

function cityIndex() {
  if (citiesByName) return citiesByName
  const index = new Map<string, ICity[]>()
  for (const city of City.getAllCities()) {
    const key = city.name.toLowerCase()
    const existing = index.get(key)
    if (existing) existing.push(city)
    else index.set(key, [city])
  }
  citiesByName = index
  return index
}

function countryCode(country: string) {
  const name = country.trim().toLowerCase()
  if (!name) return null
  const match = Country.getAllCountries().find(
    (item) => item.name.toLowerCase() === name || item.isoCode.toLowerCase() === name,
  )
  return match?.isoCode ?? null
}

function withCoordinates(cities: ICity[]) {
  return cities.find((city) => city.latitude && city.longitude) ?? null
}

/** Center point for a typed city name. Country disambiguates shared names. */
export function locateCity(city: string, country = "") {
  const name = city.trim().toLowerCase()
  if (name.length < 2) return null

  const index = cityIndex()
  let hits = index.get(name) ?? []
  if (!hits.length && name.length >= 3) {
    hits = []
    for (const [key, cities] of index) {
      if (!key.startsWith(name)) continue
      hits.push(...cities)
      if (hits.length > 30) break
    }
  }

  const code = countryCode(country)
  if (code) {
    const narrowed = hits.filter((item) => item.countryCode === code)
    if (narrowed.length) hits = narrowed
  }

  hits.sort((a, b) => a.name.length - b.name.length)
  const match = withCoordinates(hits)
  if (!match?.latitude || !match.longitude) return null
  const latitude = Number(match.latitude)
  const longitude = Number(match.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}
