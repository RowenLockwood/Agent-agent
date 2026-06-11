import { prisma } from "./db";

const SETTINGS_ID = "singleton";

export type AppSettingsRecord = {
  agencyName: string;
};

export async function getAppSettings(): Promise<AppSettingsRecord> {
  const row = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  return { agencyName: row?.agencyName ?? "" };
}

export async function updateAgencyName(
  value: string,
): Promise<AppSettingsRecord> {
  const trimmed = value.trim();
  const row = await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { agencyName: trimmed },
    create: { id: SETTINGS_ID, agencyName: trimmed },
  });
  return { agencyName: row.agencyName };
}
