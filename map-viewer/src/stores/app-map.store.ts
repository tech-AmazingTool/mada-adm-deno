import { computed, Signal, signal } from "@preact/signals";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";
import { GeoJSONGeometry } from "@scope/types/utils";
import { AdmEntityDiscriminated, EntityId } from "@scope/types/models";
import { AdmGeoJsonLayerCheckedState } from "@/types/app-map.d.ts";
import { AdmGeojsonClientCache } from "@/client-cache/adm-geojson.client-cache.ts";
import { AdmGeojsonMetadataClientCacheItem } from "@/types/cache.d.ts";
import { AdmGeoJsonStore } from "@/stores/adm-geojson.store.ts";
import { LayerSwitcherControl } from "@/helpers/map-layer-switch-control.helper.ts";
import { fitGeoJsonBboxIntoMap } from "@/helpers/app-map.helper.ts";
import { ApiStore } from "@/stores/api.store.ts";
import { ProvinceApi } from "@/api/province.api.ts";
import { RegionApi } from "@/api/region.api.ts";
import { DistrictApi } from "@/api/district.api.ts";
import { CommuneApi } from "@/api/commune.api.ts";
import { FokontanyApi } from "@/api/fokontany.api.ts";
import {
  getAdmEntityValue,
  getCommuneNameEncoding,
  getFokontanyNameEncoding,
} from "@/helpers/adm-entity.helper.ts";

export type EnableAdmGeoJsonLayerOptions = {
  fitBbox?: boolean;
};

export type LoadAdmEntityWithGeoJsonFromApiResult = {
  admEntityDiscriminated: AdmEntityDiscriminated;
  geojson: GeoJSONGeometry;
};

export type AppMapAdmEntityGeoJsonEntry = {
  admEntityDiscriminated?: AdmEntityDiscriminated;
  name: string;
  geojson?: GeoJSONGeometry;
  isLoading: boolean;
  isRendered: boolean;
  refsCount: number;
};

export type AdmEntityDivisionWithEntry = {
  admLevelCode: AdmLevelCode;
  name: string;
  text: string;
  isLoading: boolean;
  isRendered: boolean;
  refsCount: number;
};

export class AppMapStore {
  constructor(
    private admGeoJsonClientCache: AdmGeojsonClientCache,
    private admGeoJsonStore: AdmGeoJsonStore,
    private apiStore: ApiStore,
    private provinceApi: ProvinceApi,
    private regionApi: RegionApi,
    private districtApi: DistrictApi,
    private communeApi: CommuneApi,
    private fokontanyApi: FokontanyApi,
  ) {}

  readonly map = signal<maplibregl.Map | null>(null);
  readonly mapIsLoaded = signal(false);
  readonly mapLayerSwitcherControl = signal<LayerSwitcherControl | null>(null);

  readonly admGeoJsonLayersCheckboxesStates = signal<
    AdmGeoJsonLayerCheckedState[]
  >(ADM_LEVEL_CODES_INDEXED.map((admLevelCode) => ({
    code: admLevelCode,
    checked: false,
    isFirstTime: true,
  })));

  checkAdmGeoJsonLayer(
    admLevelCode: AdmLevelCode,
    checked: boolean | "loading",
  ) {
    const i = this.admGeoJsonLayersCheckboxesStates.value.findIndex(
      (d) => d.code === admLevelCode,
    );
    if (i >= 0) {
      const checkboxData = {
        ...this.admGeoJsonLayersCheckboxesStates.value[i],
        checked,
        isFirstTime: false,
      };
      this.admGeoJsonLayersCheckboxesStates.value[i] = checkboxData;
      this.admGeoJsonLayersCheckboxesStates.value = [
        ...this.admGeoJsonLayersCheckboxesStates.value,
      ];
    }
  }

  async enableAdmGeoJsonLayer(
    admLevelCode: AdmLevelCode,
    options?: EnableAdmGeoJsonLayerOptions,
  ) {
    let admGeoJsonMetadata: AdmGeojsonMetadataClientCacheItem | null =
      this.admGeoJsonStore.cachedMetadata.value.find((metadata) =>
        metadata.admLevelCode === admLevelCode
      ) ?? null;
    if (!admGeoJsonMetadata) {
      this.checkAdmGeoJsonLayer(admLevelCode, "loading");
      admGeoJsonMetadata = await this.admGeoJsonClientCache.getMetadataByCode(
        admLevelCode,
      );
      if (admGeoJsonMetadata) {
        this.admGeoJsonStore.upsertCachedMetadata({ ...admGeoJsonMetadata });
      }
    }
    if (!admGeoJsonMetadata) {
      this.checkAdmGeoJsonLayer(admLevelCode, true);
      this.admGeoJsonStore.openDownloadModal([admLevelCode]);
    } else {
      const fitBbox = options?.fitBbox ??
        this.admGeoJsonLayersCheckboxesStates.value.find((state) =>
          state.code === admLevelCode
        )!.isFirstTime;
      this.checkAdmGeoJsonLayer(admLevelCode, true);
      // TODO: Add GeoJSON to the map
      const geojsonData = await this.admGeoJsonClientCache.getGeojsonByCode(
        admGeoJsonMetadata.admLevelCode,
      );
      if (geojsonData) {
        if (
          !this.mapLayerSwitcherControl.value?.hasStaticAdmGeoJsonLayer(
            admGeoJsonMetadata.admLevelCode,
          )
        ) {
          await this.mapLayerSwitcherControl.value?.addStaticAdmGeoJsonLayer(
            admGeoJsonMetadata.admLevelCode,
            geojsonData.geojson,
            { fitBbox },
          );
        } else if (fitBbox) {
          await fitGeoJsonBboxIntoMap(
            this.map.value!,
            geojsonData.geojson,
          );
        }
      }
    }
  }

  getAdmLevelEntries(
    admLevelCode: AdmLevelCode,
  ): Signal<AppMapAdmEntityGeoJsonEntry[]> {
    switch (admLevelCode) {
      case AdmLevelCode.PROVINCE:
        return this.provincesGeoJsonEntries;
      case AdmLevelCode.REGION:
        return this.regionsGeoJsonEntries;
      case AdmLevelCode.DISTRICT:
        return this.districtsGeoJsonEntries;
      case AdmLevelCode.COMMUNE:
        return this.communesGeoJsonEntries;
      case AdmLevelCode.FOKONTANY:
        return this.fokontanysGeoJsonEntries;
      default:
        throw new Error(
          `Unsupported admLevelCode ${admLevelCode satisfies never} in getAdmLevelEntries`,
        );
    }
  }

  getAdmEntityEntryByNameMapByLevel(
    admLevelCode: AdmLevelCode,
  ): Map<string, AppMapAdmEntityGeoJsonEntry> {
    switch (admLevelCode) {
      case AdmLevelCode.PROVINCE:
        return this.provinceGeoJsonEntryByName.value;
      case AdmLevelCode.REGION:
        return this.regionGeoJsonEntryByName.value;
      case AdmLevelCode.DISTRICT:
        return this.districtGeoJsonEntryByName.value;
      case AdmLevelCode.COMMUNE:
        return this.communeGeoJsonEntryByName.value;
      case AdmLevelCode.FOKONTANY:
        return this.fokontanyGeoJsonEntryByName.value;
      default:
        throw new Error(
          `Unsupported admLevelCode ${admLevelCode satisfies never} in getAdmLevelEntries`,
        );
    }
  }

  renderAdmEntityGeoJsonEntryByName(
    admLevelCode: AdmLevelCode,
    name: string,
    render: boolean = true,
  ) {
    const entries = this.getAdmLevelEntries(admLevelCode);
    const index = entries.value.findIndex((entry) => entry.name === name);
    if (index >= 0) {
      const _entries = [...entries.value];
      const entry = _entries[index];
      _entries[index] = {
        ...entry,
        isRendered: render,
      };
      entries.value = _entries;
    }
  }

  referenceAdmEntityGeoJsonEntryByName(
    admLevelCode: AdmLevelCode,
    name: string,
    reference: boolean = true,
  ): AppMapAdmEntityGeoJsonEntry | null {
    const entries = this.getAdmLevelEntries(admLevelCode);
    const index = entries.value.findIndex((entry) => entry.name === name);
    if (index >= 0) {
      const entry: AppMapAdmEntityGeoJsonEntry = {
        ...entries.value[index],
      };
      let refsCount = entry.refsCount;
      entry.refsCount = Math.max(0, reference ? ++refsCount : --refsCount);
      const _entries = [...entries.value];
      _entries[index] = entry;
      entries.value = _entries;
      return entry;
    }
    return null;
  }

  removeNonReferencedAdmEntityGeoJsonEntries(
    admLevelCode: AdmLevelCode,
  ) {
    const entries = this.getAdmLevelEntries(admLevelCode);
    const hasToBeRemoved = entries.value.some((entry) =>
      entry.isLoading || (!entry.isLoading && entry.refsCount === 0)
    );
    if (hasToBeRemoved) {
      entries.value = entries.value.filter((entry) =>
        entry.isLoading || (!entry.isLoading && entry.refsCount > 0)
      );
    }
  }

  private resolveProvinceIdFromAdmEntityDiscriminated(
    admEntityDiscriminated: AdmEntityDiscriminated,
  ): EntityId | null {
    let provinceId: EntityId | null = null;
    if (admEntityDiscriminated.admLevelCode === AdmLevelCode.PROVINCE) {
      provinceId = admEntityDiscriminated.entity.id;
    } else {
      if (admEntityDiscriminated.entity.provinceId) {
        provinceId = admEntityDiscriminated.entity.provinceId;
      } else if (admEntityDiscriminated.entity.province) {
        provinceId = this.apiStore.provinceByName.value.get(
          admEntityDiscriminated.entity.province,
        )?.province ?? null;
      } else {
        provinceId = this.apiStore.provinceByRegionName.value.get(
          admEntityDiscriminated.entity.region,
        )?.province ?? null;
      }
    }
    return provinceId;
  }

  private async loadAdmEntityGeoJsonFromApi(
    admEntityDiscriminated: AdmEntityDiscriminated,
    fieldAdmLevelCode: AdmLevelCode,
  ): Promise<LoadAdmEntityWithGeoJsonFromApiResult> {
    const admLevelCode = admEntityDiscriminated.admLevelCode;
    switch (admLevelCode) {
      case AdmLevelCode.PROVINCE: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          const province = await this.provinceApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.id,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.PROVINCE,
              entity: province,
            },
            geojson: province.geojson,
          };
        }
        throw new Error(
          `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} in loadAdmEntityGeoJsonFromApi`,
        );
      }
      case AdmLevelCode.REGION: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          const province = await this.provinceApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.provinceId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.PROVINCE,
              entity: province,
            },
            geojson: province.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          const region = await this.regionApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.id,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.REGION,
              entity: region,
            },
            geojson: region.geojson,
          };
        }
        throw new Error(
          `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} in loadAdmEntityGeoJsonFromApi`,
        );
      }
      case AdmLevelCode.DISTRICT: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          const provinceId = this.resolveProvinceIdFromAdmEntityDiscriminated(
            admEntityDiscriminated,
          );
          if (!provinceId) {
            throw new Error(
              `provinceId not available for district: ${admEntityDiscriminated.entity.district}`,
            );
          }
          const province = await this.provinceApi.getWithGeoJsonById(
            provinceId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.PROVINCE,
              entity: province,
            },
            geojson: province.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          const region = await this.regionApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.regionId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.REGION,
              entity: region,
            },
            geojson: region.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
          const district = await this.districtApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.id,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.DISTRICT,
              entity: district,
            },
            geojson: district.geojson,
          };
        }
        throw new Error(
          `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} in loadAdmEntityGeoJsonFromApi`,
        );
      }
      case AdmLevelCode.COMMUNE: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          const provinceId = this.resolveProvinceIdFromAdmEntityDiscriminated(
            admEntityDiscriminated,
          );
          if (!provinceId) {
            throw new Error(
              `provinceId not available for commune: ${admEntityDiscriminated.entity.commune}`,
            );
          }
          const province = await this.provinceApi.getWithGeoJsonById(
            provinceId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.PROVINCE,
              entity: province,
            },
            geojson: province.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          const regionId = admEntityDiscriminated.entity.regionId ??
            this.apiStore.regionByName.value.get(
              admEntityDiscriminated.entity.region,
            )?.id;
          if (!regionId) {
            throw new Error(
              `regionId not available for commune: ${admEntityDiscriminated.entity.region}`,
            );
          }
          const region = await this.regionApi.getWithGeoJsonById(regionId);
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.REGION,
              entity: region,
            },
            geojson: region.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
          const district = await this.districtApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.districtId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.DISTRICT,
              entity: district,
            },
            geojson: district.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.COMMUNE) {
          const commune = await this.communeApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.id,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.COMMUNE,
              entity: commune,
            },
            geojson: commune.geojson,
          };
        }
        throw new Error(
          `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} in loadAdmEntityGeoJsonFromApi`,
        );
      }
      case AdmLevelCode.FOKONTANY: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          const provinceId = this.resolveProvinceIdFromAdmEntityDiscriminated(
            admEntityDiscriminated,
          );
          if (!provinceId) {
            throw new Error(
              `provinceId not available for fokontany: ${admEntityDiscriminated.entity.commune}`,
            );
          }
          const province = await this.provinceApi.getWithGeoJsonById(
            provinceId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.PROVINCE,
              entity: province,
            },
            geojson: province.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          const regionId = admEntityDiscriminated.entity.regionId ??
            this.apiStore.regionByName.value.get(
              admEntityDiscriminated.entity.region,
            )?.id;
          if (!regionId) {
            throw new Error(
              `regionId not available for fokontany: ${admEntityDiscriminated.entity.region}`,
            );
          }
          const region = await this.regionApi.getWithGeoJsonById(regionId);
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.REGION,
              entity: region,
            },
            geojson: region.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
          const districtId = admEntityDiscriminated.entity.districtId;
          const district = districtId
            ? await this.districtApi.getWithGeoJsonById(districtId)
            : await this.districtApi.getWithGeoJsonByFokontanyId(
              admEntityDiscriminated.entity.id,
            );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.DISTRICT,
              entity: district,
            },
            geojson: district.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.COMMUNE) {
          const commune = await this.communeApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.communeId,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.COMMUNE,
              entity: commune,
            },
            geojson: commune.geojson,
          };
        } else if (fieldAdmLevelCode === AdmLevelCode.FOKONTANY) {
          const fokontany = await this.fokontanyApi.getWithGeoJsonById(
            admEntityDiscriminated.entity.id,
          );
          return {
            admEntityDiscriminated: {
              admLevelCode: AdmLevelCode.FOKONTANY,
              entity: fokontany,
            },
            geojson: fokontany.geojson,
          };
        }
        throw new Error(
          `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} in loadAdmEntityGeoJsonFromApi`,
        );
      }
      default:
        throw new Error(
          `Unsupported admLevelCode ${admLevelCode satisfies never} in loadAdmEntityGeoJsonFromApi`,
        );
    }
  }

  getAdmEntityEntryName(
    admEntityDiscriminated: AdmEntityDiscriminated,
    fieldAdmLevelCode?: AdmLevelCode,
  ): string {
    if (
      !fieldAdmLevelCode ||
      fieldAdmLevelCode === admEntityDiscriminated.admLevelCode
    ) {
      return admEntityDiscriminated.admLevelCode === AdmLevelCode.COMMUNE
        ? getCommuneNameEncoding(admEntityDiscriminated.entity)
        : admEntityDiscriminated.admLevelCode === AdmLevelCode.FOKONTANY
        ? getFokontanyNameEncoding(admEntityDiscriminated.entity)
        : getAdmEntityValue(
          admEntityDiscriminated.entity,
          admEntityDiscriminated.admLevelCode,
        );
    }
    const admLevelCode = admEntityDiscriminated.admLevelCode;
    switch (admLevelCode) {
      case AdmLevelCode.PROVINCE:
        break;
      case AdmLevelCode.REGION: {
        if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          return admEntityDiscriminated.entity.province;
        }
        break;
      }
      case AdmLevelCode.DISTRICT: {
        if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          return admEntityDiscriminated.entity.region;
        } else if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          if (admEntityDiscriminated.entity.province) {
            return admEntityDiscriminated.entity.province;
          } else {
            const province = this.apiStore.provinceByRegionName.value.get(
              admEntityDiscriminated.entity.region,
            );
            if (province) return province.province;
            throw new Error(
              `province not available for district: ${admEntityDiscriminated.entity.district}`,
            );
          }
        }
        break;
      }
      case AdmLevelCode.COMMUNE: {
        if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
          return admEntityDiscriminated.entity.district;
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          return admEntityDiscriminated.entity.region;
        } else if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          if (admEntityDiscriminated.entity.province) {
            return admEntityDiscriminated.entity.province;
          } else {
            const province = this.apiStore.provinceByRegionName.value.get(
              admEntityDiscriminated.entity.region,
            );
            if (province) return province.province;
            throw new Error(
              `province not available for commune: ${admEntityDiscriminated.entity.commune}`,
            );
          }
        }
        break;
      }
      case AdmLevelCode.FOKONTANY: {
        if (fieldAdmLevelCode === AdmLevelCode.COMMUNE) {
          return getCommuneNameEncoding(admEntityDiscriminated.entity);
        } else if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
          return admEntityDiscriminated.entity.district;
        } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
          return admEntityDiscriminated.entity.region;
        } else if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
          if (admEntityDiscriminated.entity.province) {
            return admEntityDiscriminated.entity.province;
          } else {
            const province = this.apiStore.provinceByRegionName.value.get(
              admEntityDiscriminated.entity.region,
            );
            if (province) return province.province;
            throw new Error(
              `province not available for fokontany: ${admEntityDiscriminated.entity.commune}`,
            );
          }
        }
        break;
      }
      default:
        throw new Error(
          `Unsupported admLevelCode ${admLevelCode} for getAdmEntityEntryName`,
        );
    }
    throw new Error(
      `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} for getAdmEntityEntryName`,
    );
  }

  async loadAdmEntityGeoJsonEntry(
    admEntityDiscriminated: AdmEntityDiscriminated,
    fieldAdmLevelCode?: AdmLevelCode,
  ): Promise<GeoJSONGeometry> {
    const entries = this.getAdmLevelEntries(
      fieldAdmLevelCode ?? admEntityDiscriminated.admLevelCode,
    );
    const name = this.getAdmEntityEntryName(
      admEntityDiscriminated,
      fieldAdmLevelCode,
    );
    const index = entries.value.findIndex((entry) => entry.name === name);
    if (index >= 0) {
      const _entries = [...entries.value];
      _entries[index] = { ..._entries[index], isLoading: true };
      entries.value = _entries;
    } else {
      entries.value = [
        ...entries.value,
        {
          name,
          isLoading: true,
          isRendered: false,
          refsCount: 0,
        },
      ];
    }
    try {
      const { admEntityDiscriminated: apiAdmEntityDiscriminated, geojson } =
        await this.loadAdmEntityGeoJsonFromApi(
          admEntityDiscriminated,
          fieldAdmLevelCode ?? admEntityDiscriminated.admLevelCode,
        );
      const index = entries.value.findIndex((entry) => entry.name === name);
      if (index >= 0) {
        const _entries = [...entries.value];
        _entries[index] = {
          ..._entries[index],
          admEntityDiscriminated: apiAdmEntityDiscriminated,
          geojson,
          isLoading: false,
          isRendered: true,
        };
        entries.value = _entries;
      }
      return geojson;
    } catch (error) {
      console.error(error);
      const index = entries.value.findIndex((entry) => entry.name === name);
      if (index >= 0) {
        const _entries = [...entries.value];
        _entries[index] = {
          ..._entries[index],
          isLoading: false,
        };
        entries.value = _entries;
      }
      throw error;
    }
  }

  async toggleAdmEntityGeoJsonEntryOnMap(
    admEntityDiscriminated: AdmEntityDiscriminated,
    fieldAdmLevelCode: AdmLevelCode,
    toggle: boolean = true,
    forceFitBboxOnLoaded: boolean = false,
    forceFitBboxOnNotLoaded: boolean = true,
  ) {
    const entryName = this.getAdmEntityEntryName(
      admEntityDiscriminated,
      fieldAdmLevelCode,
    );
    const entry = this
      .getAdmEntityEntryByNameMapByLevel(fieldAdmLevelCode)
      .get(entryName);
    if (toggle) {
      if (entry?.geojson) {
        if (this.map.value) {
          if (!entry.isRendered) {
            this.renderAdmEntityGeoJsonEntryByName(
              fieldAdmLevelCode,
              entryName,
            );
          }
          if (forceFitBboxOnLoaded) {
            await fitGeoJsonBboxIntoMap(this.map.value, entry.geojson);
          }
        }
      } else {
        try {
          const geojson = await this.loadAdmEntityGeoJsonEntry(
            admEntityDiscriminated,
            fieldAdmLevelCode,
          );
          if (this.map.value && forceFitBboxOnNotLoaded) {
            await fitGeoJsonBboxIntoMap(this.map.value, geojson);
          }
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      this.renderAdmEntityGeoJsonEntryByName(
        fieldAdmLevelCode,
        entryName,
        false,
      );
    }
  }

  breakAdmAttributesDiscriminatedDivisionsWithEntry(
    admEntityDiscriminated: AdmEntityDiscriminated,
    includeRoot: boolean = true,
  ): AdmEntityDivisionWithEntry[] {
    const divisions: AdmEntityDivisionWithEntry[] = [];

    const resolveProvinceName = (): string | null => {
      if (admEntityDiscriminated.entity.province) {
        return admEntityDiscriminated.entity.province;
      } else if (
        admEntityDiscriminated.admLevelCode === AdmLevelCode.PROVINCE
      ) {
        return admEntityDiscriminated.entity.province;
      } else {
        return this.apiStore.provinceByRegionName.value.get(
          admEntityDiscriminated.entity.region,
        )?.province ?? null;
      }
    };

    const pushDivision = (
      targetAdmLevelCode: AdmLevelCode,
      name: string,
      text: string,
    ) => {
      let admEntityGeoJsonEntryByName!: Map<
        string,
        AppMapAdmEntityGeoJsonEntry
      >;
      switch (targetAdmLevelCode) {
        case AdmLevelCode.PROVINCE:
          admEntityGeoJsonEntryByName = this.provinceGeoJsonEntryByName.value;
          break;
        case AdmLevelCode.REGION:
          admEntityGeoJsonEntryByName = this.regionGeoJsonEntryByName.value;
          break;
        case AdmLevelCode.DISTRICT:
          admEntityGeoJsonEntryByName = this.districtGeoJsonEntryByName.value;
          break;
        case AdmLevelCode.COMMUNE:
          admEntityGeoJsonEntryByName = this.communeGeoJsonEntryByName.value;
          break;
        case AdmLevelCode.FOKONTANY:
          admEntityGeoJsonEntryByName = this.fokontanyGeoJsonEntryByName.value;
          break;
        default:
          throw new Error(
            `Unsupported admLevelCode ${targetAdmLevelCode satisfies never} in breakAdmAttributesDiscriminatedDivisionsWithEntry`,
          );
      }
      const entry = admEntityGeoJsonEntryByName.get(name);
      divisions.push({
        admLevelCode: targetAdmLevelCode,
        name,
        text,
        isLoading: entry?.isLoading ?? false,
        isRendered: entry?.isRendered ?? false,
        refsCount: entry?.refsCount ?? 0,
      });
    };

    const admLevelCode = admEntityDiscriminated.admLevelCode;

    switch (admLevelCode) {
      case AdmLevelCode.PROVINCE: {
        if (includeRoot) {
          const province = admEntityDiscriminated.entity.province;
          pushDivision(
            AdmLevelCode.PROVINCE,
            province,
            province,
          );
        }
        break;
      }
      case AdmLevelCode.REGION: {
        const province = admEntityDiscriminated.entity.province;
        if (includeRoot) {
          const region = admEntityDiscriminated.entity.region;
          pushDivision(
            AdmLevelCode.REGION,
            region,
            region,
          );
        }
        pushDivision(
          AdmLevelCode.PROVINCE,
          province,
          province,
        );
        break;
      }
      case AdmLevelCode.DISTRICT: {
        const province = resolveProvinceName();
        const region = admEntityDiscriminated.entity.region;
        if (includeRoot) {
          const district = admEntityDiscriminated.entity.district;
          pushDivision(
            AdmLevelCode.DISTRICT,
            district,
            district,
          );
        }
        pushDivision(
          AdmLevelCode.REGION,
          region,
          region,
        );
        province && pushDivision(
          AdmLevelCode.PROVINCE,
          province,
          province,
        );
        break;
      }
      case AdmLevelCode.COMMUNE: {
        const province = resolveProvinceName();
        const region = admEntityDiscriminated.entity.region;
        const district = admEntityDiscriminated.entity.district;
        if (includeRoot) {
          const commune = admEntityDiscriminated.entity.commune;
          const name = getCommuneNameEncoding(
            admEntityDiscriminated.entity,
          );
          pushDivision(
            AdmLevelCode.COMMUNE,
            name,
            commune,
          );
        }
        pushDivision(
          AdmLevelCode.DISTRICT,
          district,
          district,
        );
        pushDivision(
          AdmLevelCode.REGION,
          region,
          region,
        );
        province && pushDivision(
          AdmLevelCode.PROVINCE,
          province,
          province,
        );
        break;
      }
      case AdmLevelCode.FOKONTANY: {
        const province = resolveProvinceName();
        const region = admEntityDiscriminated.entity.region;
        const district = admEntityDiscriminated.entity.district;
        const commune = admEntityDiscriminated.entity.commune;
        if (includeRoot) {
          const fokontany = admEntityDiscriminated.entity.fokontany;
          const name = getFokontanyNameEncoding(
            admEntityDiscriminated.entity,
          );
          pushDivision(
            AdmLevelCode.FOKONTANY,
            name,
            fokontany,
          );
        }
        pushDivision(
          AdmLevelCode.COMMUNE,
          getCommuneNameEncoding(admEntityDiscriminated.entity),
          commune,
        );
        pushDivision(
          AdmLevelCode.DISTRICT,
          district,
          district,
        );
        pushDivision(
          AdmLevelCode.REGION,
          region,
          region,
        );
        province && pushDivision(
          AdmLevelCode.PROVINCE,
          province,
          province,
        );
        break;
      }
      default: {
        throw new Error(
          `Unsupported admLevelCode ${admLevelCode satisfies never} in breakAdmAttributesDiscriminatedDivisionsWithEntry`,
        );
      }
    }

    return divisions;
  }

  readonly provincesGeoJsonEntries = signal<AppMapAdmEntityGeoJsonEntry[]>([]);
  readonly provinceGeoJsonEntryByName = computed<
    Map<string, AppMapAdmEntityGeoJsonEntry>
  >(() => {
    return new Map(
      this.provincesGeoJsonEntries.value.map((entry) => [entry.name, entry]),
    );
  });

  readonly regionsGeoJsonEntries = signal<AppMapAdmEntityGeoJsonEntry[]>([]);
  readonly regionGeoJsonEntryByName = computed<
    Map<string, AppMapAdmEntityGeoJsonEntry>
  >(() => {
    return new Map(
      this.regionsGeoJsonEntries.value.map((entry) => [entry.name, entry]),
    );
  });

  readonly districtsGeoJsonEntries = signal<AppMapAdmEntityGeoJsonEntry[]>([]);
  readonly districtGeoJsonEntryByName = computed<
    Map<string, AppMapAdmEntityGeoJsonEntry>
  >(() => {
    return new Map(
      this.districtsGeoJsonEntries.value.map((entry) => [entry.name, entry]),
    );
  });

  readonly communesGeoJsonEntries = signal<AppMapAdmEntityGeoJsonEntry[]>([]);
  readonly communeGeoJsonEntryByName = computed<
    Map<string, AppMapAdmEntityGeoJsonEntry>
  >(() => {
    return new Map(
      this.communesGeoJsonEntries.value.map((entry) => [entry.name, entry]),
    );
  });

  readonly fokontanysGeoJsonEntries = signal<AppMapAdmEntityGeoJsonEntry[]>([]);
  readonly fokontanyGeoJsonEntryByName = computed<
    Map<string, AppMapAdmEntityGeoJsonEntry>
  >(() => {
    return new Map(
      this.fokontanysGeoJsonEntries.value.map((entry) => [entry.name, entry]),
    );
  });
}

let appMapStore: AppMapStore | null = null;

export function injectAppMapStore(
  admGeoJsonClientCache: AdmGeojsonClientCache,
  admGeoJsonStore: AdmGeoJsonStore,
  apiStore: ApiStore,
  provinceApi: ProvinceApi,
  regionApi: RegionApi,
  districtApi: DistrictApi,
  communeApi: CommuneApi,
  fokontanyApi: FokontanyApi,
) {
  return appMapStore ??= new AppMapStore(
    admGeoJsonClientCache,
    admGeoJsonStore,
    apiStore,
    provinceApi,
    regionApi,
    districtApi,
    communeApi,
    fokontanyApi,
  );
}
