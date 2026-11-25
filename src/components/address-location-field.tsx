"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { LocateFixed } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const AddressLocationMap = dynamic(() => import("@/components/address-location-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-36 animate-pulse rounded-xl bg-muted" />,
})

export type AddressCoordinates = {
  latitude: number | null
  longitude: number | null
}

type Precision = "city" | "exact" | "none"

function roundCoord(value: number) {
  return Math.round(value * 1e6) / 1e6
}

function locationError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is blocked. Allow it for this site, or drop a pin on the map."
  }
  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Drop a pin on the map instead."
  }
  return "Your location could not be read. Drop a pin on the map instead."
}

export function AddressLocationField({
  latitude,
  longitude,
  city,
  country,
  onChange,
  className,
}: AddressCoordinates & {
  city: string
  country: string
  onChange: (next: AddressCoordinates) => void
  className?: string
}) {
  const [locating, setLocating] = useState(false)
  const [precision, setPrecision] = useState<Precision>(latitude != null ? "exact" : "none")
  const [lookupKey, setLookupKey] = useState(0)
  const precisionRef = useRef(precision)
  precisionRef.current = precision
  const hasPin = latitude != null && longitude != null

  const setPin = (nextLatitude: number, nextLongitude: number, nextPrecision: Precision) => {
    setPrecision(nextPrecision)
    onChange({
      latitude: roundCoord(nextLatitude),
      longitude: roundCoord(nextLongitude),
    })
  }

  useEffect(() => {
    const name = city.trim()
    if (name.length < 2 || precisionRef.current === "exact") return

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ city: name })
      if (country.trim()) params.set("country", country.trim())
      fetch(`/api/store/geocode?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return null
          return (await response.json()) as AddressCoordinates
        })
        .then((match) => {
          if (precisionRef.current === "exact") return
          if (match?.latitude == null || match.longitude == null) return
          setPin(match.latitude, match.longitude, "city")
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
        })
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [city, country, lookupKey])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error({
        title: "Location unavailable",
        description: "This browser cannot read your location. Drop a pin on the map.",
      })
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin(position.coords.latitude, position.coords.longitude, "exact")
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        toast.error({
          title: "Could not set location",
          description: locationError(error),
        })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  return (
    <div className={cn("flex min-h-36 flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label>Location</Label>
        {hasPin ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setPrecision("none")
              onChange({ latitude: null, longitude: null })
              setLookupKey((key) => key + 1)
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="h-44 sm:h-auto sm:min-h-0 sm:flex-1">
        <AddressLocationMap
          latitude={latitude}
          longitude={longitude}
          zoom={precision === "city" ? 11 : 16}
          onPick={(nextLatitude, nextLongitude) => setPin(nextLatitude, nextLongitude, "exact")}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {hasPin
          ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          : "Enter a city, or set your current location."}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
        <LocateFixed />
        {locating ? "Finding location…" : "Set location"}
      </Button>
    </div>
  )
}
