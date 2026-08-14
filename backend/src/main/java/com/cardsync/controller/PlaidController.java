package com.cardsync.controller;

import com.cardsync.dto.ExchangeTokenRequest;
import com.cardsync.dto.LinkTokenResponse;
import com.cardsync.service.PlaidService;
import com.plaid.client.model.AccountsGetResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    /**
     * Returns Plaid's raw /accounts/balance/get response, unmapped -- for inspecting the
     * actual shape of what Plaid sends back, not for the app's normal balance display (which
     * doesn't exist yet; see Account.currentBalance, populated only as a side effect of sync).
     */
    @GetMapping("/balances/raw")
    public ResponseEntity<List<AccountsGetResponse>> getRawBalances(Authentication authentication) {
        return ResponseEntity.ok(plaidService.getRawBalances(authentication.getName()));
    }
}
