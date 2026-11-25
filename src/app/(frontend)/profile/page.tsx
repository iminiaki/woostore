"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Heart, User, Settings, Edit, Trash2, Star, LogOut, Wallet, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountOrdersList } from "@/components/account-orders-list";
import { AccountWallet } from "@/components/account-wallet";
import { AddressLocationField } from "@/components/address-location-field";
import { useWishlist } from "@/components/wishlist-store";
import { useCart } from "@/components/cart-store";
import { useAuth } from "@/components/auth-context";
import { VariantSelector } from "@/components/variant-selector";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProtectedRoute } from "@/components/protected-route";
import { PageShell } from "@/components/page-shell";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

type SavedAddress = {
  id: string;
  title: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
};

const blankAddressForm = {
  id: "",
  title: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  latitude: null as number | null,
  longitude: null as number | null,
};

function readSavedAddress(value: unknown): SavedAddress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<SavedAddress>;
  if (typeof raw.id !== "string" || !raw.id) return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    street: typeof raw.street === "string" ? raw.street : "",
    city: typeof raw.city === "string" ? raw.city : "",
    state: typeof raw.state === "string" ? raw.state : "",
    zipCode: typeof raw.zipCode === "string" ? raw.zipCode : "",
    country: typeof raw.country === "string" ? raw.country : "",
    isDefault: Boolean(raw.isDefault),
    latitude: typeof raw.latitude === "number" && Number.isFinite(raw.latitude) ? raw.latitude : null,
    longitude: typeof raw.longitude === "number" && Number.isFinite(raw.longitude) ? raw.longitude : null,
  };
}

type AccountSettings = {
  orderUpdates: boolean;
  newArrivals: boolean;
  promotional: boolean;
  browsingHistory: boolean;
  recommendations: boolean;
};

const defaultSettings: AccountSettings = {
  orderUpdates: true,
  newArrivals: true,
  promotional: false,
  browsingHistory: true,
  recommendations: false,
};

const profileTabs = ["orders", "wallet", "wishlist", "profile", "settings"] as const;

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = profileTabs.includes(requestedTab as (typeof profileTabs)[number])
    ? requestedTab!
    : "orders";

  const selectTab = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  };
  const tabListRef = useRef<HTMLDivElement>(null);
  const pillReady = useRef(false);
  const [tabPill, setTabPill] = useState<{ top: number; height: number; immediate: boolean } | null>(null);

  useLayoutEffect(() => {
    const list = tabListRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    const top = active.offsetTop;
    const height = active.offsetHeight;
    setTabPill({ top, height, immediate: !pillReady.current });
    pillReady.current = true;
  }, [activeTab]);
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<any>(null);
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesReady, setAddressesReady] = useState(false);
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);

  const [editAddressForm, setEditAddressForm] = useState(blankAddressForm);
  const [addressFormKey, setAddressFormKey] = useState(0);

  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  const { state: wishlistState, dispatch: wishlistDispatch } = useWishlist();
  const { dispatch: cartDispatch } = useCart();
  const { user, logout, updateProfile } = useAuth();

  const tabs = [
    { id: "orders", label: "Orders", icon: Package },
    { id: "wallet", label: "Wallet", icon: Wallet },
    {
      id: "wishlist",
      label: "Wishlist",
      icon: Heart,
      count: wishlistState.items.length > 0 ? wishlistState.items.length : undefined,
    },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  useEffect(() => {
    if (!user) return;
    setProfileData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    });
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    setAddressesReady(false);
    setSettingsReady(false);
    try {
      const rawAddresses = localStorage.getItem(`lastore-addresses:${user.email}`);
      const parsedAddresses = rawAddresses ? JSON.parse(rawAddresses) : [];
      setAddresses(
        Array.isArray(parsedAddresses)
          ? parsedAddresses.flatMap((item) => {
              const address = readSavedAddress(item);
              return address ? [address] : [];
            })
          : [],
      );
    } catch {
      setAddresses([]);
    }
    try {
      const rawSettings = localStorage.getItem(`lastore-settings:${user.email}`);
      setSettings(rawSettings ? { ...defaultSettings, ...JSON.parse(rawSettings) } : defaultSettings);
    } catch {
      setSettings(defaultSettings);
    }
    setAddressesReady(true);
    setSettingsReady(true);
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email || !addressesReady) return;
    localStorage.setItem(`lastore-addresses:${user.email}`, JSON.stringify(addresses));
  }, [addresses, addressesReady, user?.email]);

  useEffect(() => {
    if (!user?.email || !settingsReady) return;
    localStorage.setItem(`lastore-settings:${user.email}`, JSON.stringify(settings));
  }, [settings, settingsReady, user?.email]);

  const handleAddToCartWithVariants = (product: any, selectedColor: string, selectedSize: string) => {
    const productWithVariants = {
      ...product,
      selectedColor,
      selectedSize,
    };
    cartDispatch({ type: "add", product: productWithVariants, quantity: 1 });
    wishlistDispatch({ type: "remove", productId: product.id });
  };

  const renderOrders = () => <AccountOrdersList />;

  const renderWishlist = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Wishlist</h2>
      {wishlistState.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start adding items to your wishlist to see them here
            </p>
            <Button asChild>
              <Link href="/shop">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-4">
          {wishlistState.items.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <Link href={`/product/${product.id}`} className="block">
                  <div className="relative aspect-[1/1] mb-4 overflow-hidden rounded-md bg-muted">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <h3 className="font-medium hover:underline">{product.name}</h3>
                </Link>
                {product.category ? (
                  <p className="text-sm text-muted-foreground capitalize">{product.category}</p>
                ) : null}
                <p className="font-medium mt-2">${Number(product.price || 0).toFixed(2)}</p>
                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      if (product.colors.length > 0 || product.sizes.length > 0) {
                        setVariantSelectorProduct(product);
                        setIsVariantSelectorOpen(true);
                      } else {
                        cartDispatch({ type: "add", product, quantity: 1 });
                        wishlistDispatch({ type: "remove", productId: product.id });
                      }
                    }}
                  >
                    Add to Cart
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => wishlistDispatch({ type: "remove", productId: product.id })}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Profile Information</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">First Name</Label>
            <p className="text-sm text-muted-foreground">{profileData.firstName || "Not set"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Last Name</Label>
            <p className="text-sm text-muted-foreground">{profileData.lastName || "Not set"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-muted-foreground">{profileData.email}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Phone</Label>
            <p className="text-sm text-muted-foreground">{profileData.phone || "Not set"}</p>
          </div>
          <Button variant="outline" onClick={() => {
            // Reset form to current profile data when opening
            setEditForm({
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              email: profileData.email,
              phone: profileData.phone,
            });
            setIsEditProfileOpen(true);
          }}>Edit Profile</Button>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold">Shipping Addresses</h2>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-4">
            {addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipping addresses saved yet.</p>
            ) : null}
            {addresses.map((address) => (
              <div key={address.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{address.title}</h3>
                  <div className="flex gap-1">
                  {!address.isDefault && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setAddresses(addresses.map(addr => ({
                            ...addr,
                            isDefault: addr.id === address.id
                          })));
                        }}
                        className="text-muted-foreground hover:text-primary"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditAddressForm({
                          id: address.id,
                          title: address.title,
                          street: address.street,
                          city: address.city,
                          state: address.state,
                          zipCode: address.zipCode,
                          country: address.country,
                          latitude: address.latitude,
                          longitude: address.longitude,
                        });
                        setAddressFormKey((key) => key + 1);
                        setIsAddingNewAddress(false);
                        setIsEditAddressOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const remaining = addresses.filter((item) => item.id !== address.id);
                        const next = address.isDefault && remaining.length
                          ? remaining.map((item, index) => ({ ...item, isDefault: index === 0 }))
                          : remaining;
                        setAddresses(next);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove address"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {address.street}
                  {[address.city, address.state, address.zipCode].filter(Boolean).length ? (
                    <>
                      <br />
                      {[address.city, address.state, address.zipCode].filter(Boolean).join(", ")}
                    </>
                  ) : null}
                  {address.country ? (
                    <>
                      <br />
                      {address.country}
                    </>
                  ) : null}
                </p>
                {address.latitude != null && address.longitude != null ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    Location set
                  </p>
                ) : null}
                {address.isDefault && (
                  <div className="inline-flex items-center gap-1 mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    <Star className="h-3 w-3 fill-current" />
                    <span>Default Address</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setEditAddressForm(blankAddressForm);
              setAddressFormKey((key) => key + 1);
              setIsAddingNewAddress(true);
              setIsEditAddressOpen(true);
            }}
          >
            Add New Address
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Account Settings</h2>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Email Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="order-updates"
                  checked={settings.orderUpdates}
                  onCheckedChange={(checked) => setSettings({ ...settings, orderUpdates: checked === true })}
                />
                <Label htmlFor="order-updates">Order updates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-arrivals"
                  checked={settings.newArrivals}
                  onCheckedChange={(checked) => setSettings({ ...settings, newArrivals: checked === true })}
                />
                <Label htmlFor="new-arrivals">New arrivals</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="promotional"
                  checked={settings.promotional}
                  onCheckedChange={(checked) => setSettings({ ...settings, promotional: checked === true })}
                />
                <Label htmlFor="promotional">Promotional emails</Label>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium">Privacy</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="browsing-history"
                  checked={settings.browsingHistory}
                  onCheckedChange={(checked) => setSettings({ ...settings, browsingHistory: checked === true })}
                />
                <Label htmlFor="browsing-history">Save browsing history</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recommendations"
                  checked={settings.recommendations}
                  onCheckedChange={(checked) => setSettings({ ...settings, recommendations: checked === true })}
                />
                <Label htmlFor="recommendations">Personalized recommendations</Label>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              if (user?.email) {
                localStorage.setItem(`lastore-settings:${user.email}`, JSON.stringify(settings));
              }
              toast({ title: "Settings saved" });
            }}
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ProtectedRoute>
      <PageShell className="space-y-8 md:space-y-10">
        <div className="space-y-6">
          <Breadcrumbs
            items={[
              { label: "Profile" }
            ]}
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </p>
          </div>
        </div>

      <div className="md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:items-start md:gap-x-16">
      <nav
        aria-label="Account sections"
        className="border-b border-border/70 md:sticky md:top-24 md:self-start md:border-0"
      >
        <div
          ref={tabListRef}
          className="relative -mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
          role="tablist"
        >
          {tabPill ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-0 hidden rounded-full bg-foreground md:block"
              style={{ borderRadius: 999 }}
              initial={false}
              animate={{ top: tabPill.top, height: tabPill.height }}
              transition={
                tabPill.immediate
                  ? { duration: 0 }
                  : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
              }
            />
          ) : null}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = "count" in tab ? tab.count : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(event) => {
                  selectTab(tab.id);
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    event.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      inline: "center",
                      block: "nearest",
                    });
                  }
                }}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm font-medium transition-colors duration-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
                  "md:w-full md:justify-start md:gap-3 md:rounded-full md:px-4 md:py-2.5",
                  isActive
                    ? "text-foreground md:text-background"
                    : "text-muted-foreground hover:text-foreground md:hover:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "relative z-10 h-4 w-4 transition-transform duration-300",
                    isActive && "scale-110 md:scale-100",
                  )}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span className="relative z-10">{tab.label}</span>
                {count != null ? (
                  <span
                    className={cn(
                      "relative z-10 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
                      isActive
                        ? "bg-foreground text-background md:bg-background md:text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
                {isActive ? (
                  <motion.span
                    layoutId="profile-tab-ink"
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto h-1 w-9 rounded-full bg-foreground md:hidden"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 26,
                      mass: 0.7,
                    }}
                  />
                ) : null}
              </button>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm font-medium text-destructive transition-colors duration-300",
              "hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
              "md:w-full md:justify-start md:gap-3 md:rounded-full md:px-4 md:py-2.5 md:hover:bg-destructive/10",
            )}
          >
            <LogOut className="relative z-10 h-4 w-4" strokeWidth={1.75} />
            <span className="relative z-10">Sign Out</span>
          </button>
        </div>
      </nav>

      <div className="min-h-[400px] min-w-0 pt-6 md:pt-1">
        {activeTab === "orders" && renderOrders()}
        {activeTab === "wallet" && <AccountWallet />}
        {activeTab === "wishlist" && renderWishlist()}
        {activeTab === "profile" && renderProfile()}
        {activeTab === "settings" && renderSettings()}
      </div>
      </div>

      {/* Variant Selector Modal */}
      {variantSelectorProduct && (
        <VariantSelector
          product={variantSelectorProduct}
          isOpen={isVariantSelectorOpen}
          onClose={() => {
            setIsVariantSelectorOpen(false);
            setVariantSelectorProduct(null);
          }}
          onAddToCart={handleAddToCartWithVariants}
        />
      )}

      {/* Edit Profile Modal */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={editForm.email}
                disabled
                className="bg-muted"
                placeholder="Email"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Phone number"
                type="tel"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditProfileOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const next = {
                    firstName: editForm.firstName.trim(),
                    lastName: editForm.lastName.trim(),
                    email: profileData.email,
                    phone: editForm.phone.trim(),
                  };
                  updateProfile({
                    firstName: next.firstName,
                    lastName: next.lastName,
                    phone: next.phone,
                  });
                  setProfileData(next);
                  toast({ title: "Profile saved" });
                  setIsEditProfileOpen(false);
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Address Modal */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent className="overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isAddingNewAddress ? "Add New Address" : "Edit Shipping Address"}</DialogTitle>
          </DialogHeader>

          <form
            className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1fr)_17rem] sm:items-stretch"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              // Prefer FormData so browser autofill is captured even when React state lags.
              const title = String(data.get("addressTitle") ?? editAddressForm.title).trim();
              const street = String(data.get("street") ?? editAddressForm.street).trim();
              const city = String(data.get("city") ?? editAddressForm.city).trim();
              const state = String(data.get("state") ?? editAddressForm.state).trim();
              const zipCode = String(data.get("zipCode") ?? editAddressForm.zipCode).trim();
              const country = String(data.get("country") ?? editAddressForm.country).trim();
              const { latitude, longitude } = editAddressForm;

              if (!title && !street) {
                toast.error({
                  title: "Missing address details",
                  description: "Add a title and street address.",
                });
                return;
              }
              if (!title) {
                toast.error({
                  title: "Title required",
                  description: "Add a short label like Home or Work.",
                });
                return;
              }
              if (!street) {
                toast.error({
                  title: "Street address required",
                  description: "Enter the street address for delivery.",
                });
                return;
              }

              setEditAddressForm((prev) => ({
                ...prev,
                title,
                street,
                city,
                state,
                zipCode,
                country,
              }));

              if (isAddingNewAddress) {
                const newAddress: SavedAddress = {
                  id: crypto.randomUUID(),
                  title,
                  street,
                  city,
                  state,
                  zipCode,
                  country,
                  latitude,
                  longitude,
                  isDefault: addresses.length === 0,
                };
                setAddresses([...addresses, newAddress]);
                toast.success({ title: "Address added" });
              } else {
                setAddresses(
                  addresses.map((addr) =>
                    addr.id === editAddressForm.id
                      ? { ...addr, title, street, city, state, zipCode, country, latitude, longitude }
                      : addr,
                  ),
                );
                toast.success({ title: "Address saved" });
              }
              setIsEditAddressOpen(false);
            }}
          >
            <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="addressTitle">Address Title</Label>
              <Input
                id="addressTitle"
                name="addressTitle"
                autoComplete="nickname"
                value={editAddressForm.title}
                onChange={(e) => setEditAddressForm({ ...editAddressForm, title: e.target.value })}
                onInput={(e) =>
                  setEditAddressForm((prev) => ({
                    ...prev,
                    title: (e.target as HTMLInputElement).value,
                  }))
                }
                placeholder="e.g., Home, Work, Office"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressStreet">Street Address</Label>
              <Input
                id="addressStreet"
                name="street"
                autoComplete="street-address"
                value={editAddressForm.street}
                onChange={(e) => setEditAddressForm({ ...editAddressForm, street: e.target.value })}
                onInput={(e) =>
                  setEditAddressForm((prev) => ({
                    ...prev,
                    street: (e.target as HTMLInputElement).value,
                  }))
                }
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  name="city"
                  autoComplete="address-level2"
                  value={editAddressForm.city}
                  onChange={(e) => setEditAddressForm({ ...editAddressForm, city: e.target.value })}
                  onInput={(e) =>
                    setEditAddressForm((prev) => ({
                      ...prev,
                      city: (e.target as HTMLInputElement).value,
                    }))
                  }
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressState">State</Label>
                <Input
                  id="addressState"
                  name="state"
                  autoComplete="address-level1"
                  value={editAddressForm.state}
                  onChange={(e) => setEditAddressForm({ ...editAddressForm, state: e.target.value })}
                  onInput={(e) =>
                    setEditAddressForm((prev) => ({
                      ...prev,
                      state: (e.target as HTMLInputElement).value,
                    }))
                  }
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addressZip">ZIP Code</Label>
                <Input
                  id="addressZip"
                  name="zipCode"
                  autoComplete="postal-code"
                  value={editAddressForm.zipCode}
                  onChange={(e) => setEditAddressForm({ ...editAddressForm, zipCode: e.target.value })}
                  onInput={(e) =>
                    setEditAddressForm((prev) => ({
                      ...prev,
                      zipCode: (e.target as HTMLInputElement).value,
                    }))
                  }
                  placeholder="ZIP code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  name="country"
                  autoComplete="country-name"
                  value={editAddressForm.country}
                  onChange={(e) => setEditAddressForm({ ...editAddressForm, country: e.target.value })}
                  onInput={(e) =>
                    setEditAddressForm((prev) => ({
                      ...prev,
                      country: (e.target as HTMLInputElement).value,
                    }))
                  }
                  placeholder="Country"
                />
              </div>
            </div>
            </div>

            <AddressLocationField
              key={addressFormKey}
              className="sm:h-full"
              city={editAddressForm.city}
              country={editAddressForm.country}
              latitude={editAddressForm.latitude}
              longitude={editAddressForm.longitude}
              onChange={({ latitude, longitude }) =>
                setEditAddressForm((prev) => ({ ...prev, latitude, longitude }))
              }
            />

            <div className="flex gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditAddressOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {isAddingNewAddress ? "Add Address" : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </PageShell>
    </ProtectedRoute>
  );
}


