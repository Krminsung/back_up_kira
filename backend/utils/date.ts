export function getKSTTodayStart(): Date {
    // Current time in UTC
    const now = new Date();

    // KST is UTC+9
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);

    // Get year, month, date components of KST
    const year = kstDate.getUTCFullYear();
    const month = kstDate.getUTCMonth();
    const day = kstDate.getUTCDate();

    // Create KST start of day in UTC timestamp
    // We create a date with KST components, then subtract offset to get UTC
    const kstMidnight = new Date(Date.UTC(year, month, day));
    return new Date(kstMidnight.getTime() - kstOffset);
}
