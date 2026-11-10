using Cicclo.Domain.Orders;
using Cicclo.Domain.Services;
using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;

namespace Cicclo.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Wallet> Wallets => Set<Wallet>();

    public DbSet<WalletCredit> WalletCredits => Set<WalletCredit>();

    public DbSet<LaundryService> Services => Set<LaundryService>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
