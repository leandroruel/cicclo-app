namespace Cicclo.Application.Wallets.CreditWallet;

public enum WalletCreditStatus
{
    Applied,
    AlreadyApplied,
    IdempotencyKeyConflict
}

public sealed record WalletCreditResult(
    WalletCreditStatus Status,
    Guid WalletId,
    decimal Balance);
