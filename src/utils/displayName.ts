/**
 * Extracts a display name (first name) from a user profile.
 * 
 * Priority:
 * 1. First word of full_name if available
 * 2. First part of email before @ (e.g., "morten" from "morten.tangen@gmail.com")
 * 3. Fallback to "Anonym"
 * 
 * The result is capitalized properly.
 */
export function getDisplayName(
    fullName: string | null | undefined,
    email: string | null | undefined
): string {
    // Try to get first name from full_name
    if (fullName && fullName.trim().length > 0) {
        const trimmedName = fullName.trim();

        // Handle case where fullName is actually an email
        if (trimmedName.includes('@')) {
            const localPart = trimmedName.split('@')[0];
            const firstName = localPart.split('.')[0];
            return capitalize(firstName);
        }

        const firstName = trimmedName.split(' ')[0];
        return capitalize(firstName);
    }

    // Fallback to email
    if (email && email.includes('@')) {
        const localPart = email.split('@')[0];
        const firstName = localPart.split('.')[0];
        return capitalize(firstName);
    }

    return 'Anonym';
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
