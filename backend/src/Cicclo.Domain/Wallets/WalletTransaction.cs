namespace Cicclo.Domain.Wallets;

public enum WalletTransactionType
{
    Debit,
    Credit
}

public sealed class WalletTransaction
{
    private WalletTransaction()
    {
    }

    public WalletTransaction(
        Guid id,
        Guid walletId,
        WalletTransactionType type,
        decimal amount,
        decimal balanceAfter,
        Guid orderId)
    {
        Id = id;
        WalletId = walletId;
        Type = type;
        Amount = amount;
        BalanceAfter = balanceAfter;
        OrderId = orderId;
    }

    public Guid Id { get; private set; }

    public Guid WalletId { get; private set; }

    public WalletTransactionType Type { get; private set; }

    public decimal Amount { get; private set; }

    public decimal BalanceAfter { get; private set; }

    public Guid OrderId { get; private set; }
}
