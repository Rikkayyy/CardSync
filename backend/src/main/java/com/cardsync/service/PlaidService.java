package com.cardsync.service;

import com.cardsync.model.PlaidItem;
import com.cardsync.model.User;
import com.cardsync.repository.PlaidItemRepository;
import com.cardsync.repository.UserRepository;
import com.cardsync.security.EncryptionService;
import com.plaid.client.model.CountryCode;
import com.plaid.client.model.ItemPublicTokenExchangeRequest;
import com.plaid.client.model.ItemPublicTokenExchangeResponse;
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
    private final PlaidItemRepository plaidItemRepository;
    private final EncryptionService encryptionService;

    public PlaidService(
            PlaidApi plaidApi,
            UserRepository userRepository,
            PlaidItemRepository plaidItemRepository,
            EncryptionService encryptionService) {
        this.plaidApi = plaidApi;
        this.userRepository = userRepository;
        this.plaidItemRepository = plaidItemRepository;
        this.encryptionService = encryptionService;
    }

    public String createLinkToken(String email) {
        User user = resolveUser(email);

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

    public void exchangePublicToken(String email, String publicToken, String institutionId, String institutionName) {
        User user = resolveUser(email);

        ItemPublicTokenExchangeRequest request = new ItemPublicTokenExchangeRequest()
                .publicToken(publicToken);

        Response<ItemPublicTokenExchangeResponse> response;
        try {
            response = plaidApi.itemPublicTokenExchange(request).execute();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to reach Plaid", e);
        }

        ItemPublicTokenExchangeResponse body = response.body();
        if (!response.isSuccessful() || body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Plaid token exchange failed");
        }

        PlaidItem item = new PlaidItem();
        item.setUser(user);
        item.setPlaidItemId(body.getItemId());
        item.setInstitutionId(institutionId);
        item.setInstitutionName(institutionName);
        item.setAccessTokenEncrypted(encryptionService.encrypt(body.getAccessToken()));
        plaidItemRepository.save(item);
    }

    private User resolveUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
