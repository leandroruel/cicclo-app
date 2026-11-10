namespace Cicclo.Api.Contracts;

public sealed record WalletResponse(Guid Id, decimal Balance, string Currency);
