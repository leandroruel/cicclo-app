namespace Cicclo.Domain.Wallets;

public sealed class WalletCredit
{
    private WalletCredit()
    {
    }

    public WalletCredit(Guid walletId, string idempotencyKey, decimal amount, decimal balanceAfter)
    {
        Id = Guid.NewGuid();
        WalletId = walletId;
        IdempotencyKey = idempotencyKey;
        Amount = amount;
        BalanceAfter = balanceAfter;
    }

    public Guid Id { get; private set; }

    public Guid WalletId { get; private set; }

    public string IdempotencyKey { get; private set; } = string.Empty;

    public decimal Amount { get; private set; }

    public decimal BalanceAfter { get; private set; }
}
