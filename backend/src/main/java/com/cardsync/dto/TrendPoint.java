package com.cardsync.dto;

import java.time.LocalDate;

public record TrendPoint(LocalDate periodStart, double total) {
}
