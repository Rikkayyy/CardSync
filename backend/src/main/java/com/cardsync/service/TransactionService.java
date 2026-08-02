package com.cardsync.service;

import com.cardsync.dto.TransactionResponse;
import com.cardsync.model.Account;
import com.cardsync.model.PlaidItem;
import com.cardsync.model.Transaction;
import com.cardsync.model.User;
import com.cardsync.repository.AccountRepository;
import com.cardsync.repository.PlaidItemRepository;
import com.cardsync.repository.TransactionRepository;
import com.cardsync.repository.UserRepository;
import com.cardsync.security.EncryptionService;
import com.plaid.client.model.AccountBase;
import com.plaid.client.model.RemovedTransaction;
import com.plaid.client.model.TransactionsSyncRequest;
import com.plaid.client.model.TransactionsSyncResponse;
import com.plaid.client.request.PlaidApi;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Service
public class TransactionService {

    private final PlaidApi plaidApi;
    private final UserRepository userRepository;
    private final PlaidItemRepository plaidItemRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final EncryptionService encryptionService;

    public TransactionService(
            PlaidApi plaidApi,
            UserRepository userRepository,
            PlaidItemRepository plaidItemRepository,
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            EncryptionService encryptionService) {
        this.plaidApi = plaidApi;
        this.userRepository = userRepository;
        this.plaidItemRepository = plaidItemRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public void syncTransactions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        for (PlaidItem item : plaidItemRepository.findAllByUser(user)) {
            syncItem(item);
        }
    }

    private void syncItem(PlaidItem item) {
        String accessToken = encryptionService.decrypt(item.getAccessTokenEncrypted());
        String cursor = item.getTransactionsCursor();
        boolean hasMore = true;

        while (hasMore) {
            TransactionsSyncRequest request = new TransactionsSyncRequest()
                    .accessToken(accessToken)
                    .cursor(cursor);

            Response<TransactionsSyncResponse> response;
            try {
                response = plaidApi.transactionsSync(request).execute();
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to reach Plaid", e);
            }

            TransactionsSyncResponse body = response.body();
            if (!response.isSuccessful() || body == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Plaid transactions sync failed");
            }

            upsertAccounts(body.getAccounts(), item);
            upsertTransactions(body.getAdded());
            upsertTransactions(body.getModified());
            removeTransactions(body.getRemoved());

            cursor = body.getNextCursor();
            hasMore = Boolean.TRUE.equals(body.getHasMore());
        }

        item.setTransactionsCursor(cursor);
        plaidItemRepository.save(item);
    }

    private void upsertAccounts(List<AccountBase> plaidAccounts, PlaidItem item) {
        for (AccountBase plaidAccount : plaidAccounts) {
            Account account = accountRepository.findByPlaidAccountId(plaidAccount.getAccountId())
                    .orElseGet(Account::new);
            account.setPlaidItem(item);
            account.setPlaidAccountId(plaidAccount.getAccountId());
            account.setName(plaidAccount.getName());
            account.setMask(plaidAccount.getMask());
            account.setType(plaidAccount.getType() != null ? plaidAccount.getType().getValue() : null);
            account.setSubtype(plaidAccount.getSubtype() != null ? plaidAccount.getSubtype().getValue() : null);
            if (plaidAccount.getBalances() != null) {
                account.setCurrentBalance(plaidAccount.getBalances().getCurrent());
                account.setIsoCurrencyCode(plaidAccount.getBalances().getIsoCurrencyCode());
            }
            accountRepository.save(account);
        }
    }

    private void upsertTransactions(List<com.plaid.client.model.Transaction> plaidTransactions) {
        for (com.plaid.client.model.Transaction plaidTransaction : plaidTransactions) {
            Account account = accountRepository.findByPlaidAccountId(plaidTransaction.getAccountId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.INTERNAL_SERVER_ERROR,
                            "Transaction references unknown account " + plaidTransaction.getAccountId()));

            Transaction transaction = transactionRepository
                    .findByPlaidTransactionId(plaidTransaction.getTransactionId())
                    .orElseGet(Transaction::new);
            transaction.setAccount(account);
            transaction.setPlaidTransactionId(plaidTransaction.getTransactionId());
            transaction.setAmount(plaidTransaction.getAmount());
            transaction.setIsoCurrencyCode(plaidTransaction.getIsoCurrencyCode());
            transaction.setDate(plaidTransaction.getDate());
            transaction.setName(plaidTransaction.getName());
            transaction.setMerchantName(plaidTransaction.getMerchantName());
            transaction.setCategory(
                    plaidTransaction.getCategory() != null ? String.join(" > ", plaidTransaction.getCategory()) : null);
            transaction.setPending(Boolean.TRUE.equals(plaidTransaction.getPending()));
            transactionRepository.save(transaction);
        }
    }

    private void removeTransactions(List<RemovedTransaction> removed) {
        for (RemovedTransaction removedTransaction : removed) {
            transactionRepository.deleteByPlaidTransactionId(removedTransaction.getTransactionId());
        }
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listTransactions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return transactionRepository.findAllByUserOrderByDateDesc(user)
                .stream()
                .map(t -> new TransactionResponse(
                        t.getAccount().getName(),
                        t.getDate(),
                        t.getName(),
                        t.getMerchantName(),
                        t.getAmount(),
                        t.getIsoCurrencyCode(),
                        t.getCategory(),
                        Boolean.TRUE.equals(t.getPending())))
                .toList();
    }
}
