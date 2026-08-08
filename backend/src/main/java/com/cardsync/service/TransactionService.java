package com.cardsync.service;

import com.cardsync.dto.AccountResponse;
import com.cardsync.dto.CategoryTotal;
import com.cardsync.dto.SpendSummaryResponse;
import com.cardsync.dto.SpendTrendResponse;
import com.cardsync.dto.TransactionResponse;
import com.cardsync.dto.TrendPoint;
import com.cardsync.model.Account;
import com.cardsync.model.PlaidItem;
import com.cardsync.model.Transaction;
import com.cardsync.model.TrendGranularity;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
public class TransactionService {

    /** Plaid personal_finance_category primaries that represent moving money, not spending it. */
    private static final Set<String> NON_SPEND_CATEGORIES = Set.of("LOAN_PAYMENTS", "TRANSFER_IN", "TRANSFER_OUT");

    private final PlaidApi plaidApi;
    private final UserRepository userRepository;
    private final PlaidItemRepository plaidItemRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final EncryptionService encryptionService;
    private final TransferDetectionService transferDetectionService;

    public TransactionService(
            PlaidApi plaidApi,
            UserRepository userRepository,
            PlaidItemRepository plaidItemRepository,
            AccountRepository accountRepository,
            TransactionRepository transactionRepository,
            EncryptionService encryptionService,
            TransferDetectionService transferDetectionService) {
        this.plaidApi = plaidApi;
        this.userRepository = userRepository;
        this.plaidItemRepository = plaidItemRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.encryptionService = encryptionService;
        this.transferDetectionService = transferDetectionService;
    }

    @Transactional
    public void syncTransactions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        for (PlaidItem item : plaidItemRepository.findAllByUser(user)) {
            syncItem(item);
        }

        transferDetectionService.detectTransfers(user);
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
            account.setOfficialName(plaidAccount.getOfficialName());
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
            if (plaidTransaction.getPersonalFinanceCategory() != null) {
                transaction.setCategoryPrimary(plaidTransaction.getPersonalFinanceCategory().getPrimary());
                transaction.setCategoryDetailed(plaidTransaction.getPersonalFinanceCategory().getDetailed());
            }
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
                        displayAccountName(t.getAccount()),
                        t.getDate(),
                        t.getName(),
                        t.getMerchantName(),
                        t.getAmount(),
                        t.getIsoCurrencyCode(),
                        t.getCategoryPrimary(),
                        t.getCategoryDetailed(),
                        Boolean.TRUE.equals(t.getPending()),
                        Boolean.TRUE.equals(t.getIsInternalTransfer())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccounts(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return accountRepository.findAllByPlaidItem_User(user)
                .stream()
                .map(a -> new AccountResponse(
                        a.getPlaidItem().getInstitutionName(),
                        a.getOfficialName() != null ? a.getOfficialName() : a.getName(),
                        a.getMask()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SpendSummaryResponse getSpendSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate earliest = startOfWeek.isBefore(startOfMonth) ? startOfWeek : startOfMonth;

        List<Transaction> transactions = transactionRepository.findAllByUserSince(user, earliest);

        double totalToday = 0;
        double totalThisWeek = 0;
        double totalThisMonth = 0;
        String isoCurrencyCode = null;
        Map<String, Double> byCategory = new LinkedHashMap<>();

        for (Transaction t : transactions) {
            if (!isSpend(t)) continue;
            if (isoCurrencyCode == null) {
                isoCurrencyCode = t.getIsoCurrencyCode();
            }

            double amount = t.getAmount();
            if (!t.getDate().isBefore(startOfMonth)) {
                totalThisMonth += amount;
                String category = t.getCategoryPrimary() != null ? t.getCategoryPrimary() : "OTHER";
                byCategory.merge(category, amount, Double::sum);
            }
            if (!t.getDate().isBefore(startOfWeek)) {
                totalThisWeek += amount;
            }
            if (!t.getDate().isBefore(today)) {
                totalToday += amount;
            }
        }

        List<CategoryTotal> categoryTotals = byCategory.entrySet().stream()
                .map(e -> new CategoryTotal(e.getKey(), e.getValue()))
                .sorted((a, b) -> Double.compare(b.total(), a.total()))
                .toList();

        return new SpendSummaryResponse(totalToday, totalThisWeek, totalThisMonth, isoCurrencyCode, categoryTotals);
    }

    @Transactional(readOnly = true)
    public SpendTrendResponse getSpendTrend(String email, TrendGranularity granularity) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        LocalDate today = LocalDate.now();
        LocalDate since = switch (granularity) {
            case DAY -> today.minusDays(29);
            case WEEK -> today.minusWeeks(11).with(DayOfWeek.MONDAY);
            case MONTH -> today.minusMonths(11).withDayOfMonth(1);
        };

        List<Transaction> transactions = transactionRepository.findAllByUserSince(user, since);

        Map<LocalDate, Double> totalsByPeriod = new TreeMap<>();
        String isoCurrencyCode = null;
        for (Transaction t : transactions) {
            if (!isSpend(t)) continue;
            if (isoCurrencyCode == null) {
                isoCurrencyCode = t.getIsoCurrencyCode();
            }
            LocalDate period = periodStart(t.getDate(), granularity);
            totalsByPeriod.merge(period, t.getAmount(), Double::sum);
        }

        List<TrendPoint> points = new ArrayList<>();
        LocalDate cursor = since;
        while (!cursor.isAfter(today)) {
            points.add(new TrendPoint(cursor, totalsByPeriod.getOrDefault(cursor, 0.0)));
            cursor = switch (granularity) {
                case DAY -> cursor.plusDays(1);
                case WEEK -> cursor.plusWeeks(1);
                case MONTH -> cursor.plusMonths(1);
            };
        }

        return new SpendTrendResponse(granularity.name(), isoCurrencyCode, points);
    }

    private LocalDate periodStart(LocalDate date, TrendGranularity granularity) {
        return switch (granularity) {
            case DAY -> date;
            case WEEK -> date.with(DayOfWeek.MONDAY);
            case MONTH -> date.withDayOfMonth(1);
        };
    }

    private String displayAccountName(Account account) {
        String name = account.getOfficialName() != null ? account.getOfficialName() : account.getName();
        String institution = account.getPlaidItem().getInstitutionName();
        String withInstitution = institution != null ? institution + " " + name : name;
        return account.getMask() != null ? withInstitution + " ••" + account.getMask() : withInstitution;
    }

    private boolean isSpend(Transaction t) {
        if (t.getAmount() == null || t.getAmount() <= 0) return false;
        if (Boolean.TRUE.equals(t.getIsInternalTransfer())) return false;
        return t.getCategoryPrimary() == null || !NON_SPEND_CATEGORIES.contains(t.getCategoryPrimary());
    }
}
