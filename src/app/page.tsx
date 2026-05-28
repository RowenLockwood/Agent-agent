import { AppShell } from "@/components/AppShell";
import { getAppSettings } from "@/lib/appSettings";
import { listAuthors, type AuthorRecord } from "@/lib/authors";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initialAuthors: AuthorRecord[] = [];
  let initialError: string | null = null;
  try {
    initialAuthors = await listAuthors();
  } catch (err) {
    console.error("Failed to load authors", err);
    initialError =
      "Couldn't reach the database. Check DATABASE_URL and run migrations.";
  }

  let initialAgencyName = "";
  try {
    initialAgencyName = (await getAppSettings()).agencyName;
  } catch (err) {
    console.error("Failed to load app settings", err);
  }

  return (
    <AppShell
      initialAuthors={initialAuthors}
      initialError={initialError}
      initialAgencyName={initialAgencyName}
    />
  );
}
