import { BaseApi } from "@/api/base.api.ts";

export class MadaAdmConfigApi extends BaseApi {
  async get() {
    const res = await this.client.api.config.$get();
    return res.json();
  }
}

let instance: MadaAdmConfigApi | null = null;

export function injectMadaAdmConfigApi(): MadaAdmConfigApi {
  if (!instance) {
    instance = new MadaAdmConfigApi();
  }
  return instance;
}
