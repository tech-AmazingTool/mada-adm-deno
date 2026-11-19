import { computed, signal } from "@preact/signals";
import {
  Commune,
  District,
  Fokontany,
  MadaAdmConfig,
  Province,
  Region,
} from "@scope/types/models";

export class ApiStore {
  readonly configIsLoaded = signal(false);
  readonly config = signal<MadaAdmConfig | null>(null);

  readonly initialAdmEntitiesAreLoaded = signal(false);

  readonly provinces = signal<Province[]>([]);
  readonly provinceByName = computed(() => {
    return new Map(this.provinces.value.map((p) => [p.province, p]));
  });
  readonly provinceByRegionName = computed(() => {
    return new Map<string, Province>(
      this.regions.value.map<[string, Province]>((region) => [
        region.region,
        this.provinceByName.value.get(region.province!)!,
      ]),
    );
  });

  readonly regions = signal<Region[]>([]);
  readonly regionByName = computed(() => {
    return new Map(this.regions.value.map((p) => [p.region, p]));
  });

  readonly districtsAreLoaded = signal(false);
  readonly districtsNextCursor = signal<string | null>(null);
  readonly districts = signal<District[]>([]);

  readonly communesAreLoaded = signal(false);
  readonly communesNextCursor = signal<string | null>(null);
  readonly communes = signal<Commune[]>([]);

  readonly fokontanysAreLoaded = signal(false);
  readonly fokontanysNextCursor = signal<string | null>(null);
  readonly fokontanys = signal<Fokontany[]>([]);
}

let instance: ApiStore | null = null;

export function injectApiStore(): ApiStore {
  return (instance ??= new ApiStore());
}
