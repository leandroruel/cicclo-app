using Cicclo.Domain.Wallets;

namespace Cicclo.Application.Wallets.GetTransactions;

public sealed record WalletTransactionResult(
    Guid Id,
    WalletTransactionType Type,
    decimal Amount,
    decimal BalanceAfter,
    Guid OrderId,
    DateTimeOffset CreatedAt);
