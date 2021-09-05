import { ParsedUrlQuery } from "querystring";
import { useEffect, useRef } from "react";
import axios from "axios";

import { Configuration as ConfigurationEntity } from "../../assets/entities/configuration.entity";
import { defaultConfiguration } from "../../assets/data/defaultSettings";
import { Information as InformationEntity } from "../../assets/entities/information.entity";
import { Setting } from "../../assets/entities/settings.entity";

export function handleCopyToClipboard(value: string) {
  navigator.permissions
    .query({ name: "clipboard-write" as PermissionName })
    .then((result) => {
      if (result.state === "granted" || result.state === "prompt") {
        navigator.clipboard.writeText(value);
      }
    });
}

export async function getInformation(
  query: ParsedUrlQuery
): Promise<InformationEntity | undefined> {
  if (!query || !query.apiKey) return undefined;
  const response = await axios.get<InformationEntity>(
    `http://${query.apiHost || window.location.hostname}:${
      query.apiPort || 9170
    }/information`,
    {
      headers: { "api-key": query.apiKey },
    }
  );
  if (response.status > 204 || !response.data) {
    console.error(response);
    return undefined;
  }
  return response.data;
}

export async function getSettings(
  query: ParsedUrlQuery
): Promise<ConfigurationEntity | undefined> {
  if (!query || !query.apiKey) return defaultConfiguration;
  const response = await axios.get<Setting[]>(
    `http://${query.apiHost || window.location.hostname}:${
      query.apiPort || 9170
    }/settings`,
    {
      headers: { "api-key": query.apiKey },
    }
  );
  if (
    response.status > 204 ||
    !response.data ||
    !Array.isArray(response.data)
  ) {
    console.error(response);
    return defaultConfiguration;
  }
  const s: ConfigurationEntity = defaultConfiguration;
  Object.keys(s).forEach((sectionKey: string) => {
    Object.keys(s[sectionKey].items).forEach((itemKey: string) => {
      const settingValue = response.data.find(({ key }: Setting) => {
        const keys = key.split("-");
        return keys[0] === sectionKey && keys[1] === itemKey;
      })?.value;
      const defaultValue = s[sectionKey].items[itemKey].defaultValue;
      const value = settingValue || s[sectionKey].items[itemKey].defaultValue;
      s[sectionKey].items[itemKey].value =
        typeof defaultValue === "boolean"
          ? value === "true"
          : typeof defaultValue === "number"
          ? Number(value)
          : value;
      if (!settingValue)
        axios.post<Setting>(
          `http://${query.apiHost || window.location.hostname}:${
            query.apiPort || 9170
          }/settings`,
          {
            key: `${sectionKey}-${itemKey}`,
            value: String(s[sectionKey].items[itemKey].defaultValue),
          },
          {
            headers: { "api-key": query.apiKey },
          }
        );
    });
  });
  return s;
}

export function usePrevious(value: any): unknown {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
