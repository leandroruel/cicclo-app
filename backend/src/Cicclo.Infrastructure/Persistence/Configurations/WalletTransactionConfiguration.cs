using Cicclo.Domain.Orders;
using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cicclo.Infrastructure.Persistence.Configurations;

public sealed class WalletTransactionConfiguration : IEntityTypeConfiguration<WalletTransaction>
{
    public void Configure(EntityTypeBuilder<WalletTransaction> builder)
    {
        builder.ToTable("Transactions");
        builder.HasKey(transaction => transaction.Id);
        builder.Property(transaction => transaction.Type)
            .HasConversion<string>()
            .HasMaxLength(32)
            .IsRequired();
        builder.Property(transaction => transaction.Amount)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.Property(transaction => transaction.BalanceAfter)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.HasIndex(transaction => transaction.OrderId)
            .IsUnique();
        builder.HasOne<Wallet>()
            .WithMany()
            .HasForeignKey(transaction => transaction.WalletId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Order>()
            .WithMany()
            .HasForeignKey(transaction => transaction.OrderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
