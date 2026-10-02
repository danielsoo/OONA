import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import type { SchoolSuggestion } from "@/types/school";
import type { PromoFrameCrop, WorkSection } from "@/types/work";
import type { CreditDraft, InviteDraft, PickedMedia } from "~/lib/upload";

/**
 * The upload form saved on the device (the website keeps its draft in the
 * browser the same way). Picked files are saved as their local URIs; ones the
 * OS has cleared from the cache are dropped on restore and must be picked again.
 */
export type UploadDraft = {
  stepIndex: number;
  full: PickedMedia | null;
  title: string;
  description: string;
  director: string;
  section: WorkSection;
  contentCategory: string;
  tags: string;
  thumbnail: PickedMedia | null;
  thumbnailCrop: PromoFrameCrop;
  school: SchoolSuggestion | null;
  credits: CreditDraft[];
  invites: InviteDraft[];
  prologueChoice: "upload" | "skip" | "";
  prologue: PickedMedia | null;
  prologueTitle: string;
  promo: PickedMedia | null;
  promoCrop: PromoFrameCrop;
  promoTitle: string;
  promoDescription: string;
  trimStart: string;
};

const keyFor = (uid: string) => `oona_upload_draft:${uid}`;

async function stillExists(media: PickedMedia | null): Promise<PickedMedia | null> {
  if (!media) return null;
  try {
    return new File(media.uri).exists ? media : null;
  } catch {
    // A URI this API can't inspect (e.g. content://): keep it; the upload reports a missing file.
    return media;
  }
}

export async function loadUploadDraft(uid: string): Promise<UploadDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const draft = JSON.parse(raw) as UploadDraft;
    const [full, thumbnail, prologue, promo] = await Promise.all([
      stillExists(draft.full),
      stillExists(draft.thumbnail),
      stillExists(draft.prologue),
      stillExists(draft.promo),
    ]);
    return { ...draft, full, thumbnail, prologue, promo };
  } catch {
    return null;
  }
}

export function saveUploadDraft(uid: string, draft: UploadDraft): Promise<void> {
  return AsyncStorage.setItem(keyFor(uid), JSON.stringify(draft)).catch(() => {});
}

export function clearUploadDraft(uid: string): Promise<void> {
  return AsyncStorage.removeItem(keyFor(uid)).catch(() => {});
}

/** True when the form has anything worth restoring. */
export function hasDraftContent(d: UploadDraft): boolean {
  return Boolean(d.full || d.thumbnail || d.promo || d.prologue || d.title.trim() || d.description.trim() || d.credits.length);
}
