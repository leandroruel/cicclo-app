namespace Cicclo.Domain.Wallets;

using Cicclo.Domain.Exceptions;

public sealed class Wallet
{
    private Wallet()
    {
    }

    public Wallet(Guid id, decimal balance)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("A carteira precisa de um identificador.", nameof(id));
        }

        if (balance < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(balance), "O saldo inicial não pode ser negativo.");
        }

        Id = id;
        Balance = balance;
        Version = Guid.NewGuid();
    }

    public Guid Id { get; private set; }

    public decimal Balance { get; private set; }

    public Guid Version { get; private set; }

    public void Debit(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "O valor do débito deve ser positivo.");
        }

        if (Balance < amount)
        {
            throw new InsufficientBalanceException(Balance, amount);
        }

        Balance -= amount;
        Version = Guid.NewGuid();
    }
}
