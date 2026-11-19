import {
  AdmEntity,
  AdmEntityDiscriminated,
  Commune,
  District,
  Fokontany,
  Province,
  Region,
} from "@scope/types/models";
import { ADM_LEVEL_CODES_INDEXED, AdmLevelCode } from "@scope/consts/models";

export function getAdmEntityValue(
  entity: AdmEntity,
  admLevelCode?: AdmLevelCode,
): string {
  let value!: string;
  const _admLevelCode = admLevelCode ??
    ADM_LEVEL_CODES_INDEXED[entity.admLevel!];
  switch (_admLevelCode) {
    case AdmLevelCode.PROVINCE:
      value = (entity as Province).province;
      break;
    case AdmLevelCode.REGION:
      value = (entity as Region).region;
      break;
    case AdmLevelCode.DISTRICT:
      value = (entity as District).district;
      break;
    case AdmLevelCode.COMMUNE:
      value = (entity as Commune).commune;
      break;
    case AdmLevelCode.FOKONTANY:
      value = (entity as Fokontany).fokontany;
      break;
    default:
      break;
  }
  return value;
}

export interface CommuneIdentifiers {
  district: string;
  commune: string;
}

export function getCommuneNameEncoding(commune: CommuneIdentifiers) {
  return `${commune.district} - ${commune.commune}`;
}

export interface FokontanyIdentifiers {
  district: string;
  commune: string;
  fokontany: string;
}

export function getFokontanyNameEncoding(fokontany: FokontanyIdentifiers) {
  return `${fokontany.district} - ${fokontany.commune} - ${fokontany.fokontany}`;
}

export function getAdmEntityDiscriminatedValue(
  admEntityDiscriminated: AdmEntityDiscriminated,
  fieldAdmLevelCode?: AdmLevelCode,
): string {
  const admLevelCode = admEntityDiscriminated.admLevelCode;
  if (!fieldAdmLevelCode || fieldAdmLevelCode === admLevelCode) {
    return getAdmEntityValue(admEntityDiscriminated.entity, admLevelCode);
  }
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
        }
        throw new Error(
          `province not available for district: ${admEntityDiscriminated.entity.district}`,
        );
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
        }
        throw new Error(
          `province not available for commune: ${admEntityDiscriminated.entity.commune}`,
        );
      }
      break;
    }
    case AdmLevelCode.FOKONTANY: {
      if (fieldAdmLevelCode === AdmLevelCode.COMMUNE) {
        return admEntityDiscriminated.entity.commune;
      } else if (fieldAdmLevelCode === AdmLevelCode.DISTRICT) {
        return admEntityDiscriminated.entity.district;
      } else if (fieldAdmLevelCode === AdmLevelCode.REGION) {
        return admEntityDiscriminated.entity.region;
      } else if (fieldAdmLevelCode === AdmLevelCode.PROVINCE) {
        if (admEntityDiscriminated.entity.province) {
          return admEntityDiscriminated.entity.province;
        }
        throw new Error(
          `province not available for commune: ${admEntityDiscriminated.entity.commune}`,
        );
      }
      break;
    }
    default:
      throw new Error(
        `Unsupported admLevelCode ${admLevelCode} for getAdmEntityDiscriminatedValue`,
      );
  }
  throw new Error(
    `Unsupported fieldAdmLevelCode ${fieldAdmLevelCode} for getAdmEntityDiscriminatedValue`,
  );
}
