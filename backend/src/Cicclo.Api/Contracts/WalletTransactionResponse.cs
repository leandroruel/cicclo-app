namespace Cicclo.Api.Contracts;

/// <summary>Representa um lançamento do extrato da carteira.</summary>
public sealed record WalletTransactionResponse(
    Guid Id,
    string Type,
    decimal Amount,
    decimal BalanceAfter,
    Guid OrderId,
    DateTimeOffset CreatedAt);
