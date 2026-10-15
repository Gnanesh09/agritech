import { useSyncExternalStore } from "react";

export type MarketplaceListing = {
  id: string;
  cropName: string;
  price: number;
  originalPrice?: number;
  packSizeValue: number;
  packSizeUnit: string;
  quantityAvailable: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  harvestType?: string;
  expectedHarvestDate?: string | null;
  distanceKm?: number | null;
  deliveryFee?: number;
  sellerDelivery?: boolean;
  customerPickup?: boolean;
  deliveryRadiusKm?: number | null;
  seller?: { id?: string; username?: string };
  sellerLocation?: {
    id?: string;
    label?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  [key: string]: any;
};

export type CartItem = { listing: MarketplaceListing; quantity: number };
export type MarketplaceLocation = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
  mapplsPin?: string | null;
  landmark?: string | null;
};

let selectedListing: MarketplaceListing | null = null;
let selectedLocation: MarketplaceLocation | null = null;
let cartItems: CartItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeMarketplaceStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSelectedListing(listing: MarketplaceListing | null) {
  selectedListing = listing;
  notify();
}
export function getSelectedListing() { return selectedListing; }
export function useSelectedListing() {
  return useSyncExternalStore(subscribeMarketplaceStore, getSelectedListing, getSelectedListing);
}

export function setSelectedLocation(location: MarketplaceLocation | null) {
  selectedLocation = location;
  notify();
}
export function getSelectedLocation() { return selectedLocation; }
export function useSelectedLocation() {
  return useSyncExternalStore(subscribeMarketplaceStore, getSelectedLocation, getSelectedLocation);
}

export function getCartItems() { return cartItems; }
export function useCartItems() {
  return useSyncExternalStore(subscribeMarketplaceStore, getCartItems, getCartItems);
}
export function addToCart(listing: MarketplaceListing, quantity = 1) {
  const min = Math.max(1, Number(listing.minOrderQuantity ?? 1));
  const amount = Math.max(min, Number(quantity || min));
  const found = cartItems.find((item) => item.listing.id === listing.id);
  cartItems = found
    ? cartItems.map((item) => item.listing.id === listing.id
        ? { ...item, quantity: Math.min(Number(listing.quantityAvailable || 9999), item.quantity + amount) }
        : item)
    : [...cartItems, { listing, quantity: Math.min(Number(listing.quantityAvailable || 9999), amount) }];
  notify();
}
export function setCartQuantity(listingId: string, quantity: number) {
  cartItems = cartItems
    .map((item) => item.listing.id === listingId
      ? { ...item, quantity: Math.max(Number(item.listing.minOrderQuantity ?? 1), Math.min(Number(item.listing.quantityAvailable || 9999), quantity)) }
      : item);
  notify();
}
export function removeCartItem(listingId: string) {
  cartItems = cartItems.filter((item) => item.listing.id !== listingId);
  notify();
}
export function clearCart() {
  cartItems = [];
  notify();
}
