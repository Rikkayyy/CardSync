package com.cardsync.controller;

import com.cardsync.dto.ExchangeTokenRequest;
import com.cardsync.dto.LinkTokenResponse;
import com.cardsync.service.PlaidService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/plaid")
public class PlaidController {

    private final PlaidService plaidService;

    public PlaidController(PlaidService plaidService) {
        this.plaidService = plaidService;
    }

    @PostMapping("/link-token")
    public ResponseEntity<LinkTokenResponse> createLinkToken(Authentication authentication) {
        String linkToken = plaidService.createLinkToken(authentication.getName());
        return ResponseEntity.ok(new LinkTokenResponse(linkToken));
    }

    @PostMapping("/exchange-token")
    public ResponseEntity<Void> exchangeToken(
            Authentication authentication, @Valid @RequestBody ExchangeTokenRequest request) {
        plaidService.exchangePublicToken(
                authentication.getName(), request.publicToken(), request.institutionId(), request.institutionName());
        return ResponseEntity.noContent().build();
    }
}
