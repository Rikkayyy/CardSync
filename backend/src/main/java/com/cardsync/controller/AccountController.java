package com.cardsync.controller;

import com.cardsync.dto.AccountResponse;
import com.cardsync.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final TransactionService transactionService;

    public AccountController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(transactionService.listAccounts(authentication.getName()));
    }
}
