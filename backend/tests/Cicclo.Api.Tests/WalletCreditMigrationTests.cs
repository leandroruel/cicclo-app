using Cicclo.Domain.Wallets;
using Cicclo.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Cicclo.Api.Tests;

public sealed class WalletCreditMigrationTests
{
    [Fact]
    public async Task Migration_AddsCreatedAtToExistingWalletCredits()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var dbContext = new AppDbContext(options);
        await dbContext.Database.MigrateAsync("20261110211530_AddOrdersAndServices");

        var walletId = Guid.NewGuid();
        dbContext.Wallets.Add(new Wallet(walletId, 50m));
        await dbContext.SaveChangesAsync();
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO WalletCredits (Id, WalletId, IdempotencyKey, Amount, BalanceAfter) VALUES ({Guid.NewGuid()}, {walletId}, {"existing-credit"}, {"25.00"}, {"75.00"})");

        await dbContext.Database.MigrateAsync();

        var credit = await dbContext.WalletCredits.AsNoTracking().SingleAsync();
        Assert.Equal(25m, credit.Amount);
        Assert.True(credit.CreatedAt > DateTimeOffset.MinValue);
    }
}
