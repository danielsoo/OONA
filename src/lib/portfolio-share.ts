import type { PortfolioShareDoc } from "@/types/portfolio";

/**
 * Whether a portfolio link shows a work. A link made for one place lists its
 * works (includedWorkIds) and shows exactly those; an older one shows
 * everything not left out. Someone else's work its owner hid from portfolio
 * links stays out of every link, listed or not; your own you can still list.
 */
export function workIncludedInShare(
  workId: string,
  work: { portfolioSubmissionHidden?: boolean },
  share: Pick<PortfolioShareDoc, "includedWorkIds" | "excludedWorkIds">,
  ownWork: boolean
): boolean {
  if (work.portfolioSubmissionHidden && !ownWork) return false;
  if (share.excludedWorkIds.includes(workId)) return false;
  if (share.includedWorkIds.length > 0) {
    return share.includedWorkIds.includes(workId);
  }
  if (work.portfolioSubmissionHidden) return false;
  return true;
}
