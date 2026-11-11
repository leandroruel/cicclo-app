namespace Cicclo.Api.Contracts;

/// <summary>Lista de lançamentos do extrato da carteira.</summary>
public sealed record WalletTransactionListResponse(IReadOnlyList<WalletTransactionResponse> Items);
