using Cicclo.Domain.Exceptions;
using Cicclo.Domain.Wallets;
using Xunit;

namespace Cicclo.Domain.Tests.Wallets;

public sealed class WalletTests
{
    [Fact]
    public void Credit_WhenAmountIsPositive_IncreasesBalanceAndChangesVersion()
    {
        var wallet = CreateWallet(50m);
        var originalVersion = wallet.Version;

        wallet.Credit(50m);

        Assert.Equal(100m, wallet.Balance);
        Assert.NotEqual(originalVersion, wallet.Version);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Credit_WhenAmountIsNotPositive_ThrowsWithoutChangingState(decimal amount)
    {
        var wallet = CreateWallet(50m);
        var originalVersion = wallet.Version;

        Assert.Throws<ArgumentOutOfRangeException>(() => wallet.Credit(amount));

        Assert.Equal(50m, wallet.Balance);
        Assert.Equal(originalVersion, wallet.Version);
    }

    [Fact]
    public void Debit_WhenBalanceIsSufficient_ReducesBalanceAndChangesVersion()
    {
        var wallet = CreateWallet(50m);
        var originalVersion = wallet.Version;

        wallet.Debit(18.90m);

        Assert.Equal(31.10m, wallet.Balance);
        Assert.NotEqual(originalVersion, wallet.Version);
    }

    [Fact]
    public void Debit_WhenBalanceEqualsAmount_SetsBalanceToZero()
    {
        var wallet = CreateWallet(18.90m);

        wallet.Debit(18.90m);

        Assert.Equal(0m, wallet.Balance);
    }

    [Fact]
    public void Debit_WhenBalanceIsInsufficient_ThrowsAndPreservesWalletState()
    {
        var wallet = CreateWallet(10.20m);
        var originalVersion = wallet.Version;

        var exception = Assert.Throws<InsufficientBalanceException>(() => wallet.Debit(18.90m));

        Assert.Equal(10.20m, exception.Balance);
        Assert.Equal(18.90m, exception.Required);
        Assert.Equal(10.20m, wallet.Balance);
        Assert.Equal(originalVersion, wallet.Version);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Debit_WhenAmountIsNotPositive_ThrowsWithoutChangingState(decimal amount)
    {
        var wallet = CreateWallet(50m);
        var originalVersion = wallet.Version;

        Assert.Throws<ArgumentOutOfRangeException>(() => wallet.Debit(amount));

        Assert.Equal(50m, wallet.Balance);
        Assert.Equal(originalVersion, wallet.Version);
    }

    private static Wallet CreateWallet(decimal balance) => new(Guid.NewGuid(), balance);
}
