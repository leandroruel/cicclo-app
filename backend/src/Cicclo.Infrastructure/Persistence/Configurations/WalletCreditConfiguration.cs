using Cicclo.Domain.Wallets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cicclo.Infrastructure.Persistence.Configurations;

public sealed class WalletCreditConfiguration : IEntityTypeConfiguration<WalletCredit>
{
    public void Configure(EntityTypeBuilder<WalletCredit> builder)
    {
        builder.ToTable("WalletCredits");
        builder.HasKey(credit => credit.Id);
        builder.Property(credit => credit.IdempotencyKey)
            .HasMaxLength(128)
            .IsRequired();
        builder.HasIndex(credit => credit.IdempotencyKey)
            .IsUnique();
        builder.HasOne<Wallet>()
            .WithMany()
            .HasForeignKey(credit => credit.WalletId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Property(credit => credit.Amount)
            .HasPrecision(18, 2)
            .IsRequired();
        builder.Property(credit => credit.BalanceAfter)
            .HasPrecision(18, 2)
            .IsRequired();
    }
}
