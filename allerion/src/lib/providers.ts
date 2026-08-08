// Provider selection logic shared between server and viewer.
// Server decides defaults based on env, viewer honours the explicit pick.

export type Provider = "google-3d-tiles" | "osm-buildings";

export function defaultProvider(env: NodeJS.ProcessEnv = process.env): Provider {
  return env.GOOGLE_MAPS_API_KEY ? "google-3d-tiles" : "osm-buildings";
}

export function resolveProvider(
  requested: Provider | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Provider {
  if (requested === "google-3d-tiles" && !env.GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "google-3d-tiles requested but GOOGLE_MAPS_API_KEY is not set. " +
        "Set the env var or pass provider='osm-buildings'.",
    );
  }
  return requested ?? defaultProvider(env);
}

export interface ProviderConfig {
  provider: Provider;
  googleKey?: string;
  cesiumIonToken?: string;
}

export function providerConfig(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  return {
    provider: defaultProvider(env),
    googleKey: env.GOOGLE_MAPS_API_KEY,
    cesiumIonToken: env.CESIUM_ION_TOKEN,
  };
}
