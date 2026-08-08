package com.cardsync.controller;

import com.cardsync.dto.SpendSummaryResponse;
import com.cardsync.dto.SpendTrendResponse;
import com.cardsync.dto.TransactionResponse;
import com.cardsync.model.TrendGranularity;
import com.cardsync.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/sync")
    public ResponseEntity<Void> sync(Authentication authentication) {
        transactionService.syncTransactions(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(transactionService.listTransactions(authentication.getName()));
    }

    @GetMapping("/summary")
    public ResponseEntity<SpendSummaryResponse> summary(Authentication authentication) {
        return ResponseEntity.ok(transactionService.getSpendSummary(authentication.getName()));
    }

    @GetMapping("/trend")
    public ResponseEntity<SpendTrendResponse> trend(
            @RequestParam(defaultValue = "DAY") TrendGranularity granularity, Authentication authentication) {
        return ResponseEntity.ok(transactionService.getSpendTrend(authentication.getName(), granularity));
    }
}
