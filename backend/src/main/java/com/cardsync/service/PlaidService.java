package com.cardsync.service;

import com.cardsync.model.User;
import com.cardsync.repository.UserRepository;
import com.plaid.client.model.CountryCode;
import com.plaid.client.model.LinkTokenCreateRequest;
import com.plaid.client.model.LinkTokenCreateRequestUser;
import com.plaid.client.model.LinkTokenCreateResponse;
import com.plaid.client.model.Products;
import com.plaid.client.request.PlaidApi;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Service
public class PlaidService {

    private final PlaidApi plaidApi;
    private final UserRepository userRepository;

    public PlaidService(PlaidApi plaidApi, UserRepository userRepository) {
        this.plaidApi = plaidApi;
        this.userRepository = userRepository;
    }

    public String createLinkToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        LinkTokenCreateRequest request = new LinkTokenCreateRequest()
                .clientName("CardSync")
                .language("en")
                .countryCodes(List.of(CountryCode.US))
                .products(List.of(Products.TRANSACTIONS))
                .user(new LinkTokenCreateRequestUser().clientUserId(user.getId().toString()));

        Response<LinkTokenCreateResponse> response;
        try {
            response = plaidApi.linkTokenCreate(request).execute();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to reach Plaid", e);
        }

        LinkTokenCreateResponse body = response.body();
        if (!response.isSuccessful() || body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Plaid link token creation failed");
        }

        return body.getLinkToken();
    }
}
