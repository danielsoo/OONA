/**
 * Demo content switch.
 *
 * Production shows only real data: placeholder films, fake reviews, invented
 * statistics and fixture series stay hidden. Set NEXT_PUBLIC_DEMO_MODE=1 in
 * .env.local to bring the showcase content back for pitches and design review.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
