package com.cardsync.service;

import java.util.regex.Pattern;

/**
 * Collapses raw Plaid transaction names into a canonical merchant key, so the same
 * real-world merchant (e.g. "STARBUCKS #4521" from one bank, "SQ *STARBUCKS COFFEE"
 * from another) reconciles to one key regardless of formatting differences between
 * institutions/card networks.
 */
final class MerchantNormalizer {

    private static final Pattern POS_PREFIX =
            Pattern.compile("^(SQ|TST|PY|WL|CKO|PP|IN|SP)\\s?\\*\\s*");
    private static final Pattern STORE_NUMBER = Pattern.compile("#\\d+");
    private static final Pattern TRAILING_DIGITS = Pattern.compile("\\s+\\d{3,}$");
    private static final Pattern NON_ALNUM_SPACE = Pattern.compile("[^A-Z0-9 ]");
    private static final Pattern EXTRA_WHITESPACE = Pattern.compile("\\s+");

    private MerchantNormalizer() {
    }

    static String normalize(String merchantName, String name) {
        String raw = (merchantName != null && !merchantName.isBlank()) ? merchantName : name;
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String s = raw.toUpperCase();
        s = POS_PREFIX.matcher(s).replaceFirst("");
        s = STORE_NUMBER.matcher(s).replaceAll("");
        s = TRAILING_DIGITS.matcher(s).replaceAll("");
        s = NON_ALNUM_SPACE.matcher(s).replaceAll("");
        s = EXTRA_WHITESPACE.matcher(s).replaceAll(" ").trim();

        return s.isEmpty() ? null : s.toLowerCase();
    }
}
