package com.cardsync.dto;

import java.util.List;

public record SpendTrendResponse(String granularity, String isoCurrencyCode, List<TrendPoint> points) {
}
