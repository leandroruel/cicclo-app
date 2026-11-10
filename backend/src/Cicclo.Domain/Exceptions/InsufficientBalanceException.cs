namespace Cicclo.Domain.Exceptions;

public sealed class InsufficientBalanceException(decimal balance, decimal required)
    : Exception("O saldo da carteira não cobre o valor solicitado.")
{
    public decimal Balance { get; } = balance;

    public decimal Required { get; } = required;
}
