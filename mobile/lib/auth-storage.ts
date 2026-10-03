import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const ONBOARDING_KEY = "has_seen_onboarding";

export async function saveAccessToken(token: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function removeAccessToken() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function hasSeenOnboarding() {
  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);

  return value === "true";
}

export async function markOnboardingSeen() {
  await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
}
