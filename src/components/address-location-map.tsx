"use client"

import { useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { useTheme } from "next-themes"
import "leaflet/dist/leaflet.css"

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

function pinIcon(dark: boolean) {
  const fill = dark ? "#f4f4f5" : "#111111"
  const stroke = dark ? "#111111" : "#ffffff"
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    html: `<span style="display:block;width:16px;height:16px;margin-left:3px;border-radius:999px 999px 999px 0;background:${fill};border:2px solid ${stroke};transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  })
}

function RefreshSize() {
  const map = useMap()
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 150)
    return () => window.clearTimeout(id)
  }, [map])
  return null
}

function MapClick({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function FollowPin({
  latitude,
  longitude,
  zoom,
}: {
  latitude: number
  longitude: number
  zoom: number
}) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], zoom)
  }, [latitude, longitude, zoom, map])
  return null
}

export default function AddressLocationMap({
  latitude,
  longitude,
  zoom = 16,
  onPick,
}: {
  latitude: number | null
  longitude: number | null
  zoom?: number
  onPick: (latitude: number, longitude: number) => void
}) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  const icon = useMemo(() => pinIcon(dark), [dark])
  const hasPin = latitude != null && longitude != null

  return (
    <div
      className={cn(
        "h-full overflow-hidden rounded-xl border border-border [&_.leaflet-bottom]:hidden [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:cursor-crosshair [&_.leaflet-container]:bg-muted [&_.leaflet-container]:font-[inherit] [&_.leaflet-container_img]:max-h-none [&_.leaflet-container_img]:max-w-none [&_.leaflet-control-attribution]:hidden",
        dark
          ? "[&_.leaflet-tile-pane]:[filter:grayscale(1)_invert(1)_contrast(1.2)]"
          : "[&_.leaflet-tile-pane]:[filter:grayscale(1)_contrast(1.15)]",
      )}
    >
      <MapContainer
        center={hasPin ? [latitude, longitude] : [20, 0]}
        zoom={hasPin ? zoom : 2}
        className="h-full w-full"
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer url={TILES} subdomains="abc" />
        <RefreshSize />
        <MapClick onPick={onPick} />
        {hasPin ? (
          <>
            <FollowPin latitude={latitude} longitude={longitude} zoom={zoom} />
            <Marker position={[latitude, longitude]} icon={icon} />
          </>
        ) : null}
      </MapContainer>
      <span className="sr-only">Map data © OpenStreetMap</span>
    </div>
  )
}
